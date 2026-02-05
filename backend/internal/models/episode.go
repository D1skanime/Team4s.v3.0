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
