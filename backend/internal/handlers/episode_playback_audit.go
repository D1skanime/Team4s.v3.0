package handlers

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type playbackAuditLogger struct {
	client redis.UniversalClient
}

func newPlaybackAuditLogger(client redis.UniversalClient) *playbackAuditLogger {
	if client == nil {
		return nil
	}
	return &playbackAuditLogger{client: client}
}

func (a *playbackAuditLogger) logRapidGrantRequests(ctx context.Context, userID int64, episodeID int64, clientIP string) {
	log.Printf(
		"AUDIT: rapid grant requests detected (user_id=%d, episode_id=%d, client_ip=%s)",
		userID,
		episodeID,
		clientIP,
	)

	if a != nil && a.client != nil {
		key := fmt.Sprintf("audit:rapid_grant:user:%d:episode:%d", userID, episodeID)
		a.client.Incr(ctx, key)
		a.client.Expire(ctx, key, 24*time.Hour)
	}
}

func (a *playbackAuditLogger) logMultipleIPsPerUser(ctx context.Context, userID int64, clientIP string) {
	if a == nil || a.client == nil {
		return
	}

	key := fmt.Sprintf("audit:user_ips:user:%d", userID)
	added, err := a.client.SAdd(ctx, key, clientIP).Result()
	if err != nil {
		return
	}

	if added > 0 {
		count, err := a.client.SCard(ctx, key).Result()
		if err == nil && count > 3 {
			log.Printf(
				"AUDIT: multiple IPs detected for user (user_id=%d, ip_count=%d, latest_ip=%s)",
				userID,
				count,
				clientIP,
			)
		}
		a.client.Expire(ctx, key, 24*time.Hour)
	}
}

func (a *playbackAuditLogger) logRateLimitViolation(ctx context.Context, action string, principal string, clientIP string) {
	log.Printf(
		"AUDIT: rate limit violated (action=%s, principal=%s, client_ip=%s)",
		action,
		principal,
		clientIP,
	)

	if a != nil && a.client != nil {
		key := fmt.Sprintf("audit:rate_limit:principal:%s", principal)
		a.client.Incr(ctx, key)
		a.client.Expire(ctx, key, 1*time.Hour)
	}
}

func (a *playbackAuditLogger) logGrantReplayAttempt(ctx context.Context, userID int64, episodeID int64, clientIP string) {
	log.Printf(
		"AUDIT: grant replay attempt detected (user_id=%d, episode_id=%d, client_ip=%s)",
		userID,
		episodeID,
		clientIP,
	)

	if a != nil && a.client != nil {
		key := fmt.Sprintf("audit:grant_replay:user:%d", userID)
		a.client.Incr(ctx, key)
		a.client.Expire(ctx, key, 24*time.Hour)
	}
}
