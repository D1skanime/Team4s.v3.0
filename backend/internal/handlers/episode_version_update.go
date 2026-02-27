package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) UpdateEpisodeVersion(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	versionID, err := parseEpisodeVersionID(c.Param("versionId"))
	if err != nil {
		badRequest(c, "ungueltige version id")
		return
	}

	var req models.EpisodeVersionPatchInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("episode version update: bad request (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateEpisodeVersionPatchRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}

	item, err := h.episodeVersionRepo.Update(c.Request.Context(), versionID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "episodenversion nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "versionskombination bereits vorhanden"}})
		return
	}
	if err != nil {
		log.Printf("episode version update: repo error (user_id=%d, version_id=%d): %v", identity.UserID, versionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}
