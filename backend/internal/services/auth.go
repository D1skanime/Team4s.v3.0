package services

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserInactive       = errors.New("user account is inactive")
	ErrInvalidUsername    = errors.New("username must be 3-50 alphanumeric characters or underscores")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrPasswordTooShort   = errors.New("password must be at least 8 characters")
)

// BcryptCost defines the bcrypt hashing cost
const BcryptCost = 10

// usernameRegex validates username format
var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,50}$`)

// emailRegex validates email format (basic validation)
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// AuthService handles authentication business logic
type AuthService struct {
	userRepo            *repository.UserRepository
	tokenService        *TokenService
	verificationService *VerificationService
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo *repository.UserRepository, tokenService *TokenService) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		tokenService: tokenService,
	}
}

// SetVerificationService sets the verification service (to avoid circular dependency)
func (s *AuthService) SetVerificationService(vs *VerificationService) {
	s.verificationService = vs
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error) {
	// Validate input
	if err := s.validateRegisterRequest(req); err != nil {
		return nil, err
	}

	// Check if username exists
	exists, err := s.userRepo.ExistsByUsername(ctx, req.Username)
	if err != nil {
		return nil, fmt.Errorf("check username: %w", err)
	}
	if exists {
		return nil, repository.ErrUsernameExists
	}

	// Check if email exists
	exists, err = s.userRepo.ExistsByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("check email: %w", err)
	}
	if exists {
		return nil, repository.ErrEmailExists
	}

	// Hash password
	hashedPassword, err := s.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	// Create user
	user := &models.User{
		Username:     req.Username,
		Email:        strings.ToLower(req.Email),
		PasswordHash: hashedPassword,
		DisplayName:  req.DisplayName,
		IsActive:     true,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	// Generate tokens
	accessToken, refreshToken, err := s.tokenService.GenerateTokenPair(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("generate tokens: %w", err)
	}

	// Send verification email (if verification service is configured)
	if s.verificationService != nil {
		// Send in background, don't block registration
		go func() {
			_, _, err := s.verificationService.SendVerificationEmail(ctx, user.ID)
			if err != nil {
				fmt.Printf("failed to send verification email: %v\n", err)
			}
		}()
	}

	return &models.AuthResponse{
		User:         user.ToPublic(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.tokenService.GetAccessTokenExpiry(),
	}, nil
}

// Login authenticates a user with username/email and password
func (s *AuthService) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	// Find user by username or email
	user, err := s.userRepo.GetByUsernameOrEmail(ctx, req.Login)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("find user: %w", err)
	}

	// Check if user is active
	if !user.IsActive {
		return nil, ErrUserInactive
	}

	// Verify password
	if !s.CheckPassword(req.Password, user.PasswordHash) {
		return nil, ErrInvalidCredentials
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		// Log error but don't fail login
		fmt.Printf("failed to update last login: %v\n", err)
	}

	// Generate tokens
	accessToken, refreshToken, err := s.tokenService.GenerateTokenPair(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("generate tokens: %w", err)
	}

	return &models.AuthResponse{
		User:         user.ToPublic(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.tokenService.GetAccessTokenExpiry(),
	}, nil
}

// Refresh generates new tokens using a refresh token
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*models.TokenResponse, error) {
	// Validate refresh token
	userID, err := s.tokenService.ValidateRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, err
	}

	// Get user to verify they're still active
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	if !user.IsActive {
		return nil, ErrUserInactive
	}

	// Revoke old refresh token
	if err := s.tokenService.RevokeRefreshToken(ctx, refreshToken, userID); err != nil {
		// Log error but continue with token generation
		fmt.Printf("failed to revoke old refresh token: %v\n", err)
	}

	// Generate new token pair
	newAccessToken, newRefreshToken, err := s.tokenService.GenerateTokenPair(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("generate tokens: %w", err)
	}

	return &models.TokenResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    s.tokenService.GetAccessTokenExpiry(),
	}, nil
}

// Logout revokes the refresh token
func (s *AuthService) Logout(ctx context.Context, userID int64, refreshToken string) error {
	if refreshToken != "" {
		return s.tokenService.RevokeRefreshToken(ctx, refreshToken, userID)
	}
	return nil
}

// LogoutAll revokes all refresh tokens for a user
func (s *AuthService) LogoutAll(ctx context.Context, userID int64) error {
	return s.tokenService.RevokeAllUserTokens(ctx, userID)
}

// GetUserByID returns a user by ID
func (s *AuthService) GetUserByID(ctx context.Context, userID int64) (*models.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

// HashPassword hashes a password using bcrypt
func (s *AuthService) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPassword verifies a password against its hash
func (s *AuthService) CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// validateRegisterRequest validates the registration request
func (s *AuthService) validateRegisterRequest(req models.RegisterRequest) error {
	// Validate username
	if !usernameRegex.MatchString(req.Username) {
		return ErrInvalidUsername
	}

	// Validate email
	if !emailRegex.MatchString(req.Email) {
		return ErrInvalidEmail
	}

	// Validate password length
	if len(req.Password) < 8 {
		return ErrPasswordTooShort
	}

	return nil
}
