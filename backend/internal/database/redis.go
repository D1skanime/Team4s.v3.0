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
	refreshTokenPrefix       = "refresh_token:"
	userTokensPrefix         = "user_tokens:"
	verificationTokenPrefix  = "verification_token:"
	verificationRateLimitKey = "verification_ratelimit:"
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

// Email Verification Token Methods

// StoreVerificationToken stores an email verification token for a user
// Token expires after the specified duration (typically 24 hours)
// The token is one-time use - will be deleted after verification
func (r *RedisClient) StoreVerificationToken(ctx context.Context, token string, userID int64, expiry time.Duration) error {
	tokenKey := verificationTokenPrefix + token
	if err := r.client.Set(ctx, tokenKey, userID, expiry).Err(); err != nil {
		return fmt.Errorf("store verification token: %w", err)
	}
	return nil
}

// GetVerificationToken retrieves the user ID associated with a verification token
// Returns 0 if token not found or expired
func (r *RedisClient) GetVerificationToken(ctx context.Context, token string) (int64, error) {
	tokenKey := verificationTokenPrefix + token
	result, err := r.client.Get(ctx, tokenKey).Result()
	if err == redis.Nil {
		return 0, nil // Token not found or expired
	}
	if err != nil {
		return 0, fmt.Errorf("get verification token: %w", err)
	}

	userID, err := strconv.ParseInt(result, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse user id: %w", err)
	}

	return userID, nil
}

// DeleteVerificationToken removes a verification token (after successful verification)
func (r *RedisClient) DeleteVerificationToken(ctx context.Context, token string) error {
	tokenKey := verificationTokenPrefix + token
	if err := r.client.Del(ctx, tokenKey).Err(); err != nil {
		return fmt.Errorf("delete verification token: %w", err)
	}
	return nil
}

// CheckVerificationRateLimit checks if user can send another verification email
// Returns (allowed, remaining count, seconds until reset, error)
// Limit: 3 verification emails per hour per user
func (r *RedisClient) CheckVerificationRateLimit(ctx context.Context, userID int64) (bool, int, int64, error) {
	key := verificationRateLimitKey + strconv.FormatInt(userID, 10)
	window := time.Hour

	// Get current count
	countStr, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		// No previous requests, allow and set counter
		pipe := r.client.Pipeline()
		pipe.Set(ctx, key, "1", window)
		_, err = pipe.Exec(ctx)
		if err != nil {
			return false, 0, 0, fmt.Errorf("set rate limit: %w", err)
		}
		return true, 2, 0, nil // 3 allowed, 1 used, 2 remaining
	}
	if err != nil {
		return false, 0, 0, fmt.Errorf("get rate limit: %w", err)
	}

	count, err := strconv.Atoi(countStr)
	if err != nil {
		return false, 0, 0, fmt.Errorf("parse count: %w", err)
	}

	// Get TTL for retry-after calculation
	ttl, err := r.client.TTL(ctx, key).Result()
	if err != nil {
		return false, 0, 0, fmt.Errorf("get ttl: %w", err)
	}

	// Check limit (3 per hour)
	if count >= 3 {
		return false, 0, int64(ttl.Seconds()), nil
	}

	// Increment counter
	newCount, err := r.client.Incr(ctx, key).Result()
	if err != nil {
		return false, 0, 0, fmt.Errorf("incr rate limit: %w", err)
	}

	remaining := 3 - int(newCount)
	if remaining < 0 {
		remaining = 0
	}

	return true, remaining, 0, nil
}
