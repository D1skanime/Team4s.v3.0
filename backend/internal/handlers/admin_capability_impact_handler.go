package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

// Phase 138 Plan 07 -- Role-to-Capability Change Impact Preview HTTP boundary (CAP-09).
//
// This handler sits directly ahead of the existing, already-live role-capability mutation
// (AdminCapabilityHandler.GrantCapability/RevokeCapability, PUT/DELETE
// /admin/role-capabilities/:roleCode/:actionCode) and gives the admin a read-only, no-side-
// effect batch preview of the full effective-rights before/after diff a hypothetical
// grant/revoke of actionCode on roleCode would cause across EVERY current real holder of that
// role (138-01's ListRoleHolders), across every group they hold it in -- the "one action,
// many users" counterpart to Plan 138-04's role-assignment impact preview ("one user, many
// actions"). Authorization mirrors GrantCapability/RevokeCapability's exact platform-admin-
// only gate so an admin who cannot perform the mutation cannot preview it either (T-138-14).

// capabilityImpactPermissionSvc is the minimal central-resolver surface this handler needs.
// Already implemented by *permissions.Service (Plan 138-07); declared as a narrow interface
// here purely so handler tests can substitute a fake without a real Postgres-backed resolver.
type capabilityImpactPermissionSvc interface {
	PreviewGroupRightsCapabilityChange(
		ctx context.Context, roleCode string, actionCode permissions.Action, add bool, holders []permissions.RoleHolderTarget,
	) ([]permissions.CapabilityImpactResult, error)
}

// AdminCapabilityImpactHandler exposes the read-only, platform-admin-gated batch impact
// preview for one hypothetical role-to-capability change.
type AdminCapabilityImpactHandler struct {
	authzRepo      capabilityAuthzRepo
	roleHolderRepo roleHolderRepo
	permissionSvc  capabilityImpactPermissionSvc
}

// NewAdminCapabilityImpactHandler creates a new AdminCapabilityImpactHandler.
func NewAdminCapabilityImpactHandler(
	authzRepo capabilityAuthzRepo, roleHolderRepo roleHolderRepo, permissionSvc capabilityImpactPermissionSvc,
) *AdminCapabilityImpactHandler {
	return &AdminCapabilityImpactHandler{
		authzRepo:      authzRepo,
		roleHolderRepo: roleHolderRepo,
		permissionSvc:  permissionSvc,
	}
}

// PreviewCapabilityChange returns a before/after effective-rights diff for every real current
// holder of roleCode, for a hypothetical grant (add=true) or revoke (add=false) of actionCode
// on that role -- never persisting anything, never a second decision engine (D-20).
// GET /api/v1/admin/role-capabilities/:roleCode/:actionCode/impact-preview?add=true|false
// Gesichert: platform-admin identity check (erste Aktion, matches GrantCapability/RevokeCapability).
func (h *AdminCapabilityImpactHandler) PreviewCapabilityChange(c *gin.Context) {
	_, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	roleCode := c.Param("roleCode")
	actionCode := c.Param("actionCode")
	if roleCode == "" || actionCode == "" {
		badRequest(c, "roleCode und actionCode sind erforderlich.")
		return
	}

	// add must be explicit -- never silently default to one direction (Grant vs Revoke).
	add, err := strconv.ParseBool(c.Query("add"))
	if err != nil {
		badRequest(c, "ungültiger oder fehlender add-Parameter (true|false erforderlich).")
		return
	}

	// G4: mirrors GrantCapability/RevokeCapability's exact guard -- only rein historische
	// Rollen ohne aktiven Kontext sind gesperrt.
	if !permissions.IsCapabilityBearingRole(roleCode) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "role_not_capability_bearing",
				"message": "Diese Rolle ist eine rein historische Rolle und kann keine Berechtigungen erhalten.",
			},
		})
		return
	}

	holders, err := h.roleHolderRepo.ListRoleHolders(c.Request.Context(), roleCode)
	if err != nil {
		log.Printf("capability impact preview: ListRoleHolders repo error (role=%q): %v", roleCode, err)
		internalError(c, "Rolleninhaber konnten nicht geladen werden.")
		return
	}

	targets := make([]permissions.RoleHolderTarget, 0, len(holders))
	for _, holder := range holders {
		targets = append(targets, permissions.RoleHolderTarget{
			AppUserID:     holder.AppUserID,
			FansubGroupID: holder.FansubGroupID,
		})
	}

	results, err := h.permissionSvc.PreviewGroupRightsCapabilityChange(
		c.Request.Context(), roleCode, permissions.Action(actionCode), add, targets,
	)
	if err != nil {
		log.Printf("capability impact preview: preview error (role=%q, action=%q): %v", roleCode, actionCode, err)
		internalError(c, "interner serverfehler")
		return
	}

	items := make([]CapabilityOverrideImpactItem, 0, len(results))
	for _, result := range results {
		items = append(items, CapabilityOverrideImpactItem{
			TargetUserID: result.TargetUserID,
			Before:       effectiveRightStateFromCapabilityState(result.Before),
			After:        effectiveRightStateFromCapabilityState(result.After),
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": CapabilityOverrideImpactPreview{
		AffectedUserCount: len(items),
		Items:             items,
	}})
}
