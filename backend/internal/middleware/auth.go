package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/services"
	"github.com/gin-gonic/gin"
)

const (
	// UserIDKey is the key used to store the user ID in the context
	UserIDKey = "userID"
	// ClaimsKey is the key used to store the JWT claims in the context
	ClaimsKey = "claims"
)

// AuthMiddleware creates a middleware that validates JWT tokens
type AuthMiddleware struct {
	tokenService *services.TokenService
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(tokenService *services.TokenService) *AuthMiddleware {
	return &AuthMiddleware{
		tokenService: tokenService,
	}
}

// RequireAuth returns a middleware that requires a valid JWT token
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header required",
			})
			return
		}

		// Check for Bearer prefix
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header format",
			})
			return
		}

		token := parts[1]

		// Validate token
		claims, err := m.tokenService.ValidateAccessToken(token)
		if err != nil {
			status := http.StatusUnauthorized
			message := "invalid token"

			if errors.Is(err, services.ErrExpiredToken) {
				message = "token has expired"
			}

			c.AbortWithStatusJSON(status, gin.H{
				"error": message,
			})
			return
		}

		// Set user ID and claims in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(ClaimsKey, claims)

		c.Next()
	}
}

// OptionalAuth returns a middleware that validates JWT tokens if present
// but allows the request to continue even without authentication
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Check for Bearer prefix
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.Next()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := m.tokenService.ValidateAccessToken(token)
		if err != nil {
			// Token invalid, but continue without auth
			c.Next()
			return
		}

		// Set user ID and claims in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(ClaimsKey, claims)

		c.Next()
	}
}

// GetUserID extracts the user ID from the context
// Returns 0 if user is not authenticated
func GetUserID(c *gin.Context) int64 {
	userID, exists := c.Get(UserIDKey)
	if !exists {
		return 0
	}

	id, ok := userID.(int64)
	if !ok {
		return 0
	}

	return id
}

// GetClaims extracts the JWT claims from the context
// Returns nil if user is not authenticated
func GetClaims(c *gin.Context) *services.Claims {
	claimsVal, exists := c.Get(ClaimsKey)
	if !exists {
		return nil
	}

	claims, ok := claimsVal.(*services.Claims)
	if !ok {
		return nil
	}

	return claims
}

// IsAuthenticated checks if the request has a valid authentication
func IsAuthenticated(c *gin.Context) bool {
	return GetUserID(c) > 0
}
