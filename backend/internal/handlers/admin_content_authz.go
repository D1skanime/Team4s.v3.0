package handlers

import (
	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// requireAdmin prüft, ob der anfragende Benutzer die Admin-Rolle besitzt, und bricht die Anfrage mit einem Fehler ab, falls nicht.
func (h *AdminContentHandler) requireAdmin(c *gin.Context) (middleware.AuthIdentity, bool) {
	return requirePlatformAdminIdentity(c, h.authzRepo, h.adminRoleName)
}
