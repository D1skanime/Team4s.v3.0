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

// AdminAnimeThemeSegment repräsentiert einen Episodenbereich für ein OP/ED-Theme.
type AdminAnimeThemeSegment struct {
	ID                 int64     `json:"id"`
	ThemeID            int64     `json:"theme_id"`
	StartEpisodeID     *int64    `json:"start_episode_id"`
	EndEpisodeID       *int64    `json:"end_episode_id"`
	StartEpisodeNumber *string   `json:"start_episode_number"`
	EndEpisodeNumber   *string   `json:"end_episode_number"`
	CreatedAt          time.Time `json:"created_at"`
}

// AdminAnimeThemeSegmentCreateInput enthält die Felder zum Anlegen eines neuen Theme-Segments.
type AdminAnimeThemeSegmentCreateInput struct {
	StartEpisodeID *int64 `json:"start_episode_id"`
	EndEpisodeID   *int64 `json:"end_episode_id"`
}
