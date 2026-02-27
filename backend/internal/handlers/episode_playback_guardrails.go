package handlers

import (
	"context"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	episodePlaybackRateLimitExceededMessage    = "zu viele anfragen, bitte spaeter erneut versuchen"
	episodePlaybackRateLimitUnavailableMessage = "stream-rate-limit voruebergehend nicht verfuegbar"
	episodePlaybackOverloadedMessage           = "stream derzeit ueberlastet"
)

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

	clientIP := extractClientIP(c)

	// Check user-based rate limit
	userKey := strings.TrimSpace(action) + ":" + strings.TrimSpace(principal)
	userAllowed, userRetryAfter, userErr := h.playbackRateLimiter.Allow(c.Request.Context(), userKey)

	// Check IP-based rate limit
	ipKey := strings.TrimSpace(action) + ":" + playbackPrincipalForIP(clientIP)
	ipAllowed, ipRetryAfter, ipErr := h.playbackRateLimiter.Allow(c.Request.Context(), ipKey)

	if userErr != nil || ipErr != nil {
		log.Printf(
			"episode_playback: rate limit store unavailable (path=%s method=%s action=%s principal=%s client_ip=%s): user_err=%v ip_err=%v",
			c.FullPath(),
			c.Request.Method,
			action,
			principal,
			clientIP,
			userErr,
			ipErr,
		)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": episodePlaybackRateLimitUnavailableMessage,
			},
		})
		return false
	}

	if !userAllowed || !ipAllowed {
		if h.auditLogger != nil {
			h.auditLogger.logRateLimitViolation(c.Request.Context(), action, principal, clientIP)
		}

		retryAfter := userRetryAfter
		if ipRetryAfter > retryAfter {
			retryAfter = ipRetryAfter
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

	return true
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
