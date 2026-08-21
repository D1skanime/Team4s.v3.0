package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// Phase 137 Plan 07 -- Effective-Rights Inspection, Mutation and History API.
//
// This handler is a thin HTTP projection of the central resolver established
// in 137-04/137-05 (permissions.ResolveGroupRights) and the transactional
// mutation service built in 137-06 (services.EffectiveRightsService). It
// introduces NO second decision engine: inspection calls ResolveGroupRights
// exactly once per request and projects the result; mutation delegates
// entirely to EffectiveRightsService.MutateOverride, then re-resolves once
// more to report the resulting effective_right for the mutated action.
//
// D07: every operation (inspection, mutation, history) is authorized through
// the same dedicated user_group_capability_override.manage capability, since
// no separate "inspect only" action exists in the catalog and whoever may
// manage overrides in a group must certainly be able to inspect them.
//
// D08 group scoping: every operation is authorized against the :id path
// parameter (the fansub group). The target user's membership is always
// resolved and locked/read strictly within that same group -- a manipulated
// or foreign group/user id simply fails to resolve, never disclosing
// cross-group existence. Body group_id/target_user_id (mutation) must exactly
// match the path before any domain mutation is attempted.

// effectiveRightsPermissionService is the minimal central-resolver surface
// this handler needs. Both methods are already implemented by
// *permissions.Service (137-04/137-05); declared as a narrow interface here
// purely so handler tests can substitute a fake without a real Postgres-backed
// resolver.
type effectiveRightsPermissionService interface {
	CanForFansubGroup(ctx context.Context, actor permissions.Actor, action permissions.Action, fansubGroupID int64) (permissions.Result, error)
	ResolveGroupRights(ctx context.Context, actor permissions.Actor, fansubGroupID int64) (*permissions.GroupRightsResolution, error)
}

// effectiveRightsMutationService is the minimal write-path surface this
// handler needs from *services.EffectiveRightsService (137-06).
type effectiveRightsMutationService interface {
	MutateOverride(ctx context.Context, cmd services.EffectiveRightsOverrideMutationCommand) (*services.EffectiveRightsOverrideMutationResult, error)
}

// effectiveRightsTargetRepo is the minimal read surface this handler needs
// from *repository.AuthzUserOverridesRepository (137-03) to resolve/lock the
// target membership (D08) and list immutable override history.
type effectiveRightsTargetRepo interface {
	LockTargetMembership(ctx context.Context, appUserID int64, fansubGroupID int64) (*repository.TargetMembership, error)
	ListHistoryForSubject(ctx context.Context, appUserID int64, fansubGroupID int64, limit int, offset int) ([]repository.UserGroupCapabilityOverrideHistoryEntry, error)
}

// AdminEffectiveRightsHandler exposes inspection, mutation and history
// endpoints for one (target app user, fansub group) pair.
type AdminEffectiveRightsHandler struct {
	permissionSvc effectiveRightsPermissionService
	mutationSvc   effectiveRightsMutationService
	targetRepo    effectiveRightsTargetRepo
	authzRepo     capabilityAuthzRepo
	auditLogRepo  auditLogWriter
}

// NewAdminEffectiveRightsHandler erstellt einen neuen AdminEffectiveRightsHandler.
func NewAdminEffectiveRightsHandler(
	permissionSvc effectiveRightsPermissionService,
	mutationSvc effectiveRightsMutationService,
	targetRepo effectiveRightsTargetRepo,
	authzRepo capabilityAuthzRepo,
	auditLogRepo auditLogWriter,
) *AdminEffectiveRightsHandler {
	return &AdminEffectiveRightsHandler{
		permissionSvc: permissionSvc,
		mutationSvc:   mutationSvc,
		targetRepo:    targetRepo,
		authzRepo:     authzRepo,
		auditLogRepo:  auditLogRepo,
	}
}

