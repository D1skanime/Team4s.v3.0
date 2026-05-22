package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func requirePlatformAdminIdentity(c *gin.Context, roleChecker any, fallbackRoleName string) (middleware.AuthIdentity, bool) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, false
	}

	if identity.AppUserID > 0 {
		if identity.AppUserStatus == models.AppUserStatusDisabled {
			c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "konto ist deaktiviert"}})
			return middleware.AuthIdentity{}, false
		}
		if identity.AppUserStatus == models.AppUserStatusPending {
			c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "konto wartet noch auf freischaltung"}})
			return middleware.AuthIdentity{}, false
		}

		if checker, ok := roleChecker.(interface {
			AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error)
		}); ok {
			isAdmin, err := checker.AppUserHasGlobalRole(c.Request.Context(), identity.AppUserID, models.AppGlobalRolePlatformAdmin)
			if err != nil {
				log.Printf("platform-admin authz failed (app_user_id=%d): %v", identity.AppUserID, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
				return middleware.AuthIdentity{}, false
			}
			if !isAdmin {
				c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung"}})
				return middleware.AuthIdentity{}, false
			}
			return identity, true
		}
	}

	checker, ok := roleChecker.(interface {
		UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error)
	})
	if !ok || checker == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return middleware.AuthIdentity{}, false
	}

	roleName := strings.TrimSpace(fallbackRoleName)
	if roleName == "" {
		roleName = "admin"
	}
	isAdmin, err := checker.UserHasRole(c.Request.Context(), identity.UserID, roleName)
	if err != nil {
		log.Printf("legacy admin authz failed (user_id=%d role=%q): %v", identity.UserID, roleName, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return middleware.AuthIdentity{}, false
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung"}})
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}
