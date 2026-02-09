package repository

import (
	"context"
	"fmt"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WatchlistRepository struct {
	db *pgxpool.Pool
}

func NewWatchlistRepository(db *pgxpool.Pool) *WatchlistRepository {
	return &WatchlistRepository{db: db}
}

// GetUserWatchlist returns all watchlist entries for a user with anime info
func (r *WatchlistRepository) GetUserWatchlist(ctx context.Context, userID int64) ([]models.WatchlistItem, error) {
	query := `
		SELECT
			w.id, w.anime_id, w.status, w.created_at, w.updated_at,
			a.id, a.title, a.type, a.status, a.year, a.cover_image, a.max_episodes
		FROM watchlist w
		JOIN anime a ON a.id = w.anime_id
		WHERE w.user_id = $1
		ORDER BY w.updated_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query user watchlist: %w", err)
	}
	defer rows.Close()

	var items []models.WatchlistItem
	for rows.Next() {
		var item models.WatchlistItem
		var anime models.WatchlistAnime

		if err := rows.Scan(
			&item.ID, &item.AnimeID, &item.Status, &item.CreatedAt, &item.UpdatedAt,
			&anime.ID, &anime.Title, &anime.Type, &anime.Status, &anime.Year, &anime.CoverImage, &anime.MaxEpisodes,
		); err != nil {
			return nil, fmt.Errorf("scan watchlist item: %w", err)
		}

		item.Anime = &anime
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate watchlist rows: %w", err)
	}

	return items, nil
}

// GetWatchlistCounts returns count of items per status for a user
func (r *WatchlistRepository) GetWatchlistCounts(ctx context.Context, userID int64) (map[models.WatchlistStatus]int, error) {
	query := `
		SELECT status, COUNT(*) as count
		FROM watchlist
		WHERE user_id = $1
		GROUP BY status
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query watchlist counts: %w", err)
	}
	defer rows.Close()

	counts := make(map[models.WatchlistStatus]int)
	// Initialize all statuses with 0
	for _, status := range models.ValidWatchlistStatuses {
		counts[status] = 0
	}

	for rows.Next() {
		var status models.WatchlistStatus
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("scan watchlist count: %w", err)
		}
		counts[status] = count
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate watchlist count rows: %w", err)
	}

	return counts, nil
}

// GetWatchlistEntry returns a specific watchlist entry for a user and anime
// Returns nil, nil if no entry exists
func (r *WatchlistRepository) GetWatchlistEntry(ctx context.Context, userID, animeID int64) (*models.WatchlistEntry, error) {
	query := `
		SELECT id, anime_id, user_id, status, created_at, updated_at
		FROM watchlist
		WHERE user_id = $1 AND anime_id = $2
	`

	var entry models.WatchlistEntry
	err := r.db.QueryRow(ctx, query, userID, animeID).Scan(
		&entry.ID, &entry.AnimeID, &entry.UserID, &entry.Status, &entry.CreatedAt, &entry.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // No entry found
		}
		return nil, fmt.Errorf("query watchlist entry: %w", err)
	}

	return &entry, nil
}

// AddToWatchlist adds an anime to a user's watchlist
// Uses upsert to update status if already exists
func (r *WatchlistRepository) AddToWatchlist(ctx context.Context, userID, animeID int64, status models.WatchlistStatus) (*models.WatchlistEntry, error) {
	query := `
		INSERT INTO watchlist (anime_id, user_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (user_id, anime_id)
		DO UPDATE SET status = $3, updated_at = NOW()
		RETURNING id, anime_id, user_id, status, created_at, updated_at
	`

	var entry models.WatchlistEntry
	err := r.db.QueryRow(ctx, query, animeID, userID, status).Scan(
		&entry.ID, &entry.AnimeID, &entry.UserID, &entry.Status, &entry.CreatedAt, &entry.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("add to watchlist: %w", err)
	}

	return &entry, nil
}

