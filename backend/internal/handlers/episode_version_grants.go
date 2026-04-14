package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// CreateReleaseStreamGrant stellt ein zeitlich begrenztes Stream-Grant-Token für eine Release-Version aus.
func (h *FansubHandler) CreateReleaseStreamGrant(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige release id")
		return
	}

	if _, err := h.episodeVersionRepo.GetReleaseStreamSource(c.Request.Context(), versionID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("release stream grant: repo error (release_id=%d, user_id=%d): %v", versionID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	if h.releaseGrantTTL <= 0 || strings.TrimSpace(h.releaseGrantSecret) == "" {
		log.Printf("release stream grant: grant config unavailable (release_id=%d, user_id=%d)", versionID, identity.UserID)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "stream grant voruebergehend nicht verfuegbar"}})
		return
	}

	grantToken, expiresAt, err := auth.CreateReleaseStreamGrant(versionID, identity.UserID, h.releaseGrantSecret, time.Now(), h.releaseGrantTTL)
	if err != nil {
		log.Printf("release stream grant: signing failed (release_id=%d, user_id=%d): %v", versionID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"release_id":  versionID,
			"grant_token": grantToken,
			"expires_at":  expiresAt,
			"ttl_seconds": int64(h.releaseGrantTTL / time.Second),
			"issued_for":  identity.UserID,
		},
	})
}

func (h *FansubHandler) authorizeReleaseStream(c *gin.Context, versionID int64) bool {
	if identity, ok := middleware.CommentAuthIdentityFromContext(c); ok && identity.UserID > 0 {
		return true
	}

	grantToken := strings.TrimSpace(c.Query("grant"))
	if grantToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return false
	}

	if strings.TrimSpace(h.releaseGrantSecret) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "stream grant voruebergehend nicht verfuegbar"}})
		return false
	}

	claims, err := auth.ParseAndVerifyReleaseStreamGrant(grantToken, h.releaseGrantSecret, time.Now())
	if err != nil || claims.ReleaseID != versionID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "ungueltiger stream grant"}})
		return false
	}

	return true
}
