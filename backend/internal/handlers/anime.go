package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type AnimeHandler struct {
	repo *repository.AnimeRepository
}

func NewAnimeHandler(repo *repository.AnimeRepository) *AnimeHandler {
	return &AnimeHandler{repo: repo}
}

// List handles GET /api/v1/anime
func (h *AnimeHandler) List(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "24"))

	filter := models.AnimeFilter{
		Letter:      c.Query("letter"),
		ContentType: c.DefaultQuery("content_type", "anime"),
		Status:      c.Query("status"),
		Type:        c.Query("type"),
		Page:        page,
		PerPage:     perPage,
	}

	// Query database
	items, total, err := h.repo.List(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Ensure items is not nil for JSON
	if items == nil {
		items = []models.AnimeListItem{}
	}

	// Calculate total pages
	totalPages := int(total) / filter.PerPage
	if int(total)%filter.PerPage > 0 {
		totalPages++
	}

	// Build response
	response := models.PaginatedResponse[models.AnimeListItem]{
		Data: items,
		Meta: models.PaginationMeta{
			Total:      total,
			Page:       filter.Page,
			PerPage:    filter.PerPage,
			TotalPages: totalPages,
		},
	}

	c.JSON(http.StatusOK, response)
}

// Search handles GET /api/v1/anime/search
func (h *AnimeHandler) Search(c *gin.Context) {
	// Parse query parameter
	query := c.Query("q")
	if len(query) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query must be at least 2 characters"})
		return
	}

	// Parse limit parameter
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Search database
	items, total, err := h.repo.Search(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Ensure items is not nil for JSON
	if items == nil {
		items = []models.AnimeListItem{}
	}

	// Build response
	response := models.SearchResponse[models.AnimeListItem]{
		Data: items,
		Meta: models.SearchMeta{
			Total: total,
			Query: query,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetByID handles GET /api/v1/anime/:id
func (h *AnimeHandler) GetByID(c *gin.Context) {
	// Parse ID
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Query database
	anime, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "anime not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": anime})
}
