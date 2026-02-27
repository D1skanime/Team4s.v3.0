package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) DeleteEpisodeVersion(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungueltige version id")
		return
	}

	if err := h.episodeVersionRepo.Delete(c.Request.Context(), versionID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
		return
	} else if err != nil {
		log.Printf("episode version delete: repo error (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.Status(http.StatusNoContent)
}
