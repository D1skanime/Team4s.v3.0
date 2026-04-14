package handlers

import (
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// Revoke verarbeitet POST /api/v1/auth/revoke und widerruft das Access-Token sowie die zugehörige Session.
func (h *AuthHandler) Revoke(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}

	var req revokeAuthRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	accessTokenTTL := time.Until(time.Unix(identity.ExpiresAt, 0))
	if accessTokenTTL < 0 {
		accessTokenTTL = 0
	}

	if err := h.repo.RevokeAccessToken(c.Request.Context(), identity.TokenHash, accessTokenTTL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	if identity.SessionID != "" {
		if err := h.repo.RevokeSession(c.Request.Context(), identity.SessionID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
			return
		}
	}

	if strings.TrimSpace(req.RefreshToken) != "" {
		if err := h.repo.RevokeRefreshToken(c.Request.Context(), req.RefreshToken); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
			return
		}
	}

	c.Status(http.StatusNoContent)
}
