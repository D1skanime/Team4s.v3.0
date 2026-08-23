package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// Phase 138 Plan 04 -- Role-Assignment Impact Preview HTTP boundary (D-22, CAP-09).
//
// This handler sits ahead of the existing, already-live role-assignment mutation
// (AppAuthHandler.SetFansubGroupMemberRole, PUT .../app-members/:appUserId/roles) and gives
// the admin a read-only, no-side-effect preview of the full effective-rights diff a
// hypothetical role assign/revoke would cause across every action for one user -- the "one
// user, many actions" counterpart to CAP-09's role->capability preview ("one action, many
// users"). Authorization and role validation deliberately mirror
// setFansubGroupMemberRole's exact gate so an admin who cannot perform the mutation cannot
// preview it either (T-138-07).

// roleAssignmentImpactPermissionService is the minimal central-resolver surface this
// handler needs. Both methods are already implemented by *permissions.Service
// (137-04/137-05, 138-04); declared as a narrow interface (distinct from
// effectiveRightsPermissionService, whose method set differs) purely so handler tests can
// substitute a fake without a real Postgres-backed resolver.
type roleAssignmentImpactPermissionService interface {
	CanForFansubGroup(ctx context.Context, actor permissions.Actor, action permissions.Action, fansubGroupID int64) (permissions.Result, error)
	PreviewGroupRightsWithRoleChange(ctx context.Context, actor permissions.Actor, fansubGroupID int64, roleCode string, add bool) (before *permissions.GroupRightsResolution, after *permissions.GroupRightsResolution, err error)
}

// AdminRoleAssignmentImpactHandler exposes the read-only role-assignment impact preview for
// one (target app user, fansub group, hypothetical role change) triple.
type AdminRoleAssignmentImpactHandler struct {
	permissionSvc roleAssignmentImpactPermissionService
	targetRepo    effectiveRightsTargetRepo
	authzRepo     capabilityAuthzRepo
}

// NewAdminRoleAssignmentImpactHandler erstellt einen neuen AdminRoleAssignmentImpactHandler.
func NewAdminRoleAssignmentImpactHandler(
	permissionSvc roleAssignmentImpactPermissionService,
	targetRepo effectiveRightsTargetRepo,
	authzRepo capabilityAuthzRepo,
) *AdminRoleAssignmentImpactHandler {
	return &AdminRoleAssignmentImpactHandler{
		permissionSvc: permissionSvc,
		targetRepo:    targetRepo,
		authzRepo:     authzRepo,
	}
}

// PreviewRoleAssignment returns a before/after effective-rights diff for a hypothetical
// role assign/revoke on one user in one fansub group, computed by
// PreviewGroupRightsWithRoleChange -- never persisting anything.
// GET /admin/fansubs/:id/app-members/:appUserId/role-assignment-impact?role_code={code}&change={assign|revoke}
func (h *AdminRoleAssignmentImpactHandler) PreviewRoleAssignment(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubGroupID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}
	targetAppUserID, err := strconv.ParseInt(c.Param("appUserId"), 10, 64)
	if err != nil || targetAppUserID <= 0 {
		badRequest(c, "ungültige app_user_id")
		return
	}

	// Authorization mirrors setFansubGroupMemberRole's exact action (app_auth.go) -- this is
	// a preview of THAT mutation, so its gate must not diverge from it (T-138-07).
	result, err := h.permissionSvc.CanForFansubGroup(
		c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubGroupID,
	)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	roleCode := strings.TrimSpace(c.Query("role_code"))
	change := strings.TrimSpace(c.Query("change"))
	if change != "assign" && change != "revoke" {
		badRequest(c, "ungültiger change-Wert")
		return
	}
	// Role validation mirrors setFansubGroupMemberRole's exact check (app_auth.go).
	if !permissions.IsKnownFansubGroupRole(roleCode) {
		badRequest(c, "unbekannte gruppenrolle")
		return
	}

	// Target-actor resolution mirrors AdminEffectiveRightsHandler's neutral-404 convention
	// (T-138-08): a foreign/non-existent (group, user) pair never discloses cross-group
	// existence.
	targetActor, err := loadEffectiveRightsTargetActorState(c.Request.Context(), h.targetRepo, h.authzRepo, targetAppUserID, fansubGroupID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitgliedschaftseintrag nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("role assignment impact: target membership lookup error (target=%d, group=%d): %v", targetAppUserID, fansubGroupID, err)
		internalError(c, "interner serverfehler")
		return
	}

	before, after, err := h.permissionSvc.PreviewGroupRightsWithRoleChange(
		c.Request.Context(), *targetActor, fansubGroupID, roleCode, change == "assign",
	)
	if err != nil {
		log.Printf("role assignment impact: preview error (group=%d, target=%d, role=%s): %v", fansubGroupID, targetAppUserID, roleCode, err)
		internalError(c, "interner serverfehler")
		return
	}

	response := RoleAssignmentImpactPreview{
		TargetUserID: targetAppUserID,
		RoleCode:     roleCode,
		Change:       change,
		Before:       effectiveRightStatesFromResolution(before),
		After:        effectiveRightStatesFromResolution(after),
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}
