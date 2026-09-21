package handlers

// Testet den Redis-Adapter (jellyfin_discovery_cache_redis.go) gegen ein echtes
// *redis.Client, das auf eine in-memory miniredis-Instanz zeigt -- dasselbe Muster wie
// episode_playback_security_test.go/repository/auth_test.go, damit kein laufendes echtes
// Redis fuer den Test noetig ist, aber der echte go-redis-v9-Get/Set-Vertrag (inkl. TTL)
// mitgeprueft wird, nicht nur der In-Memory-Fake aus jellyfin_discovery_cache_test.go.

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestRedisDiscoveryCache_SetThenGetRoundTrips(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer client.Close()

	cache := NewRedisDiscoveryCache(client)
	ctx := context.Background()

	if err := cache.Set(ctx, "test-key", `{"a":1}`, time.Minute); err != nil {
		t.Fatalf("Set: %v", err)
	}

	got, err := cache.Get(ctx, "test-key")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != `{"a":1}` {
		t.Fatalf("expected round-tripped value, got %q", got)
	}
}

func TestRedisDiscoveryCache_GetMissReturnsError(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer client.Close()

	cache := NewRedisDiscoveryCache(client)

	if _, err := cache.Get(context.Background(), "missing-key"); err == nil {
		t.Fatal("expected an error (redis.Nil) for a missing key, got nil")
	}
}

func TestRedisDiscoveryCache_ExpiresAfterTTL(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis.Run: %v", err)
	}
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer client.Close()

	cache := NewRedisDiscoveryCache(client)
	ctx := context.Background()

	if err := cache.Set(ctx, "ttl-key", "value", 5*time.Minute); err != nil {
		t.Fatalf("Set: %v", err)
	}

	// discoverySnapshotCacheTTL is 5 minutes (jellyfin_discovery_cache.go); fast-forward
	// miniredis past that window and confirm the key is gone, proving the TTL is actually
	// honored by the adapter's Set call (not just accepted and ignored).
	mr.FastForward(6 * time.Minute)

	if _, err := cache.Get(ctx, "ttl-key"); err == nil {
		t.Fatal("expected the key to have expired after the TTL window")
	}
}

// TestRedisDiscoveryCache_SatisfiesDiscoveryCacheStore is a compile-time assertion that
// NewRedisDiscoveryCache's return value actually implements discoveryCacheStore -- the
// same interface buildJellyfinDiscoverySnapshot (jellyfin_discovery_cache.go) depends on.
func TestRedisDiscoveryCache_SatisfiesDiscoveryCacheStore(t *testing.T) {
	var _ discoveryCacheStore = NewRedisDiscoveryCache(redis.NewClient(&redis.Options{}))
}
