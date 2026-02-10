package handlers

import (
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

// AdminHandler handles admin-related requests
type AdminHandler struct {
	repo *repository.AdminRepository
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(repo *repository.AdminRepository) *AdminHandler {
	return &AdminHandler{repo: repo}
}

// GetDashboardStats handles GET /api/v1/admin/dashboard/stats
func (h *AdminHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.repo.GetDashboardStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch dashboard stats",
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetRecentActivity handles GET /api/v1/admin/dashboard/activity
func (h *AdminHandler) GetRecentActivity(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	activities, err := h.repo.GetRecentActivity(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch recent activity",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
	})
}
