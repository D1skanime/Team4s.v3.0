package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
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
// Returns aggregated rating data for an anime (public)
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

// GetUserRating handles GET /api/v1/anime/:id/rating/me
// Returns the authenticated user's rating for an anime (protected)
func (h *RatingHandler) GetUserRating(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Query user's rating
	rating, err := h.repo.GetUserRating(c.Request.Context(), animeID, userID.(int64))
	if err != nil {
		log.Printf("Error getting user rating: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// No rating found
	if rating == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "rating not found"})
		return
	}

	c.JSON(http.StatusOK, rating)
}

// SubmitRating handles POST /api/v1/anime/:id/rating
// Creates or updates the authenticated user's rating for an anime (protected)
func (h *RatingHandler) SubmitRating(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Parse request body
	var req models.SubmitRatingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rating must be between 1 and 10"})
		return
	}

	// Validate rating value (additional check)
	if req.Rating < 1 || req.Rating > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rating must be between 1 and 10"})
		return
	}

	ctx := c.Request.Context()

	// Check if anime exists
	exists2, err := h.repo.AnimeExists(ctx, animeID)
	if err != nil {
		log.Printf("Error checking anime exists: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if !exists2 {
		c.JSON(http.StatusNotFound, gin.H{"error": "anime not found"})
		return
	}

	// Create or update rating
	userRating, err := h.repo.CreateOrUpdateRating(ctx, animeID, userID.(int64), req.Rating)
	if err != nil {
		log.Printf("Error creating/updating rating: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Get updated anime rating stats
	animeRating, err := h.repo.GetAnimeRating(ctx, animeID)
	if err != nil {
		log.Printf("Error getting updated anime rating: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Return both user rating and updated anime rating
	response := models.SubmitRatingResponse{
		Rating:      userRating,
		AnimeRating: animeRating,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteRating handles DELETE /api/v1/anime/:id/rating
// Removes the authenticated user's rating for an anime (protected)
func (h *RatingHandler) DeleteRating(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid anime id"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Delete rating
	deleted, err := h.repo.DeleteRating(c.Request.Context(), animeID, userID.(int64))
	if err != nil {
		log.Printf("Error deleting rating: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{"error": "rating not found"})
		return
	}

	c.Status(http.StatusNoContent)
}
