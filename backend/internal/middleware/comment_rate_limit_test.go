package middleware

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"team4s.v3/backend/internal/observability"

	"github.com/gin-gonic/gin"
)

type fakeCommentRateLimitStore struct {
	err    error
	counts map[string]int64
}

func (s *fakeCommentRateLimitStore) IncrementWindow(_ context.Context, key string, _ time.Duration) (int64, error) {
	if s.err != nil {
		return 0, s.err
	}
	if s.counts == nil {
		s.counts = make(map[string]int64)
	}
	s.counts[key]++
	return s.counts[key], nil
}

func TestCommentRateLimiterAllow(t *testing.T) {
	now := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 2, time.Minute)
	limiter.nowFunc = func() time.Time {
		return now
	}

	allowed, retryAfter, err := limiter.Allow(context.Background(), "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !allowed {
		t.Fatalf("expected first request to be allowed")
	}
	if retryAfter != 0 {
		t.Fatalf("expected retryAfter to be zero, got %s", retryAfter)
	}

	allowed, retryAfter, err = limiter.Allow(context.Background(), "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !allowed {
		t.Fatalf("expected second request to be allowed")
	}
	if retryAfter != 0 {
		t.Fatalf("expected retryAfter to be zero, got %s", retryAfter)
	}

	allowed, retryAfter, err = limiter.Allow(context.Background(), "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if allowed {
		t.Fatalf("expected third request to be blocked")
	}
	if retryAfter <= 0 {
		t.Fatalf("expected positive retryAfter for blocked request")
	}
}

func TestCommentRateLimiterResetsAfterWindow(t *testing.T) {
	now := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 1, 30*time.Second)
	limiter.nowFunc = func() time.Time {
		return now
	}

	allowed, _, err := limiter.Allow(context.Background(), "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !allowed {
		t.Fatalf("expected first request to be allowed")
	}

	allowed, retryAfter, err := limiter.Allow(context.Background(), "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if allowed {
		t.Fatalf("expected second request to be blocked")
	}
	if retryAfter != 30*time.Second {
		t.Fatalf("expected retryAfter 30s, got %s", retryAfter)
	}

	now = now.Add(31 * time.Second)

	allowed, retryAfter, err = limiter.Allow(context.Background(), "127.0.0.1")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !allowed {
		t.Fatalf("expected request after window to be allowed")
	}
	if retryAfter != 0 {
		t.Fatalf("expected retryAfter to be zero, got %s", retryAfter)
	}
}

func TestCommentRateLimiterUsesUnknownForEmptyKey(t *testing.T) {
	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 1, time.Minute)

	allowed, _, err := limiter.Allow(context.Background(), "")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !allowed {
		t.Fatalf("expected first request to be allowed")
	}

	allowed, _, err = limiter.Allow(context.Background(), "")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if allowed {
		t.Fatalf("expected second request to be blocked for same empty key")
	}
}

func TestCommentCreateRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 1, time.Minute)
	limiter.nowFunc = func() time.Time {
		return now
	}

	router := gin.New()
	router.POST("/comments", CommentCreateRateLimitMiddleware(limiter), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req1 := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req1.RemoteAddr = "127.0.0.1:12345"
	rec1 := httptest.NewRecorder()
	router.ServeHTTP(rec1, req1)

	if rec1.Code != http.StatusCreated {
		t.Fatalf("expected first request status %d, got %d", http.StatusCreated, rec1.Code)
	}

	req2 := httptest.NewRequest(http.MethodPost, "/comments", nil)
	req2.RemoteAddr = "127.0.0.1:12345"
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second request status %d, got %d", http.StatusTooManyRequests, rec2.Code)
	}
	if got := rec2.Header().Get("Retry-After"); got != "60" {
		t.Fatalf("expected Retry-After header %q, got %q", "60", got)
	}
	if body := rec2.Body.String(); body == "" {
		t.Fatalf("expected non-empty response body")
	}
}

func TestCommentCreateRateLimitMiddlewareStoreError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	before := observability.GetDegradedCounters()

	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{
		err: fmt.Errorf("%w: redis unavailable", ErrCommentRateLimitStoreUnavailable),
	}, 1, time.Minute)

	router := gin.New()
	router.POST("/comments", CommentCreateRateLimitMiddleware(limiter), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d", http.StatusCreated, rec.Code)
	}
	if got := rec.Header().Get(commentRateLimitDegradedHeader); got != "true" {
		t.Fatalf("expected degraded header %q, got %q", "true", got)
	}

	after := observability.GetDegradedCounters()
	if after.CommentRateLimitDegradedTotal < before.CommentRateLimitDegradedTotal+1 {
		t.Fatalf(
			"expected comment rate degraded counter to increase by at least 1 (before=%d after=%d)",
			before.CommentRateLimitDegradedTotal,
			after.CommentRateLimitDegradedTotal,
		)
	}
}

func TestCommentCreateRateLimitMiddlewareInvalidConfig(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 0, time.Minute)

	router := gin.New()
	router.POST("/comments", CommentCreateRateLimitMiddleware(limiter), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodPost, "/comments", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, rec.Code)
	}
}

