package handlers

import (
	"net/http"
	"time"

	"team4s.v3/backend/internal/auth"

	"github.com/gin-gonic/gin"
)

func (h *AuthHandler) Issue(c *gin.Context) {
	now := time.Now().UTC()
	userID, displayName, statusCode, message := h.resolveTrustedIssueIdentity(c, now)
	if statusCode != 0 {
		c.JSON(statusCode, gin.H{"error": gin.H{"message": message}})
		return
	}

	session, refreshToken, refreshExpiresAt, err := h.repo.CreateSession(
		c.Request.Context(),
		userID,
		displayName,
		now,
		h.refreshTokenTTL,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	accessToken, accessExpiresAt, err := auth.CreateSignedToken(auth.Claims{
		UserID:      session.UserID,
		DisplayName: session.DisplayName,
		SessionID:   session.SessionID,
	}, h.tokenSecret, now, h.accessTokenTTL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": buildAuthTokenResponse(now, session, accessToken, accessExpiresAt, refreshToken, refreshExpiresAt),
	})
}
