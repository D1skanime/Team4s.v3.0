package models

import "time"

type WatchlistFilter struct {
	Page    int
	PerPage int
	UserID  int64
}

type WatchlistItem struct {
	AnimeID     int64     `json:"anime_id"`
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
	Year        *int16    `json:"year,omitempty"`
	CoverImage  *string   `json:"cover_image,omitempty"`
	MaxEpisodes *int16    `json:"max_episodes,omitempty"`
	AddedAt     time.Time `json:"added_at"`
}
