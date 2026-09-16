package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"
)

// buildAdminTagNamesQuery returns a SELECT over tags LEFT JOINed with
// anime_tags (for the usage count, mirroring buildAuthoritativeTagTokensQuery's
// alias convention) and tag_names (for the current German name). Unlike
// buildAuthoritativeTagTokensQuery, this selects an id column because the
// admin maintenance page (D-04) targets a row by id for PATCH.
func buildAdminTagNamesQuery() string {
	return `
		SELECT t.id, t.name, COUNT(at_.anime_id), tn.name
		FROM tags t
		LEFT JOIN anime_tags at_ ON at_.tag_id = t.id
		LEFT JOIN tag_names tn ON tn.tag_id = t.id AND tn.language_id = (SELECT id FROM languages WHERE code = 'de')
		GROUP BY t.id, t.name, tn.name
		ORDER BY t.name ASC
	`
}

// ListTagNamesAdmin returns one row per tag with its id, base name, usage
// count across all anime, and current German name (nil if untranslated).
// Used by the admin tag/genre-name maintenance page (D-04).
func (r *AdminContentRepository) ListTagNamesAdmin(ctx context.Context) ([]models.AdminTagNameRow, error) {
	rows, err := r.db.Query(ctx, buildAdminTagNamesQuery())
	if err != nil {
		return nil, fmt.Errorf("query admin tag names: %w", err)
	}
	defer rows.Close()

	items := make([]models.AdminTagNameRow, 0)
	for rows.Next() {
		var item models.AdminTagNameRow
		if err := rows.Scan(&item.ID, &item.Name, &item.Count, &item.NameDE); err != nil {
			return nil, fmt.Errorf("scan admin tag name row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin tag names: %w", err)
	}

	return items, nil
}

// UpsertTagGermanName sets the German display name for a tag, or clears it
// (DELETEs the tag_names row) when name is empty/whitespace-only. Global for
// all anime (not anime-scoped), per D-04.
func (r *AdminContentRepository) UpsertTagGermanName(ctx context.Context, tagID int64, name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		if _, err := r.db.Exec(
			ctx,
			`DELETE FROM tag_names WHERE tag_id = $1 AND language_id = (SELECT id FROM languages WHERE code = 'de')`,
			tagID,
		); err != nil {
			return fmt.Errorf("clear tag german name tag=%d: %w", tagID, err)
		}
		return nil
	}

	if _, err := r.db.Exec(
		ctx,
		`
		INSERT INTO tag_names (tag_id, language_id, name, updated_at)
		VALUES ($1, (SELECT id FROM languages WHERE code = 'de'), $2, NOW())
		ON CONFLICT (tag_id, language_id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		`,
		tagID,
		trimmed,
	); err != nil {
		return fmt.Errorf("upsert tag german name tag=%d: %w", tagID, err)
	}

	return nil
}

// buildAdminGenreNamesQuery mirrors buildAdminTagNamesQuery for genres.
func buildAdminGenreNamesQuery() string {
	return `
		SELECT g.id, g.name, COUNT(ag.anime_id), gn.name
		FROM genres g
		LEFT JOIN anime_genres ag ON ag.genre_id = g.id
		LEFT JOIN genre_names gn ON gn.genre_id = g.id AND gn.language_id = (SELECT id FROM languages WHERE code = 'de')
		GROUP BY g.id, g.name, gn.name
		ORDER BY g.name ASC
	`
}

// ListGenreNamesAdmin mirrors ListTagNamesAdmin for genres (D-04/D-07).
func (r *AdminContentRepository) ListGenreNamesAdmin(ctx context.Context) ([]models.AdminGenreNameRow, error) {
	rows, err := r.db.Query(ctx, buildAdminGenreNamesQuery())
	if err != nil {
		return nil, fmt.Errorf("query admin genre names: %w", err)
	}
	defer rows.Close()

	items := make([]models.AdminGenreNameRow, 0)
	for rows.Next() {
		var item models.AdminGenreNameRow
		if err := rows.Scan(&item.ID, &item.Name, &item.Count, &item.NameDE); err != nil {
			return nil, fmt.Errorf("scan admin genre name row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin genre names: %w", err)
	}

	return items, nil
}

// UpsertGenreGermanName mirrors UpsertTagGermanName for genres.
func (r *AdminContentRepository) UpsertGenreGermanName(ctx context.Context, genreID int64, name string) error {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		if _, err := r.db.Exec(
			ctx,
			`DELETE FROM genre_names WHERE genre_id = $1 AND language_id = (SELECT id FROM languages WHERE code = 'de')`,
			genreID,
		); err != nil {
			return fmt.Errorf("clear genre german name genre=%d: %w", genreID, err)
		}
		return nil
	}

	if _, err := r.db.Exec(
		ctx,
		`
		INSERT INTO genre_names (genre_id, language_id, name, updated_at)
		VALUES ($1, (SELECT id FROM languages WHERE code = 'de'), $2, NOW())
		ON CONFLICT (genre_id, language_id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		`,
		genreID,
		trimmed,
	); err != nil {
		return fmt.Errorf("upsert genre german name genre=%d: %w", genreID, err)
	}

	return nil
}
