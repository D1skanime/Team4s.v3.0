package models

// AnimeFilter enthält alle Filterparameter für Anime-Listenabfragen in der öffentlichen und Admin-API.
type AnimeFilter struct {
	Page            int    // Seitennummer (1-basiert)
	PerPage         int    // Einträge pro Seite
	Letter          string // Anfangsbuchstabe des Titels
	Q               string // Volltextsuchbegriff
	ContentType     string // Inhaltstyp-Filter (z.B. "anime", "movie")
	Status          string // Status-Filter (z.B. "ongoing", "completed")
	FansubGroupID   *int64 // Optional: nur Anime einer bestimmten Fansub-Gruppe
	HasCover        *bool  // Optional: nur Anime mit oder ohne Coverbild
	IncludeDisabled bool   // Deaktivierte Einträge einschließen (nur Admin)
}

// AnimeListItem repräsentiert einen einzelnen Anime-Eintrag in der öffentlichen Listenansicht.
type AnimeListItem struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Type        string  `json:"type"`
	ContentType string  `json:"content_type,omitempty"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year,omitempty"`
	CoverImage  *string `json:"cover_image,omitempty"`
	MaxEpisodes *int16  `json:"max_episodes,omitempty"`
}

// EpisodeListItem repräsentiert eine einzelne Episode in der Episodenliste eines Anime.
type EpisodeListItem struct {
	ID            int64    `json:"id"`
	EpisodeNumber string   `json:"episode_number"`
	Title         *string  `json:"title,omitempty"`
	Status        string   `json:"status"`
	ViewCount     int32    `json:"view_count"`
	DownloadCount int32    `json:"download_count"`
	StreamLinks   []string `json:"stream_links,omitempty"`
	Filename      *string  `json:"filename,omitempty"`
}

// AnimeDetail enthält die vollständige Detailansicht eines Anime inklusive Episodenliste,
// wird von der öffentlichen Anime-Detailseite verwendet.
type AnimeDetail struct {
	ID          int64             `json:"id"`
	Title       string            `json:"title"`
	TitleDE     *string           `json:"title_de,omitempty"`
	TitleEN     *string           `json:"title_en,omitempty"`
	Type        string            `json:"type"`
	ContentType string            `json:"content_type"`
	Status      string            `json:"status"`
	Year        *int16            `json:"year,omitempty"`
	MaxEpisodes *int16            `json:"max_episodes,omitempty"`
	Genre       *string           `json:"genre,omitempty"`
	Genres      []string          `json:"genres,omitempty"`
	Description *string           `json:"description,omitempty"`
	CoverImage  *string           `json:"cover_image,omitempty"`
	ViewCount   int32             `json:"view_count"`
	Episodes    []EpisodeListItem `json:"episodes"`
}

// AnimeMediaLookup enthält die für Medienpfad-Lookups benötigten Titelfelder eines Anime,
// wird intern für Jellyfin- und Medien-Resolver-Abfragen verwendet.
type AnimeMediaLookup struct {
	Title      string
	TitleDE    *string
	TitleEN    *string
	Source     *string
	FolderName *string
}

// AnimeBackdropManifest enthält alle Backdrop- und Medien-URLs eines Anime,
// die von einem externen Provider (z.B. Jellyfin) geliefert werden.
type AnimeBackdropManifest struct {
	AnimeID     int64    `json:"anime_id"`
	Provider    string   `json:"provider"`
	MediaItemID string   `json:"media_item_id,omitempty"`
	Backdrops   []string `json:"backdrops"`
	ThemeVideos []string `json:"theme_videos"`
	LogoURL     string   `json:"logo_url,omitempty"`
	BannerURL   string   `json:"banner_url,omitempty"`
}

// PaginationMeta enthält die Paginierungsmetadaten für paginierten Listenendpunkte.
type PaginationMeta struct {
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	TotalPages int   `json:"total_pages"`
}

// GenreToken repräsentiert ein Genre mit seiner Verwendungshäufigkeit im Anime-Katalog.
type GenreToken struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}
