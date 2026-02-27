package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *EpisodePlaybackHandler) authorizePlayback(c *gin.Context, episodeID int64) (string, bool) {
	if identity, ok := middleware.CommentAuthIdentityFromContext(c); ok && identity.UserID > 0 {
		return playbackPrincipalForUserID(identity.UserID), true
	}

	grantToken := strings.TrimSpace(c.Query("grant"))
	if grantToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return "", false
	}

	if strings.TrimSpace(h.releaseGrantSecret) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream grant voruebergehend nicht verfuegbar",
			},
		})
		return "", false
	}

	// Check for grant replay
	if h.grantStore != nil {
		used, err := h.grantStore.IsUsed(c.Request.Context(), grantToken)
		if err != nil {
			log.Printf("episode_playback: grant store check failed (episode_id=%d): %v", episodeID, err)
		} else if used {
			clientIP := extractClientIP(c)
			if h.auditLogger != nil {
				h.auditLogger.logGrantReplayAttempt(c.Request.Context(), 0, episodeID, clientIP)
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"message": "ungueltiger stream grant",
				},
			})
			return "", false
		}
	}

	claims, err := auth.ParseAndVerifyReleaseStreamGrant(grantToken, h.releaseGrantSecret, time.Now())
	if err != nil || claims.ReleaseID != episodeID {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "ungueltiger stream grant",
			},
		})
		return "", false
	}

	// Mark grant as used
	if h.grantStore != nil {
		if err := h.grantStore.MarkUsed(c.Request.Context(), grantToken, h.releaseGrantTTL*2); err != nil {
			log.Printf("episode_playback: mark grant used failed (episode_id=%d, user_id=%d): %v", episodeID, claims.UserID, err)
		}
	}

	return playbackPrincipalForUserID(claims.UserID), true
}

func (h *EpisodePlaybackHandler) loadPlayableEpisode(c *gin.Context, episodeID int64) (*models.EpisodeDetail, bool) {
	episode, err := h.repo.GetByID(c.Request.Context(), episodeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episode nicht gefunden",
			},
		})
		return nil, false
	}
	if err != nil {
		log.Printf("episode_playback: load episode failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return nil, false
	}

	if len(h.allowedAnimeIDs) > 0 {
		if _, ok := h.allowedAnimeIDs[episode.AnimeID]; !ok {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"message": "stream nicht gefunden",
				},
			})
			return nil, false
		}
	}

	return episode, true
}
