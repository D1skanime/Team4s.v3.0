package repository

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/models"

	"github.com/redis/go-redis/v9"
)

const (
	authRefreshKeyPrefix       = "auth:refresh:"
	authSessionKeyPrefix       = "auth:session:"
	authRevokedAccessKeyPrefix = "auth:access:revoked:"
	authRandomTokenBytes       = 32
)

type AuthRepository struct {
	redis *redis.Client
}

type refreshSessionRecord struct {
	SessionID   string `json:"sid"`
	UserID      int64  `json:"user_id"`
	DisplayName string `json:"display_name"`
}

func NewAuthRepository(redisClient *redis.Client) *AuthRepository {
	return &AuthRepository{redis: redisClient}
}

func (r *AuthRepository) CreateSession(
	ctx context.Context,
	userID int64,
	displayName string,
	now time.Time,
	ttl time.Duration,
) (models.AuthSession, string, int64, error) {
	if userID <= 0 || strings.TrimSpace(displayName) == "" || ttl <= 0 {
		return models.AuthSession{}, "", 0, fmt.Errorf("invalid create session input")
	}

	sessionID, err := randomToken()
	if err != nil {
		return models.AuthSession{}, "", 0, fmt.Errorf("generate session id: %w", err)
	}
	refreshToken, err := randomToken()
	if err != nil {
		return models.AuthSession{}, "", 0, fmt.Errorf("generate refresh token: %w", err)
	}

	normalizedDisplayName := strings.TrimSpace(displayName)
	refreshTokenHash := auth.HashToken(refreshToken)
	record := refreshSessionRecord{
		SessionID:   sessionID,
		UserID:      userID,
		DisplayName: normalizedDisplayName,
	}
	recordJSON, err := json.Marshal(record)
	if err != nil {
		return models.AuthSession{}, "", 0, fmt.Errorf("marshal refresh session: %w", err)
	}

	pipe := r.redis.TxPipeline()
	pipe.Set(ctx, authRefreshKey(refreshTokenHash), string(recordJSON), ttl)
	pipe.Set(ctx, authSessionKey(sessionID), refreshTokenHash, ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return models.AuthSession{}, "", 0, fmt.Errorf("save refresh session: %w", err)
	}

	return models.AuthSession{
		SessionID:   sessionID,
		UserID:      userID,
		DisplayName: normalizedDisplayName,
	}, refreshToken, now.Add(ttl).Unix(), nil
}

func (r *AuthRepository) RotateSession(
	ctx context.Context,
	refreshToken string,
	now time.Time,
	ttl time.Duration,
) (models.AuthSession, string, int64, error) {
	if strings.TrimSpace(refreshToken) == "" || ttl <= 0 {
		return models.AuthSession{}, "", 0, ErrNotFound
	}

	refreshTokenHash := auth.HashToken(refreshToken)
	recordJSON, err := r.redis.Get(ctx, authRefreshKey(refreshTokenHash)).Result()
	if err != nil {
		if err == redis.Nil {
			return models.AuthSession{}, "", 0, ErrNotFound
		}

		return models.AuthSession{}, "", 0, fmt.Errorf("load refresh session: %w", err)
	}

	var record refreshSessionRecord
	if err := json.Unmarshal([]byte(recordJSON), &record); err != nil {
		return models.AuthSession{}, "", 0, fmt.Errorf("decode refresh session: %w", err)
	}

	newRefreshToken, err := randomToken()
	if err != nil {
		return models.AuthSession{}, "", 0, fmt.Errorf("generate refresh token: %w", err)
	}
	newRefreshHash := auth.HashToken(newRefreshToken)
	expiresAt := now.Add(ttl).Unix()

	pipe := r.redis.TxPipeline()
	pipe.Del(ctx, authRefreshKey(refreshTokenHash))
	pipe.Set(ctx, authRefreshKey(newRefreshHash), recordJSON, ttl)
	pipe.Set(ctx, authSessionKey(record.SessionID), newRefreshHash, ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return models.AuthSession{}, "", 0, fmt.Errorf("rotate refresh session: %w", err)
	}

	return models.AuthSession{
		SessionID:   record.SessionID,
		UserID:      record.UserID,
		DisplayName: strings.TrimSpace(record.DisplayName),
	}, newRefreshToken, expiresAt, nil
}

