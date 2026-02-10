package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

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

// ListForAdmin returns a paginated list of episodes for admin management
func (r *EpisodeRepository) ListForAdmin(ctx context.Context, f models.EpisodeAdminFilter) ([]models.EpisodeAdminListItem, int64, error) {
	// Build WHERE conditions
	conditions := []string{"1=1"}
	args := []any{}
	argNum := 1

	// Anime filter
	if f.AnimeID > 0 {
		conditions = append(conditions, fmt.Sprintf("e.anime_id = $%d", argNum))
		args = append(args, f.AnimeID)
		argNum++
	}

	// Status filter
	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("e.status = $%d", argNum))
		args = append(args, f.Status)
		argNum++
	}

	// Search filter (episode number or title)
	if f.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(e.episode_number ILIKE $%d OR e.title ILIKE $%d OR a.title ILIKE $%d)", argNum, argNum, argNum))
		args = append(args, "%"+f.Search+"%")
		argNum++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM episodes e
		JOIN anime a ON a.id = e.anime_id
		WHERE %s
	`, whereClause)
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count episodes: %w", err)
	}

	// Pagination defaults
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 20
	}
	if f.PerPage > 100 {
		f.PerPage = 100
	}

	offset := (f.Page - 1) * f.PerPage

	// Data query
	dataQuery := fmt.Sprintf(`
		SELECT
			e.id, e.anime_id, a.title as anime_title, e.episode_number, e.title, e.filename,
			e.status, e.view_count, e.download_count,
			e.raw_proc, e.translate_proc, e.time_proc, e.typeset_proc, e.logo_proc,
			e.edit_proc, e.karatime_proc, e.karafx_proc, e.qc_proc, e.encode_proc,
			e.created_at, e.updated_at
		FROM episodes e
		JOIN anime a ON a.id = e.anime_id
		WHERE %s
		ORDER BY a.title,
			CASE
				WHEN e.episode_number ~ '^\d+$' THEN LPAD(e.episode_number, 10, '0')
				ELSE e.episode_number
			END
		LIMIT $%d OFFSET $%d
	`, whereClause, argNum, argNum+1)

	args = append(args, f.PerPage, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("query episodes list: %w", err)
	}
	defer rows.Close()

	var items []models.EpisodeAdminListItem
	for rows.Next() {
		var item models.EpisodeAdminListItem
		if err := rows.Scan(
			&item.ID, &item.AnimeID, &item.AnimeTitle, &item.EpisodeNumber, &item.Title, &item.Filename,
			&item.Status, &item.ViewCount, &item.DownloadCount,
			&item.Progress.Raw, &item.Progress.Translate, &item.Progress.Time,
			&item.Progress.Typeset, &item.Progress.Logo, &item.Progress.Edit,
			&item.Progress.Karatime, &item.Progress.Karafx, &item.Progress.QC,
			&item.Progress.Encode, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan episode: %w", err)
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate episodes: %w", err)
	}

	return items, total, nil
}

// Create creates a new episode
func (r *EpisodeRepository) Create(ctx context.Context, req models.CreateEpisodeRequest) (*models.Episode, error) {
	query := `
		INSERT INTO episodes (
			anime_id, episode_number, title, filename, stream_links, status,
			raw_proc, translate_proc, time_proc, typeset_proc, logo_proc,
			edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc,
			view_count, download_count, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14, $15, $16,
			0, 0, NOW(), NOW()
		)
		RETURNING id, created_at, updated_at
	`

	// Handle stream links
	streamLinks := req.StreamLinks
	if streamLinks == nil {
		streamLinks = []string{}
	}

	episode := &models.Episode{
		AnimeID:       req.AnimeID,
		EpisodeNumber: req.EpisodeNumber,
		Title:         req.Title,
		Filename:      req.Filename,
		StreamLinks:   streamLinks,
		Status:        req.Status,
		ViewCount:     0,
		DownloadCount: 0,
		Progress: models.FansubProgress{
			Raw:       req.ProgressRaw,
			Translate: req.ProgressTranslate,
			Time:      req.ProgressTime,
			Typeset:   req.ProgressTypeset,
			Logo:      req.ProgressLogo,
			Edit:      req.ProgressEdit,
			Karatime:  req.ProgressKaratime,
			Karafx:    req.ProgressKarafx,
			QC:        req.ProgressQC,
			Encode:    req.ProgressEncode,
		},
	}

	err := r.db.QueryRow(ctx, query,
		req.AnimeID, req.EpisodeNumber, req.Title, req.Filename, streamLinks, req.Status,
		req.ProgressRaw, req.ProgressTranslate, req.ProgressTime, req.ProgressTypeset, req.ProgressLogo,
		req.ProgressEdit, req.ProgressKaratime, req.ProgressKarafx, req.ProgressQC, req.ProgressEncode,
	).Scan(&episode.ID, &episode.CreatedAt, &episode.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("create episode: %w", err)
	}

	return episode, nil
}

// Update updates an existing episode
func (r *EpisodeRepository) Update(ctx context.Context, id int64, req models.UpdateEpisodeRequest) (*models.Episode, error) {
	// Build dynamic update query
	setClauses := []string{}
	args := []any{}
	argNum := 1

	if req.EpisodeNumber != nil {
		setClauses = append(setClauses, fmt.Sprintf("episode_number = $%d", argNum))
		args = append(args, *req.EpisodeNumber)
		argNum++
	}
	if req.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argNum))
		args = append(args, *req.Title)
		argNum++
	}
	if req.Filename != nil {
		setClauses = append(setClauses, fmt.Sprintf("filename = $%d", argNum))
		args = append(args, *req.Filename)
		argNum++
	}
	if req.StreamLinks != nil {
		setClauses = append(setClauses, fmt.Sprintf("stream_links = $%d", argNum))
		args = append(args, req.StreamLinks)
		argNum++
	}
	if req.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argNum))
		args = append(args, *req.Status)
		argNum++
	}
	if req.ProgressRaw != nil {
		setClauses = append(setClauses, fmt.Sprintf("raw_proc = $%d", argNum))
		args = append(args, *req.ProgressRaw)
		argNum++
	}
	if req.ProgressTranslate != nil {
		setClauses = append(setClauses, fmt.Sprintf("translate_proc = $%d", argNum))
		args = append(args, *req.ProgressTranslate)
		argNum++
	}
	if req.ProgressTime != nil {
		setClauses = append(setClauses, fmt.Sprintf("time_proc = $%d", argNum))
		args = append(args, *req.ProgressTime)
		argNum++
	}
	if req.ProgressTypeset != nil {
		setClauses = append(setClauses, fmt.Sprintf("typeset_proc = $%d", argNum))
		args = append(args, *req.ProgressTypeset)
		argNum++
	}
	if req.ProgressLogo != nil {
		setClauses = append(setClauses, fmt.Sprintf("logo_proc = $%d", argNum))
		args = append(args, *req.ProgressLogo)
		argNum++
	}
	if req.ProgressEdit != nil {
		setClauses = append(setClauses, fmt.Sprintf("edit_proc = $%d", argNum))
		args = append(args, *req.ProgressEdit)
		argNum++
	}
	if req.ProgressKaratime != nil {
		setClauses = append(setClauses, fmt.Sprintf("karatime_proc = $%d", argNum))
		args = append(args, *req.ProgressKaratime)
		argNum++
	}
	if req.ProgressKarafx != nil {
		setClauses = append(setClauses, fmt.Sprintf("karafx_proc = $%d", argNum))
		args = append(args, *req.ProgressKarafx)
		argNum++
	}
	if req.ProgressQC != nil {
		setClauses = append(setClauses, fmt.Sprintf("qc_proc = $%d", argNum))
		args = append(args, *req.ProgressQC)
		argNum++
	}
	if req.ProgressEncode != nil {
		setClauses = append(setClauses, fmt.Sprintf("encode_proc = $%d", argNum))
		args = append(args, *req.ProgressEncode)
		argNum++
	}

	if len(setClauses) == 0 {
		// No fields to update, just return the existing episode
		return r.getEpisodeByID(ctx, id)
	}

	// Always update updated_at
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argNum))
	args = append(args, time.Now())
	argNum++

	// Add ID as the last argument
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE episodes
		SET %s
		WHERE id = $%d
	`, strings.Join(setClauses, ", "), argNum)

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("update episode: %w", err)
	}

	if result.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	return r.getEpisodeByID(ctx, id)
}

