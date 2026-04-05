package repository

import (
	"context"
	"fmt"
	"strings"
)

type ExistingJellyfinAnimeMatch struct {
	AnimeID    int64
	Title      string
	Source     *string
	FolderName *string
}

func (r *AdminContentRepository) FindExistingAnimeByJellyfinIntakeRefs(
	ctx context.Context,
	seriesIDs []string,
	paths []string,
) ([]ExistingJellyfinAnimeMatch, error) {
	normalizedSeriesIDs := normalizeDistinctStrings(seriesIDs)
	normalizedPaths := normalizeDistinctStrings(paths)
	if len(normalizedSeriesIDs) == 0 && len(normalizedPaths) == 0 {
		return []ExistingJellyfinAnimeMatch{}, nil
	}

	schema, err := r.loadAnimeV2SchemaInfo(ctx)
	if err != nil {
		return nil, err
	}
	if schema.HasSlug {
		return r.findExistingAnimeByJellyfinIntakeRefsV2(ctx, schema, normalizedSeriesIDs, normalizedPaths)
	}
	return r.findExistingAnimeByJellyfinIntakeRefsLegacy(ctx, normalizedSeriesIDs, normalizedPaths)
}

func (r *AdminContentRepository) findExistingAnimeByJellyfinIntakeRefsLegacy(
	ctx context.Context,
	seriesIDs []string,
	paths []string,
) ([]ExistingJellyfinAnimeMatch, error) {
	query := `
		SELECT id, title, source, folder_name
		FROM anime
		WHERE (
			cardinality($1::text[]) > 0
			AND source = ANY($1::text[])
		) OR (
			cardinality($2::text[]) > 0
			AND folder_name = ANY($2::text[])
		)
	`

	rows, err := r.db.Query(ctx, query, buildJellyfinSourceTags(seriesIDs), paths)
	if err != nil {
		return nil, fmt.Errorf("query legacy jellyfin intake matches: %w", err)
	}
	defer rows.Close()

	matches := make([]ExistingJellyfinAnimeMatch, 0)
	for rows.Next() {
		var item ExistingJellyfinAnimeMatch
		if err := rows.Scan(&item.AnimeID, &item.Title, &item.Source, &item.FolderName); err != nil {
			return nil, fmt.Errorf("scan legacy jellyfin intake match: %w", err)
		}
		matches = append(matches, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate legacy jellyfin intake matches: %w", err)
	}

	return matches, nil
}

func (r *AdminContentRepository) findExistingAnimeByJellyfinIntakeRefsV2(
	ctx context.Context,
	schema animeV2SchemaInfo,
	seriesIDs []string,
	paths []string,
) ([]ExistingJellyfinAnimeMatch, error) {
	displayTitleExpr := primaryNormalizedTitleSQL("anime.id", "anime.slug")
	sourceSelect := "anime.source"
	sourceMatchClause := "anime.source = ANY($1::text[])"
	if !schema.HasSource {
		sourceSelect = `(
			SELECT 'jellyfin:' || me.external_id
			FROM anime_media am
			JOIN media_external me ON me.media_id = am.media_id
			WHERE am.anime_id = anime.id
			  AND me.provider = 'jellyfin'
			ORDER BY am.sort_order ASC, me.id ASC
			LIMIT 1
		)`
		sourceMatchClause = `EXISTS (
			SELECT 1
			FROM anime_media am
			JOIN media_external me ON me.media_id = am.media_id
			WHERE am.anime_id = anime.id
			  AND me.provider = 'jellyfin'
			  AND ('jellyfin:' || me.external_id) = ANY($1::text[])
		)`
	}

	query := `
		SELECT
			anime.id,
			` + displayTitleExpr + ` AS display_title,
			` + sourceSelect + ` AS source,
			anime.folder_name
		FROM anime
		WHERE (
			cardinality($1::text[]) > 0
			AND ` + sourceMatchClause + `
		) OR (
			cardinality($2::text[]) > 0
			AND anime.folder_name = ANY($2::text[])
		)
	`

	rows, err := r.db.Query(ctx, query, buildJellyfinSourceTags(seriesIDs), paths)
	if err != nil {
		return nil, fmt.Errorf("query v2 jellyfin intake matches: %w", err)
	}
	defer rows.Close()

	matches := make([]ExistingJellyfinAnimeMatch, 0)
	for rows.Next() {
		var item ExistingJellyfinAnimeMatch
		if err := rows.Scan(&item.AnimeID, &item.Title, &item.Source, &item.FolderName); err != nil {
			return nil, fmt.Errorf("scan v2 jellyfin intake match: %w", err)
		}
		matches = append(matches, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate v2 jellyfin intake matches: %w", err)
	}

	return matches, nil
}

func buildJellyfinSourceTags(seriesIDs []string) []string {
	result := make([]string, 0, len(seriesIDs))
	for _, id := range seriesIDs {
		trimmed := strings.TrimSpace(id)
		if trimmed == "" {
			continue
		}
		result = append(result, "jellyfin:"+trimmed)
	}
	return result
}

func normalizeDistinctStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}
