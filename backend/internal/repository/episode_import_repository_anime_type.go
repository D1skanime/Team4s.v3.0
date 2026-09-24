package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// GetAnimeType returns the anime.type column value for animeID, used at
// episode-import preview time (GAP-03) to decide whether a single
// number-less file should get an Einteiler suggestion
// (IsEinteilerAnimeType, episode_placeholder_title.go). Mirrors
// GetAnimeSyncSource's error handling (admin_content_sync.go): pgx.ErrNoRows
// maps to the package's ErrNotFound sentinel, any other error is wrapped
// with the anime ID for context.
func (r *EpisodeImportRepository) GetAnimeType(ctx context.Context, animeID int64) (string, error) {
	if r == nil || r.db == nil {
		return "", fmt.Errorf("episode import repository is not configured")
	}

	var animeType string
	err := r.db.QueryRow(ctx, `SELECT type FROM anime WHERE id = $1`, animeID).Scan(&animeType)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("get anime type %d: %w", animeID, err)
	}
	return animeType, nil
}