// parseGroupAndTarget parses the :id (fansub group) and :appUserId (target)
// path parameters shared by all three endpoints in this handler.
func (h *AdminEffectiveRightsHandler) parseGroupAndTarget(c *gin.Context) (int64, int64, bool) {
	fansubGroupID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return 0, 0, false
	}
	targetAppUserID, err := strconv.ParseInt(c.Param("appUserId"), 10, 64)
	if err != nil || targetAppUserID <= 0 {
		badRequest(c, "ungültige app_user_id")
		return 0, 0, false
	}
	return fansubGroupID, targetAppUserID, true
}

// authorizeManagement checks the caller's dedicated management capability for
// the exact target group, auditing and writing a denial response itself when
// not allowed. Returns ok=false if the caller must not proceed.
func (h *AdminEffectiveRightsHandler) authorizeManagement(
	c *gin.Context, identity middleware.AuthIdentity, actor permissions.Actor,
	fansubGroupID int64, targetAppUserID int64, eventType string, targetType string,
) bool {
	result, err := h.permissionSvc.CanForFansubGroup(
		c.Request.Context(), actor, permissions.ActionUserGroupCapabilityOverrideManage, fansubGroupID,
	)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return false
	}
	if !result.Allowed {
		auditPermissionDenied(
			c, h.auditLogRepo, identity, eventType, &fansubGroupID, targetType, &targetAppUserID,
			permissions.ActionUserGroupCapabilityOverrideManage, result,
		)
		writePermissionDenied(c, result)
		return false
	}
	return true
}

// resolveTargetActor loads the target's real active-membership row (D08:
// strictly scoped to this exact group) plus their global platform-admin
// status, and builds the permissions.Actor ResolveGroupRights needs to
// produce an accurate resolution for the TARGET user (not the caller). A
// genuinely foreign/non-existent (target, group) pair returns a neutral 404
// without disclosing whether the target exists in a different group.
func (h *AdminEffectiveRightsHandler) resolveTargetActor(
	c *gin.Context, targetAppUserID int64, fansubGroupID int64,
) (*permissions.Actor, bool) {
	membership, err := h.targetRepo.LockTargetMembership(c.Request.Context(), targetAppUserID, fansubGroupID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitgliedschaftseintrag nicht gefunden"}})
		return nil, false
	}
	if err != nil {
		log.Printf("effective rights: target membership lookup error (target=%d, group=%d): %v", targetAppUserID, fansubGroupID, err)
		internalError(c, "interner serverfehler")
		return nil, false
	}

	isPlatformAdmin, err := h.authzRepo.AppUserHasGlobalRole(c.Request.Context(), targetAppUserID, "platform_admin")
	if err != nil {
		log.Printf("effective rights: platform admin lookup error (target=%d): %v", targetAppUserID, err)
		internalError(c, "interner serverfehler")
		return nil, false
	}

	return &permissions.Actor{
		AppUserID:       targetAppUserID,
		Status:          membership.AppUserStatus,
		IsPlatformAdmin: isPlatformAdmin,
	}, true
}

// GetEffectiveRights returns the complete group-wide effective-rights
// projection for one target app user in one fansub group -- a single
// ResolveGroupRights call, never a per-capability loop (D09).
// GET /admin/fansubs/:id/app-members/:appUserId/effective-rights
func (h *AdminEffectiveRightsHandler) GetEffectiveRights(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubGroupID, targetAppUserID, ok := h.parseGroupAndTarget(c)
	if !ok {
		return
	}

	if !h.authorizeManagement(c, identity, actor, fansubGroupID, targetAppUserID, "effective_rights.inspect.denied", "effective_rights") {
		return
	}

	targetActor, ok := h.resolveTargetActor(c, targetAppUserID, fansubGroupID)
	if !ok {
		return
	}

	resolution, err := h.permissionSvc.ResolveGroupRights(c.Request.Context(), *targetActor, fansubGroupID)
	if err != nil {
		log.Printf("effective rights inspect: resolve error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": effectiveRightStatesFromResolution(resolution)})
}

