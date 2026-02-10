package middleware

import (
	"net/http"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

// AdminMiddleware provides admin access control
type AdminMiddleware struct {
	userRepo *repository.UserRepository
}

// NewAdminMiddleware creates a new admin middleware
func NewAdminMiddleware(userRepo *repository.UserRepository) *AdminMiddleware {
	return &AdminMiddleware{
		userRepo: userRepo,
	}
}

// RequireAdmin returns a middleware that requires admin role
// IMPORTANT: This middleware must be used AFTER RequireAuth() to have userID in context
func (m *AdminMiddleware) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := GetUserID(c)
		if userID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authentication required",
			})
			return
		}

		// Check if user has admin role
		isAdmin, err := m.userRepo.HasRole(c.Request.Context(), userID, "admin")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "failed to check permissions",
			})
			return
		}

		if !isAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "admin access required",
			})
			return
		}

		c.Next()
	}
}

// RequireRole returns a middleware that requires a specific role
// IMPORTANT: This middleware must be used AFTER RequireAuth() to have userID in context
func (m *AdminMiddleware) RequireRole(roleName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := GetUserID(c)
		if userID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authentication required",
			})
			return
		}

		// Check if user has the required role or is admin (admin has all permissions)
		hasRole, err := m.userRepo.HasRole(c.Request.Context(), userID, roleName)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "failed to check permissions",
			})
			return
		}

		if !hasRole {
			// Check if user is admin (admins have all permissions)
			isAdmin, err := m.userRepo.HasRole(c.Request.Context(), userID, "admin")
			if err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": "failed to check permissions",
				})
				return
			}

			if !isAdmin {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error": "insufficient permissions",
				})
				return
			}
		}

		c.Next()
	}
}
