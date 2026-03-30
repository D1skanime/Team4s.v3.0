package models

type AnimeFilter struct {
	Page            int
	PerPage         int
	Letter          string
	Q               string
	ContentType     string
	Status          string
	FansubGroupID   *int64
	HasCover        *bool
	IncludeDisabled bool
}

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

type AnimeMediaLookup struct {
	Title      string
	TitleDE    *string
	TitleEN    *string
	Source     *string
	FolderName *string
}

type AnimeBackdropManifest struct {
	AnimeID     int64    `json:"anime_id"`
	Provider    string   `json:"provider"`
	MediaItemID string   `json:"media_item_id,omitempty"`
	Backdrops   []string `json:"backdrops"`
	ThemeVideos []string `json:"theme_videos"`
	LogoURL     string   `json:"logo_url,omitempty"`
	BannerURL   string   `json:"banner_url,omitempty"`
}

type PaginationMeta struct {
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	TotalPages int   `json:"total_pages"`
}

type GenreToken struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}