// MutateOverride applies exactly one D06 SET ALLOW / SET DENY / REMOVE
// operation for one target user's group-scoped capability override, entirely
// delegated to EffectiveRightsService.MutateOverride.
// PUT /admin/fansubs/:id/app-members/:appUserId/capability-overrides
func (h *AdminEffectiveRightsHandler) MutateOverride(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubGroupID, targetAppUserID, ok := h.parseGroupAndTarget(c)
	if !ok {
		return
	}

	var req CapabilityOverrideMutationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	// D08: the path parameters are the authorization-bearing scope; a
	// manipulated body group_id/target_user_id must never silently override
	// them or reach the domain mutation.
	if req.GroupID != fansubGroupID || req.TargetUserID != targetAppUserID {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "group_id/target_user_id im Body stimmen nicht mit dem Pfad überein"},
		})
		return
	}
	if strings.TrimSpace(req.ActionCode) == "" {
		badRequest(c, "action_code ist erforderlich")
		return
	}

	kind, ok := overrideMutationKindFromRequest(req.Effect)
	if !ok {
		badRequest(c, "ungültiger effect-Wert")
		return
	}

	reasonCategory, reasonText := "", ""
	if req.Reason != nil {
		reasonCategory = string(req.Reason.Category)
		if req.Reason.Text != nil {
			reasonText = *req.Reason.Text
		}
	}

	result, err := h.mutationSvc.MutateOverride(c.Request.Context(), services.EffectiveRightsOverrideMutationCommand{
		Actor:           actor,
		TargetAppUserID: targetAppUserID,
		FansubGroupID:   fansubGroupID,
		ActionCode:      permissions.Action(req.ActionCode),
		Kind:            kind,
		ReasonCategory:  reasonCategory,
		ReasonText:      reasonText,
	})
	if err != nil {
		h.writeMutationError(c, identity, fansubGroupID, targetAppUserID, permissions.Action(req.ActionCode), err)
		return
	}

	targetActor, ok := h.resolveTargetActor(c, targetAppUserID, fansubGroupID)
	if !ok {
		return
	}
	resolution, err := h.permissionSvc.ResolveGroupRights(c.Request.Context(), *targetActor, fansubGroupID)
	if err != nil {
		log.Printf("effective rights mutate: resolve error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
		return
	}
	effectiveRight := effectiveRightStateFromCapabilityState(resolution.Can(permissions.Action(req.ActionCode)))
	now := time.Now().UTC().Format(time.RFC3339)

	response := CapabilityOverrideMutationResult{
		Status:  mutationStatus(result.Changed),
		Changed: result.Changed,
		Before: capabilityOverrideStateFromMutationSide(
			fansubGroupID, targetAppUserID, req.ActionCode, result.BeforeEffect, req.Reason, actor.AppUserID, now,
		),
		After: capabilityOverrideStateFromMutationSide(
			fansubGroupID, targetAppUserID, req.ActionCode, result.AfterEffect, req.Reason, actor.AppUserID, now,
		),
		EffectiveRight:   effectiveRight,
		ActivationStatus: CapabilityActivationStatusActive,
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "effective_rights.override.mutated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubGroupID,
		TargetType:     "user_group_capability_override",
		TargetID:       &targetAppUserID,
		Action:         req.ActionCode,
		Outcome:        "allowed",
		Payload:        map[string]any{"action_code": req.ActionCode, "kind": string(kind), "changed": result.Changed},
	})

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// ListOverrideHistory lists immutable override transitions for one target
// user, strictly scoped to the requested group (D08 rule 6). A foreign
// (target, group) pair simply resolves an empty list -- the repository query
// itself is already scoped, so no separate existence check is required and
// none is performed (avoids an enumeration oracle).
// GET /admin/fansubs/:id/app-members/:appUserId/capability-overrides/history
func (h *AdminEffectiveRightsHandler) ListOverrideHistory(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubGroupID, targetAppUserID, ok := h.parseGroupAndTarget(c)
	if !ok {
		return
	}

	if !h.authorizeManagement(c, identity, actor, fansubGroupID, targetAppUserID, "effective_rights.history.denied", "user_group_capability_override_history") {
		return
	}

	limit, offset := parseHistoryPageParams(c)

	entries, err := h.targetRepo.ListHistoryForSubject(c.Request.Context(), targetAppUserID, fansubGroupID, limit, offset)
	if err != nil {
		log.Printf("effective rights history: repo error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": capabilityOverrideAuditItemsFromHistory(entries)})
}

