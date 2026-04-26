package models

import "time"

// AdminThemeType repräsentiert einen Theme-Typ (z.B. OP1, ED2).
type AdminThemeType struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// AdminAnimeTheme repräsentiert ein OP/ED-Theme eines Anime.
type AdminAnimeTheme struct {
	ID            int64     `json:"id"`
	AnimeID       int64     `json:"anime_id"`
	ThemeTypeID   int64     `json:"theme_type_id"`
	ThemeTypeName string    `json:"theme_type_name"`
	Title         *string   `json:"title"`
	CreatedAt     time.Time `json:"created_at"`
}

// AdminAnimeThemeCreateInput enthält die Felder zum Anlegen eines neuen Themes.
type AdminAnimeThemeCreateInput struct {
	ThemeTypeID int64   `json:"theme_type_id"`
	Title       *string `json:"title"`
}

// AdminAnimeThemePatchInput enthält die optionalen Felder für ein Theme-Update.
// Nur gesetzte Felder (non-nil) werden aktualisiert.
type AdminAnimeThemePatchInput struct {
	ThemeTypeID *int64  `json:"theme_type_id"`
	Title       *string `json:"title"`
}

// AdminThemeSegment repraesentiert ein Release-Segment (OP/ED-Timing) fuer eine Fansub-Gruppe und Version.
type AdminThemeSegment struct {
	ID                   int64     `json:"id"`
	ThemeID              int64     `json:"theme_id"`
	AnimeID              int64     `json:"anime_id"`
	ThemeTitle           *string   `json:"theme_title"`
	ThemeTypeName        string    `json:"theme_type_name"`
	FansubGroupID        *int64    `json:"fansub_group_id"`
	Version              string    `json:"version"`
	StartEpisode         *int      `json:"start_episode"`
	EndEpisode           *int      `json:"end_episode"`
	StartTime            *string   `json:"start_time"`   // Interval als HH:MM:SS-String
	EndTime              *string   `json:"end_time"`     // Interval als HH:MM:SS-String
	SourceJellyfinItemID *string   `json:"source_jellyfin_item_id"`
	CreatedAt            time.Time `json:"created_at"`
}

// AdminThemeSegmentCreateInput enthaelt die Felder zum Anlegen eines neuen Segments.
type AdminThemeSegmentCreateInput struct {
	ThemeID              int64   `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              string  `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
}

// AdminThemeSegmentPatchInput enthaelt die optionalen Felder fuer ein Segment-Update.
type AdminThemeSegmentPatchInput struct {
	ThemeID              *int64  `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              *string `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
}
