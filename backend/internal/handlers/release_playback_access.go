package handlers

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
)

func (h *FansubHandler) allowReleasePlayback(c *gin.Context, actor permissions.Actor, versionID int64) bool {
	if h.releasePlaybackEntitlements == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "wiedergaberechte vorübergehend nicht verfügbar"}})
		return false
	}
	decision, err := h.releasePlaybackEntitlements.ResolveReleasePlaybackEntitlement(c.Request.Context(), actor, versionID)
	if err != nil {
		log.Printf("release playback entitlement: resolve failed (release_id=%d, app_user_id=%d): %v", versionID, actor.AppUserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return false
	}
	if !decision.Allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung für diese wiedergabe"}})
		return false
	}
	return true
}

func (h *FansubHandler) GetReleasePlaybackAccess(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	versionID, err := parseEpisodeVersionID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige release id")
		return
	}
	if h.releasePlaybackEntitlements == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "wiedergaberechte vorübergehend nicht verfügbar"}})
		return
	}
	decision, err := h.releasePlaybackEntitlements.ResolveReleasePlaybackEntitlement(c.Request.Context(), actor, versionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}
	ready := false
	if decision.Allowed {
		_, sourceErr := h.episodeVersionRepo.GetReleaseStreamSource(c.Request.Context(), versionID)
		if sourceErr == nil {
			ready = true
		} else if !errors.Is(sourceErr, repository.ErrNotFound) {
			log.Printf("release playback access: source lookup failed (release_id=%d): %v", versionID, sourceErr)
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"can_play": decision.Allowed, "stream_ready": ready}})
}