func (h *AdminEffectiveRightsHandler) writeMutationError(
	c *gin.Context, identity middleware.AuthIdentity, fansubGroupID int64, targetAppUserID int64,
	action permissions.Action, err error,
) {
	switch {
	case errors.Is(err, services.ErrEffectiveRightsCapabilityDenied):
		auditPermissionDenied(
			c, h.auditLogRepo, identity, "effective_rights.override.denied", &fansubGroupID,
			"user_group_capability_override", &targetAppUserID, action,
			permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole},
		)
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung für diese aktion"}})
	case errors.Is(err, services.ErrEffectiveRightsTargetNotActiveMember):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "zielmitglied hat keine aktive mitgliedschaft in dieser gruppe"},
		})
	case errors.Is(err, services.ErrEffectiveRightsActionUnknown):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "unbekannter action_code"}})
	case errors.Is(err, services.ErrEffectiveRightsActionNotOverridable):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "diese capability kann nicht individuell überschrieben werden"},
		})
	case errors.Is(err, services.ErrEffectiveRightsReasonRequired):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "ein grund ist für diese änderung erforderlich"},
		})
	case errors.Is(err, services.ErrEffectiveRightsMutationInvalid):
		badRequest(c, "ungültige mutation")
	default:
		log.Printf("effective rights mutate: service error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
	}
}

// --- Projection helpers ---

func effectiveRightStatesFromResolution(resolution *permissions.GroupRightsResolution) []EffectiveRightState {
	states := make([]EffectiveRightState, 0, len(resolution.Rights))
	for _, state := range resolution.Rights {
		states = append(states, effectiveRightStateFromCapabilityState(state))
	}
	sort.Slice(states, func(i, j int) bool { return states[i].ActionCode < states[j].ActionCode })
	return states
}

// effectiveRightStateFromCapabilityState projects the resolver's in-memory
// permissions.CapabilityRightState into the wire-level EffectiveRightState
// DTO -- a pure field mapping, never a second decision. provenance/decisive
// mirror the Phase-136 single-capability semantics (this state IS the
// decisive record for its own action_code); decisive_source additionally
// names D04's precedence-winning source explicitly.
func effectiveRightStateFromCapabilityState(state permissions.CapabilityRightState) EffectiveRightState {
	grantingRoles := state.GrantingRoles
	if grantingRoles == nil {
		grantingRoles = []string{}
	}
	specializedGrants := state.SpecializedGrants
	if specializedGrants == nil {
		specializedGrants = []string{}
	}
	return EffectiveRightState{
		ActionCode:        string(state.ActionCode),
		Allowed:           state.Allowed,
		Provenance:        EffectiveRightProvenance(state.DecisiveSource),
		Decisive:          true,
		NonDeniable:       state.NonDeniable,
		GrantingRoles:     grantingRoles,
		UserAllow:         state.UserAllow,
		UserDeny:          state.UserDeny,
		SpecializedGrants: specializedGrants,
		DecisiveSource:    EffectiveRightProvenance(state.DecisiveSource),
		ReasonCode:        state.ReasonCode,
	}
}

