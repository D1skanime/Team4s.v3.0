package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"team4s.v3/backend/internal/auth"

	"github.com/gin-gonic/gin"
)

type fakeEpisodePlaybackRateLimitStore struct {
	err    error
	counts map[string]int64
}

func (s *fakeEpisodePlaybackRateLimitStore) IncrementWindow(_ context.Context, key string, _ time.Duration) (int64, error) {
	if s.err != nil {
		return 0, s.err
	}
	if s.counts == nil {
		s.counts = make(map[string]int64)
	}
	s.counts[key]++
	return s.counts[key], nil
}

func TestExtractEmbyItemID_FromWebFragment(t *testing.T) {
	parsed, err := url.Parse("https://anime.team4s.de/web/index.html#!/item?id=6424&serverId=abc&context=tvshows")
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}

	itemID, err := extractEmbyItemID(parsed)
	if err != nil {
		t.Fatalf("extract item id: %v", err)
	}
	if itemID != "6424" {
		t.Fatalf("unexpected item id: %s", itemID)
	}
}

func TestExtractEmbyItemID_FromQuery(t *testing.T) {
	parsed, err := url.Parse("https://anime.team4s.de/item?id=991")
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}

	itemID, err := extractEmbyItemID(parsed)
	if err != nil {
		t.Fatalf("extract item id: %v", err)
	}
	if itemID != "991" {
		t.Fatalf("unexpected item id: %s", itemID)
	}
}

func TestExtractEmbyItemID_Missing(t *testing.T) {
	parsed, err := url.Parse("https://anime.team4s.de/web/index.html")
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}

	if _, err := extractEmbyItemID(parsed); err == nil {
		t.Fatalf("expected error for missing item id")
	}
}

func TestAuthorizePlayback_RequiresAuthOrGrant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play", nil)

	handler := &EpisodePlaybackHandler{
		releaseGrantSecret: "test-secret",
	}

	if _, ok := handler.authorizePlayback(context, 76); ok {
		t.Fatalf("expected authorization failure without bearer/grant")
	}
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
	if message := decodeErrorMessage(t, recorder.Body.Bytes()); message != "anmeldung erforderlich" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestAuthorizePlayback_ValidGrant(t *testing.T) {
	now := time.Now().UTC()
	grantToken, _, err := auth.CreateReleaseStreamGrant(76, 2, "test-secret", now, time.Minute)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play?grant="+url.QueryEscape(grantToken), nil)

	handler := &EpisodePlaybackHandler{
		releaseGrantSecret: "test-secret",
	}

	principal, ok := handler.authorizePlayback(context, 76)
	if !ok {
		t.Fatalf("expected valid grant authorization")
	}
	if principal != "user:2" {
		t.Fatalf("expected principal user:2, got %q", principal)
	}
}

func TestAuthorizePlayback_InvalidGrantID(t *testing.T) {
	now := time.Now().UTC()
	grantToken, _, err := auth.CreateReleaseStreamGrant(77, 2, "test-secret", now, time.Minute)
	if err != nil {
		t.Fatalf("create grant: %v", err)
	}

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play?grant="+url.QueryEscape(grantToken), nil)

	handler := &EpisodePlaybackHandler{
		releaseGrantSecret: "test-secret",
	}

	if _, ok := handler.authorizePlayback(context, 76); ok {
		t.Fatalf("expected authorization failure for mismatched grant id")
	}
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
	if message := decodeErrorMessage(t, recorder.Body.Bytes()); message != "ungueltiger stream grant" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestEpisodePlaybackRateLimiterAllow(t *testing.T) {
	now := time.Date(2026, 2, 21, 10, 0, 0, 0, time.UTC)
	limiter := &episodePlaybackRateLimiter{
		store:   &fakeEpisodePlaybackRateLimitStore{},
		limit:   2,
		window:  time.Minute,
		nowFunc: func() time.Time { return now },
		prefix:  "episode_playback_rate_limit",
	}

	allowed, retryAfter, err := limiter.Allow(context.Background(), "play:user:1")
	if err != nil {
		t.Fatalf("first allow failed: %v", err)
	}
	if !allowed || retryAfter != 0 {
		t.Fatalf("first request should be allowed without retryAfter")
	}

	allowed, retryAfter, err = limiter.Allow(context.Background(), "play:user:1")
	if err != nil {
		t.Fatalf("second allow failed: %v", err)
	}
	if !allowed || retryAfter != 0 {
		t.Fatalf("second request should be allowed without retryAfter")
	}

	allowed, retryAfter, err = limiter.Allow(context.Background(), "play:user:1")
	if err != nil {
		t.Fatalf("third allow failed: %v", err)
	}
	if allowed {
		t.Fatalf("third request should be rate-limited")
	}
	if retryAfter != 60*time.Second {
		t.Fatalf("expected retryAfter 60s, got %s", retryAfter)
	}
}

func TestEnforcePlaybackRateLimitTooManyRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play", nil)

	handler := &EpisodePlaybackHandler{
		playbackRateLimiter: &episodePlaybackRateLimiter{
			store:   &fakeEpisodePlaybackRateLimitStore{},
			limit:   0,
			window:  time.Minute,
			nowFunc: time.Now,
			prefix:  "episode_playback_rate_limit",
		},
	}
	if ok := handler.enforcePlaybackRateLimit(context, "play", "user:1"); ok {
		t.Fatalf("expected rate-limit failure for invalid limiter config")
	}
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", recorder.Code)
	}
}

func TestEnforcePlaybackRateLimitStoreUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play", nil)

	handler := &EpisodePlaybackHandler{
		playbackRateLimiter: &episodePlaybackRateLimiter{
			store: &fakeEpisodePlaybackRateLimitStore{
				err: fmt.Errorf("%w: redis unavailable", errEpisodePlaybackRateLimitStoreUnavailable),
			},
			limit:   1,
			window:  time.Minute,
			nowFunc: time.Now,
			prefix:  "episode_playback_rate_limit",
		},
	}
	if ok := handler.enforcePlaybackRateLimit(context, "play", "user:1"); ok {
		t.Fatalf("expected rate-limit store failure")
	}
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", recorder.Code)
	}
	if message := decodeErrorMessage(t, recorder.Body.Bytes()); message != episodePlaybackRateLimitUnavailableMessage {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestEnforcePlaybackRateLimitExceeded(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play", nil)

	now := time.Date(2026, 2, 21, 10, 0, 0, 0, time.UTC)
	limiter := &episodePlaybackRateLimiter{
		store:   &fakeEpisodePlaybackRateLimitStore{counts: map[string]int64{}},
		limit:   1,
		window:  time.Minute,
		nowFunc: func() time.Time { return now },
		prefix:  "episode_playback_rate_limit",
	}
	handler := &EpisodePlaybackHandler{
		playbackRateLimiter: limiter,
	}

	firstRecorder := httptest.NewRecorder()
	firstCtx, _ := gin.CreateTestContext(firstRecorder)
	firstCtx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play", nil)
	if ok := handler.enforcePlaybackRateLimit(firstCtx, "play", "user:1"); !ok {
		t.Fatalf("expected first request to pass rate limiter")
	}

	if ok := handler.enforcePlaybackRateLimit(context, "play", "user:1"); ok {
		t.Fatalf("expected second request to hit rate limiter")
	}
	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", recorder.Code)
	}
	if got := recorder.Header().Get("Retry-After"); got != "60" {
		t.Fatalf("expected Retry-After 60, got %q", got)
	}
	if message := decodeErrorMessage(t, recorder.Body.Bytes()); message != episodePlaybackRateLimitExceededMessage {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestEnforcePlaybackRateLimitActionIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	now := time.Date(2026, 2, 21, 10, 0, 0, 0, time.UTC)
	limiter := &episodePlaybackRateLimiter{
		store:   &fakeEpisodePlaybackRateLimitStore{counts: map[string]int64{}},
		limit:   1,
		window:  time.Minute,
		nowFunc: func() time.Time { return now },
		prefix:  "episode_playback_rate_limit",
	}
	handler := &EpisodePlaybackHandler{
		playbackRateLimiter: limiter,
	}

	firstGrantRecorder := httptest.NewRecorder()
	firstGrantCtx, _ := gin.CreateTestContext(firstGrantRecorder)
	firstGrantCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/episodes/76/play/grant", nil)
	if ok := handler.enforcePlaybackRateLimit(firstGrantCtx, "grant", "user:1"); !ok {
		t.Fatalf("expected first grant request to pass rate limiter")
	}

	secondGrantRecorder := httptest.NewRecorder()
	secondGrantCtx, _ := gin.CreateTestContext(secondGrantRecorder)
	secondGrantCtx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/episodes/76/play/grant", nil)
	if ok := handler.enforcePlaybackRateLimit(secondGrantCtx, "grant", "user:1"); ok {
		t.Fatalf("expected second grant request to hit rate limiter")
	}
	if secondGrantRecorder.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second grant status 429, got %d", secondGrantRecorder.Code)
	}

	playRecorder := httptest.NewRecorder()
	playCtx, _ := gin.CreateTestContext(playRecorder)
	playCtx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play", nil)
	if ok := handler.enforcePlaybackRateLimit(playCtx, "play", "user:1"); !ok {
		t.Fatalf("expected play action to be isolated from grant limiter key")
	}
	if playRecorder.Code != http.StatusOK {
		t.Fatalf("expected play action recorder code to remain 200, got %d", playRecorder.Code)
	}
}

func TestAcquirePlaybackSlotOverloaded(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/v1/episodes/76/play", nil)

	slots := make(chan struct{}, 1)
	slots <- struct{}{}
	handler := &EpisodePlaybackHandler{
		streamSlots: slots,
	}

	release, ok := handler.acquirePlaybackSlot(context)
	if ok {
		t.Fatalf("expected acquirePlaybackSlot to fail when full")
	}
	if release != nil {
		t.Fatalf("expected release func to be nil on failure")
	}
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", recorder.Code)
	}
	if got := recorder.Header().Get("Retry-After"); got != "1" {
		t.Fatalf("expected Retry-After 1, got %q", got)
	}
	if message := decodeErrorMessage(t, recorder.Body.Bytes()); message != episodePlaybackOverloadedMessage {
		t.Fatalf("unexpected message: %q", message)
	}
}
