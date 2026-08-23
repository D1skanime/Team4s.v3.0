package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// Phase 138 Plan 14 -- Claim-Activation Impact Preview HTTP boundary (D-24).
//
// This handler sits ahead of the existing, already-live claim-decision mutation
// (MemberClaimsHandler.ActivateClaimedMember, POST .../historical-members/:memberId/activate)
// and gives the admin a read-only, no-side-effect preview of the real effective-rights diff
// that activation would create -- the ONE claim decision action that actually changes
// rights (VerifyClaim/RejectClaim never do, and never fabricate a diff, per D-24's binding
// honesty rule). Authorization deliberately reuses the EXACT same action
// (ActionFansubGroupHistoricalMembersLink) requireFansubPermission already gates VerifyClaim/
// ActivateClaimedMember with, so an admin who cannot perform the real decision cannot
// preview it either.

// claimActivationImpactPermissionService is the minimal central-resolver surface this
// handler needs. Both methods are already implemented by *permissions.Service
// (137-04/137-05, 138-14); declared as a narrow interface so handler tests can substitute a
// fake without a real Postgres-backed resolver.
type claimActivationImpactPermissionService interface {
	CanForFansubGroup(ctx context.Context, actor permissions.Actor, action permissions.Action, fansubGroupID int64) (permissions.Result, error)
	PreviewClaimActivationImpact(ctx context.Context, appUserID int64, fansubGroupID int64, roleCodes []string) (before *permissions.GroupRightsResolution, after *permissions.GroupRightsResolution, err error)
}

// claimActivationRolesRepo is the minimal read surface this handler needs from
// *repository.MemberClaimsRepository (138-14): a zero-write preview of the exact facts
// ActivateClaimedMember's steps 1-2 would compute.
type claimActivationRolesRepo interface {
	PreviewActivatableRoles(ctx context.Context, memberID int64, fansubGroupID int64) (appUserID int64, roleCodes []string, err error)
}

// AdminClaimActivationImpactHandler exposes the read-only claim-activation impact preview
// for one (historical member, fansub group) pair.
type AdminClaimActivationImpactHandler struct {
	permissionSvc claimActivationImpactPermissionService
	claimsRepo    claimActivationRolesRepo
}

// NewAdminClaimActivationImpactHandler erstellt einen neuen AdminClaimActivationImpactHandler.
func NewAdminClaimActivationImpactHandler(
	permissionSvc claimActivationImpactPermissionService,
	claimsRepo claimActivationRolesRepo,
) *AdminClaimActivationImpactHandler {
	return &AdminClaimActivationImpactHandler{
		permissionSvc: permissionSvc,
		claimsRepo:    claimsRepo,
	}
}

// PreviewClaimActivation returns a before/after effective-rights diff for the real
// ActivateClaimedMember action on one historical member in one fansub group, computed by
// PreviewClaimActivationImpact -- never persisting anything.
// GET /admin/fansubs/:id/historical-members/:memberId/claim-activation-impact
func (h *AdminClaimActivationImpactHandler) PreviewClaimActivation(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubGroupID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}
	memberID, err := parsePositiveID(c.Param("memberId"))
	if err != nil {
		badRequest(c, "ungültige member-id")
		return
	}

	// Authorization mirrors requireFansubPermission's exact action
	// (member_claims_handler.go) -- this is a preview of the real ActivateClaimedMember
	// decision, so its gate must not diverge from it.
	result, err := h.permissionSvc.CanForFansubGroup(
		c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersLink, fansubGroupID,
	)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	appUserID, roleCodes, err := h.claimsRepo.PreviewActivatableRoles(c.Request.Context(), memberID, fansubGroupID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Kein verifizierter Claim für dieses Mitglied gefunden."}})
		return
	}
	if err != nil {
		log.Printf("claim activation impact: preview activatable roles error (group=%d, member=%d): %v", fansubGroupID, memberID, err)
		internalError(c, "interner serverfehler")
		return
	}
	if len(roleCodes) == 0 {
		// Mirrors ActivateClaimedMember's own no_activatable_roles error shape (D-24
		// consistency): the real action would refuse exactly the same way, so the preview
		// must refuse it too rather than rendering a hollow zero-role diff.
		mutationErr := &repository.ClaimMutationError{
			Code:       "no_activatable_roles",
			Message:    "Keine übernehmbaren Rollen dokumentiert (nur Leitungsrollen) — bitte manuell zuweisen.",
			HTTPStatus: http.StatusUnprocessableEntity,
		}
		c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": mutationErr.Message, "reason_code": mutationErr.Code}})
		return
	}

	before, after, err := h.permissionSvc.PreviewClaimActivationImpact(c.Request.Context(), appUserID, fansubGroupID, roleCodes)
	if err != nil {
		log.Printf("claim activation impact: preview error (group=%d, member=%d, app_user=%d): %v", fansubGroupID, memberID, appUserID, err)
		internalError(c, "interner serverfehler")
		return
	}

	response := ClaimActivationImpactPreview{
		TargetAppUserID: appUserID,
		RoleCodes:       roleCodes,
		Before:          effectiveRightStatesFromResolution(before),
		After:           effectiveRightStatesFromResolution(after),
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}
