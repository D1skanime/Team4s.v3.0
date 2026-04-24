package config

import (
	"os"
	"strconv"
	"strings"
)

// Config enthält alle Laufzeit-Konfigurationswerte, die beim Serverstart aus Umgebungsvariablen gelesen werden.
type Config struct {
	Port                         string  // HTTP-Port auf dem der Server lauscht
	RuntimeProfile               string  // Laufzeitprofil (z.B. "local", "production")
	DatabaseURL                  string  // PostgreSQL-Verbindungs-URL
	AuthTokenSecret              string  // HMAC-Geheimnis für JWT-ähnliche Token
	AuthAdminRoleName            string  // Rollenname für Admin-Zugriffsprüfung
	AuthAdminBootstrapUserIDs    []int64 // Benutzer-IDs, denen beim Start die Admin-Rolle zugewiesen wird
	EmbyAPIKey                   string  // API-Schlüssel für den Emby-Mediaserver
	EmbyStreamBaseURL            string  // Basis-URL des Emby-Streamingendpunkts
	EmbyStreamPathTemplate       string  // Pfadvorlage für Emby-Videostreams
	EmbyAllowedAnimeIDs          []int64 // Erlaubte Anime-IDs für den Emby-Zugriff
	JellyfinAPIKey               string  // API-Schlüssel für den Jellyfin-Mediaserver
	JellyfinBaseURL              string  // Basis-URL des Jellyfin-Servers
	JellyfinStreamPathTemplate   string   // Pfadvorlage für Jellyfin-Videostreams
	JellyfinAllowedLibraryIDs    []string // Optionale Whitelist von Jellyfin-Bibliotheks-IDs (JELLYFIN_ALLOWED_LIBRARY_IDS, kommagetrennt)
	AuthAccessTokenTTLSeconds    int     // Gültigkeitsdauer des Access-Tokens in Sekunden
	AuthRefreshTokenTTLSeconds   int     // Gültigkeitsdauer des Refresh-Tokens in Sekunden
	RedisAddr                    string  // Redis-Serveradresse (Host:Port)
	RedisPassword                string  // Redis-Passwort (leer = kein Passwort)
	RedisDB                      int     // Redis-Datenbanknummer
	AuthIssueDevMode             bool    // Aktiviert den Dev-Token-Ausstellungsendpunkt (nur lokal erlaubt)
	AuthIssueDevUserID           int64   // Benutzer-ID für Dev-Token
	AuthIssueDevDisplayName      string  // Anzeigename für Dev-Token
	AuthIssueDevKey              string  // Schlüssel zum Absichern des Dev-Token-Endpunkts
	AuthBypassLocal              bool    // Überspringt Auth-Middleware im lokalen Profil
	ReleaseStreamGrantSecret     string  // Geheimnis für Release-Stream-Grants (fällt auf AuthTokenSecret zurück)
	ReleaseStreamGrantTTLSeconds int     // Gültigkeitsdauer von Release-Stream-Grants in Sekunden
	EpisodePlaybackRateLimit     int     // Maximale Wiedergabeanfragen pro Zeitfenster
	EpisodePlaybackRateWindowSec int     // Länge des Rate-Limit-Zeitfensters in Sekunden
	EpisodePlaybackMaxConcurrent int     // Maximale gleichzeitige Streams pro Nutzer
	MediaStorageDir              string  // Lokales Verzeichnis für hochgeladene Mediendateien
	MediaPublicBaseURL           string  // Öffentliche Basis-URL für die Medienauslieferung
	FFmpegPath                   string  // Dateipfad zur FFmpeg-Binärdatei
	TMDBAPIKey                   string  // API-Schlüssel für The Movie Database (TMDB)
	FanartAPIKey                 string  // API-Schlüssel für fanart.tv
}

// Load liest alle Konfigurationswerte aus Umgebungsvariablen und gibt eine fertig befüllte Config zurück.
// Fehlende Werte werden durch sinnvolle Standardwerte ersetzt.
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
		JellyfinAllowedLibraryIDs:    getEnvStringList("JELLYFIN_ALLOWED_LIBRARY_IDS"),
		AuthAccessTokenTTLSeconds:    getEnvInt("AUTH_ACCESS_TOKEN_TTL_SECONDS", 900),
		AuthRefreshTokenTTLSeconds:   getEnvInt("AUTH_REFRESH_TOKEN_TTL_SECONDS", 604800),
		RedisAddr:                    getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:                os.Getenv("REDIS_PASSWORD"),
		RedisDB:                      getEnvInt("REDIS_DB", 0),
		AuthIssueDevMode:             getEnvBool("AUTH_ISSUE_DEV_MODE", false),
		AuthIssueDevUserID:           getEnvInt64("AUTH_ISSUE_DEV_USER_ID", 1),
		AuthIssueDevDisplayName:      getEnv("AUTH_ISSUE_DEV_DISPLAY_NAME", "Nico"),
		AuthIssueDevKey:              os.Getenv("AUTH_ISSUE_DEV_KEY"),
		AuthBypassLocal:              getEnvBool("AUTH_BYPASS_LOCAL", getEnv("RUNTIME_PROFILE", "local") == "local"),
		ReleaseStreamGrantSecret:     strings.TrimSpace(os.Getenv("RELEASE_STREAM_GRANT_SECRET")),
		ReleaseStreamGrantTTLSeconds: getEnvInt("RELEASE_STREAM_GRANT_TTL_SECONDS", 120),
		EpisodePlaybackRateLimit:     getEnvInt("EPISODE_PLAYBACK_RATE_LIMIT", 30),
		EpisodePlaybackRateWindowSec: getEnvInt("EPISODE_PLAYBACK_RATE_WINDOW_SECONDS", 60),
		EpisodePlaybackMaxConcurrent: getEnvInt("EPISODE_PLAYBACK_MAX_CONCURRENT_STREAMS", 12),
		MediaStorageDir:              strings.TrimSpace(getEnv("MEDIA_STORAGE_DIR", "./storage/media")),
		MediaPublicBaseURL:           strings.TrimSpace(getEnv("MEDIA_PUBLIC_BASE_URL", "http://localhost:8092")),
		FFmpegPath:                   strings.TrimSpace(getEnv("FFMPEG_PATH", "/usr/bin/ffmpeg")),
		TMDBAPIKey:                   strings.TrimSpace(os.Getenv("TMDB_API_KEY")),
		FanartAPIKey:                 strings.TrimSpace(os.Getenv("FANART_API_KEY")),
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

// getEnvStringList parst eine kommagetrennte Umgebungsvariable als String-Slice.
// Leerstrings und Einträge, die nur Whitespace enthalten, werden übersprungen.
// Gibt nil zurück wenn die Variable nicht gesetzt oder leer ist.
func getEnvStringList(key string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			items = append(items, trimmed)
		}
	}
	if len(items) == 0 {
		return nil
	}
	return items
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
