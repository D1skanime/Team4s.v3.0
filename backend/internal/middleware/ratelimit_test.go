package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/database"
	"github.com/gin-gonic/gin"
)

func setupTestRateLimiter(t *testing.T) (*RateLimiter, func()) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	ctx := context.Background()
	redis, err := database.NewRedisClient(ctx, redisURL)
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}

	rl := NewRateLimiter(redis)

	cleanup := func() {
		// Clean up test keys
		client := redis.Client()
		keys, _ := client.Keys(ctx, rateLimitPrefix+"test:*").Result()
		if len(keys) > 0 {
			client.Del(ctx, keys...)
		}
		redis.Close()
	}

	return rl, cleanup
}

func TestRateLimiter_AllowsRequestsWithinLimit(t *testing.T) {
	rl, cleanup := setupTestRateLimiter(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Configure rate limit: 5 requests per minute
	router.GET("/test", rl.Limit(RateLimitConfig{
		MaxRequests: 5,
		Window:      time.Minute,
		KeyPrefix:   "test:allow",
	}), func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	// Make 5 requests - all should succeed
	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.100:12345"
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Request %d: expected status 200, got %d", i+1, w.Code)
		}

		// Check rate limit headers
		if w.Header().Get("X-RateLimit-Limit") != "5" {
			t.Errorf("Request %d: expected X-RateLimit-Limit=5, got %s", i+1, w.Header().Get("X-RateLimit-Limit"))
		}

		remaining := w.Header().Get("X-RateLimit-Remaining")
		expectedRemaining := 4 - i
		if expectedRemaining < 0 {
			expectedRemaining = 0
		}
		t.Logf("Request %d: remaining=%s (expected %d)", i+1, remaining, expectedRemaining)
	}
}

func TestRateLimiter_BlocksExcessRequests(t *testing.T) {
	rl, cleanup := setupTestRateLimiter(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Configure rate limit: 3 requests per minute
	router.GET("/test", rl.Limit(RateLimitConfig{
		MaxRequests: 3,
		Window:      time.Minute,
		KeyPrefix:   "test:block",
	}), func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	// Make 3 requests - all should succeed
	for i := 0; i < 3; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.101:12345"
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Request %d: expected status 200, got %d", i+1, w.Code)
		}
	}

	// 4th request should be blocked
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.101:12345"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("Request 4: expected status 429, got %d", w.Code)
	}

	// Check Retry-After header is present
	retryAfter := w.Header().Get("Retry-After")
	if retryAfter == "" {
		t.Error("Expected Retry-After header to be present")
	}

	t.Logf("Request 4: blocked with Retry-After=%s", retryAfter)
}

func TestRateLimiter_DifferentIPsIndependent(t *testing.T) {
	rl, cleanup := setupTestRateLimiter(t)
	defer cleanup()

	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Configure rate limit: 2 requests per minute
	router.GET("/test", rl.Limit(RateLimitConfig{
		MaxRequests: 2,
		Window:      time.Minute,
		KeyPrefix:   "test:ips",
	}), func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	// IP 1: 2 requests
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("IP1 Request %d: expected status 200, got %d", i+1, w.Code)
		}
	}

	// IP 1: 3rd request should be blocked
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("IP1 Request 3: expected status 429, got %d", w.Code)
	}

	// IP 2: Should still be allowed
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "192.168.1.2:12345"
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("IP2 Request 1: expected status 200, got %d", w2.Code)
	}
}

func TestRateLimiter_LoginConfig(t *testing.T) {
	rl, cleanup := setupTestRateLimiter(t)
	defer cleanup()

	// Test that LimitLogin returns a valid middleware
	middleware := rl.LimitLogin()
	if middleware == nil {
		t.Error("LimitLogin should return a non-nil middleware")
	}
}

func TestRateLimiter_RegisterConfig(t *testing.T) {
	rl, cleanup := setupTestRateLimiter(t)
	defer cleanup()

	// Test that LimitRegister returns a valid middleware
	middleware := rl.LimitRegister()
	if middleware == nil {
		t.Error("LimitRegister should return a non-nil middleware")
	}
}

func TestRateLimiter_RefreshConfig(t *testing.T) {
	rl, cleanup := setupTestRateLimiter(t)
	defer cleanup()

	// Test that LimitRefresh returns a valid middleware
	middleware := rl.LimitRefresh()
	if middleware == nil {
		t.Error("LimitRefresh should return a non-nil middleware")
	}
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		duration time.Duration
		expected string
	}{
		{1 * time.Second, "1 second"},
		{30 * time.Second, "30 seconds"},
		{1 * time.Minute, "1 minute"},
		{5 * time.Minute, "5 minutes"},
		{1 * time.Hour, "1 hour"},
		{2 * time.Hour, "2 hours"},
	}

	for _, tt := range tests {
		result := formatDuration(tt.duration)
		if result != tt.expected {
			t.Errorf("formatDuration(%v) = %q, expected %q", tt.duration, result, tt.expected)
		}
	}
}
