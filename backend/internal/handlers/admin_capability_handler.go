package handlers

import (
	"context"
	"log"
	"net/http"
	"slices"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// capabilityAuthzRepo ist das minimale Interface, das der Capability-Handler für die
// Platform-Admin-Prüfung benötigt.
type capabilityAuthzRepo interface {
	AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error)
}

// capabilityMutationRepo kapselt die DB-Operationen für Capability-Mutationen
// und implementiert zugleich permissions.CacheLoader für den Cache-Reload nach Mutationen.
type capabilityMutationRepo interface {
	ListCapabilityMatrix(ctx context.Context) (*repository.CapabilityMatrix, error)
	GrantRoleCapability(ctx context.Context, roleCode, actionCode string) error
	RevokeRoleCapability(ctx context.Context, roleCode, actionCode string) error
	CountRolesWithAction(ctx context.Context, actionCode string) (int64, error)
	LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error)
	// CountGlobalRoleAssignments aggregiert app_user_global_roles für die synthetischen
	// globalen App-Rollen-Zeilen in ListCapabilityMatrix (D-05, 111-RESEARCH.md Pitfall 1).
	CountGlobalRoleAssignments(ctx context.Context) (map[string]int, error)
	// CountGroupRoleHolders aggregiert fansub_group_member_roles für permissions.IsKnownFansubGroupRole-
	// Zeilen in ListCapabilityMatrix (260824-ike Defekt 2).
	CountGroupRoleHolders(ctx context.Context) (map[string]int, error)
}

// globalAppRoleCodes ist die feste Reihenfolge der drei globalen App-Rollen, die als
// synthetische, nicht-editierbare Zeilen der Capability-Matrix vorangestellt werden.
// Kanonische Quelle für diese drei Codes: admin_users_repository.go AssignableRoles (Zeile 192).
var globalAppRoleCodes = []string{"platform_admin", "content_admin", "user"}

// globalAppRoleLabels sind die deutschen Anzeigenamen der globalen App-Rollen. MUSS synchron
// bleiben zu roleLabel() in frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx (Pitfall 2,
// 111-RESEARCH.md).
var globalAppRoleLabels = map[string]string{
	"platform_admin": "Plattform-Admin",
	"content_admin":  "Content-Admin",
	"user":           "Benutzer",
}

// capabilityPermissionSvc kapselt den Permission-Service für Cache-Reloads nach Mutationen.
type capabilityPermissionSvc interface {
	ReloadCache(ctx context.Context, loader permissions.CacheLoader) error
}

// capabilityAuditRepo kapselt das Audit-Log-Repository für Capability-Mutations-Audit.
type capabilityAuditRepo interface {
	Write(ctx context.Context, entry repository.AuditLogEntry) error
}

// AdminCapabilityHandler verwaltet die Capability-Matrix-Endpunkte.
type AdminCapabilityHandler struct {
	authzRepo     capabilityAuthzRepo
	mutationRepo  capabilityMutationRepo
	permissionSvc capabilityPermissionSvc
	auditLogRepo  capabilityAuditRepo
}

