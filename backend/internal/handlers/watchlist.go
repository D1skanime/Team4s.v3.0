package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type WatchlistHandler struct {
	repo *repository.WatchlistRepository
}

func NewWatchlistHandler(repo *repository.WatchlistRepository) *WatchlistHandler {
	return &WatchlistHandler{repo: repo}
}

// GetWatchlist handles GET /api/v1/watchlist
// Returns the authenticated user's watchlist with anime info
func (h *WatchlistHandler) GetWatchlist(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	// Get watchlist items
	items, err := h.repo.GetUserWatchlist(ctx, userID.(int64))
	if err != nil {
		log.Printf("Error getting user watchlist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Get counts by status
	counts, err := h.repo.GetWatchlistCounts(ctx, userID.(int64))
	if err != nil {
		log.Printf("Error getting watchlist counts: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	// Calculate total
	total := 0
	for _, count := range counts {
		total += count
	}

	// Return empty slice instead of nil
	if items == nil {
		items = []models.WatchlistItem{}
	}

	response := models.WatchlistResponse{
		Data: items,
		Meta: models.WatchlistMeta{
			Total:    total,
			ByStatus: counts,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetWatchlistStatus handles GET /api/v1/watchlist/:animeId
// Returns the status of a specific anime in the user's watchlist
func (h *WatchlistHandler) GetWatchlistStatus(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
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

	// Get watchlist entry
	entry, err := h.repo.GetWatchlistEntry(c.Request.Context(), userID.(int64), animeID)
	if err != nil {
		log.Printf("Error getting watchlist entry: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if entry == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not in watchlist"})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// AddToWatchlist handles POST /api/v1/watchlist/:animeId
// Adds an anime to the user's watchlist (or updates status if already exists)
func (h *WatchlistHandler) AddToWatchlist(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
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
	var req models.AddToWatchlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
		return
	}

	// Validate status
	if !req.Status.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
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

	// Add to watchlist (upsert)
	entry, err := h.repo.AddToWatchlist(ctx, userID.(int64), animeID, req.Status)
	if err != nil {
		log.Printf("Error adding to watchlist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// UpdateWatchlistStatus handles PUT /api/v1/watchlist/:animeId
// Updates the status of an anime in the user's watchlist
func (h *WatchlistHandler) UpdateWatchlistStatus(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
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
	var req models.UpdateWatchlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
		return
	}

	// Validate status
	if !req.Status.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	// Update watchlist entry
	entry, err := h.repo.UpdateWatchlistStatus(c.Request.Context(), userID.(int64), animeID, req.Status)
	if err != nil {
		log.Printf("Error updating watchlist status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if entry == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not in watchlist"})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// RemoveFromWatchlist handles DELETE /api/v1/watchlist/:animeId
// Removes an anime from the user's watchlist
func (h *WatchlistHandler) RemoveFromWatchlist(c *gin.Context) {
	// Parse anime ID from path
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
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

	// Remove from watchlist
	deleted, err := h.repo.RemoveFromWatchlist(c.Request.Context(), userID.(int64), animeID)
	if err != nil {
		log.Printf("Error removing from watchlist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{"error": "not in watchlist"})
		return
	}

	c.Status(http.StatusNoContent)
}

// SyncWatchlist handles POST /api/v1/watchlist/sync
// Syncs localStorage watchlist to backend (merge strategy)
func (h *WatchlistHandler) SyncWatchlist(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Parse request body
	var req models.SyncWatchlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// Limit number of items to sync
	if len(req.Items) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "too many items to sync (max 1000)"})
		return
	}

	// Sync watchlist
	result, err := h.repo.SyncWatchlist(c.Request.Context(), userID.(int64), req.Items)
	if err != nil {
		log.Printf("Error syncing watchlist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// CheckWatchlist handles POST /api/v1/watchlist/check
// Checks if multiple anime are in the user's watchlist
func (h *WatchlistHandler) CheckWatchlist(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Parse request body
	var req models.CheckWatchlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// Limit number of anime IDs
	if len(req.AnimeIDs) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "too many anime ids (max 100)"})
		return
	}

	// Check watchlist status for all anime
	statuses, err := h.repo.CheckMultipleAnimeWatchlist(c.Request.Context(), userID.(int64), req.AnimeIDs)
	if err != nil {
		log.Printf("Error checking watchlist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	c.JSON(http.StatusOK, models.CheckWatchlistResponse{Statuses: statuses})
}
