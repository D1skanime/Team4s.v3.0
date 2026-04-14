package handlers

import (
	"net/http"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// requireAdmin prüft, ob der anfragende Benutzer die Admin-Rolle besitzt, und bricht die Anfrage mit einem Fehler ab, falls nicht.
func (h *AdminContentHandler) requireAdmin(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, false
	}

	if h.authzRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return middleware.AuthIdentity{}, false
	}

	roleName := h.adminRoleName
	if roleName == "" {
		roleName = "admin"
	}

	isAdmin, err := h.authzRepo.UserHasRole(c.Request.Context(), identity.UserID, roleName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return middleware.AuthIdentity{}, false
	}

	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung"}})
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}