// NewAdminCapabilityHandler erstellt einen neuen AdminCapabilityHandler.
func NewAdminCapabilityHandler(
	authzRepo capabilityAuthzRepo,
	mutationRepo capabilityMutationRepo,
	permissionSvc capabilityPermissionSvc,
	auditLogRepo capabilityAuditRepo,
) *AdminCapabilityHandler {
	return &AdminCapabilityHandler{
		authzRepo:     authzRepo,
		mutationRepo:  mutationRepo,
		permissionSvc: permissionSvc,
		auditLogRepo:  auditLogRepo,
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

	matrix, err := h.mutationRepo.ListCapabilityMatrix(c.Request.Context())
	if err != nil {
		log.Printf("capability matrix: repo error: %v", err)
		internalError(c, "Capability-Matrix konnte nicht geladen werden.")
		return
	}

	// Rollen-Metadaten stammen vollständig aus role_definitions. Der Handler ergänzt
	// ausschließlich die getrennten, IdP-eigenen globalen Rollen unten.

	// D-05: Synthetische globale App-Rollen-Zeilen voranstellen (111-RESEARCH.md Pitfall 1).
	// platform_admin/content_admin/user existieren strukturell nie in role_definitions — ohne
	// diese Erweiterung könnte RoleMasterList (Plan 111-05) für sie keinen Impact-Count zeigen.
	// Fail-open: Aggregat-Fehler wird nur geloggt, Zählwerte fallen auf 0 zurück (analog zum
	// bestehenden ReloadCache-Fail-Safe-Muster).
	counts, err := h.mutationRepo.CountGlobalRoleAssignments(c.Request.Context())
	if err != nil {
		log.Printf("capability matrix: CountGlobalRoleAssignments fehlgeschlagen: %v — Zählwerte fallen auf 0 zurück", err)
		counts = map[string]int{}
	}

	syntheticRoles := make([]repository.CapabilityMatrixRoleEntry, 0, len(globalAppRoleCodes))
	for _, roleCode := range globalAppRoleCodes {
		count := counts[roleCode]
		syntheticRoles = append(syntheticRoles, repository.CapabilityMatrixRoleEntry{
			RoleCode:              roleCode,
			LabelDE:               globalAppRoleLabels[roleCode],
			Actions:               []repository.CapabilityMatrixActionState{},
			Assignable:            false,
			CapabilityEditable:    false,
			RoleKind:              "global_app_role",
			GlobalAssignmentCount: &count,
		})
	}
	matrix.Roles = append(syntheticRoles, matrix.Roles...)

	// 260824-ike Defekt 2: Gruppenrollen-Inhaberzahl fail-open aus CountGroupRoleHolders
	// ergänzen, ausschließlich für permissions.IsKnownFansubGroupRole-Rollen — NICHT für die
	// gerade vorangestellten synthetischen globalen Zeilen (die haben bereits
	// GlobalAssignmentCount) und NICHT für role_definitions-Zeilen außerhalb dieses Katalogs
	// (fansub_group_member_roles enthält für diese ohnehin nie eine Zeile).
	groupHolderCounts, err := h.mutationRepo.CountGroupRoleHolders(c.Request.Context())
	if err != nil {
		log.Printf("capability matrix: CountGroupRoleHolders fehlgeschlagen: %v — Zählwerte fallen auf 0 zurück", err)
		groupHolderCounts = map[string]int{}
	}
	for i := range matrix.Roles {
		if !permissions.IsKnownFansubGroupRole(matrix.Roles[i].RoleCode) {
			continue
		}
		count := groupHolderCounts[matrix.Roles[i].RoleCode]
		matrix.Roles[i].GroupHolderCount = &count
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

	// Nur echte Fansub-Gruppenrollen (fansub_group) können Standardrechte tragen.
	// Beitrags- und historische Rollen sind Credits/Dokumentation; Zusatzrechte sind individuell.
	if !permissions.IsCapabilityBearingRole(roleCode) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "role_not_capability_bearing",
				"message": "Diese Beitrags- oder historische Rolle kann keine Standardrechte erhalten.",
			},
		})
		return
	}

	// T-146-06 (146-03, D-16): Action-spezifischer Registry-Selbstschutz-Guard für die
	// reservierte Mitgliedschafts-Grundausstattung — verhindert, dass der Pseudo-Rolle
	// group_member irgendeine Nicht-Grundausstattungs-Action zugewiesen wird, damit ihr
	// Registrierungszustand strukturell auf die 3 vorgesehenen Actions begrenzt bleibt, selbst
	// wenn das Frontend-Badge/-Filter je umgangen wird. Die 3 Grundausstattungs-Actions selbst
	// bleiben weiterhin zuweisbar (z. B. nach einem legitimen Entzug-dann-Korrektur-Zyklus) —
	// dieser Guard ist bewusst NICHT in LoadCapabilityRoles/IsCapabilityBearingRole verortet
	// (siehe D-17-Falle), sondern eigenständig hier in GrantCapability.
	if roleCode == permissions.RoleMembershipBaseline &&
		!slices.Contains(permissions.MembershipBaselineActionCodes, permissions.Action(actionCode)) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{
			"code":    "membership_baseline_guard",
			"message": "Die reservierte Mitgliedschafts-Grundausstattung ist auf genau die 3 Grundrechte beschränkt und kann nicht um weitere Rechte erweitert werden — die Änderung wurde nicht gespeichert.",
		}})
		return
	}

	if err := h.mutationRepo.GrantRoleCapability(c.Request.Context(), roleCode, actionCode); err != nil {
		log.Printf("capability grant: repo error (role=%q, action=%q): %v", roleCode, actionCode, err)
		internalError(c, "Capability konnte nicht zugewiesen werden.")
		return
	}

	// D-06: Cache nach erfolgreicher Mutation neu laden.
	// Fail-safe: Reload-Fehler wird nur geloggt — Mutation war erfolgreich, alter Cache bleibt gültig.
	// CAP-10/D-21 (Plan 138-02): der Reload-Erfolg wird zusätzlich ehrlich in der Response
	// zurückgemeldet, statt implizit unconditional Erfolg zu behaupten.
	cacheReloadSucceeded := true
	if err := h.permissionSvc.ReloadCache(c.Request.Context(), h.mutationRepo); err != nil {
		cacheReloadSucceeded = false
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

	// CacheReloadSucceeded serialisiert als "cache_reload_succeeded" (siehe
	// RoleCapabilityMutationResult in capability_policy_contract.go).
	c.JSON(http.StatusOK, RoleCapabilityMutationResult{
		Message:              "Capability erfolgreich zugewiesen.",
		CacheReloadSucceeded: cacheReloadSucceeded,
	})
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

	// Derselbe Guard gilt für beide Mutationspfade: Nur Fansub-Gruppenrollen tragen
	// konfigurierbare Standardrechte.
	if !permissions.IsCapabilityBearingRole(roleCode) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "role_not_capability_bearing",
				"message": "Diese Beitrags- oder historische Rolle kann keine Standardrechte erhalten.",
			},
		})
		return
	}

	// T-146-05 (146-03): Unconditionaler Registry-Selbstschutz-Guard für die reservierte
	// Mitgliedschafts-Grundausstattung — VOR dem D-07 Lockout-Guard geprüft, unabhängig von
	// CountRolesWithAction. Die 3 Grundausstattungs-Rechte dürfen der Pseudo-Rolle group_member
	// niemals entzogen werden, auch wenn zahlreiche andere Rollen dieselbe Action noch tragen
	// (145-REVIEW.md CR-01) — jedes aktive Mitglied benötigt sie automatisch. Dieser Guard ist
	// eigenständig und unverändert zusätzlich zum bestehenden D-07 Lockout-Guard, der für alle
	// anderen Rollen exakt wie zuvor weiterläuft (D-02, D-03).
	if roleCode == permissions.RoleMembershipBaseline &&
		slices.Contains(permissions.MembershipBaselineActionCodes, permissions.Action(actionCode)) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "membership_baseline_guard",
				"message": "Dieses Recht gehört zur Mitgliedschafts-Grundausstattung und kann nicht entzogen werden. Jedes aktive Mitglied benötigt es automatisch — die Änderung wurde nicht gespeichert.",
			},
		})
		return
	}

	// D-07: Lockout-Guard — VOR der DB-Mutation prüfen.
	count, err := h.mutationRepo.CountRolesWithAction(c.Request.Context(), actionCode)
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

	if err := h.mutationRepo.RevokeRoleCapability(c.Request.Context(), roleCode, actionCode); err != nil {
		log.Printf("capability revoke: repo error (role=%q, action=%q): %v", roleCode, actionCode, err)
		internalError(c, "Capability konnte nicht entzogen werden.")
		return
	}

	// D-06: Cache nach erfolgreicher Mutation neu laden.
	// Fail-safe: Reload-Fehler wird nur geloggt — Mutation war erfolgreich, alter Cache bleibt gültig.
	// CAP-10/D-21 (Plan 138-02): der Reload-Erfolg wird zusätzlich ehrlich in der Response
	// zurückgemeldet, statt implizit unconditional Erfolg zu behaupten.
	cacheReloadSucceeded := true
	if err := h.permissionSvc.ReloadCache(c.Request.Context(), h.mutationRepo); err != nil {
		cacheReloadSucceeded = false
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

	// CacheReloadSucceeded serialisiert als "cache_reload_succeeded" (siehe
	// RoleCapabilityMutationResult in capability_policy_contract.go).
	c.JSON(http.StatusOK, RoleCapabilityMutationResult{
		Message:              "Capability erfolgreich entzogen.",
		CacheReloadSucceeded: cacheReloadSucceeded,
	})
}
