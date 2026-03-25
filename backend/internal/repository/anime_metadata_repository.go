package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AnimeMetadataRepository is a compatibility alias for the metadata backfill service.
// The metadata methods now live on AdminContentRepository and are shimmed here for
// the still-referenced backfill service.
type AnimeMetadataRepository = AdminContentRepository

type LegacyAnimeMetadataSource struct {
	AnimeID  int64
	Title    string
	TitleDE  *string
	TitleEN  *string
	GenreRaw *string
}

func NewAnimeMetadataRepository(db *pgxpool.Pool) *AnimeMetadataRepository {
	return NewAdminContentRepository(db)
}

func (r *AdminContentRepository) ListLegacyAnimeMetadataSources(ctx context.Context) ([]LegacyAnimeMetadataSource, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, title_de, title_en, genre
		FROM anime
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list legacy anime metadata sources: %w", err)
	}
	defer rows.Close()

	items := make([]LegacyAnimeMetadataSource, 0)
	for rows.Next() {
		var item LegacyAnimeMetadataSource
		if err := rows.Scan(&item.AnimeID, &item.Title, &item.TitleDE, &item.TitleEN, &item.GenreRaw); err != nil {
			return nil, fmt.Errorf("scan legacy anime metadata source: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate legacy anime metadata sources: %w", err)
	}

	return items, nil
}

func (r *AdminContentRepository) GetLanguageID(ctx context.Context, code string) (int64, error) {
	var id int64
	if err := r.db.QueryRow(ctx, `SELECT id FROM languages WHERE code = $1`, code).Scan(&id); err != nil {
		return 0, fmt.Errorf("get language id for %q: %w", code, err)
	}
	return id, nil
}

func (r *AdminContentRepository) GetTitleTypeID(ctx context.Context, name string) (int64, error) {
	var id int64
	if err := r.db.QueryRow(ctx, `SELECT id FROM title_types WHERE name = $1`, name).Scan(&id); err != nil {
		return 0, fmt.Errorf("get title type id for %q: %w", name, err)
	}
	return id, nil
}

func (r *AdminContentRepository) UpsertAnimeTitle(
	ctx context.Context,
	animeID int64,
	languageID int64,
	titleTypeID int64,
	title string,
) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		INSERT INTO anime_titles (anime_id, language_id, title_type_id, title)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (anime_id, language_id, title_type_id)
		DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
	`, animeID, languageID, titleTypeID, title)
	if err != nil {
		return false, fmt.Errorf("upsert anime title anime=%d language=%d type=%d: %w", animeID, languageID, titleTypeID, err)
	}

	return tag.RowsAffected() > 0, nil
}

func (r *AdminContentRepository) EnsureGenre(ctx context.Context, name string) (int64, bool, error) {
	var id int64
	var created bool
	if err := r.db.QueryRow(ctx, `
		WITH inserted AS (
			INSERT INTO genres (name)
			VALUES ($1)
			ON CONFLICT (name) DO NOTHING
			RETURNING id
		)
		SELECT id, true FROM inserted
		UNION ALL
		SELECT id, false FROM genres WHERE name = $1
		LIMIT 1
	`, name).Scan(&id, &created); err != nil {
		return 0, false, fmt.Errorf("ensure genre %q: %w", name, err)
	}
	return id, created, nil
}

func (r *AdminContentRepository) EnsureAnimeGenreLink(ctx context.Context, animeID int64, genreID int64) (bool, error) {
	tag, err := r.db.Exec(ctx, `
		INSERT INTO anime_genres (anime_id, genre_id)
		VALUES ($1, $2)
		ON CONFLICT (anime_id, genre_id) DO NOTHING
	`, animeID, genreID)
	if err != nil {
		return false, fmt.Errorf("ensure anime genre link anime=%d genre=%d: %w", animeID, genreID, err)
	}

	return tag.RowsAffected() > 0, nil
}
