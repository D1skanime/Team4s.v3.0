package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type grantTokenStore interface {
	MarkUsed(ctx context.Context, grantToken string, ttl time.Duration) error
	IsUsed(ctx context.Context, grantToken string) (bool, error)
}

type redisGrantTokenStore struct {
	client redis.UniversalClient
	prefix string
}

func newGrantTokenStore(client redis.UniversalClient) grantTokenStore {
	if client == nil {
		return nil
	}
	return &redisGrantTokenStore{
		client: client,
		prefix: "episode_playback_grant_used",
	}
}

func (s *redisGrantTokenStore) MarkUsed(ctx context.Context, grantToken string, ttl time.Duration) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("grant store unavailable")
	}
	key := fmt.Sprintf("%s:%s", s.prefix, grantToken)
	return s.client.Set(ctx, key, "1", ttl).Err()
}

func (s *redisGrantTokenStore) IsUsed(ctx context.Context, grantToken string) (bool, error) {
	if s == nil || s.client == nil {
		return false, fmt.Errorf("grant store unavailable")
	}
	key := fmt.Sprintf("%s:%s", s.prefix, grantToken)
	val, err := s.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return val == "1", nil
}
