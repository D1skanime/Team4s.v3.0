package handlers

import (
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type RatingHandler struct {
	repo *repository.RatingRepository
}

func NewRatingHandler(repo *repository.RatingRepository) *RatingHandler {
	return &RatingHandler{repo: repo}
}

// GetAnimeRating handles GET /api/v1/anime/:id/rating
func (h *RatingHandler) GetAnimeRating(c *gin.Context) {
	// Parse anime ID from path
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Query rating data
	rating, err := h.repo.GetAnimeRating(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, rating)
}
