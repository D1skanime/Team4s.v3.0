package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EpisodeRepository struct {
	db *pgxpool.Pool
}

func NewEpisodeRepository(db *pgxpool.Pool) *EpisodeRepository {
	return &EpisodeRepository{db: db}
}

func (r *EpisodeRepository) GetByID(ctx context.Context, id int64) (*models.EpisodeDetail, error) {
	query := `
		SELECT e.id, e.anime_id, a.title, e.episode_number, e.title, e.status, e.view_count, e.download_count, e.stream_links
		FROM episodes e
		INNER JOIN anime a ON a.id = e.anime_id
		WHERE e.id = $1
		  AND a.status <> 'disabled'
	`

	var episode models.EpisodeDetail
	err := r.db.QueryRow(ctx, query, id).Scan(
		&episode.ID,
		&episode.AnimeID,
		&episode.AnimeTitle,
		&episode.EpisodeNumber,
		&episode.Title,
		&episode.Status,
		&episode.ViewCount,
		&episode.DownloadCount,
		&episode.StreamLinks,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query episode detail %d: %w", id, err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, episode_number
		FROM episodes
		WHERE anime_id = $1
	`, episode.AnimeID)
	if err != nil {
		return nil, fmt.Errorf("query episode navigation set for %d: %w", id, err)
	}
	defer rows.Close()

	ordered := make([]episodeIdentity, 0, 64)
	for rows.Next() {
		var item episodeIdentity
		if err := rows.Scan(&item.ID, &item.EpisodeNumber); err != nil {
			return nil, fmt.Errorf("scan navigation episode row: %w", err)
		}
		ordered = append(ordered, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate navigation episode rows: %w", err)
	}

	sortEpisodeIdentities(ordered)
	prevID, nextID := findAdjacentEpisodeIDs(ordered, episode.ID)
	episode.PreviousEpisodeID = prevID
	episode.NextEpisodeID = nextID

	return &episode, nil
}
