package handlers

import (
	"log"
	"net/http"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// capabilityAuthzRepo ist das minimale Interface, das der Capability-Handler für die
// Platform-Admin-Prüfung und die Capability-Mutationen benötigt.
type capabilityAuthzRepo interface {
	AppUserHasGlobalRole(ctx interface{ Done() <-chan struct{} }, appUserID int64, roleName string) (bool, error)
}

// capabilityMutationRepo kapselt die DB-Operationen für Capability-Mutationen.
type capabilityMutationRepo interface {
	ListCapabilityMatrix(ctx interface{ Done() <-chan struct{} }) (*repository.CapabilityMatrix, error)
	GrantRoleCapability(ctx interface{ Done() <-chan struct{} }, roleCode, actionCode string) error
	RevokeRoleCapability(ctx interface{ Done() <-chan struct{} }, roleCode, actionCode string) error
	CountRolesWithAction(ctx interface{ Done() <-chan struct{} }, actionCode string) (int64, error)
}

// AdminCapabilityHandler verwaltet die Capability-Matrix-Endpunkte.
type AdminCapabilityHandler struct {
	authzRepo    *repository.AuthzRepository
	permissionSvc *permissions.Service
	auditLogRepo *repository.AuditLogRepository
}

// NewAdminCapabilityHandler erstellt einen neuen AdminCapabilityHandler.
func NewAdminCapabilityHandler(
	authzRepo *repository.AuthzRepository,
	permissionSvc *permissions.Service,
	auditLogRepo *repository.AuditLogRepository,
) *AdminCapabilityHandler {
	return &AdminCapabilityHandler{
		authzRepo:    authzRepo,
		permissionSvc: permissionSvc,
		auditLogRepo: auditLogRepo,
	}
}

// ListCapabilityMatrix gibt die vollständige Capability-Matrix zurück.
// GET /api/v1/admin/role-capabilities
// Gesichert: requirePlatformAdminIdentity (erste Aktion, D-08).
func (h *AdminCapabilityHandler) ListCapabilityMatrix(c *gin.Context) {
	_, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	matrix, err := h.authzRepo.ListCapabilityMatrix(c.Request.Context())
	if err != nil {
		log.Printf("capability matrix: repo error: %v", err)
		internalError(c, "Capability-Matrix konnte nicht geladen werden.")
		return
	}

	// D-04: Assignable-Anreicherung — Repository darf permissions nicht importieren (Kommentar Z.52).
	// Handler setzt Assignable nach permissions.IsKnownFansubGroupRole als Wahrheitsquelle.
	for i := range matrix.Roles {
		matrix.Roles[i].Assignable = permissions.IsKnownFansubGroupRole(matrix.Roles[i].RoleCode)
	}

	c.JSON(http.StatusOK, matrix)
}

// GrantCapability weist einer Rolle eine Action zu.
// PUT /api/v1/admin/role-capabilities/:roleCode/:actionCode
// Gesichert: requirePlatformAdminIdentity (erste Aktion, D-08).
// Nach erfolgreicher DB-Mutation wird der Cache per ReloadCache (D-06) neu geladen.
// Jede erfolgreiche Mutation schreibt einen Audit-Eintrag (D-06 Audit, T-87-05).
func (h *AdminCapabilityHandler) GrantCapability(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	roleCode := c.Param("roleCode")
	actionCode := c.Param("actionCode")

	if roleCode == "" || actionCode == "" {
		badRequest(c, "roleCode und actionCode sind erforderlich.")
		return
	}

	// D-05: Assignable-Guard — historische Rollen dürfen keine Capabilities erhalten (T-94-01).
	if !permissions.IsKnownFansubGroupRole(roleCode) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "role_not_assignable",
				"message": "Diese Rolle ist eine historische bzw. nicht-zuweisbare Rolle und kann keine Berechtigungen erhalten.",
			},
		})
		return
	}

	if err := h.authzRepo.GrantRoleCapability(c.Request.Context(), roleCode, actionCode); err != nil {
		log.Printf("capability grant: repo error (role=%q, action=%q): %v", roleCode, actionCode, err)
		internalError(c, "Capability konnte nicht zugewiesen werden.")
		return
	}

	// D-06: Cache nach erfolgreicher Mutation neu laden.
	// Fail-safe: Reload-Fehler wird nur geloggt — Mutation war erfolgreich, alter Cache bleibt gültig.
	if err := h.permissionSvc.ReloadCache(c.Request.Context(), h.authzRepo); err != nil {
		log.Printf("capability grant: ReloadCache fehlgeschlagen (role=%q, action=%q): %v — alter Cache bleibt gültig", roleCode, actionCode, err)
	}

	// D-06 Audit: Jede Capability-Mutation schreibt einen Audit-Eintrag.
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "role_capability.granted",
		TargetType:     "role_capability",
		Action:         "grant_capability",
		Outcome:        "allowed",
		Payload:        map[string]any{"role_code": roleCode, "action_code": actionCode},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Capability erfolgreich zugewiesen."})
}

