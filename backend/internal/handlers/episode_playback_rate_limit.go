package handlers

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
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

func playbackPrincipalForUserID(userID int64) string {
	return fmt.Sprintf("user:%d", userID)
}
