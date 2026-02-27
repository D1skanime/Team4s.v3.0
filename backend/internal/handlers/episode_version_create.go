package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func (h *FansubHandler) CreateEpisodeVersion(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}

	episodeNumber, err := parseEpisodeNumber(c.Param("episodeNumber"))
	if err != nil {
		badRequest(c, "ungueltige episode nummer")
		return
	}

	var req episodeVersionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("episode version create: bad request (user_id=%d, anime_id=%d, episode_number=%d): %v", identity.UserID, animeID, episodeNumber, err)
		badRequest(c, "ungueltiger request body")
		return
	}

	input, validationMessage := validateEpisodeVersionCreateRequest(req)
	if validationMessage != "" {
		badRequest(c, validationMessage)
		return
	}
	input.AnimeID = animeID
	input.EpisodeNumber = episodeNumber

	item, err := h.episodeVersionRepo.Create(c.Request.Context(), input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder fansubgruppe nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "versionskombination bereits vorhanden"}})
		return
	}
	if err != nil {
		log.Printf("episode version create: repo error (user_id=%d, anime_id=%d, episode_number=%d): %v", identity.UserID, animeID, episodeNumber, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}