// Delete deletes an episode by ID
func (r *EpisodeRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM episodes WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete episode: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// getEpisodeByID is a helper to get episode without anime join
func (r *EpisodeRepository) getEpisodeByID(ctx context.Context, id int64) (*models.Episode, error) {
	query := `
		SELECT
			id, anime_id, episode_number, title, filename,
			COALESCE(stream_links, ARRAY[]::TEXT[]) as stream_links,
			status, view_count, download_count,
			raw_proc, translate_proc, time_proc, typeset_proc, logo_proc,
			edit_proc, karatime_proc, karafx_proc, qc_proc, encode_proc,
			created_at, updated_at
		FROM episodes
		WHERE id = $1
	`

	var ep models.Episode
	err := r.db.QueryRow(ctx, query, id).Scan(
		&ep.ID, &ep.AnimeID, &ep.EpisodeNumber, &ep.Title, &ep.Filename,
		&ep.StreamLinks, &ep.Status, &ep.ViewCount, &ep.DownloadCount,
		&ep.Progress.Raw, &ep.Progress.Translate, &ep.Progress.Time,
		&ep.Progress.Typeset, &ep.Progress.Logo, &ep.Progress.Edit,
		&ep.Progress.Karatime, &ep.Progress.Karafx, &ep.Progress.QC,
		&ep.Progress.Encode, &ep.CreatedAt, &ep.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get episode by id: %w", err)
	}

	return &ep, nil
}
