package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
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

// ReleaseVariantBelongsToAnime prueft, ob die technische Release-Variante zum Anime-Kontext gehoert.
func (r *AdminContentRepository) ReleaseVariantBelongsToAnime(ctx context.Context, releaseVariantID int64, animeID int64) (bool, error) {
	if releaseVariantID <= 0 || animeID <= 0 {
		return false, nil
	}

	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM release_variants rv
			JOIN release_versions rev ON rev.id = rv.release_version_id
			JOIN fansub_releases fr ON fr.id = rev.release_id
			JOIN episodes ep ON ep.id = fr.episode_id
			WHERE rv.id = $1
			  AND ep.anime_id = $2
		)
	`, releaseVariantID, animeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check release variant anime release_variant=%d anime=%d: %w", releaseVariantID, animeID, err)
	}
	return exists, nil
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

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var animeID int64
	if err := tx.QueryRow(ctx, `SELECT anime_id FROM themes WHERE id=$1`, themeID).Scan(&animeID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if err := lockSegmentAssignmentAnimeTx(ctx, tx, animeID); err != nil {
		return err
	}
	var oldTypeName string
	if err := tx.QueryRow(ctx, `SELECT tt.name FROM themes t JOIN theme_types tt ON tt.id=t.theme_type_id WHERE t.id=$1`, themeID).Scan(&oldTypeName); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, query, args...)
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

	if input.ThemeTypeID != nil {
		var newTypeName string
		if err := tx.QueryRow(ctx, `SELECT name FROM theme_types WHERE id=$1`, *input.ThemeTypeID).Scan(&newTypeName); err != nil {
			return err
		}
		if segmentAssignmentSlotType(oldTypeName) != segmentAssignmentSlotType(newTypeName) {
			rows, err := tx.Query(ctx, `SELECT id FROM theme_segments WHERE theme_id=$1`, themeID)
			if err != nil {
				return err
			}
			ids, err := collectInt64Column(rows)
			if err != nil {
				return err
			}
			if err := validateSegmentAssignmentTypeChangeTx(ctx, tx, ids, segmentAssignmentSlotType(newTypeName)); err != nil {
				return err
			}
		}
	}
	return tx.Commit(ctx)
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
