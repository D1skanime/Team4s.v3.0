package handlers

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

func TestPlaybackPrincipalForIP(t *testing.T) {
	ip := "192.168.1.100"
	principal := playbackPrincipalForIP(ip)
	assert.Equal(t, "ip:192.168.1.100", principal)
}

func TestGrantTokenStore(t *testing.T) {
	mr, err := miniredis.Run()
	assert.NoError(t, err)
	defer mr.Close()

	client := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
	defer client.Close()

	store := newGrantTokenStore(client)
	assert.NotNil(t, store)

	ctx := context.Background()
	token := "test-grant-token-123"

	// Initially not used
	used, err := store.IsUsed(ctx, token)
	assert.NoError(t, err)
	assert.False(t, used)

	// Mark as used
	err = store.MarkUsed(ctx, token, 5*time.Second)
	assert.NoError(t, err)

	// Now should be marked as used
	used, err = store.IsUsed(ctx, token)
	assert.NoError(t, err)
	assert.True(t, used)

	// Fast forward time
	mr.FastForward(6 * time.Second)

	// Should expire
	used, err = store.IsUsed(ctx, token)
	assert.NoError(t, err)
	assert.False(t, used)
}

func TestIPRateLimiting(t *testing.T) {
	mr, err := miniredis.Run()
	assert.NoError(t, err)
	defer mr.Close()

	client := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
	defer client.Close()

	limiter := newEpisodePlaybackRateLimiter(client, 3, 60*time.Second)
	assert.NotNil(t, limiter)

	ctx := context.Background()
	ipPrincipal := playbackPrincipalForIP("192.168.1.100")
	action := "play"

	// First 3 requests should succeed
	for i := 0; i < 3; i++ {
		allowed, _, err := limiter.Allow(ctx, action+":"+ipPrincipal)
		assert.NoError(t, err)
		assert.True(t, allowed)
	}

	// 4th request should fail
	allowed, retryAfter, err := limiter.Allow(ctx, action+":"+ipPrincipal)
	assert.NoError(t, err)
	assert.False(t, allowed)
	assert.Greater(t, retryAfter, time.Duration(0))
}

func TestAuditLogger(t *testing.T) {
	mr, err := miniredis.Run()
	assert.NoError(t, err)
	defer mr.Close()

	client := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
	defer client.Close()

	logger := newPlaybackAuditLogger(client)
	assert.NotNil(t, logger)

	ctx := context.Background()

	// Test logging rapid grant requests
	logger.logRapidGrantRequests(ctx, 123, 456, "192.168.1.100")

	key := "audit:rapid_grant:user:123:episode:456"
	val, err := client.Get(ctx, key).Int64()
	assert.NoError(t, err)
	assert.Equal(t, int64(1), val)

	// Test logging multiple IPs
	logger.logMultipleIPsPerUser(ctx, 123, "192.168.1.100")
	logger.logMultipleIPsPerUser(ctx, 123, "192.168.1.101")
	logger.logMultipleIPsPerUser(ctx, 123, "192.168.1.102")

	ipKey := "audit:user_ips:user:123"
	count, err := client.SCard(ctx, ipKey).Result()
	assert.NoError(t, err)
	assert.Equal(t, int64(3), count)
}

func TestGrantTokenStoreNilClient(t *testing.T) {
	store := newGrantTokenStore(nil)
	assert.Nil(t, store)
}

func TestAuditLoggerNilClient(t *testing.T) {
	logger := newPlaybackAuditLogger(nil)
	assert.Nil(t, logger)
}
