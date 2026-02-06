package repository

import (
	"context"
	"fmt"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EpisodeRepository struct {
	db *pgxpool.Pool
}

func NewEpisodeRepository(db *pgxpool.Pool) *EpisodeRepository {
	return &EpisodeRepository{db: db}
}

// GetByAnimeID returns all episodes for an anime, ordered by episode number
func (r *EpisodeRepository) GetByAnimeID(ctx context.Context, animeID int64) ([]models.Episode, int64, error) {
	// Count total episodes
	countQuery := `SELECT COUNT(*) FROM episodes WHERE anime_id = $1`
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, animeID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count episodes: %w", err)
	}

	// Get episodes ordered by episode_number
	query := `
		SELECT
			id, anime_id, episode_number, title, filename,
			COALESCE(stream_links, ARRAY[]::TEXT[]) as stream_links,
			status, view_count, download_count,
			raw_proc, translate_proc, time_proc, typeset_proc, logo_proc,
			edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc,
			created_at, updated_at
		FROM episodes
		WHERE anime_id = $1
		ORDER BY
			CASE
				WHEN episode_number ~ '^\d+$' THEN LPAD(episode_number, 10, '0')
				ELSE episode_number
			END
	`

	rows, err := r.db.Query(ctx, query, animeID)
	if err != nil {
		return nil, 0, fmt.Errorf("query episodes: %w", err)
	}
	defer rows.Close()

	var episodes []models.Episode
	for rows.Next() {
		var ep models.Episode
		if err := rows.Scan(
			&ep.ID, &ep.AnimeID, &ep.EpisodeNumber, &ep.Title, &ep.Filename,
			&ep.StreamLinks, &ep.Status, &ep.ViewCount, &ep.DownloadCount,
			&ep.Progress.Raw, &ep.Progress.Translate, &ep.Progress.Time,
			&ep.Progress.Typeset, &ep.Progress.Logo, &ep.Progress.Edit,
			&ep.Progress.Karatime, &ep.Progress.Karafx, &ep.Progress.QC,
			&ep.Progress.Encode, &ep.CreatedAt, &ep.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan episode: %w", err)
		}
		episodes = append(episodes, ep)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate episodes: %w", err)
	}

	return episodes, total, nil
}

// GetByID returns an episode by ID with parent anime info
func (r *EpisodeRepository) GetByID(ctx context.Context, id int64) (*models.EpisodeDetail, error) {
	query := `
		SELECT
			e.id, e.anime_id, e.episode_number, e.title, e.filename,
			e.status, e.view_count, e.download_count,
			COALESCE(e.stream_links, ARRAY[]::TEXT[]) as stream_links,
			e.stream_links_legacy,
			e.raw_proc, e.translate_proc, e.time_proc, e.typeset_proc, e.logo_proc,
			e.edit_proc, e.karatime_proc, e.karafx_proc, e.qc_proc, e.encode_proc,
			e.created_at, e.updated_at,
			a.id as anime_id, a.title as anime_title, a.cover_image as anime_cover
		FROM episodes e
		JOIN anime a ON a.id = e.anime_id
		WHERE e.id = $1
	`

	var ep models.EpisodeDetail
	err := r.db.QueryRow(ctx, query, id).Scan(
		&ep.ID, &ep.AnimeID, &ep.EpisodeNumber, &ep.Title, &ep.Filename,
		&ep.Status, &ep.ViewCount, &ep.DownloadCount,
		&ep.StreamLinks, &ep.StreamLinksLegacy,
		&ep.FansubProgress.Raw, &ep.FansubProgress.Translate, &ep.FansubProgress.Time,
		&ep.FansubProgress.Typeset, &ep.FansubProgress.Logo, &ep.FansubProgress.Edit,
		&ep.FansubProgress.Karatime, &ep.FansubProgress.Karafx, &ep.FansubProgress.QC,
		&ep.FansubProgress.Encode, &ep.CreatedAt, &ep.UpdatedAt,
		&ep.Anime.ID, &ep.Anime.Title, &ep.Anime.CoverImage,
	)
	if err != nil {
		return nil, fmt.Errorf("query episode by id: %w", err)
	}

	return &ep, nil
}
