package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// CreatePlaybackGrant verarbeitet POST /api/v1/episodes/:id/playback-grant und stellt ein signiertes Stream-Grant-Token aus.
func (h *EpisodePlaybackHandler) CreatePlaybackGrant(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}

	episodeID, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige episode id")
		return
	}
	if !h.enforcePlaybackRateLimit(c, "grant", playbackPrincipalForUserID(identity.UserID)) {
		return
	}

	clientIP := extractClientIP(c)

	// Track multiple IPs per user for audit
	if h.auditLogger != nil {
		h.auditLogger.logMultipleIPsPerUser(c.Request.Context(), identity.UserID, clientIP)
	}

	episode, ok := h.loadPlayableEpisode(c, episodeID)
	if !ok {
		return
	}
	if firstNonEmpty(episode.StreamLinks) == "" {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "stream nicht gefunden",
			},
		})
		return
	}

	if h.releaseGrantTTL <= 0 || strings.TrimSpace(h.releaseGrantSecret) == "" {
		log.Printf("episode playback grant: grant config unavailable (episode_id=%d, user_id=%d)", episodeID, identity.UserID)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream grant voruebergehend nicht verfuegbar",
			},
		})
		return
	}

	grantToken, expiresAt, err := auth.CreateReleaseStreamGrant(
		episodeID,
		identity.UserID,
		h.releaseGrantSecret,
		time.Now(),
		h.releaseGrantTTL,
	)
	if err != nil {
		log.Printf("episode playback grant: signing failed (episode_id=%d, user_id=%d): %v", episodeID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	log.Printf("episode playback grant: created (episode_id=%d, user_id=%d, client_ip=%s)", episodeID, identity.UserID, clientIP)

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"episode_id":  episodeID,
			"grant_token": grantToken,
			"expires_at":  expiresAt,
			"ttl_seconds": int64(h.releaseGrantTTL / time.Second),
			"issued_for":  identity.UserID,
		},
	})
}
