package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnimeMetadataRepository struct {
	db *pgxpool.Pool
}

type LegacyAnimeMetadataSource struct {
	AnimeID  int64
	Title    string
	TitleDE  *string
	TitleEN  *string
	GenreRaw *string
}

func NewAnimeMetadataRepository(db *pgxpool.Pool) *AnimeMetadataRepository {
	return &AnimeMetadataRepository{db: db}
}

func (r *AnimeMetadataRepository) ListLegacyAnimeMetadataSources(ctx context.Context) ([]LegacyAnimeMetadataSource, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, title_de, title_en, genre
		FROM anime
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query legacy anime metadata sources: %w", err)
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

func (r *AnimeMetadataRepository) GetLanguageID(ctx context.Context, code string) (int64, error) {
	var id int64
	err := r.db.QueryRow(
		ctx,
		`SELECT id FROM languages WHERE code = $1`,
		strings.TrimSpace(code),
	).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("get language id %q: %w", code, err)
	}

	return id, nil
}

func (r *AnimeMetadataRepository) GetTitleTypeID(ctx context.Context, name string) (int64, error) {
	var id int64
	err := r.db.QueryRow(
		ctx,
		`SELECT id FROM title_types WHERE name = $1`,
		strings.TrimSpace(name),
	).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("get title type id %q: %w", name, err)
	}

	return id, nil
}

func (r *AnimeMetadataRepository) UpsertAnimeTitle(
	ctx context.Context,
	animeID, languageID, titleTypeID int64,
	title string,
) (bool, error) {
	var rowID int64
	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO anime_titles (anime_id, language_id, title, title_type_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (anime_id, language_id, title_type_id)
		DO UPDATE SET
			title = EXCLUDED.title,
			updated_at = NOW()
		WHERE anime_titles.title IS DISTINCT FROM EXCLUDED.title
		RETURNING id
		`,
		animeID,
		languageID,
		strings.TrimSpace(title),
		titleTypeID,
	).Scan(&rowID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("upsert anime title anime=%d language=%d type=%d: %w", animeID, languageID, titleTypeID, err)
	}

	return true, nil
}

func (r *AnimeMetadataRepository) EnsureGenre(ctx context.Context, name string) (int64, bool, error) {
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return 0, false, fmt.Errorf("ensure genre: name is required")
	}

	var id int64
	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO genres (name)
		VALUES ($1)
		ON CONFLICT (name) DO NOTHING
		RETURNING id
		`,
		trimmedName,
	).Scan(&id)
	if err == nil {
		return id, true, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, false, fmt.Errorf("ensure genre %q: %w", trimmedName, err)
	}

	err = r.db.QueryRow(ctx, `SELECT id FROM genres WHERE name = $1`, trimmedName).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, ErrNotFound
	}
	if err != nil {
		return 0, false, fmt.Errorf("load existing genre %q: %w", trimmedName, err)
	}

	return id, false, nil
}

func (r *AnimeMetadataRepository) EnsureAnimeGenreLink(ctx context.Context, animeID, genreID int64) (bool, error) {
	tag, err := r.db.Exec(
		ctx,
		`
		INSERT INTO anime_genres (anime_id, genre_id)
		VALUES ($1, $2)
		ON CONFLICT (anime_id, genre_id) DO NOTHING
		`,
		animeID,
		genreID,
	)
	if err != nil {
		return false, fmt.Errorf("ensure anime genre link anime=%d genre=%d: %w", animeID, genreID, err)
	}

	return tag.RowsAffected() > 0, nil
}
