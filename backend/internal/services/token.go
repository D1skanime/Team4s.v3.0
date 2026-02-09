package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/database"
	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken   = errors.New("invalid token")
	ErrExpiredToken   = errors.New("token has expired")
	ErrTokenRevoked   = errors.New("token has been revoked")
)

// TokenConfig holds the configuration for token generation
type TokenConfig struct {
	SecretKey          string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
}

// DefaultTokenConfig returns default token configuration
func DefaultTokenConfig(secretKey string) TokenConfig {
	return TokenConfig{
		SecretKey:          secretKey,
		AccessTokenExpiry:  15 * time.Minute,   // 15 minutes
		RefreshTokenExpiry: 7 * 24 * time.Hour, // 7 days
	}
}

// Claims represents the JWT claims structure
type Claims struct {
	UserID int64  `json:"user_id"`
	Type   string `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// TokenService handles JWT token generation and validation
type TokenService struct {
	config TokenConfig
	redis  *database.RedisClient
}

// NewTokenService creates a new token service
func NewTokenService(config TokenConfig, redis *database.RedisClient) *TokenService {
	return &TokenService{
		config: config,
		redis:  redis,
	}
}

// GenerateAccessToken creates a new JWT access token for a user
func (s *TokenService) GenerateAccessToken(userID int64) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Type:   "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "team4s",
			Subject:   fmt.Sprintf("%d", userID),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(s.config.SecretKey))
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}

	return signedToken, nil
}

// GenerateRefreshToken creates a new refresh token and stores it in Redis
func (s *TokenService) GenerateRefreshToken(ctx context.Context, userID int64) (string, error) {
	// Generate a random token string
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Store in Redis
	if err := s.redis.StoreRefreshToken(ctx, token, userID, s.config.RefreshTokenExpiry); err != nil {
		return "", fmt.Errorf("store refresh token: %w", err)
	}

	return token, nil
}

// ValidateAccessToken validates a JWT access token and returns the claims
func (s *TokenService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.SecretKey), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.Type != "access" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateRefreshToken validates a refresh token and returns the user ID
func (s *TokenService) ValidateRefreshToken(ctx context.Context, token string) (int64, error) {
	userID, err := s.redis.GetRefreshToken(ctx, token)
	if err != nil {
		return 0, fmt.Errorf("get refresh token: %w", err)
	}

	if userID == 0 {
		return 0, ErrTokenRevoked
	}

	return userID, nil
}

// RevokeRefreshToken removes a refresh token from Redis
func (s *TokenService) RevokeRefreshToken(ctx context.Context, token string, userID int64) error {
	return s.redis.DeleteRefreshToken(ctx, token, userID)
}

// RevokeAllUserTokens removes all refresh tokens for a user
func (s *TokenService) RevokeAllUserTokens(ctx context.Context, userID int64) error {
	return s.redis.DeleteAllUserTokens(ctx, userID)
}

// GetAccessTokenExpiry returns the access token expiry duration in seconds
func (s *TokenService) GetAccessTokenExpiry() int {
	return int(s.config.AccessTokenExpiry.Seconds())
}

// GenerateTokenPair generates both access and refresh tokens
func (s *TokenService) GenerateTokenPair(ctx context.Context, userID int64) (accessToken, refreshToken string, err error) {
	accessToken, err = s.GenerateAccessToken(userID)
	if err != nil {
		return "", "", err
	}

	refreshToken, err = s.GenerateRefreshToken(ctx, userID)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}
