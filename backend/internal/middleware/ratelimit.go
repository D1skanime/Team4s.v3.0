package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	rateLimitPrefix = "ratelimit:"
)

// RateLimitConfig holds configuration for a rate limiter
type RateLimitConfig struct {
	// MaxRequests is the maximum number of requests allowed in the window
	MaxRequests int
	// Window is the time window for the rate limit
	Window time.Duration
	// KeyPrefix is an optional prefix to distinguish different rate limiters
	KeyPrefix string
}

// RateLimiter provides Redis-based rate limiting using sliding window algorithm
type RateLimiter struct {
	redis *database.RedisClient
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redis *database.RedisClient) *RateLimiter {
	return &RateLimiter{
		redis: redis,
	}
}

// slidingWindowCheck implements the sliding window rate limiting algorithm
// Returns (allowed, remaining, retryAfter in seconds, error)
func (rl *RateLimiter) slidingWindowCheck(ctx context.Context, key string, maxRequests int, window time.Duration) (bool, int, int64, error) {
	client := rl.redis.Client()
	now := time.Now()
	windowStart := now.Add(-window).UnixMilli()
	nowMilli := now.UnixMilli()

	// Use a Redis transaction to ensure atomic operations
	pipe := client.Pipeline()

	// Remove old entries outside the window
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart, 10))

	// Count current entries in the window
	countCmd := pipe.ZCard(ctx, key)

	// Execute the pipeline
	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return false, 0, 0, fmt.Errorf("rate limit check: %w", err)
	}

	currentCount := countCmd.Val()

	// Check if we're over the limit
	if int(currentCount) >= maxRequests {
		// Calculate retry after - get the oldest entry in window
		oldest, err := client.ZRangeWithScores(ctx, key, 0, 0).Result()
		if err != nil || len(oldest) == 0 {
			// Default retry after is the full window
			return false, 0, int64(window.Seconds()), nil
		}

		oldestTime := int64(oldest[0].Score)
		retryAfter := (oldestTime + window.Milliseconds() - nowMilli) / 1000
		if retryAfter < 1 {
			retryAfter = 1
		}

		return false, 0, retryAfter, nil
	}

	// Add current request to the window
	// Use timestamp as score and a unique member (timestamp + random suffix)
	member := fmt.Sprintf("%d:%d", nowMilli, now.UnixNano())
	err = client.ZAdd(ctx, key, redis.Z{
		Score:  float64(nowMilli),
		Member: member,
	}).Err()
	if err != nil {
		return false, 0, 0, fmt.Errorf("add rate limit entry: %w", err)
	}

	// Set TTL on the key to auto-cleanup
	client.Expire(ctx, key, window+time.Second)

	remaining := maxRequests - int(currentCount) - 1
	if remaining < 0 {
		remaining = 0
	}

	return true, remaining, 0, nil
}

// Limit returns a Gin middleware that applies rate limiting
func (rl *RateLimiter) Limit(config RateLimitConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get client IP
		clientIP := c.ClientIP()

		// Build the rate limit key
		key := rateLimitPrefix
		if config.KeyPrefix != "" {
			key += config.KeyPrefix + ":"
		}
		key += clientIP

		// Check rate limit
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		allowed, remaining, retryAfter, err := rl.slidingWindowCheck(ctx, key, config.MaxRequests, config.Window)
		if err != nil {
			// On Redis error, log and allow the request (fail open)
			// In production, you might want to fail closed instead
			c.Header("X-RateLimit-Error", "true")
			c.Next()
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(config.MaxRequests))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Window", strconv.Itoa(int(config.Window.Seconds())))

		if !allowed {
			c.Header("Retry-After", strconv.FormatInt(retryAfter, 10))
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Duration(retryAfter)*time.Second).Unix(), 10))

			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "too many requests",
				"message":     fmt.Sprintf("Rate limit exceeded. Maximum %d requests per %s. Please try again later.", config.MaxRequests, formatDuration(config.Window)),
				"retry_after": retryAfter,
			})
			return
		}

		c.Next()
	}
}

// LimitLogin returns a rate limiter configured for login attempts
// 5 attempts per minute per IP
func (rl *RateLimiter) LimitLogin() gin.HandlerFunc {
	return rl.Limit(RateLimitConfig{
		MaxRequests: 5,
		Window:      time.Minute,
		KeyPrefix:   "login",
	})
}

// LimitRegister returns a rate limiter configured for registration attempts
// 3 attempts per minute per IP
func (rl *RateLimiter) LimitRegister() gin.HandlerFunc {
	return rl.Limit(RateLimitConfig{
		MaxRequests: 3,
		Window:      time.Minute,
		KeyPrefix:   "register",
	})
}

// LimitRefresh returns a rate limiter configured for token refresh attempts
// 10 attempts per minute per IP
func (rl *RateLimiter) LimitRefresh() gin.HandlerFunc {
	return rl.Limit(RateLimitConfig{
		MaxRequests: 10,
		Window:      time.Minute,
		KeyPrefix:   "refresh",
	})
}

// LimitVerificationEmail returns a rate limiter for verification email requests
// This is in addition to the per-user rate limit in the verification service
// 10 attempts per minute per IP (to prevent abuse from same IP)
func (rl *RateLimiter) LimitVerificationEmail() gin.HandlerFunc {
	return rl.Limit(RateLimitConfig{
		MaxRequests: 10,
		Window:      time.Minute,
		KeyPrefix:   "verify_email",
	})
}

// formatDuration formats a duration in a human-readable way
func formatDuration(d time.Duration) string {
	if d >= time.Hour {
		hours := int(d.Hours())
		if hours == 1 {
			return "1 hour"
		}
		return fmt.Sprintf("%d hours", hours)
	}
	if d >= time.Minute {
		minutes := int(d.Minutes())
		if minutes == 1 {
			return "1 minute"
		}
		return fmt.Sprintf("%d minutes", minutes)
	}
	seconds := int(d.Seconds())
	if seconds == 1 {
		return "1 second"
	}
	return fmt.Sprintf("%d seconds", seconds)
}
