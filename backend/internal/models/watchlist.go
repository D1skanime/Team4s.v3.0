package models

import "time"

// WatchlistStatus represents the status of an anime in a user's watchlist
type WatchlistStatus string

const (
	WatchlistStatusWatching WatchlistStatus = "watching"
	WatchlistStatusDone     WatchlistStatus = "done"
	WatchlistStatusBreak    WatchlistStatus = "break"
	WatchlistStatusPlanned  WatchlistStatus = "planned"
	WatchlistStatusDropped  WatchlistStatus = "dropped"
)

// ValidWatchlistStatuses contains all valid watchlist statuses
var ValidWatchlistStatuses = []WatchlistStatus{
	WatchlistStatusWatching,
	WatchlistStatusDone,
	WatchlistStatusBreak,
	WatchlistStatusPlanned,
	WatchlistStatusDropped,
}

// IsValid checks if a watchlist status is valid
func (s WatchlistStatus) IsValid() bool {
	for _, valid := range ValidWatchlistStatuses {
		if s == valid {
			return true
		}
	}
	return false
}

// WatchlistEntry represents a single entry in a user's watchlist
type WatchlistEntry struct {
	ID        int64           `json:"id"`
	AnimeID   int64           `json:"anime_id"`
	UserID    int64           `json:"user_id"`
	Status    WatchlistStatus `json:"status"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// WatchlistItem represents a watchlist entry with anime info for listing
type WatchlistItem struct {
	ID         int64            `json:"id"`
	AnimeID    int64            `json:"anime_id"`
	Status     WatchlistStatus  `json:"status"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
	Anime      *WatchlistAnime  `json:"anime,omitempty"`
}

// WatchlistAnime contains anime info for watchlist items
type WatchlistAnime struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year"`
	CoverImage  *string `json:"cover_image"`
	MaxEpisodes int16   `json:"max_episodes"`
}

// WatchlistResponse is the response for getting a user's watchlist
type WatchlistResponse struct {
	Data []WatchlistItem `json:"data"`
	Meta WatchlistMeta   `json:"meta"`
}

// WatchlistMeta contains metadata about the watchlist
type WatchlistMeta struct {
	Total    int                    `json:"total"`
	ByStatus map[WatchlistStatus]int `json:"by_status"`
}

// AddToWatchlistRequest is the request body for adding an anime to watchlist
type AddToWatchlistRequest struct {
	Status WatchlistStatus `json:"status" binding:"required"`
}

// UpdateWatchlistRequest is the request body for updating a watchlist entry
type UpdateWatchlistRequest struct {
	Status WatchlistStatus `json:"status" binding:"required"`
}

// SyncWatchlistRequest is the request for syncing localStorage watchlist to backend
type SyncWatchlistRequest struct {
	Items []SyncWatchlistItem `json:"items" binding:"required"`
}

// SyncWatchlistItem represents a single item to sync from localStorage
type SyncWatchlistItem struct {
	AnimeID   int64           `json:"anime_id" binding:"required"`
	Status    WatchlistStatus `json:"status" binding:"required"`
	AddedAt   time.Time       `json:"added_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// SyncWatchlistResponse contains the result of a sync operation
type SyncWatchlistResponse struct {
	Synced   int `json:"synced"`   // Number of items synced
	Skipped  int `json:"skipped"`  // Number of items skipped (already exist with same or newer status)
	Invalid  int `json:"invalid"`  // Number of invalid items (anime doesn't exist)
}

// CheckWatchlistRequest is for checking if multiple anime are in watchlist
type CheckWatchlistRequest struct {
	AnimeIDs []int64 `json:"anime_ids" binding:"required"`
}

// CheckWatchlistResponse maps anime IDs to their watchlist status
type CheckWatchlistResponse struct {
	Statuses map[int64]WatchlistStatus `json:"statuses"`
}
