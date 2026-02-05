package handlers

import (
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type EpisodeHandler struct {
	repo *repository.EpisodeRepository
}

func NewEpisodeHandler(repo *repository.EpisodeRepository) *EpisodeHandler {
	return &EpisodeHandler{repo: repo}
}

// ListByAnime handles GET /api/v1/anime/:id/episodes
func (h *EpisodeHandler) ListByAnime(c *gin.Context) {
	// Parse anime ID
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Query database
	episodes, total, err := h.repo.GetByAnimeID(c.Request.Context(), animeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Ensure episodes is not nil for JSON
	if episodes == nil {
		episodes = []models.Episode{}
	}

	// Build response
	response := models.EpisodesResponse{
		Data: episodes,
		Meta: models.EpisodesMeta{
			Total: total,
		},
	}

	c.JSON(http.StatusOK, response)
}
