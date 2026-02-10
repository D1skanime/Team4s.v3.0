package models

import "time"

// FansubProgress represents the fansub process status for an episode
type FansubProgress struct {
	Raw       int16 `json:"raw"`
	Translate int16 `json:"translate"`
	Time      int16 `json:"time"`
	Typeset   int16 `json:"typeset"`
	Logo      int16 `json:"logo"`
	Edit      int16 `json:"edit"`
	Karatime  int16 `json:"karatime"`
	Karafx    int16 `json:"karafx"`
	QC        int16 `json:"qc"`
	Encode    int16 `json:"encode"`
}

// Episode represents an episode record from the database
type Episode struct {
	ID            int64          `json:"id"`
	AnimeID       int64          `json:"anime_id"`
	EpisodeNumber string         `json:"episode_number"`
	Title         *string        `json:"title,omitempty"`
	Filename      *string        `json:"filename,omitempty"`
	StreamLinks   []string       `json:"stream_links"`
	Status        string         `json:"status"`
	ViewCount     int            `json:"view_count"`
	DownloadCount int            `json:"download_count"`
	Progress      FansubProgress `json:"progress"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// EpisodesMeta contains metadata for episode list responses
type EpisodesMeta struct {
	Total int64 `json:"total"`
}

// EpisodesResponse wraps episode data with metadata
type EpisodesResponse struct {
	Data []Episode    `json:"data"`
	Meta EpisodesMeta `json:"meta"`
}

// AnimeMinimal contains minimal anime info for episode detail view
type AnimeMinimal struct {
	ID         int64   `json:"id"`
	Title      string  `json:"title"`
	CoverImage *string `json:"cover_image,omitempty"`
}

// EpisodeDetail represents a full episode with parent anime info
type EpisodeDetail struct {
	ID                int64          `json:"id"`
	AnimeID           int64          `json:"anime_id"`
	EpisodeNumber     string         `json:"episode_number"`
	Title             *string        `json:"title,omitempty"`
	Filename          *string        `json:"filename,omitempty"`
	Status            string         `json:"status"`
	ViewCount         int            `json:"view_count"`
	DownloadCount     int            `json:"download_count"`
	StreamLinks       []string       `json:"stream_links"`
	StreamLinksLegacy *string        `json:"stream_links_legacy,omitempty"`
	FansubProgress    FansubProgress `json:"fansub_progress"`
	Anime             AnimeMinimal   `json:"anime"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

// EpisodeAdminListItem represents an episode for admin list views
type EpisodeAdminListItem struct {
	ID            int64          `json:"id"`
	AnimeID       int64          `json:"anime_id"`
	AnimeTitle    string         `json:"anime_title"`
	EpisodeNumber string         `json:"episode_number"`
	Title         *string        `json:"title,omitempty"`
	Filename      *string        `json:"filename,omitempty"`
	Status        string         `json:"status"`
	ViewCount     int            `json:"view_count"`
	DownloadCount int            `json:"download_count"`
	Progress      FansubProgress `json:"progress"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// EpisodeAdminFilter contains filter parameters for admin episode list queries
type EpisodeAdminFilter struct {
	AnimeID int64
	Status  string
	Search  string
	Page    int
	PerPage int
}

// CreateEpisodeRequest represents the request body for creating an episode
type CreateEpisodeRequest struct {
	AnimeID       int64    `json:"anime_id" binding:"required,min=1"`
	EpisodeNumber string   `json:"episode_number" binding:"required,min=1,max=20"`
	Title         *string  `json:"title" binding:"omitempty,max=255"`
	Filename      *string  `json:"filename" binding:"omitempty,max=512"`
	StreamLinks   []string `json:"stream_links"`
	Status        string   `json:"status" binding:"required,oneof=disabled private public"`
	// Fansub Progress (0-100 each)
	ProgressRaw       int16 `json:"progress_raw" binding:"min=0,max=100"`
	ProgressTranslate int16 `json:"progress_translate" binding:"min=0,max=100"`
	ProgressTime      int16 `json:"progress_time" binding:"min=0,max=100"`
	ProgressTypeset   int16 `json:"progress_typeset" binding:"min=0,max=100"`
	ProgressLogo      int16 `json:"progress_logo" binding:"min=0,max=100"`
	ProgressEdit      int16 `json:"progress_edit" binding:"min=0,max=100"`
	ProgressKaratime  int16 `json:"progress_karatime" binding:"min=0,max=100"`
	ProgressKarafx    int16 `json:"progress_karafx" binding:"min=0,max=100"`
	ProgressQC        int16 `json:"progress_qc" binding:"min=0,max=100"`
	ProgressEncode    int16 `json:"progress_encode" binding:"min=0,max=100"`
}

// UpdateEpisodeRequest represents the request body for updating an episode
type UpdateEpisodeRequest struct {
	EpisodeNumber *string  `json:"episode_number" binding:"omitempty,min=1,max=20"`
	Title         *string  `json:"title" binding:"omitempty,max=255"`
	Filename      *string  `json:"filename" binding:"omitempty,max=512"`
	StreamLinks   []string `json:"stream_links"`
	Status        *string  `json:"status" binding:"omitempty,oneof=disabled private public"`
	// Fansub Progress (0-100 each)
	ProgressRaw       *int16 `json:"progress_raw" binding:"omitempty,min=0,max=100"`
	ProgressTranslate *int16 `json:"progress_translate" binding:"omitempty,min=0,max=100"`
	ProgressTime      *int16 `json:"progress_time" binding:"omitempty,min=0,max=100"`
	ProgressTypeset   *int16 `json:"progress_typeset" binding:"omitempty,min=0,max=100"`
	ProgressLogo      *int16 `json:"progress_logo" binding:"omitempty,min=0,max=100"`
	ProgressEdit      *int16 `json:"progress_edit" binding:"omitempty,min=0,max=100"`
	ProgressKaratime  *int16 `json:"progress_karatime" binding:"omitempty,min=0,max=100"`
	ProgressKarafx    *int16 `json:"progress_karafx" binding:"omitempty,min=0,max=100"`
	ProgressQC        *int16 `json:"progress_qc" binding:"omitempty,min=0,max=100"`
	ProgressEncode    *int16 `json:"progress_encode" binding:"omitempty,min=0,max=100"`
}
