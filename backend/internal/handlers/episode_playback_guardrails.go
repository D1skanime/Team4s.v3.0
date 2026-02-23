package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	episodePlaybackRateLimitExceededMessage    = "zu viele anfragen, bitte spaeter erneut versuchen"
	episodePlaybackRateLimitUnavailableMessage = "stream-rate-limit voruebergehend nicht verfuegbar"
	episodePlaybackOverloadedMessage           = "stream derzeit ueberlastet"
)

var (
	errEpisodePlaybackRateLimitStoreUnavailable = errors.New("episode playback rate limit store unavailable")

	episodePlaybackRateLimitScript = redis.NewScript(`
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`)
)

type episodePlaybackRateLimitStore interface {
	IncrementWindow(ctx context.Context, key string, ttl time.Duration) (int64, error)
}

type redisEpisodePlaybackRateLimitStore struct {
	client redis.UniversalClient
}

type episodePlaybackRateLimiter struct {
	store   episodePlaybackRateLimitStore
	limit   int
	window  time.Duration
	nowFunc func() time.Time
	prefix  string
}

func newEpisodePlaybackRateLimiter(
	client redis.UniversalClient,
	limit int,
	window time.Duration,
) *episodePlaybackRateLimiter {
	if client == nil || limit <= 0 || window < time.Second {
		return nil
	}

	return &episodePlaybackRateLimiter{
		store:   &redisEpisodePlaybackRateLimitStore{client: client},
		limit:   limit,
		window:  window,
		nowFunc: time.Now,
		prefix:  "episode_playback_rate_limit",
	}
}

func (s *redisEpisodePlaybackRateLimitStore) IncrementWindow(
	ctx context.Context,
	key string,
	ttl time.Duration,
) (int64, error) {
	count, err := episodePlaybackRateLimitScript.Run(
		ctx,
		s.client,
		[]string{key},
		ttl.Milliseconds(),
	).Int64()
	if err != nil {
		return 0, fmt.Errorf("%w: increment redis key %q: %v", errEpisodePlaybackRateLimitStoreUnavailable, key, err)
	}
	return count, nil
}

func (l *episodePlaybackRateLimiter) Allow(
	ctx context.Context,
	key string,
) (bool, time.Duration, error) {
	if l == nil {
		return true, 0, nil
	}
	if l.limit <= 0 {
		return false, 0, fmt.Errorf("invalid limiter configuration: limit must be > 0")
	}
	windowSeconds := int64(l.window / time.Second)
	if windowSeconds <= 0 {
		return false, 0, fmt.Errorf("invalid limiter configuration: window must be >= 1s")
	}

	now := l.nowFunc().UTC()
	key = strings.TrimSpace(key)
	if key == "" {
		key = "unknown"
	}

	windowStartUnix := now.Unix() - (now.Unix() % windowSeconds)
	storeKey := fmt.Sprintf("%s:%s:%d", l.prefix, key, windowStartUnix)
	count, err := l.store.IncrementWindow(ctx, storeKey, 2*l.window)
	if err != nil {
		return false, 0, err
	}
	if count <= int64(l.limit) {
		return true, 0, nil
	}

	elapsedSeconds := now.Unix() - windowStartUnix
	retryAfterSeconds := windowSeconds - elapsedSeconds
	if retryAfterSeconds < 1 {
		retryAfterSeconds = 1
	}

	return false, time.Duration(retryAfterSeconds) * time.Second, nil
}

func (h *EpisodePlaybackHandler) enforcePlaybackRateLimit(
	c *gin.Context,
	action string,
	principal string,
) bool {
	if h.playbackRateLimiter == nil {
		return true
	}

	key := strings.TrimSpace(action) + ":" + strings.TrimSpace(principal)
	allowed, retryAfter, err := h.playbackRateLimiter.Allow(c.Request.Context(), key)
	if err != nil {
		log.Printf(
			"episode_playback: rate limit store unavailable (path=%s method=%s action=%s principal=%s): %v",
			c.FullPath(),
			c.Request.Method,
			action,
			principal,
			err,
		)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": episodePlaybackRateLimitUnavailableMessage,
			},
		})
		return false
	}

	if allowed {
		return true
	}

	retryAfterSeconds := int(math.Ceil(retryAfter.Seconds()))
	if retryAfterSeconds < 1 {
		retryAfterSeconds = 1
	}

	c.Header("Retry-After", strconv.Itoa(retryAfterSeconds))
	c.JSON(http.StatusTooManyRequests, gin.H{
		"error": gin.H{
			"message": episodePlaybackRateLimitExceededMessage,
		},
	})
	return false
}

func (h *EpisodePlaybackHandler) acquirePlaybackSlot(c *gin.Context) (func(), bool) {
	if h.streamSlots == nil {
		return func() {}, true
	}

	select {
	case h.streamSlots <- struct{}{}:
		return func() {
			<-h.streamSlots
		}, true
	default:
		c.Header("Retry-After", "1")
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": episodePlaybackOverloadedMessage,
			},
		})
		return nil, false
	}
}

func playbackPrincipalForUserID(userID int64) string {
	return fmt.Sprintf("user:%d", userID)
}
