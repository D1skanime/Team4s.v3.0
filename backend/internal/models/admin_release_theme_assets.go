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
