package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) DeleteFansubMedia(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media service nicht verfuegbar"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}
	kind, err := parseMediaKind(c.Param("kind"))
	if err != nil {
		badRequest(c, "ungueltiger media-kind")
		return
	}

	previousMediaID, err := h.mediaRepo.ClearFansubMedia(c.Request.Context(), fansubID, kind)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("fansub media delete: clear failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "loeschen fehlgeschlagen"}})
		return
	}

	if previousMediaID != nil {
		h.tryCleanupUnusedMedia(c.Request.Context(), *previousMediaID)
	}

	c.Status(http.StatusNoContent)
}