func (r *AuthRepository) RevokeSession(ctx context.Context, sessionID string) error {
	trimmedSessionID := strings.TrimSpace(sessionID)
	if trimmedSessionID == "" {
		return nil
	}

	refreshHash, err := r.redis.Get(ctx, authSessionKey(trimmedSessionID)).Result()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("load session for revoke: %w", err)
	}

	pipe := r.redis.TxPipeline()
	pipe.Del(ctx, authSessionKey(trimmedSessionID))
	if strings.TrimSpace(refreshHash) != "" {
		pipe.Del(ctx, authRefreshKey(refreshHash))
	}
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}

	return nil
}

func (r *AuthRepository) RevokeRefreshToken(ctx context.Context, refreshToken string) error {
	trimmedToken := strings.TrimSpace(refreshToken)
	if trimmedToken == "" {
		return nil
	}
	refreshTokenHash := auth.HashToken(trimmedToken)

	recordJSON, err := r.redis.Get(ctx, authRefreshKey(refreshTokenHash)).Result()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("load refresh token for revoke: %w", err)
	}

	sessionID := ""
	if recordJSON != "" {
		var record refreshSessionRecord
		if err := json.Unmarshal([]byte(recordJSON), &record); err != nil {
			return fmt.Errorf("decode refresh token for revoke: %w", err)
		}
		sessionID = strings.TrimSpace(record.SessionID)
	}

	pipe := r.redis.TxPipeline()
	pipe.Del(ctx, authRefreshKey(refreshTokenHash))
	if sessionID != "" {
		pipe.Del(ctx, authSessionKey(sessionID))
	}
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}

	return nil
}

func (r *AuthRepository) RevokeAccessToken(ctx context.Context, tokenHash string, ttl time.Duration) error {
	if strings.TrimSpace(tokenHash) == "" || ttl <= 0 {
		return nil
	}

	if err := r.redis.Set(ctx, authRevokedAccessKey(tokenHash), "1", ttl).Err(); err != nil {
		return fmt.Errorf("revoke access token: %w", err)
	}

	return nil
}

func (r *AuthRepository) IsAccessTokenRevoked(ctx context.Context, tokenHash string) (bool, error) {
	trimmedHash := strings.TrimSpace(tokenHash)
	if trimmedHash == "" {
		return false, nil
	}

	count, err := r.redis.Exists(ctx, authRevokedAccessKey(trimmedHash)).Result()
	if err != nil {
		return false, fmt.Errorf("check revoked access token: %w", err)
	}

	return count > 0, nil
}

func (r *AuthRepository) IsSessionActive(ctx context.Context, sessionID string) (bool, error) {
	trimmedSessionID := strings.TrimSpace(sessionID)
	if trimmedSessionID == "" {
		return true, nil
	}

	count, err := r.redis.Exists(ctx, authSessionKey(trimmedSessionID)).Result()
	if err != nil {
		return false, fmt.Errorf("check session active: %w", err)
	}

	return count > 0, nil
}

func authRefreshKey(tokenHash string) string {
	return authRefreshKeyPrefix + strings.TrimSpace(tokenHash)
}

func authSessionKey(sessionID string) string {
	return authSessionKeyPrefix + strings.TrimSpace(sessionID)
}

func authRevokedAccessKey(tokenHash string) string {
	return authRevokedAccessKeyPrefix + strings.TrimSpace(tokenHash)
}

func randomToken() (string, error) {
	randomBytes := make([]byte, authRandomTokenBytes)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(randomBytes), nil
}
