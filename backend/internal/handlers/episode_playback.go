package handlers

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type EpisodePlaybackConfig struct {
	EmbyAPIKey              string
	EmbyStreamBaseURL       string
	EmbyStreamPathTemplate  string
	AllowedAnimeIDs         []int64
	ReleaseGrantSecret      string
	ReleaseGrantTTLSeconds  int
	PlaybackRateLimitClient redis.UniversalClient
	PlaybackRateLimit       int
	PlaybackRateWindowSec   int
	MaxConcurrentStreams    int
}

type EpisodePlaybackHandler struct {
	repo                   *repository.EpisodeRepository
	embyAPIKey             string
	embyStreamBaseURL      string
	embyStreamPathTemplate string
	allowedAnimeIDs        map[int64]struct{}
	releaseGrantSecret     string
	releaseGrantTTL        time.Duration
	playbackRateLimiter    *episodePlaybackRateLimiter
	streamSlots            chan struct{}
	httpClient             *http.Client
}

func NewEpisodePlaybackHandler(repo *repository.EpisodeRepository, cfg EpisodePlaybackConfig) *EpisodePlaybackHandler {
	allowedAnimeIDs := make(map[int64]struct{}, len(cfg.AllowedAnimeIDs))
	for _, animeID := range cfg.AllowedAnimeIDs {
		if animeID <= 0 {
			continue
		}
		allowedAnimeIDs[animeID] = struct{}{}
	}

	streamPathTemplate := strings.TrimSpace(cfg.EmbyStreamPathTemplate)
	if streamPathTemplate == "" || !strings.Contains(streamPathTemplate, "%s") {
		streamPathTemplate = "/Videos/%s/stream"
	}
	rateWindow := time.Duration(cfg.PlaybackRateWindowSec) * time.Second
	playbackRateLimiter := newEpisodePlaybackRateLimiter(
		cfg.PlaybackRateLimitClient,
		cfg.PlaybackRateLimit,
		rateWindow,
	)

	var streamSlots chan struct{}
	if cfg.MaxConcurrentStreams > 0 {
		streamSlots = make(chan struct{}, cfg.MaxConcurrentStreams)
	}

	return &EpisodePlaybackHandler{
		repo:                   repo,
		embyAPIKey:             strings.TrimSpace(cfg.EmbyAPIKey),
		embyStreamBaseURL:      strings.TrimSpace(cfg.EmbyStreamBaseURL),
		embyStreamPathTemplate: streamPathTemplate,
		allowedAnimeIDs:        allowedAnimeIDs,
		releaseGrantSecret:     strings.TrimSpace(cfg.ReleaseGrantSecret),
		releaseGrantTTL:        time.Duration(cfg.ReleaseGrantTTLSeconds) * time.Second,
		playbackRateLimiter:    playbackRateLimiter,
		streamSlots:            streamSlots,
		httpClient: &http.Client{
			Timeout: 0,
		},
	}
}

func (h *EpisodePlaybackHandler) CreatePlaybackGrant(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}

	episodeID, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige episode id")
		return
	}
	if !h.enforcePlaybackRateLimit(c, "grant", playbackPrincipalForUserID(identity.UserID)) {
		return
	}

	episode, ok := h.loadPlayableEpisode(c, episodeID)
	if !ok {
		return
	}
	sourceURL := firstNonEmpty(episode.StreamLinks)
	if sourceURL == "" {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "stream nicht gefunden",
			},
		})
		return
	}

	if h.releaseGrantTTL <= 0 || strings.TrimSpace(h.releaseGrantSecret) == "" {
		log.Printf("episode playback grant: grant config unavailable (episode_id=%d, user_id=%d)", episodeID, identity.UserID)
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream grant voruebergehend nicht verfuegbar",
			},
		})
		return
	}

	grantToken, expiresAt, err := auth.CreateReleaseStreamGrant(
		episodeID,
		identity.UserID,
		h.releaseGrantSecret,
		time.Now(),
		h.releaseGrantTTL,
	)
	if err != nil {
		log.Printf("episode playback grant: signing failed (episode_id=%d, user_id=%d): %v", episodeID, identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"episode_id":  episodeID,
			"grant_token": grantToken,
			"expires_at":  expiresAt,
			"ttl_seconds": int64(h.releaseGrantTTL / time.Second),
			"issued_for":  identity.UserID,
		},
	})
}

func (h *EpisodePlaybackHandler) Play(c *gin.Context) {
	episodeID, err := parseEpisodeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige episode id")
		return
	}

	principal, ok := h.authorizePlayback(c, episodeID)
	if !ok {
		return
	}
	if !h.enforcePlaybackRateLimit(c, "play", principal) {
		return
	}
	releaseSlot, ok := h.acquirePlaybackSlot(c)
	if !ok {
		return
	}
	defer releaseSlot()

	if strings.TrimSpace(h.embyAPIKey) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream derzeit nicht verfuegbar",
			},
		})
		return
	}

	episode, ok := h.loadPlayableEpisode(c, episodeID)
	if !ok {
		return
	}

	sourceURL := firstNonEmpty(episode.StreamLinks)
	if sourceURL == "" {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "stream nicht gefunden",
			},
		})
		return
	}

	targetURL, err := h.buildEmbyStreamURL(sourceURL)
	if err != nil {
		log.Printf("episode_playback: build stream url failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "stream nicht erreichbar",
			},
		})
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		log.Printf("episode_playback: create outbound request failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}
	copyProxyHeaders(c.Request.Header, req.Header)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		log.Printf("episode_playback: emby request failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error": gin.H{
				"message": "stream nicht erreichbar",
			},
		})
		return
	}
	defer resp.Body.Close()

	copyResponseHeaders(resp.Header, c.Writer.Header())
	c.Status(resp.StatusCode)

	if _, err := io.Copy(c.Writer, resp.Body); err != nil {
		log.Printf("episode_playback: proxy copy failed (episode_id=%d): %v", episodeID, err)
	}
}

