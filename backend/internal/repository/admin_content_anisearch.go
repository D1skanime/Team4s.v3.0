package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AdminContentRepository) FindAnimeBySource(
	ctx context.Context,
	source string,
) (*models.AdminAnimeSourceMatch, error) {
	normalized := strings.TrimSpace(source)
	if normalized == "" {
		return nil, nil
	}

	schema, err := r.loadAnimeV2SchemaInfo(ctx)
	if err != nil {
		return nil, err
	}
	if !schema.HasSource {
		return nil, nil
	}

	displayTitleExpr := primaryNormalizedTitleSQL("anime.id", "anime.slug")
	if !schema.HasSlug {
		displayTitleExpr = "anime.title"
	}

	var item models.AdminAnimeSourceMatch
	if err := r.db.QueryRow(
		ctx,
		`
		SELECT DISTINCT anime.id, `+displayTitleExpr+`
		FROM anime
		LEFT JOIN anime_source_links asl ON asl.anime_id = anime.id
		WHERE anime.source = $1
		   OR asl.source = $1
		LIMIT 1
		`,
		normalized,
	).Scan(&item.AnimeID, &item.Title); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find anime by source %q: %w", normalized, err)
	}

	return &item, nil
}

func (r *AdminContentRepository) ResolveAdminAnimeRelationTargetsBySources(
	ctx context.Context,
	sources []string,
) ([]models.AdminAnimeSourceMatch, error) {
	normalized := normalizeDistinctStrings(sources)
	if len(normalized) == 0 {
		return []models.AdminAnimeSourceMatch{}, nil
	}

	schema, err := r.loadAnimeV2SchemaInfo(ctx)
	if err != nil {
		return nil, err
	}
	if !schema.HasSource {
		return []models.AdminAnimeSourceMatch{}, nil
	}

	displayTitleExpr := primaryNormalizedTitleSQL("anime.id", "anime.slug")
	if !schema.HasSlug {
		displayTitleExpr = "anime.title"
	}

	rows, err := r.db.Query(
		ctx,
		`
		SELECT DISTINCT COALESCE(asl.source, anime.source) AS matched_source, anime.id, `+displayTitleExpr+`
		FROM anime
		LEFT JOIN anime_source_links asl ON asl.anime_id = anime.id
		WHERE (
			anime.source = ANY($1::text[])
			OR asl.source = ANY($1::text[])
		)
		  AND anime.status <> 'disabled'
		`,
		normalized,
	)
	if err != nil {
		return nil, fmt.Errorf("resolve admin anime relation targets by sources: %w", err)
	}
	defer rows.Close()

	results := make([]models.AdminAnimeSourceMatch, 0)
	for rows.Next() {
		var item models.AdminAnimeSourceMatch
		if err := rows.Scan(&item.Source, &item.AnimeID, &item.Title); err != nil {
			return nil, fmt.Errorf("scan admin anime source match: %w", err)
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin anime source matches: %w", err)
	}

	return results, nil
}

func (r *AdminContentRepository) ResolveAdminAnimeRelationTargetsByTitles(
	ctx context.Context,
	titles []string,
) ([]models.AdminAnimeRelationTitleMatch, error) {
	normalizedTitles := normalizeDistinctStrings(titles)
	if len(normalizedTitles) == 0 {
		return []models.AdminAnimeRelationTitleMatch{}, nil
	}

	schema, err := r.loadAnimeV2SchemaInfo(ctx)
	if err != nil {
		return nil, err
	}

	displayTitleExpr := primaryNormalizedTitleSQL("a.id", "a.slug")
	if !schema.HasSlug {
		displayTitleExpr = "a.title"
	}

	rows, err := r.db.Query(
		ctx,
		`
		WITH requested_titles AS (
			SELECT DISTINCT lower(btrim(value)) AS normalized_title
			FROM unnest($1::text[]) AS value
		)
		SELECT DISTINCT ON (a.id, requested_titles.normalized_title)
			requested_titles.normalized_title,
			a.id,
			`+displayTitleExpr+` AS display_title,
			a.type,
			a.status,
			a.year,
			a.cover_image
		FROM anime a
		JOIN requested_titles ON (
			lower(btrim(COALESCE(a.title, ''))) = requested_titles.normalized_title
			OR lower(btrim(COALESCE(a.title_de, ''))) = requested_titles.normalized_title
			OR lower(btrim(COALESCE(a.title_en, ''))) = requested_titles.normalized_title
			OR EXISTS (
				SELECT 1
				FROM anime_titles at
				WHERE at.anime_id = a.id
				  AND lower(btrim(at.title)) = requested_titles.normalized_title
			)
		)
		WHERE a.status <> 'disabled'
		ORDER BY a.id, requested_titles.normalized_title
		`,
		normalizedTitles,
	)
	if err != nil {
		return nil, fmt.Errorf("resolve admin anime relation titles: %w", err)
	}
	defer rows.Close()

	results := make([]models.AdminAnimeRelationTitleMatch, 0)
	for rows.Next() {
		var item models.AdminAnimeRelationTitleMatch
		if err := rows.Scan(
			&item.MatchedTitle,
			&item.Target.AnimeID,
			&item.Target.Title,
			&item.Target.Type,
			&item.Target.Status,
			&item.Target.Year,
			&item.Target.CoverURL,
		); err != nil {
			return nil, fmt.Errorf("scan admin anime relation title match: %w", err)
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin anime relation title matches: %w", err)
	}

	return results, nil
}
