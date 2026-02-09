package handlers

import (
	"errors"
	"net/http"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/middleware"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register handles POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
			"details": err.Error(),
		})
		return
	}

	response, err := h.authService.Register(c.Request.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		message := "registration failed"

		switch {
		case errors.Is(err, repository.ErrUsernameExists):
			status = http.StatusConflict
			message = "username already exists"
		case errors.Is(err, repository.ErrEmailExists):
			status = http.StatusConflict
			message = "email already exists"
		case errors.Is(err, services.ErrInvalidUsername):
			status = http.StatusBadRequest
			message = err.Error()
		case errors.Is(err, services.ErrInvalidEmail):
			status = http.StatusBadRequest
			message = err.Error()
		case errors.Is(err, services.ErrPasswordTooShort):
			status = http.StatusBadRequest
			message = err.Error()
		}

		c.JSON(status, gin.H{"error": message})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
			"details": err.Error(),
		})
		return
	}

	response, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError
		message := "login failed"

		switch {
		case errors.Is(err, services.ErrInvalidCredentials):
			status = http.StatusUnauthorized
			message = "invalid username/email or password"
		case errors.Is(err, services.ErrUserInactive):
			status = http.StatusForbidden
			message = "account is inactive"
		}

		c.JSON(status, gin.H{"error": message})
		return
	}

	c.JSON(http.StatusOK, response)
}

// Refresh handles POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req models.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
			"details": err.Error(),
		})
		return
	}

	response, err := h.authService.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		status := http.StatusInternalServerError
		message := "refresh failed"

		switch {
		case errors.Is(err, services.ErrTokenRevoked):
			status = http.StatusUnauthorized
			message = "refresh token is invalid or expired"
		case errors.Is(err, services.ErrInvalidCredentials):
			status = http.StatusUnauthorized
			message = "user not found"
		case errors.Is(err, services.ErrUserInactive):
			status = http.StatusForbidden
			message = "account is inactive"
		}

		c.JSON(status, gin.H{"error": message})
		return
	}

	c.JSON(http.StatusOK, response)
}

// Logout handles POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get refresh token from body (optional)
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	c.ShouldBindJSON(&req)

	if err := h.authService.Logout(c.Request.Context(), userID, req.RefreshToken); err != nil {
		// Log error but don't fail
		// In production, this should be proper logging
	}

	c.JSON(http.StatusOK, models.MessageResponse{
		Message: "logged out successfully",
	})
}

// LogoutAll handles POST /api/v1/auth/logout-all
func (h *AuthHandler) LogoutAll(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.authService.LogoutAll(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to logout from all devices"})
		return
	}

	c.JSON(http.StatusOK, models.MessageResponse{
		Message: "logged out from all devices",
	})
}

// Me handles GET /api/v1/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.authService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user.ToPublic(),
	})
}
