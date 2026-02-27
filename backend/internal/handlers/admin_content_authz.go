package handlers

import (
	"log"
	"net/http"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) requireAdmin(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		log.Printf("admin_content require_admin: missing identity (path=%s)", c.FullPath())
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, false
	}

	if h.authzRepo == nil {
		log.Printf("admin_content require_admin: authz repo missing (user_id=%d, path=%s)", identity.UserID, c.FullPath())
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return middleware.AuthIdentity{}, false
	}

	roleName := h.adminRoleName
	if roleName == "" {
		roleName = "admin"
	}

	isAdmin, err := h.authzRepo.UserHasRole(c.Request.Context(), identity.UserID, roleName)
	if err != nil {
		log.Printf("admin_content require_admin: authz check failed (user_id=%d, role=%q): %v", identity.UserID, roleName, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return middleware.AuthIdentity{}, false
	}

	if !isAdmin {
		log.Printf("admin_content require_admin: forbidden (user_id=%d, role=%q, path=%s)", identity.UserID, roleName, c.FullPath())
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung"}})
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}
