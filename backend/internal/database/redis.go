package database

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient wraps the Redis client with application-specific methods
type RedisClient struct {
	client *redis.Client
}

// NewRedisClient creates a new Redis client from connection string
func NewRedisClient(ctx context.Context, redisURL string) (*RedisClient, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opts)

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return &RedisClient{client: client}, nil
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	return r.client.Close()
}

// Ping tests the Redis connection
func (r *RedisClient) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Token Storage Methods

const (
	refreshTokenPrefix = "refresh_token:"
	userTokensPrefix   = "user_tokens:"
)

// StoreRefreshToken stores a refresh token with associated user ID
func (r *RedisClient) StoreRefreshToken(ctx context.Context, token string, userID int64, expiry time.Duration) error {
	// Store token -> userID mapping
	tokenKey := refreshTokenPrefix + token
	if err := r.client.Set(ctx, tokenKey, userID, expiry).Err(); err != nil {
		return fmt.Errorf("store refresh token: %w", err)
	}

	// Add token to user's token set (for logout all functionality)
	userKey := userTokensPrefix + strconv.FormatInt(userID, 10)
	if err := r.client.SAdd(ctx, userKey, token).Err(); err != nil {
		return fmt.Errorf("add token to user set: %w", err)
	}

	// Set expiry on user's token set if not exists
	r.client.Expire(ctx, userKey, expiry)

	return nil
}

// GetRefreshToken retrieves the user ID associated with a refresh token
// Returns 0 if token not found
func (r *RedisClient) GetRefreshToken(ctx context.Context, token string) (int64, error) {
	tokenKey := refreshTokenPrefix + token
	result, err := r.client.Get(ctx, tokenKey).Result()
	if err == redis.Nil {
		return 0, nil // Token not found
	}
	if err != nil {
		return 0, fmt.Errorf("get refresh token: %w", err)
	}

	userID, err := strconv.ParseInt(result, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse user id: %w", err)
	}

	return userID, nil
}

// DeleteRefreshToken removes a refresh token
func (r *RedisClient) DeleteRefreshToken(ctx context.Context, token string, userID int64) error {
	tokenKey := refreshTokenPrefix + token

	// Delete the token
	if err := r.client.Del(ctx, tokenKey).Err(); err != nil {
		return fmt.Errorf("delete refresh token: %w", err)
	}

	// Remove from user's token set
	userKey := userTokensPrefix + strconv.FormatInt(userID, 10)
	r.client.SRem(ctx, userKey, token)

	return nil
}

// DeleteAllUserTokens removes all refresh tokens for a user (logout from all devices)
func (r *RedisClient) DeleteAllUserTokens(ctx context.Context, userID int64) error {
	userKey := userTokensPrefix + strconv.FormatInt(userID, 10)

	// Get all tokens for this user
	tokens, err := r.client.SMembers(ctx, userKey).Result()
	if err != nil {
		return fmt.Errorf("get user tokens: %w", err)
	}

	// Delete each token
	for _, token := range tokens {
		tokenKey := refreshTokenPrefix + token
		r.client.Del(ctx, tokenKey)
	}

	// Delete the user's token set
	r.client.Del(ctx, userKey)

	return nil
}

// Client returns the underlying Redis client for advanced usage
func (r *RedisClient) Client() *redis.Client {
	return r.client
}