// withFakeIdentity setzt eine AuthIdentity direkt im Gin-Kontext, bevor die Middleware
// unter Test läuft — simuliert die vorgeschaltete authMiddleware ohne echte Keycloak-
// Verifikation (Unit-Test-Grenze der Rate-Limit-Middleware selbst).
func withFakeIdentity(appUserID int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(commentAuthIdentityContextKey, AuthIdentity{
			UserID:      appUserID,
			DisplayName: "Testnutzer",
			AppUserID:   appUserID,
		})
		c.Next()
	}
}

func TestFansubGroupHintRateLimitMiddlewareAllowsUpToLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 2, 24*time.Hour)
	limiter.nowFunc = func() time.Time {
		return now
	}

	router := gin.New()
	router.POST("/me/fansub-group-hints", withFakeIdentity(42), FansubGroupHintDailyLimitMiddleware(limiter), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/me/fansub-group-hints", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("expected request %d to be allowed (status %d), got %d", i+1, http.StatusCreated, rec.Code)
		}
	}
}

func TestFansubGroupHintRateLimitMiddlewareDeniesBeyondLimitWithRetryAfter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 1, 24*time.Hour)
	limiter.nowFunc = func() time.Time {
		return now
	}

	router := gin.New()
	router.POST("/me/fansub-group-hints", withFakeIdentity(7), FansubGroupHintDailyLimitMiddleware(limiter), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req1 := httptest.NewRequest(http.MethodPost, "/me/fansub-group-hints", nil)
	rec1 := httptest.NewRecorder()
	router.ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusCreated {
		t.Fatalf("expected first request allowed, got %d", rec1.Code)
	}

	req2 := httptest.NewRequest(http.MethodPost, "/me/fansub-group-hints", nil)
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second request denied with %d, got %d", http.StatusTooManyRequests, rec2.Code)
	}
	if got := rec2.Header().Get("Retry-After"); got == "" {
		t.Fatalf("expected non-empty Retry-After header")
	}
	if body := rec2.Body.String(); body == "" {
		t.Fatalf("expected non-empty response body")
	}
}

func TestFansubGroupHintRateLimitMiddlewareDifferentAppUsersHaveIndependentLimits(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Date(2026, 2, 10, 10, 0, 0, 0, time.UTC)
	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 1, 24*time.Hour)
	limiter.nowFunc = func() time.Time {
		return now
	}

	routerFor := func(appUserID int64) *gin.Engine {
		router := gin.New()
		router.POST("/me/fansub-group-hints", withFakeIdentity(appUserID), FansubGroupHintDailyLimitMiddleware(limiter), func(c *gin.Context) {
			c.Status(http.StatusCreated)
		})
		return router
	}

	rec1 := httptest.NewRecorder()
	routerFor(1).ServeHTTP(rec1, httptest.NewRequest(http.MethodPost, "/me/fansub-group-hints", nil))
	if rec1.Code != http.StatusCreated {
		t.Fatalf("expected app user 1's first request allowed, got %d", rec1.Code)
	}

	rec2 := httptest.NewRecorder()
	routerFor(2).ServeHTTP(rec2, httptest.NewRequest(http.MethodPost, "/me/fansub-group-hints", nil))
	if rec2.Code != http.StatusCreated {
		t.Fatalf("expected app user 2's first request allowed despite app user 1's limit, got %d", rec2.Code)
	}
}

func TestFansubGroupHintRateLimitMiddlewareFailsClosedWithoutIdentity(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{}, 10, 24*time.Hour)

	router := gin.New()
	router.POST("/me/fansub-group-hints", FansubGroupHintDailyLimitMiddleware(limiter), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodPost, "/me/fansub-group-hints", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d when no identity in context, got %d", http.StatusInternalServerError, rec.Code)
	}
}

func TestFansubGroupHintRateLimitMiddlewareDegradesOnStoreError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	before := observability.GetDegradedCounters()

	limiter := newCommentRateLimiterWithStore(&fakeCommentRateLimitStore{
		err: fmt.Errorf("%w: redis unavailable", ErrCommentRateLimitStoreUnavailable),
	}, 10, 24*time.Hour)

	router := gin.New()
	router.POST("/me/fansub-group-hints", withFakeIdentity(99), FansubGroupHintDailyLimitMiddleware(limiter), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodPost, "/me/fansub-group-hints", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected fail-open status %d, got %d", http.StatusCreated, rec.Code)
	}
	if got := rec.Header().Get(commentRateLimitDegradedHeader); got != "true" {
		t.Fatalf("expected degraded header %q, got %q", "true", got)
	}

	after := observability.GetDegradedCounters()
	if after.CommentRateLimitDegradedTotal < before.CommentRateLimitDegradedTotal+1 {
		t.Fatalf(
			"expected comment rate degraded counter to increase by at least 1 (before=%d after=%d)",
			before.CommentRateLimitDegradedTotal,
			after.CommentRateLimitDegradedTotal,
		)
	}
}
