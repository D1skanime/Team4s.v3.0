package handlers

import (
	"net/http"
	"strconv"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/middleware"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

// AdminUserHandler handles admin user management requests
type AdminUserHandler struct {
	repo *repository.UserRepository
}

// NewAdminUserHandler creates a new admin user handler
func NewAdminUserHandler(repo *repository.UserRepository) *AdminUserHandler {
	return &AdminUserHandler{repo: repo}
}

// ListUsers handles GET /api/v1/admin/users
func (h *AdminUserHandler) ListUsers(c *gin.Context) {
	var filter models.UserAdminFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid query parameters",
		})
		return
	}

	users, total, err := h.repo.ListUsersAdmin(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch users",
		})
		return
	}

	filter.SetDefaults()
	totalPages := int(total) / filter.PerPage
	if int(total)%filter.PerPage > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.UsersAdminListResponse{
		Data: users,
		Meta: models.PaginationMeta{
			Total:      total,
			Page:       filter.Page,
			PerPage:    filter.PerPage,
			TotalPages: totalPages,
		},
	})
}

// GetUser handles GET /api/v1/admin/users/:id
func (h *AdminUserHandler) GetUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	user, err := h.repo.GetUserByIDAdmin(c.Request.Context(), id)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch user",
		})
		return
	}

	c.JSON(http.StatusOK, models.UserAdminResponse{
		Data: *user,
	})
}

// UpdateUser handles PUT /api/v1/admin/users/:id
func (h *AdminUserHandler) UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	// Prevent admin from modifying themselves (to avoid locking out)
	currentUserID := middleware.GetUserID(c)
	if currentUserID == id {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "cannot modify your own account via admin panel",
		})
		return
	}

	var req models.UpdateUserAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	// Check if user exists first
	_, err = h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to check user",
		})
		return
	}

	err = h.repo.UpdateUserAdmin(c.Request.Context(), id, req)
	if err != nil {
		if err == repository.ErrEmailExists {
			c.JSON(http.StatusConflict, gin.H{
				"error": "email already exists",
			})
			return
		}
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to update user",
		})
		return
	}

	// Fetch updated user
	user, err := h.repo.GetUserByIDAdmin(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to fetch updated user",
		})
		return
	}

	c.JSON(http.StatusOK, models.UserAdminResponse{
		Data: *user,
	})
}

// DeleteUser handles DELETE /api/v1/admin/users/:id
func (h *AdminUserHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	// Prevent admin from deleting themselves
	currentUserID := middleware.GetUserID(c)
	if currentUserID == id {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "cannot delete your own account",
		})
		return
	}

	// Check hard delete query param
	hardDelete := c.Query("hard") == "true"

	// Check if user exists first
	_, err = h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to check user",
		})
		return
	}

	err = h.repo.DeleteUserAdmin(c.Request.Context(), id, hardDelete)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to delete user",
		})
		return
	}

	message := "user deactivated"
	if hardDelete {
		message = "user permanently deleted"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": message,
	})
}

// BanUser handles POST /api/v1/admin/users/:id/ban
func (h *AdminUserHandler) BanUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	// Prevent admin from banning themselves
	currentUserID := middleware.GetUserID(c)
	if currentUserID == id {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "cannot ban your own account",
		})
		return
	}

	isActive := false
	err = h.repo.UpdateUserAdmin(c.Request.Context(), id, models.UpdateUserAdminRequest{
		IsActive: &isActive,
	})
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to ban user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "user banned",
	})
}

// UnbanUser handles POST /api/v1/admin/users/:id/unban
func (h *AdminUserHandler) UnbanUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	isActive := true
	err = h.repo.UpdateUserAdmin(c.Request.Context(), id, models.UpdateUserAdminRequest{
		IsActive: &isActive,
	})
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "user not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to unban user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "user unbanned",
	})
}
