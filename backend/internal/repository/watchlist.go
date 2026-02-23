package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WatchlistRepository struct {
	db *pgxpool.Pool
}

func NewWatchlistRepository(db *pgxpool.Pool) *WatchlistRepository {
	return &WatchlistRepository{db: db}
}

func (r *WatchlistRepository) ListByUser(
	ctx context.Context,
	filter models.WatchlistFilter,
) ([]models.WatchlistItem, int64, error) {
	if err := validateWatchlistIdentity(filter.UserID); err != nil {
		return nil, 0, err
	}

	var total int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM watchlist_entries
		WHERE user_id = $1
	`, filter.UserID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count watchlist entries for user_id %d: %w", filter.UserID, err)
	}

	offset := (filter.Page - 1) * filter.PerPage
	rows, err := r.db.Query(ctx, `
		SELECT w.anime_id, a.title, a.type, a.status, a.year, a.cover_image, a.max_episodes, w.created_at
		FROM watchlist_entries w
		INNER JOIN anime a ON a.id = w.anime_id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC, w.id DESC
		LIMIT $2 OFFSET $3
	`, filter.UserID, filter.PerPage, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query watchlist entries for user_id %d: %w", filter.UserID, err)
	}
	defer rows.Close()

	items := make([]models.WatchlistItem, 0, filter.PerPage)
	for rows.Next() {
		var item models.WatchlistItem
		if err := rows.Scan(
			&item.AnimeID,
			&item.Title,
			&item.Type,
			&item.Status,
			&item.Year,
			&item.CoverImage,
			&item.MaxEpisodes,
			&item.AddedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan watchlist row: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate watchlist rows: %w", err)
	}

	return items, total, nil
}

func (r *WatchlistRepository) CreateByUser(
	ctx context.Context,
	userID int64,
	animeID int64,
) (*models.WatchlistItem, error) {
	if err := validateWatchlistIdentity(userID); err != nil {
		return nil, err
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	item, err := r.GetByUserAndAnimeID(ctx, userID, animeID)
	if err == nil {
		return item, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}

	if _, err := r.db.Exec(ctx, `
		INSERT INTO watchlist_entries (user_id, anime_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, anime_id)
		DO UPDATE SET
			updated_at = NOW()
	`, userID, animeID); err != nil {
		return nil, fmt.Errorf("insert watchlist entry user_id %d anime %d: %w", userID, animeID, err)
	}

	return r.GetByUserAndAnimeID(ctx, userID, animeID)
}

func (r *WatchlistRepository) DeleteByUser(ctx context.Context, userID int64, animeID int64) error {
	if err := validateWatchlistIdentity(userID); err != nil {
		return err
	}

	tag, err := r.db.Exec(ctx, `
		DELETE FROM watchlist_entries
		WHERE user_id = $1
		  AND anime_id = $2
	`, userID, animeID)
	if err != nil {
		return fmt.Errorf("delete watchlist entry user_id %d anime %d: %w", userID, animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *WatchlistRepository) GetByUserAndAnimeID(
	ctx context.Context,
	userID int64,
	animeID int64,
) (*models.WatchlistItem, error) {
	if err := validateWatchlistIdentity(userID); err != nil {
		return nil, err
	}

	var item models.WatchlistItem
	if err := r.db.QueryRow(ctx, `
		SELECT w.anime_id, a.title, a.type, a.status, a.year, a.cover_image, a.max_episodes, w.created_at
		FROM watchlist_entries w
		INNER JOIN anime a ON a.id = w.anime_id
		WHERE w.user_id = $1
		  AND w.anime_id = $2
		LIMIT 1
	`, userID, animeID).Scan(
		&item.AnimeID,
		&item.Title,
		&item.Type,
		&item.Status,
		&item.Year,
		&item.CoverImage,
		&item.MaxEpisodes,
		&item.AddedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query watchlist entry user_id %d anime %d: %w", userID, animeID, err)
	}

	return &item, nil
}

func (r *WatchlistRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
}

func validateWatchlistIdentity(userID int64) error {
	if userID <= 0 {
		return fmt.Errorf("invalid watchlist user id: %d", userID)
	}

	return nil
}
