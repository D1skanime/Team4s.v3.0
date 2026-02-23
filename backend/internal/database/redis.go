package database

import (
	"context"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(ctx context.Context, addr string, password string, db int) (*redis.Client, error) {
	trimmedAddr := strings.TrimSpace(addr)
	if trimmedAddr == "" {
		return nil, fmt.Errorf("REDIS_ADDR is empty")
	}

	client := redis.NewClient(&redis.Options{
		Addr:         trimmedAddr,
		Password:     password,
		DB:           db,
		PoolSize:     20,
		MinIdleConns: 2,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return client, nil
}
