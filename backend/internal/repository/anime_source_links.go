package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

type animeSourceLinkQueryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func syncAnimeSourceLinks(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	primary *string,
	extra []string,
) error {
	values := normalizeDistinctStrings(extra)
	if primary != nil && strings.TrimSpace(*primary) != "" {
		values = normalizeDistinctStrings(append([]string{strings.TrimSpace(*primary)}, values...))
	}
	if animeID <= 0 || len(values) == 0 {
		return nil
	}

	for _, source := range values {
		if _, err := tx.Exec(
			ctx,
			`
			INSERT INTO anime_source_links (anime_id, source)
			VALUES ($1, $2)
			ON CONFLICT (anime_id, source) DO NOTHING
			`,
			animeID,
			source,
		); err != nil {
			return fmt.Errorf("link anime source anime=%d source=%q: %w", animeID, source, err)
		}
	}

	return nil
}

func loadAnimeSourceLinks(ctx context.Context, q animeSourceLinkQueryer, animeID int64) ([]string, error) {
	rows, err := q.Query(ctx, `SELECT source FROM anime_source_links WHERE anime_id = $1 ORDER BY source ASC`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime source links %d: %w", animeID, err)
	}
	defer rows.Close()

	result := make([]string, 0)
	for rows.Next() {
		var source string
		if err := rows.Scan(&source); err != nil {
			return nil, fmt.Errorf("scan anime source link %d: %w", animeID, err)
		}
		result = append(result, source)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime source links %d: %w", animeID, err)
	}

	return result, nil
}