func overrideMutationKindFromRequest(effect *CapabilityOverrideEffect) (services.OverrideMutationKind, bool) {
	if effect == nil {
		return services.OverrideMutationRemove, true
	}
	switch *effect {
	case CapabilityOverrideEffectAllow:
		return services.OverrideMutationSetAllow, true
	case CapabilityOverrideEffectDeny:
		return services.OverrideMutationSetDeny, true
	default:
		return "", false
	}
}

func mutationStatus(changed bool) CapabilityMutationStatus {
	if changed {
		return CapabilityMutationStatusChanged
	}
	return CapabilityMutationStatusNoOp
}

// capabilityOverrideStateFromMutationSide builds a full CapabilityOverrideState
// for one side (before/after) of a mutation result. Per-row historical
// provenance for a PRIOR override state is not separately tracked by the
// schema (only the current row's created_by/updated_at is persisted) -- this
// handler therefore attributes both the before- and after-side metadata
// (reason/actor/timestamp) to the single transition event that produced this
// result, mirroring the immutable history row the service appended in the
// same transaction. A nil effect (no override existed on that side) returns nil.
func capabilityOverrideStateFromMutationSide(
	fansubGroupID int64, targetAppUserID int64, actionCode string,
	effect *string, reason *CapabilityOverrideReason, actorAppUserID int64, occurredAt string,
) *CapabilityOverrideState {
	if effect == nil {
		return nil
	}
	resolvedReason := CapabilityOverrideReason{}
	if reason != nil {
		resolvedReason = *reason
	}
	return &CapabilityOverrideState{
		GroupID:         fansubGroupID,
		TargetUserID:    targetAppUserID,
		ActionCode:      actionCode,
		Effect:          CapabilityOverrideEffect(*effect),
		Reason:          resolvedReason,
		CreatedByUserID: actorAppUserID,
		CreatedAt:       occurredAt,
	}
}

func parseHistoryPageParams(c *gin.Context) (int, int) {
	limit, _ := strconv.Atoi(c.Query("limit"))
	offset, _ := strconv.Atoi(c.Query("offset"))
	return limit, offset
}

func capabilityOverrideAuditItemsFromHistory(entries []repository.UserGroupCapabilityOverrideHistoryEntry) []CapabilityOverrideAuditItem {
	items := make([]CapabilityOverrideAuditItem, 0, len(entries))
	for _, entry := range entries {
		items = append(items, capabilityOverrideAuditItemFromHistoryEntry(entry))
	}
	return items
}

func capabilityOverrideAuditItemFromHistoryEntry(entry repository.UserGroupCapabilityOverrideHistoryEntry) CapabilityOverrideAuditItem {
	reason := capabilityOverrideReasonFromHistory(entry.ReasonCategory, entry.ReasonText)
	occurredAt := entry.OccurredAt.UTC().Format(time.RFC3339)
	return CapabilityOverrideAuditItem{
		ID:           entry.ID,
		GroupID:      entry.FansubGroupID,
		TargetUserID: entry.AppUserID,
		ActionCode:   entry.ActionCode,
		ActorUserID:  entry.ActorAppUserID,
		OccurredAt:   occurredAt,
		Before: capabilityOverrideStateFromMutationSide(
			entry.FansubGroupID, entry.AppUserID, entry.ActionCode, entry.BeforeEffect, reason, entry.ActorAppUserID, occurredAt,
		),
		After: capabilityOverrideStateFromMutationSide(
			entry.FansubGroupID, entry.AppUserID, entry.ActionCode, entry.AfterEffect, reason, entry.ActorAppUserID, occurredAt,
		),
		Reason: reason,
	}
}

func capabilityOverrideReasonFromHistory(category *string, text *string) *CapabilityOverrideReason {
	if category == nil {
		return nil
	}
	return &CapabilityOverrideReason{Category: CapabilityOverrideReasonCategory(*category), Text: text}
}
