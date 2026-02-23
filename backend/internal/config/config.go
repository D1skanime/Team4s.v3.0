package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                         string
	RuntimeProfile               string
	DatabaseURL                  string
	AuthTokenSecret              string
	AuthAdminRoleName            string
	AuthAdminBootstrapUserIDs    []int64
	EmbyAPIKey                   string
	EmbyStreamBaseURL            string
	EmbyStreamPathTemplate       string
	EmbyAllowedAnimeIDs          []int64
	JellyfinAPIKey               string
	JellyfinBaseURL              string
	JellyfinStreamPathTemplate   string
	AuthAccessTokenTTLSeconds    int
	AuthRefreshTokenTTLSeconds   int
	RedisAddr                    string
	RedisPassword                string
	RedisDB                      int
	AuthIssueDevMode             bool
	AuthIssueDevUserID           int64
	AuthIssueDevDisplayName      string
	AuthIssueDevKey              string
	ReleaseStreamGrantSecret     string
	ReleaseStreamGrantTTLSeconds int
	EpisodePlaybackRateLimit     int
	EpisodePlaybackRateWindowSec int
	EpisodePlaybackMaxConcurrent int
}

func Load() Config {
	bootstrapAdminUserIDs := getEnvInt64List("AUTH_ADMIN_BOOTSTRAP_USER_IDS", nil)

	return Config{
		Port:                         getEnv("PORT", "8092"),
		RuntimeProfile:               getEnv("RUNTIME_PROFILE", "local"),
		DatabaseURL:                  os.Getenv("DATABASE_URL"),
		AuthTokenSecret:              os.Getenv("AUTH_TOKEN_SECRET"),
		AuthAdminRoleName:            getEnv("AUTH_ADMIN_ROLE_NAME", "admin"),
		AuthAdminBootstrapUserIDs:    bootstrapAdminUserIDs,
		EmbyAPIKey:                   strings.TrimSpace(os.Getenv("EMBY_API_KEY")),
		EmbyStreamBaseURL:            strings.TrimSpace(os.Getenv("EMBY_STREAM_BASE_URL")),
		EmbyStreamPathTemplate:       getEnv("EMBY_STREAM_PATH_TEMPLATE", "/Videos/%s/stream"),
		EmbyAllowedAnimeIDs:          getEnvInt64List("EMBY_ALLOWED_ANIME_IDS", nil),
		JellyfinAPIKey:               strings.TrimSpace(os.Getenv("JELLYFIN_API_KEY")),
		JellyfinBaseURL:              strings.TrimSpace(os.Getenv("JELLYFIN_BASE_URL")),
		JellyfinStreamPathTemplate:   getEnv("JELLYFIN_STREAM_PATH_TEMPLATE", "/Videos/%s/stream"),
		AuthAccessTokenTTLSeconds:    getEnvInt("AUTH_ACCESS_TOKEN_TTL_SECONDS", 900),
		AuthRefreshTokenTTLSeconds:   getEnvInt("AUTH_REFRESH_TOKEN_TTL_SECONDS", 604800),
		RedisAddr:                    getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:                os.Getenv("REDIS_PASSWORD"),
		RedisDB:                      getEnvInt("REDIS_DB", 0),
		AuthIssueDevMode:             getEnvBool("AUTH_ISSUE_DEV_MODE", false),
		AuthIssueDevUserID:           getEnvInt64("AUTH_ISSUE_DEV_USER_ID", 1),
		AuthIssueDevDisplayName:      getEnv("AUTH_ISSUE_DEV_DISPLAY_NAME", "Nico"),
		AuthIssueDevKey:              os.Getenv("AUTH_ISSUE_DEV_KEY"),
		ReleaseStreamGrantSecret:     strings.TrimSpace(os.Getenv("RELEASE_STREAM_GRANT_SECRET")),
		ReleaseStreamGrantTTLSeconds: getEnvInt("RELEASE_STREAM_GRANT_TTL_SECONDS", 120),
		EpisodePlaybackRateLimit:     getEnvInt("EPISODE_PLAYBACK_RATE_LIMIT", 30),
		EpisodePlaybackRateWindowSec: getEnvInt("EPISODE_PLAYBACK_RATE_WINDOW_SECONDS", 60),
		EpisodePlaybackMaxConcurrent: getEnvInt("EPISODE_PLAYBACK_MAX_CONCURRENT_STREAMS", 12),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func getEnvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvInt64(key string, fallback int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvInt64List(key string, fallback []int64) []int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parts := strings.Split(value, ",")
	items := make([]int64, 0, len(parts))
	seen := make(map[int64]struct{}, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}

		parsed, err := strconv.ParseInt(trimmed, 10, 64)
		if err != nil || parsed <= 0 {
			continue
		}

		if _, exists := seen[parsed]; exists {
			continue
		}

		seen[parsed] = struct{}{}
		items = append(items, parsed)
	}

	if len(items) == 0 {
		return fallback
	}

	return items
}
