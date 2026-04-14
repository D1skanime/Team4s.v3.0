package handlers

import (
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/repository"

	"github.com/redis/go-redis/v9"
)

// EpisodePlaybackConfig enthält alle Konfigurationsparameter für den EpisodePlaybackHandler.
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

// EpisodePlaybackHandler verwaltet HTTP-Endpunkte für Episode-Wiedergabe, Stream-Grants und Rate-Limiting.
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
	grantStore             grantTokenStore
	auditLogger            *playbackAuditLogger
}

// NewEpisodePlaybackHandler erstellt einen neuen EpisodePlaybackHandler mit Repository und vollständiger Konfiguration.
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
		playbackRateLimiter: newEpisodePlaybackRateLimiter(
			cfg.PlaybackRateLimitClient,
			cfg.PlaybackRateLimit,
			time.Duration(cfg.PlaybackRateWindowSec)*time.Second,
		),
		streamSlots:  streamSlots,
		grantStore:   newGrantTokenStore(cfg.PlaybackRateLimitClient),
		auditLogger:  newPlaybackAuditLogger(cfg.PlaybackRateLimitClient),
		httpClient: &http.Client{
			Timeout: 0,
		},
	}
}
