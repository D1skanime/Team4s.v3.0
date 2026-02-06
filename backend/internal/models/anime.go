package models

import "time"

// Anime represents a full anime record from the database
type Anime struct {
	ID           int64      `json:"id"`
	AnisearchID  *string    `json:"anisearch_id,omitempty"`
	Title        string     `json:"title"`
	TitleDE      *string    `json:"title_de,omitempty"`
	TitleEN      *string    `json:"title_en,omitempty"`
	Type         string     `json:"type"`
	ContentType  string     `json:"content_type"`
	Status       string     `json:"status"`
	Year         *int16     `json:"year,omitempty"`
	MaxEpisodes  int16      `json:"max_episodes"`
	Genre        *string    `json:"genre,omitempty"`
	Source       *string    `json:"source,omitempty"`
	Description  *string    `json:"description,omitempty"`
	CoverImage   *string    `json:"cover_image,omitempty"`
	FolderName   *string    `json:"folder_name,omitempty"`
	SubComment   *string    `json:"sub_comment,omitempty"`
	StreamComment *string   `json:"stream_comment,omitempty"`
	IsSelfSubbed bool       `json:"is_self_subbed"`
	ViewCount    int        `json:"view_count"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// AnimeListItem represents a slim anime record for list views
type AnimeListItem struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year,omitempty"`
	CoverImage  *string `json:"cover_image,omitempty"`
	MaxEpisodes int16   `json:"max_episodes"`
}

// AnimeFilter contains filter parameters for anime list queries
type AnimeFilter struct {
	Letter      string // A-Z, "0" for numbers, "" for all
	ContentType string // anime, hentai
	Status      string // ongoing, done, aborted, licensed, disabled
	Type        string // tv, film, ova, ona, special, bonus
	Page        int
	PerPage     int
}

// PaginationMeta contains pagination metadata
type PaginationMeta struct {
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	TotalPages int   `json:"total_pages"`
}

// PaginatedResponse wraps data with pagination metadata
type PaginatedResponse[T any] struct {
	Data []T            `json:"data"`
	Meta PaginationMeta `json:"meta"`
}

// SearchMeta contains metadata for search results
type SearchMeta struct {
	Total int64  `json:"total"`
	Query string `json:"query"`
}

// SearchResponse wraps search results with metadata
type SearchResponse[T any] struct {
	Data []T        `json:"data"`
	Meta SearchMeta `json:"meta"`
}

// RelatedAnime represents an anime related to another anime
type RelatedAnime struct {
	ID           int64   `json:"id"`
	Title        string  `json:"title"`
	Type         string  `json:"type"`
	Status       string  `json:"status"`
	Year         *int16  `json:"year,omitempty"`
	CoverImage   *string `json:"cover_image,omitempty"`
	RelationType string  `json:"relation_type"`
}
