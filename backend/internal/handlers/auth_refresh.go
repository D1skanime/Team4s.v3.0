package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	refreshToken := strings.TrimSpace(req.RefreshToken)
	if refreshToken == "" {
		badRequest(c, "refresh_token ist erforderlich")
		return
	}

	now := time.Now().UTC()
	session, rotatedRefreshToken, refreshExpiresAt, err := h.repo.RotateSession(
		c.Request.Context(),
		refreshToken,
		now,
		h.refreshTokenTTL,
	)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "ungueltiges refresh-token"}})
		return
	}
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

	c.JSON(http.StatusOK, gin.H{
		"data": buildAuthTokenResponse(now, session, accessToken, accessExpiresAt, rotatedRefreshToken, refreshExpiresAt),
	})
}
