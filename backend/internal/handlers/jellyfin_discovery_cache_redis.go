package handlers

// Redis-Adapter fuer discoveryCacheStore (165-01/D-19, Nachtrag zur Redis-Verdrahtung).
//
// buildJellyfinDiscoverySnapshot haengt bewusst nur vom schmalen discoveryCacheStore-
// Interface ab (siehe jellyfin_discovery_cache.go), nicht vom konkreten *redis.Client,
// damit die Cache-Logik ohne laufendes Redis unit-testbar bleibt. redisDiscoveryCache
// ist der duenne Adapter, der den echten *redis.Client (backend/internal/database/redis.go)
// auf dieses Interface abbildet, weil die go-redis-v9-Methodensignaturen
// (Get(...).Result(), Set(...).Err()) nicht direkt zum String/error-Interface passen.

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// redisDiscoveryCache adaptiert *redis.Client auf discoveryCacheStore.
type redisDiscoveryCache struct {
	client *redis.Client
}

// NewRedisDiscoveryCache verdrahtet den echten Redis-Client als Discovery-Snapshot-Cache
// (main.go). Rueckgabetyp ist bewusst das unexportierte discoveryCacheStore-Interface --
// Aufrufer aus anderen Paketen reichen den Rueckgabewert direkt an
// AdminContentHandler.WithDiscoveryCacheDeps weiter, ohne den konkreten Typnamen zu kennen.
func NewRedisDiscoveryCache(client *redis.Client) discoveryCacheStore {
	return redisDiscoveryCache{client: client}
}

func (c redisDiscoveryCache) Get(ctx context.Context, key string) (string, error) {
	return c.client.Get(ctx, key).Result()
}

func (c redisDiscoveryCache) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return c.client.Set(ctx, key, value, ttl).Err()
}
