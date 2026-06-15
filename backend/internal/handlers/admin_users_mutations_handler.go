package handlers

import (
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- PUT /admin/users/:userId/global-roles/:role ---

// AssignGlobalRole weist einem User eine globale Rolle zu und schreibt einen Audit-Eintrag.
// Platform-Admin-Gate ist erste Aktion (T-80-03-01).
func (h *AdminUsersHandler) AssignGlobalRole(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	role := c.Param("role")
	if _, valid := validGlobalRoles[role]; !valid {
		badRequest(c, "Ungültige Rolle. Erlaubte Werte: platform_admin, content_admin, user.")
		return
	}

	if err := h.authzRepo.AssignAppUserGlobalRole(c.Request.Context(), userID, role); err != nil {
		log.Printf("admin users: AssignGlobalRole error: %v", err)
		internalError(c, "Rolle konnte nicht zugewiesen werden.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "app_user_global_role.assigned",
		TargetType:     "app_user",
		TargetID:       &userID,
		Action:         "assign_global_role",
		Outcome:        "allowed",
		Payload:        map[string]any{"role": role},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Rolle erfolgreich zugewiesen."})
}

// --- DELETE /admin/users/:userId/global-roles/:role ---

// RevokeGlobalRole entzieht einem User eine globale Rolle.
// Last-Admin-Guard: Revoke der letzten platform_admin-Rolle → HTTP 409 (T-80-03-03).
// Kein Audit-Write bei Ablehnung.
func (h *AdminUsersHandler) RevokeGlobalRole(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	role := c.Param("role")
	if _, valid := validGlobalRoles[role]; !valid {
		badRequest(c, "Ungültige Rolle. Erlaubte Werte: platform_admin, content_admin, user.")
		return
	}

	// Last-Admin-Guard nur für platform_admin-Rolle (T-80-03-03)
	if role == "platform_admin" {
		count, err := h.authzRepo.CountActivePlatformAdmins(c.Request.Context())
		if err != nil {
			log.Printf("admin users: RevokeGlobalRole CountActivePlatformAdmins error: %v", err)
			internalError(c, "Last-Admin-Prüfung fehlgeschlagen.")
			return
		}
		if count <= 1 {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{
				"message": "Die letzte Plattform-Admin-Rolle kann nicht entzogen werden.",
				"code":    "last_admin_guard",
			}})
			return
		}
	}

	if err := h.authzRepo.RevokeAppUserGlobalRole(c.Request.Context(), userID, role); err != nil {
		log.Printf("admin users: RevokeGlobalRole error: %v", err)
		internalError(c, "Rolle konnte nicht entzogen werden.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "app_user_global_role.revoked",
		TargetType:     "app_user",
		TargetID:       &userID,
		Action:         "revoke_global_role",
		Outcome:        "allowed",
		Payload:        map[string]any{"role": role},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Rolle erfolgreich entzogen."})
}

// --- PUT /admin/users/:userId/status ---

// UpdateUserStatus ändert den Account-Status eines Users (active/disabled).
// Last-Admin-Guard: Disable des letzten aktiven Platform-Admins → HTTP 409 (T-80-03-03).
// Kein Audit-Write bei Ablehnung.
func (h *AdminUsersHandler) UpdateUserStatus(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		badRequest(c, "Ungültiger Request-Body.")
		return
	}

	if _, valid := validAdminUserStatusValues[body.Status]; !valid {
		badRequest(c, "Ungültiger Statuswert. Erlaubt sind: active, disabled.")
		return
	}

	// Last-Admin-Guard: Disable des letzten aktiven Platform-Admins verhindern (T-80-03-03)
	if body.Status == "disabled" {
		isAdmin, err := h.authzRepo.AppUserHasGlobalRole(
			c.Request.Context(), userID, models.AppGlobalRolePlatformAdmin,
		)
		if err != nil {
			log.Printf("admin users: UpdateUserStatus AppUserHasGlobalRole error: %v", err)
			internalError(c, "Rollenprüfung fehlgeschlagen.")
			return
		}
		if isAdmin {
			count, err := h.authzRepo.CountActivePlatformAdmins(c.Request.Context())
			if err != nil {
				log.Printf("admin users: UpdateUserStatus CountActivePlatformAdmins error: %v", err)
				internalError(c, "Last-Admin-Prüfung fehlgeschlagen.")
				return
			}
			if count <= 1 {
				c.JSON(http.StatusConflict, gin.H{"error": gin.H{
					"message": "Der letzte aktive Plattform-Admin kann nicht deaktiviert werden.",
					"code":    "last_admin_guard",
				}})
				return
			}
		}
	}

	if err := h.repo.UpdateAppUserStatus(c.Request.Context(), userID, body.Status); err != nil {
		log.Printf("admin users: UpdateUserStatus error: %v", err)
		internalError(c, "Status konnte nicht geändert werden.")
		return
	}

	eventType := "app_user_status.reactivated"
	if body.Status == "disabled" {
		eventType = "app_user_status.disabled"
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      eventType,
		TargetType:     "app_user",
		TargetID:       &userID,
		Action:         "update_status",
		Outcome:        "allowed",
		Payload:        map[string]any{"status": body.Status},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Status erfolgreich geändert."})
}