// RevokeCapability entzieht einer Rolle eine Action.
// DELETE /api/v1/admin/role-capabilities/:roleCode/:actionCode
// Gesichert: requirePlatformAdminIdentity (erste Aktion, D-08).
// Lockout-Guard (D-07): Wenn CountRolesWithAction <= 1 UND NOT IsStandaloneAction → HTTP 409.
// permissions.IsStandaloneAction ist der einzige Wahrheits-Ort — kein Hardcode-String hier.
func (h *AdminCapabilityHandler) RevokeCapability(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	roleCode := c.Param("roleCode")
	actionCode := c.Param("actionCode")

	if roleCode == "" || actionCode == "" {
		badRequest(c, "roleCode und actionCode sind erforderlich.")
		return
	}

	// D-05: Assignable-Guard — historische Rollen dürfen keine Capabilities erhalten (T-94-01).
	// VOR dem Lockout-Guard prüfen (Pitfall 4: Guard in BEIDEN Mutationspfaden).
	if !permissions.IsKnownFansubGroupRole(roleCode) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "role_not_assignable",
				"message": "Diese Rolle ist eine historische bzw. nicht-zuweisbare Rolle und kann keine Berechtigungen erhalten.",
			},
		})
		return
	}

	// D-07: Lockout-Guard — VOR der DB-Mutation prüfen.
	count, err := h.authzRepo.CountRolesWithAction(c.Request.Context(), actionCode)
	if err != nil {
		log.Printf("capability revoke: CountRolesWithAction error (action=%q): %v", actionCode, err)
		internalError(c, "Lockout-Prüfung fehlgeschlagen.")
		return
	}

	// Guard: Wenn nur noch 1 Rolle diese Action hat und sie kein Standalone ist → 409.
	if count <= 1 && !permissions.IsStandaloneAction(permissions.Action(actionCode)) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "lockout_guard",
				"message": "Diese Berechtigung kann nicht entzogen werden, da sonst keine Rolle mehr über sie verfügt.",
			},
		})
		return
	}

	if err := h.authzRepo.RevokeRoleCapability(c.Request.Context(), roleCode, actionCode); err != nil {
		log.Printf("capability revoke: repo error (role=%q, action=%q): %v", roleCode, actionCode, err)
		internalError(c, "Capability konnte nicht entzogen werden.")
		return
	}

	// D-06: Cache nach erfolgreicher Mutation neu laden.
	// Fail-safe: Reload-Fehler wird nur geloggt — Mutation war erfolgreich, alter Cache bleibt gültig.
	if err := h.permissionSvc.ReloadCache(c.Request.Context(), h.authzRepo); err != nil {
		log.Printf("capability revoke: ReloadCache fehlgeschlagen (role=%q, action=%q): %v — alter Cache bleibt gültig", roleCode, actionCode, err)
	}

	// D-06 Audit: Jede Capability-Mutation schreibt einen Audit-Eintrag.
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "role_capability.revoked",
		TargetType:     "role_capability",
		Action:         "revoke_capability",
		Outcome:        "allowed",
		Payload:        map[string]any{"role_code": roleCode, "action_code": actionCode},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Capability erfolgreich entzogen."})
}