// UpdateWatchlistStatus updates the status of an existing watchlist entry
func (r *WatchlistRepository) UpdateWatchlistStatus(ctx context.Context, userID, animeID int64, status models.WatchlistStatus) (*models.WatchlistEntry, error) {
	query := `
		UPDATE watchlist
		SET status = $3, updated_at = NOW()
		WHERE user_id = $1 AND anime_id = $2
		RETURNING id, anime_id, user_id, status, created_at, updated_at
	`

	var entry models.WatchlistEntry
	err := r.db.QueryRow(ctx, query, userID, animeID, status).Scan(
		&entry.ID, &entry.AnimeID, &entry.UserID, &entry.Status, &entry.CreatedAt, &entry.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // Entry doesn't exist
		}
		return nil, fmt.Errorf("update watchlist status: %w", err)
	}

	return &entry, nil
}

// RemoveFromWatchlist removes an anime from a user's watchlist
// Returns true if an entry was deleted, false if no entry existed
func (r *WatchlistRepository) RemoveFromWatchlist(ctx context.Context, userID, animeID int64) (bool, error) {
	query := `
		DELETE FROM watchlist
		WHERE user_id = $1 AND anime_id = $2
	`

	result, err := r.db.Exec(ctx, query, userID, animeID)
	if err != nil {
		return false, fmt.Errorf("remove from watchlist: %w", err)
	}

	return result.RowsAffected() > 0, nil
}

// AnimeExists checks if an anime with the given ID exists
func (r *WatchlistRepository) AnimeExists(ctx context.Context, animeID int64) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`

	var exists bool
	if err := r.db.QueryRow(ctx, query, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime exists: %w", err)
	}

	return exists, nil
}

// CheckMultipleAnimeWatchlist returns the watchlist status for multiple anime IDs
func (r *WatchlistRepository) CheckMultipleAnimeWatchlist(ctx context.Context, userID int64, animeIDs []int64) (map[int64]models.WatchlistStatus, error) {
	if len(animeIDs) == 0 {
		return make(map[int64]models.WatchlistStatus), nil
	}

	query := `
		SELECT anime_id, status
		FROM watchlist
		WHERE user_id = $1 AND anime_id = ANY($2)
	`

	rows, err := r.db.Query(ctx, query, userID, animeIDs)
	if err != nil {
		return nil, fmt.Errorf("query multiple anime watchlist: %w", err)
	}
	defer rows.Close()

	statuses := make(map[int64]models.WatchlistStatus)
	for rows.Next() {
		var animeID int64
		var status models.WatchlistStatus
		if err := rows.Scan(&animeID, &status); err != nil {
			return nil, fmt.Errorf("scan watchlist status: %w", err)
		}
		statuses[animeID] = status
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate watchlist status rows: %w", err)
	}

	return statuses, nil
}

// SyncWatchlist syncs multiple watchlist items from localStorage
// Uses merge strategy: keep backend entry if it was updated more recently
func (r *WatchlistRepository) SyncWatchlist(ctx context.Context, userID int64, items []models.SyncWatchlistItem) (*models.SyncWatchlistResponse, error) {
	response := &models.SyncWatchlistResponse{}

	for _, item := range items {
		// Validate status
		if !item.Status.IsValid() {
			response.Invalid++
			continue
		}

		// Check if anime exists
		exists, err := r.AnimeExists(ctx, item.AnimeID)
		if err != nil {
			return nil, fmt.Errorf("check anime %d exists: %w", item.AnimeID, err)
		}
		if !exists {
			response.Invalid++
			continue
		}

		// Check existing entry
		existing, err := r.GetWatchlistEntry(ctx, userID, item.AnimeID)
		if err != nil {
			return nil, fmt.Errorf("get existing entry for anime %d: %w", item.AnimeID, err)
		}

		if existing != nil {
			// Entry exists - check if localStorage version is newer
			if item.UpdatedAt.After(existing.UpdatedAt) {
				// localStorage is newer, update backend
				_, err := r.UpdateWatchlistStatus(ctx, userID, item.AnimeID, item.Status)
				if err != nil {
					return nil, fmt.Errorf("update watchlist entry for anime %d: %w", item.AnimeID, err)
				}
				response.Synced++
			} else {
				// Backend is newer or same, skip
				response.Skipped++
			}
		} else {
			// No existing entry, create new one
			_, err := r.AddToWatchlist(ctx, userID, item.AnimeID, item.Status)
			if err != nil {
				return nil, fmt.Errorf("add watchlist entry for anime %d: %w", item.AnimeID, err)
			}
			response.Synced++
		}
	}

	return response, nil
}
