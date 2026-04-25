package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgconn"
)

// ListThemeTypes gibt alle Theme-Typen geordnet nach ID zurück.
func (r *AdminContentRepository) ListThemeTypes(ctx context.Context) ([]models.AdminThemeType, error) {
	rows, err := r.db.Query(ctx, `SELECT id, name FROM theme_types ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("list theme types: %w", err)
	}
	defer rows.Close()

	types := make([]models.AdminThemeType, 0)
	for rows.Next() {
		var tt models.AdminThemeType
		if err := rows.Scan(&tt.ID, &tt.Name); err != nil {
			return nil, fmt.Errorf("scan theme type: %w", err)
		}
		types = append(types, tt)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate theme types: %w", err)
	}

	return types, nil
}

// ListAdminAnimeThemes gibt alle Themes eines Anime zurück, mit aufgelöstem theme_type_name.
func (r *AdminContentRepository) ListAdminAnimeThemes(ctx context.Context, animeID int64) ([]models.AdminAnimeTheme, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			t.id,
			t.anime_id,
			t.theme_type_id,
			tt.name AS theme_type_name,
			t.title,
			t.created_at
		FROM themes t
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE t.anime_id = $1
		ORDER BY t.theme_type_id, t.id
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("list admin anime themes anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	themes := make([]models.AdminAnimeTheme, 0)
	for rows.Next() {
		var theme models.AdminAnimeTheme
		if err := rows.Scan(
			&theme.ID,
			&theme.AnimeID,
			&theme.ThemeTypeID,
			&theme.ThemeTypeName,
			&theme.Title,
			&theme.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan admin anime theme anime=%d: %w", animeID, err)
		}
		themes = append(themes, theme)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin anime themes anime=%d: %w", animeID, err)
	}

	return themes, nil
}

// CreateAdminAnimeTheme legt ein neues Theme an und gibt den erstellten Datensatz zurück.
func (r *AdminContentRepository) CreateAdminAnimeTheme(ctx context.Context, animeID int64, input models.AdminAnimeThemeCreateInput) (*models.AdminAnimeTheme, error) {
	if animeID <= 0 {
		return nil, ErrNotFound
	}

	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	var theme models.AdminAnimeTheme
	err = r.db.QueryRow(ctx, `
		INSERT INTO themes (anime_id, theme_type_id, title)
		VALUES ($1, $2, $3)
		RETURNING id, anime_id, theme_type_id, title, created_at
	`, animeID, input.ThemeTypeID, input.Title).Scan(
		&theme.ID,
		&theme.AnimeID,
		&theme.ThemeTypeID,
		&theme.Title,
		&theme.CreatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create admin anime theme anime=%d: %w", animeID, err)
	}

	// theme_type_name per Follow-up-SELECT auflösen
	if err := r.db.QueryRow(ctx, `SELECT name FROM theme_types WHERE id = $1`, theme.ThemeTypeID).Scan(&theme.ThemeTypeName); err != nil {
		return nil, fmt.Errorf("resolve theme type name id=%d: %w", theme.ThemeTypeID, err)
	}

	return &theme, nil
}

// UpdateAdminAnimeTheme aktualisiert theme_type_id und/oder title eines Themes (partieller Patch).
func (r *AdminContentRepository) UpdateAdminAnimeTheme(ctx context.Context, themeID int64, input models.AdminAnimeThemePatchInput) error {
	if themeID <= 0 {
		return ErrNotFound
	}

	setClauses := make([]string, 0, 2)
	args := make([]interface{}, 0, 3)
	argIdx := 1

	if input.ThemeTypeID != nil {
		setClauses = append(setClauses, fmt.Sprintf("theme_type_id = $%d", argIdx))
		args = append(args, *input.ThemeTypeID)
		argIdx++
	}
	if input.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *input.Title)
		argIdx++
	}

	if len(setClauses) == 0 {
		// Nichts zu aktualisieren — prüfen ob Theme existiert
		var exists bool
		if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM themes WHERE id = $1)`, themeID).Scan(&exists); err != nil {
			return fmt.Errorf("check theme existence id=%d: %w", themeID, err)
		}
		if !exists {
			return ErrNotFound
		}
		return nil
	}

	args = append(args, themeID)
	query := fmt.Sprintf("UPDATE themes SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argIdx)

	tag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return ErrConflict
		}
		return fmt.Errorf("update admin anime theme id=%d: %w", themeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// DeleteAdminAnimeTheme löscht ein Theme anhand seiner ID.
func (r *AdminContentRepository) DeleteAdminAnimeTheme(ctx context.Context, themeID int64) error {
	if themeID <= 0 {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `DELETE FROM themes WHERE id = $1`, themeID)
	if err != nil {
		return fmt.Errorf("delete admin anime theme id=%d: %w", themeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// ListAdminAnimeThemeSegments gibt alle Segmente eines Themes zurück (Plan 02).
func (r *AdminContentRepository) ListAdminAnimeThemeSegments(ctx context.Context, themeID int64) ([]models.AdminAnimeThemeSegment, error) {
	if themeID <= 0 {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			ts.id,
			ts.theme_id,
			ts.start_episode_id,
			ts.end_episode_id,
			se.episode_number AS start_episode_number,
			ee.episode_number AS end_episode_number,
			ts.created_at
		FROM theme_segments ts
		LEFT JOIN episodes se ON se.id = ts.start_episode_id
		LEFT JOIN episodes ee ON ee.id = ts.end_episode_id
		WHERE ts.theme_id = $1
		ORDER BY ts.id
	`, themeID)
	if err != nil {
		return nil, fmt.Errorf("list admin anime theme segments theme=%d: %w", themeID, err)
	}
	defer rows.Close()

	segments := make([]models.AdminAnimeThemeSegment, 0)
	for rows.Next() {
		var seg models.AdminAnimeThemeSegment
		if err := rows.Scan(
			&seg.ID,
			&seg.ThemeID,
			&seg.StartEpisodeID,
			&seg.EndEpisodeID,
			&seg.StartEpisodeNumber,
			&seg.EndEpisodeNumber,
			&seg.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan admin anime theme segment theme=%d: %w", themeID, err)
		}
		segments = append(segments, seg)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin anime theme segments theme=%d: %w", themeID, err)
	}

	return segments, nil
}

// CreateAdminAnimeThemeSegment legt ein neues Segment für ein Theme an (Plan 02).
func (r *AdminContentRepository) CreateAdminAnimeThemeSegment(ctx context.Context, themeID int64, input models.AdminAnimeThemeSegmentCreateInput) (*models.AdminAnimeThemeSegment, error) {
	if themeID <= 0 {
		return nil, ErrNotFound
	}

	var seg models.AdminAnimeThemeSegment
	err := r.db.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, start_episode_id, end_episode_id)
		VALUES ($1, $2, $3)
		RETURNING id, theme_id, start_episode_id, end_episode_id, created_at
	`, themeID, input.StartEpisodeID, input.EndEpisodeID).Scan(
		&seg.ID,
		&seg.ThemeID,
		&seg.StartEpisodeID,
		&seg.EndEpisodeID,
		&seg.CreatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23503" {
				return nil, ErrConflict
			}
			if pgErr.Code == "23505" {
				return nil, ErrConflict
			}
		}
		return nil, fmt.Errorf("create admin anime theme segment theme=%d: %w", themeID, err)
	}

	// episode_number Werte per Follow-up-Queries auflösen
	if seg.StartEpisodeID != nil {
		var epNum string
		if err := r.db.QueryRow(ctx, `SELECT episode_number FROM episodes WHERE id = $1`, *seg.StartEpisodeID).Scan(&epNum); err == nil {
			seg.StartEpisodeNumber = &epNum
		}
	}
	if seg.EndEpisodeID != nil {
		var epNum string
		if err := r.db.QueryRow(ctx, `SELECT episode_number FROM episodes WHERE id = $1`, *seg.EndEpisodeID).Scan(&epNum); err == nil {
			seg.EndEpisodeNumber = &epNum
		}
	}

	return &seg, nil
}

// DeleteAdminAnimeThemeSegment löscht ein Theme-Segment anhand seiner ID (Plan 02).
func (r *AdminContentRepository) DeleteAdminAnimeThemeSegment(ctx context.Context, segmentID int64) error {
	if segmentID <= 0 {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `DELETE FROM theme_segments WHERE id = $1`, segmentID)
	if err != nil {
		return fmt.Errorf("delete admin anime theme segment id=%d: %w", segmentID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
