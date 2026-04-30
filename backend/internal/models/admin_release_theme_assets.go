package models

import "time"

// AdminFansubAnimeEntry beschreibt einen Anime-Eintrag in der Fansub-Adminansicht.
type AdminFansubAnimeEntry struct {
	ID    int64  `json:"id"`
	Title string `json:"title"`
}

// AdminReleaseThemeAsset beschreibt ein Theme-Video eines Fansub-Releases.
type AdminReleaseThemeAsset struct {
	ReleaseID     int64     `json:"release_id"`
	ThemeID       int64     `json:"theme_id"`
	ThemeTypeName string    `json:"theme_type_name"`
	ThemeTitle    *string   `json:"theme_title"`
	MediaID       int64     `json:"media_id"`
	PublicURL     string    `json:"public_url"`
	MimeType      string    `json:"mime_type"`
	SizeBytes     int64     `json:"size_bytes"`
	CreatedAt     time.Time `json:"created_at"`
}

// AdminReleaseThemeAssetCreateInput enthaelt die Zuordnungsfelder fuer Release-Theme-Videos.
type AdminReleaseThemeAssetCreateInput struct {
	ReleaseID int64
	ThemeID   int64
	MediaID   int64
}

// AdminFansubReleaseSummary beschreibt einen Fansub-Release als explizite Admin-Ressource.
// Die Felder machen Release-Identitaet, Anime-Kontext, Fansub/Gruppen-Kontext und
// Episoden-Anker sichtbar, sodass UI-Aufrufer keine Release-ID mehr indirekt aus
// Theme-Asset-Nebenantworten erraten muessen.
type AdminFansubReleaseSummary struct {
	ReleaseID      int64   `json:"release_id"`
	AnimeID        int64   `json:"anime_id"`
	AnimeTitle     string  `json:"anime_title"`
	FansubGroupID  int64   `json:"fansub_group_id"`
	FansubName     string  `json:"fansub_name"`
	EpisodeID      int64   `json:"episode_id"`
	EpisodeNumber  string  `json:"episode_number"`
	Source         *string `json:"source,omitempty"`
	VersionCount   int     `json:"version_count"`
	HasThemeAssets bool    `json:"has_theme_assets"`
	CreatedAt      time.Time `json:"created_at"`
}

// CanonicalFansubAnimeReleaseResponse beschreibt die Antwort fuer den kanonischen
// Release-Anker einer Fansub-Anime-Kombination. Release ist nil, wenn kein
// Release-Anker fuer die gegebene Kombination existiert.
type CanonicalFansubAnimeReleaseResponse struct {
	FansubGroupID int64                  `json:"fansub_group_id"`
	AnimeID       int64                  `json:"anime_id"`
	Release       *AdminFansubReleaseSummary `json:"release"`
}
