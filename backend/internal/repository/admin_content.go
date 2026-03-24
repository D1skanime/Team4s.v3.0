package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminContentRepository struct {
	db *pgxpool.Pool
}

func NewAdminContentRepository(db *pgxpool.Pool) *AdminContentRepository {
	return &AdminContentRepository{db: db}
}

func (r *AdminContentRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
}

func syncAuthoritativeAnimeMetadata(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	write authoritativeAnimeMetadataWrite,
) error {
	for _, slot := range write.TitleSlots {
		if !slot.Set {
			continue
		}
		if err := upsertAuthoritativeAnimeTitle(ctx, tx, animeID, slot); err != nil {
			return err
		}
	}

	if write.GenresSet {
		if err := replaceAuthoritativeAnimeGenres(ctx, tx, animeID, write.Genres); err != nil {
			return err
		}
	}

	return nil
}

func upsertAuthoritativeAnimeTitle(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	slot authoritativeAnimeTitleSlotWrite,
) error {
	if slot.Title == nil {
		_, err := tx.Exec(
			ctx,
			`
			DELETE FROM anime_titles
			WHERE anime_id = $1
			  AND language_id = (SELECT id FROM languages WHERE code = $2)
			  AND title_type_id = (SELECT id FROM title_types WHERE name = $3)
			`,
			animeID,
			slot.LanguageCode,
			slot.TitleType,
		)
		if err != nil {
			return fmt.Errorf(
				"delete authoritative anime title anime=%d language=%s type=%s: %w",
				animeID,
				slot.LanguageCode,
				slot.TitleType,
				err,
			)
		}

		return nil
	}

	_, err := tx.Exec(
		ctx,
		`
		INSERT INTO anime_titles (anime_id, language_id, title, title_type_id)
		SELECT $1, l.id, $4, tt.id
		FROM languages l
		JOIN title_types tt ON tt.name = $3
		WHERE l.code = $2
		ON CONFLICT (anime_id, language_id, title_type_id)
		DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
		`,
		animeID,
		slot.LanguageCode,
		slot.TitleType,
		*slot.Title,
	)
	if err != nil {
		return fmt.Errorf(
			"upsert authoritative anime title anime=%d language=%s type=%s: %w",
			animeID,
			slot.LanguageCode,
			slot.TitleType,
			err,
		)
	}

	return nil
}

func replaceAuthoritativeAnimeGenres(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	genres []string,
) error {
	if _, err := tx.Exec(ctx, `DELETE FROM anime_genres WHERE anime_id = $1`, animeID); err != nil {
		return fmt.Errorf("clear authoritative anime genres anime=%d: %w", animeID, err)
	}

	for _, genre := range genres {
		if _, err := tx.Exec(
			ctx,
			`
			INSERT INTO genres (name)
			VALUES ($1)
			ON CONFLICT (name) DO NOTHING
			`,
			genre,
		); err != nil {
			return fmt.Errorf("ensure authoritative genre %q: %w", genre, err)
		}

		if _, err := tx.Exec(
			ctx,
			`
			INSERT INTO anime_genres (anime_id, genre_id)
			SELECT $1, g.id
			FROM genres g
			WHERE g.name = $2
			ON CONFLICT (anime_id, genre_id) DO NOTHING
			`,
			animeID,
			genre,
		); err != nil {
			return fmt.Errorf("attach authoritative genre anime=%d genre=%q: %w", animeID, genre, err)
		}
	}

	return nil
}

func buildAuthoritativeGenreTokensQuery() string {
	return `
		SELECT g.name, COUNT(*) AS usage_count
		FROM anime_genres ag
		JOIN genres g ON g.id = ag.genre_id
		GROUP BY g.name
	`
}

func filterGenreTokens(tokens []models.GenreToken, query string, limit int) []models.GenreToken {
	filtered := make([]models.GenreToken, 0, len(tokens))
	q := strings.ToLower(strings.TrimSpace(query))
	for _, token := range tokens {
		if q != "" && !strings.Contains(strings.ToLower(token.Name), q) {
			continue
		}
		filtered = append(filtered, token)
	}

	sort.Slice(filtered, func(i, j int) bool {
		leftName := strings.ToLower(filtered[i].Name)
		rightName := strings.ToLower(filtered[j].Name)

		if q != "" {
			leftPrefix := strings.HasPrefix(leftName, q)
			rightPrefix := strings.HasPrefix(rightName, q)
			if leftPrefix != rightPrefix {
				return leftPrefix
			}
		}

		if leftName != rightName {
			return leftName < rightName
		}

		return filtered[i].Count > filtered[j].Count
	})

	if limit > 0 && len(filtered) > limit {
		filtered = filtered[:limit]
	}

	return filtered
}

func (r *AdminContentRepository) ListGenreTokens(
	ctx context.Context,
	query string,
	limit int,
) ([]models.GenreToken, error) {
	rows, err := r.db.Query(ctx, buildAuthoritativeGenreTokensQuery())
	if err != nil {
		return nil, fmt.Errorf("query authoritative genres: %w", err)
	}
	defer rows.Close()

	tokens := make([]models.GenreToken, 0)
	for rows.Next() {
		var token models.GenreToken
		if err := rows.Scan(&token.Name, &token.Count); err != nil {
			return nil, fmt.Errorf("scan authoritative genre token: %w", err)
		}
		tokens = append(tokens, token)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate authoritative genre tokens: %w", err)
	}

	return filterGenreTokens(tokens, query, limit), nil
}