func (h *EpisodePlaybackHandler) authorizePlayback(c *gin.Context, episodeID int64) (string, bool) {
	if identity, ok := middleware.CommentAuthIdentityFromContext(c); ok && identity.UserID > 0 {
		return playbackPrincipalForUserID(identity.UserID), true
	}

	grantToken := strings.TrimSpace(c.Query("grant"))
	if grantToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return "", false
	}

	if strings.TrimSpace(h.releaseGrantSecret) == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"message": "stream grant voruebergehend nicht verfuegbar",
			},
		})
		return "", false
	}

	claims, err := auth.ParseAndVerifyReleaseStreamGrant(grantToken, h.releaseGrantSecret, time.Now())
	if err != nil || claims.ReleaseID != episodeID {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "ungueltiger stream grant",
			},
		})
		return "", false
	}

	return playbackPrincipalForUserID(claims.UserID), true
}

func (h *EpisodePlaybackHandler) loadPlayableEpisode(c *gin.Context, episodeID int64) (*models.EpisodeDetail, bool) {
	episode, err := h.repo.GetByID(c.Request.Context(), episodeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "episode nicht gefunden",
			},
		})
		return nil, false
	}
	if err != nil {
		log.Printf("episode_playback: load episode failed (episode_id=%d): %v", episodeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return nil, false
	}

	if len(h.allowedAnimeIDs) > 0 {
		if _, ok := h.allowedAnimeIDs[episode.AnimeID]; !ok {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"message": "stream nicht gefunden",
				},
			})
			return nil, false
		}
	}

	return episode, true
}

func (h *EpisodePlaybackHandler) buildEmbyStreamURL(sourceURL string) (string, error) {
	parsedSource, err := url.Parse(strings.TrimSpace(sourceURL))
	if err != nil {
		return "", fmt.Errorf("parse source url: %w", err)
	}

	itemID, err := extractEmbyItemID(parsedSource)
	if err != nil {
		return "", err
	}

	baseURL := strings.TrimSpace(h.embyStreamBaseURL)
	if baseURL == "" {
		baseURL = parsedSource.Scheme + "://" + parsedSource.Host
	}

	parsedBase, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("parse emby base url: %w", err)
	}

	streamPath := fmt.Sprintf(h.embyStreamPathTemplate, itemID)
	parsedBase.Path = path.Clean("/" + strings.TrimPrefix(streamPath, "/"))

	query := parsedBase.Query()
	query.Set("api_key", h.embyAPIKey)
	query.Set("static", "true")
	parsedBase.RawQuery = query.Encode()

	return parsedBase.String(), nil
}

func extractEmbyItemID(sourceURL *url.URL) (string, error) {
	if sourceURL == nil {
		return "", fmt.Errorf("source url missing")
	}

	if itemID := strings.TrimSpace(sourceURL.Query().Get("id")); itemID != "" {
		return itemID, nil
	}

	fragment := strings.TrimSpace(sourceURL.Fragment)
	if fragment != "" {
		trimmed := strings.TrimPrefix(fragment, "!")
		if !strings.HasPrefix(trimmed, "/") {
			trimmed = "/" + trimmed
		}
		parsedFragment, err := url.Parse(trimmed)
		if err == nil {
			if itemID := strings.TrimSpace(parsedFragment.Query().Get("id")); itemID != "" {
				return itemID, nil
			}
		}
	}

	parts := strings.Split(strings.Trim(sourceURL.Path, "/"), "/")
	for i := 0; i < len(parts)-1; i++ {
		if !strings.EqualFold(parts[i], "Videos") {
			continue
		}

		itemID := strings.TrimSpace(parts[i+1])
		if itemID != "" {
			return itemID, nil
		}
	}

	return "", fmt.Errorf("emby item id missing in source url")
}

func copyProxyHeaders(src http.Header, dst http.Header) {
	rangeHeader := strings.TrimSpace(src.Get("Range"))
	if rangeHeader != "" {
		dst.Set("Range", rangeHeader)
	}

	userAgent := strings.TrimSpace(src.Get("User-Agent"))
	if userAgent != "" {
		dst.Set("User-Agent", userAgent)
	}
}

func copyResponseHeaders(src http.Header, dst http.Header) {
	allowed := []string{
		"Content-Type",
		"Content-Length",
		"Content-Range",
		"Accept-Ranges",
		"Content-Disposition",
		"Cache-Control",
		"ETag",
		"Last-Modified",
	}
	for _, key := range allowed {
		value := strings.TrimSpace(src.Get(key))
		if value != "" {
			dst.Set(key, value)
		}
	}
}

func firstNonEmpty(items []string) string {
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
