package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
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

// GetByID handles GET /api/v1/episodes/:id
func (h *EpisodeHandler) GetByID(c *gin.Context) {
	// Parse episode ID
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid episode id"})
		return
	}

	// Query database
	episode, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "episode not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": episode})
}

// ========== Admin CRUD handlers ==========

// AdminList handles GET /api/v1/admin/episodes
func (h *EpisodeHandler) AdminList(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	animeID, _ := strconv.ParseInt(c.Query("anime_id"), 10, 64)

	filter := models.EpisodeAdminFilter{
		AnimeID: animeID,
		Status:  c.Query("status"),
		Search:  c.Query("search"),
		Page:    page,
		PerPage: perPage,
	}

	// Query database
	items, total, err := h.repo.ListForAdmin(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Ensure items is not nil for JSON
	if items == nil {
		items = []models.EpisodeAdminListItem{}
	}

	// Calculate total pages
	totalPages := int(total) / filter.PerPage
	if int(total)%filter.PerPage > 0 {
		totalPages++
	}

	// Build response
	response := models.PaginatedResponse[models.EpisodeAdminListItem]{
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

// Create handles POST /api/v1/admin/episodes
func (h *EpisodeHandler) Create(c *gin.Context) {
	var req models.CreateEpisodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"details": err.Error(),
		})
		return
	}

	episode, err := h.repo.Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create episode"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": episode})
}

// Update handles PUT /api/v1/admin/episodes/:id
func (h *EpisodeHandler) Update(c *gin.Context) {
	// Parse ID
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req models.UpdateEpisodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"details": err.Error(),
		})
		return
	}

	episode, err := h.repo.Update(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "episode not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update episode"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": episode})
}

// Delete handles DELETE /api/v1/admin/episodes/:id
func (h *EpisodeHandler) Delete(c *gin.Context) {
	// Parse ID
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	err = h.repo.Delete(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "episode not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete episode"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "episode deleted successfully"})
}
