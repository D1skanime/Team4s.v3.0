package middleware

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

	"team4s.v3/backend/internal/observability"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const commentRateLimitExceededMessage = "zu viele anfragen, bitte spaeter erneut versuchen"
const commentRateLimitInternalErrorMessage = "interner serverfehler"
const commentRateLimitDegradedHeader = "X-Comment-RateLimit-Degraded"

var ErrCommentRateLimitStoreUnavailable = errors.New("comment rate limit store unavailable")

var commentRateLimitScript = redis.NewScript(`
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return current
`)

type commentRateLimitStore interface {
	IncrementWindow(ctx context.Context, key string, ttl time.Duration) (int64, error)
}

type CommentRateLimiter struct {
	store   commentRateLimitStore
	limit   int
	window  time.Duration
	nowFunc func() time.Time
	prefix  string
}

type redisCommentRateLimitStore struct {
	client redis.UniversalClient
}

func NewCommentRateLimiter(client redis.UniversalClient, limit int, window time.Duration) *CommentRateLimiter {
	return newCommentRateLimiterWithStore(&redisCommentRateLimitStore{client: client}, limit, window)
}

func newCommentRateLimiterWithStore(store commentRateLimitStore, limit int, window time.Duration) *CommentRateLimiter {
	return &CommentRateLimiter{
		store:   store,
		limit:   limit,
		window:  window,
		nowFunc: time.Now,
		prefix:  "comment_rate_limit",
	}
}

func (s *redisCommentRateLimitStore) IncrementWindow(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	count, err := commentRateLimitScript.Run(ctx, s.client, []string{key}, ttl.Milliseconds()).Int64()
	if err != nil {
		return 0, fmt.Errorf("%w: increment redis key %q: %v", ErrCommentRateLimitStoreUnavailable, key, err)
	}
	return count, nil
}

func (l *CommentRateLimiter) Allow(ctx context.Context, key string) (bool, time.Duration, error) {
	now := l.nowFunc().UTC()
	key = strings.TrimSpace(key)
	if key == "" {
		key = "unknown"
	}
	if l.limit <= 0 {
		return false, 0, fmt.Errorf("invalid limiter configuration: limit must be > 0")
	}
	windowSeconds := int64(l.window / time.Second)
	if windowSeconds <= 0 {
		return false, 0, fmt.Errorf("invalid limiter configuration: window must be >= 1s")
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

func CommentCreateRateLimitMiddleware(limiter *CommentRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		allowed, retryAfter, err := limiter.Allow(c.Request.Context(), c.ClientIP())
		if err != nil {
			if errors.Is(err, ErrCommentRateLimitStoreUnavailable) {
				total := observability.IncCommentRateLimitDegraded()
				log.Printf(
					"event=redis_comment_rate_limit_degraded component=comment_rate_limit path=%s method=%s client_ip=%s total=%d error=%v",
					c.FullPath(),
					c.Request.Method,
					c.ClientIP(),
					total,
					err,
				)
				c.Header(commentRateLimitDegradedHeader, "true")
				c.Next()
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": commentRateLimitInternalErrorMessage,
				},
			})
			c.Abort()
			return
		}

		if allowed {
			c.Next()
			return
		}

		retryAfterSeconds := int(math.Ceil(retryAfter.Seconds()))
		if retryAfterSeconds < 1 {
			retryAfterSeconds = 1
		}

		c.Header("Retry-After", strconv.Itoa(retryAfterSeconds))
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": gin.H{
				"message": commentRateLimitExceededMessage,
			},
		})
		c.Abort()
	}
}
