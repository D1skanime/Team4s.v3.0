package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/middleware"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/services"
	"github.com/gin-gonic/gin"
)

// VerificationHandler handles email verification endpoints
type VerificationHandler struct {
	verificationService *services.VerificationService
}

// NewVerificationHandler creates a new verification handler
func NewVerificationHandler(verificationService *services.VerificationService) *VerificationHandler {
	return &VerificationHandler{
		verificationService: verificationService,
	}
}

// SendVerificationEmailRequest represents the request body for sending verification email
type SendVerificationEmailRequest struct {
	// Optional - can be sent without body if user is authenticated
}

// SendVerificationEmailResponse represents the response for send verification
type SendVerificationEmailResponse struct {
	Message   string `json:"message"`
	Remaining int    `json:"remaining"` // Remaining attempts in rate limit window
}

// VerifyEmailResponse represents the response for email verification
type VerifyEmailResponse struct {
	Message  string `json:"message"`
	Verified bool   `json:"verified"`
}

// SendVerificationEmail handles POST /api/v1/auth/send-verification
// Sends a verification email to the authenticated user
// Rate limited to 3 emails per hour per user
func (h *VerificationHandler) SendVerificationEmail(c *gin.Context) {
	// Get user ID from auth middleware
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Send verification email
	remaining, retryAfter, err := h.verificationService.SendVerificationEmail(c.Request.Context(), userID)
	if err != nil {
		status := http.StatusInternalServerError
		message := "failed to send verification email"

		switch {
		case errors.Is(err, services.ErrRateLimitExceeded):
			status = http.StatusTooManyRequests
			message = "Zu viele Anfragen. Bitte warte etwas bevor du es erneut versuchst."
			c.Header("Retry-After", formatRetryAfter(retryAfter))
			c.JSON(status, gin.H{
				"error":       message,
				"retry_after": retryAfter,
			})
			return
		case errors.Is(err, services.ErrAlreadyVerified):
			status = http.StatusBadRequest
			message = "E-Mail ist bereits verifiziert"
		}

		c.JSON(status, gin.H{"error": message})
		return
	}

	c.JSON(http.StatusOK, SendVerificationEmailResponse{
		Message:   "Verifizierungs-E-Mail wurde gesendet",
		Remaining: remaining,
	})
}

// VerifyEmail handles GET /api/v1/auth/verify-email
// Verifies the email using the token from query parameter
// Token is one-time use
func (h *VerificationHandler) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}

	// Verify the email
	err := h.verificationService.VerifyEmail(c.Request.Context(), token)
	if err != nil {
		status := http.StatusInternalServerError
		message := "verification failed"

		switch {
		case errors.Is(err, services.ErrInvalidVerifyToken):
			status = http.StatusBadRequest
			message = "Ungueltiger oder abgelaufener Verifizierungslink"
		case errors.Is(err, services.ErrAlreadyVerified):
			// Already verified - treat as success
			c.JSON(http.StatusOK, VerifyEmailResponse{
				Message:  "E-Mail ist bereits verifiziert",
				Verified: true,
			})
			return
		}

		c.JSON(status, gin.H{"error": message})
		return
	}

	c.JSON(http.StatusOK, VerifyEmailResponse{
		Message:  "E-Mail erfolgreich verifiziert!",
		Verified: true,
	})
}

// formatRetryAfter formats seconds for the Retry-After header
func formatRetryAfter(seconds int64) string {
	return fmt.Sprintf("%d", seconds)
}
