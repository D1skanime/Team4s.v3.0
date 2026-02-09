package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/database"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
)

var (
	ErrRateLimitExceeded   = errors.New("rate limit exceeded")
	ErrInvalidVerifyToken  = errors.New("invalid or expired verification token")
	ErrAlreadyVerified     = errors.New("email already verified")
)

// VerificationService handles email verification logic
type VerificationService struct {
	userRepo     *repository.UserRepository
	redis        *database.RedisClient
	emailService EmailService
	tokenExpiry  time.Duration
}

// NewVerificationService creates a new verification service
func NewVerificationService(
	userRepo *repository.UserRepository,
	redis *database.RedisClient,
	emailService EmailService,
) *VerificationService {
	return &VerificationService{
		userRepo:     userRepo,
		redis:        redis,
		emailService: emailService,
		tokenExpiry:  24 * time.Hour, // 24 hours
	}
}

// SendVerificationEmail sends a verification email to the user
// Rate limited to 3 emails per hour
// Returns (remaining attempts, retry after seconds, error)
func (s *VerificationService) SendVerificationEmail(ctx context.Context, userID int64) (int, int64, error) {
	// Check if user exists and get their data
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return 0, 0, fmt.Errorf("get user: %w", err)
	}

	// Check if already verified
	if user.EmailVerified {
		return 0, 0, ErrAlreadyVerified
	}

	// Check rate limit
	allowed, remaining, retryAfter, err := s.redis.CheckVerificationRateLimit(ctx, userID)
	if err != nil {
		return 0, 0, fmt.Errorf("check rate limit: %w", err)
	}

	if !allowed {
		return 0, retryAfter, ErrRateLimitExceeded
	}

	// Generate verification token
	token, err := s.generateToken()
	if err != nil {
		return remaining, 0, fmt.Errorf("generate token: %w", err)
	}

	// Store token in Redis
	if err := s.redis.StoreVerificationToken(ctx, token, userID, s.tokenExpiry); err != nil {
		return remaining, 0, fmt.Errorf("store token: %w", err)
	}

	// Get username for email
	username := user.Username
	if user.DisplayName != nil && *user.DisplayName != "" {
		username = *user.DisplayName
	}

	// Send email
	if err := s.emailService.SendVerificationEmail(ctx, user.Email, username, token); err != nil {
		return remaining, 0, fmt.Errorf("send email: %w", err)
	}

	return remaining, 0, nil
}

// VerifyEmail verifies the email using the token
// Token is one-time use and will be deleted after successful verification
func (s *VerificationService) VerifyEmail(ctx context.Context, token string) error {
	// Get user ID from token
	userID, err := s.redis.GetVerificationToken(ctx, token)
	if err != nil {
		return fmt.Errorf("get token: %w", err)
	}

	if userID == 0 {
		return ErrInvalidVerifyToken
	}

	// Check if user exists
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			// User deleted, remove token
			s.redis.DeleteVerificationToken(ctx, token)
			return ErrInvalidVerifyToken
		}
		return fmt.Errorf("get user: %w", err)
	}

	// Check if already verified
	if user.EmailVerified {
		// Remove token anyway
		s.redis.DeleteVerificationToken(ctx, token)
		return ErrAlreadyVerified
	}

	// Update user email_verified status
	if err := s.userRepo.UpdateEmailVerified(ctx, userID, true); err != nil {
		return fmt.Errorf("update email verified: %w", err)
	}

	// Delete token (one-time use)
	if err := s.redis.DeleteVerificationToken(ctx, token); err != nil {
		// Log but don't fail - verification was successful
		fmt.Printf("failed to delete verification token: %v\n", err)
	}

	return nil
}

// generateToken generates a secure random token
func (s *VerificationService) generateToken() (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	return hex.EncodeToString(tokenBytes), nil
}

// GetTokenExpiry returns the token expiry duration
func (s *VerificationService) GetTokenExpiry() time.Duration {
	return s.tokenExpiry
}
