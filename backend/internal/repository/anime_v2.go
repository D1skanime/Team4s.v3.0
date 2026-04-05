package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AnimeRepository) loadAnimeV2SchemaInfo(ctx context.Context) (animeV2SchemaInfo, error) {
	return loadAnimeV2SchemaInfo(ctx, r.db)
}

func (r *AnimeRepository) listV2(ctx context.Context, filter models.AnimeFilter, schema animeV2SchemaInfo) ([]models.AnimeListItem, int64, error) {
	if filter.FansubGroupID != nil {
		return []models.AnimeListItem{}, 0, nil
	}
	if !schema.HasContentType && filter.ContentType != "" && filter.ContentType != "anime" {
		return []models.AnimeListItem{}, 0, nil
	}
	if !schema.HasStatus && filter.Status != "" && filter.Status != "ongoing" {
		return []models.AnimeListItem{}, 0, nil
	}

	whereSQL, args := buildAnimeListWhereV2(filter)
	if !schema.HasContentType || !schema.HasStatus {
		whereSQL, args = buildAnimeListWhereV2WithSchema(filter, schema)
	}
	contentTypeSelect := `'anime'::text`
	if schema.HasContentType {
		contentTypeSelect = "anime.content_type"
	}
	statusSelect := `'ongoing'::text`
	if schema.HasStatus {
		statusSelect = "anime.status"
	}
	maxEpisodesSelect := `NULL::smallint`
	if schema.HasMaxEpisodes {
		maxEpisodesSelect = "anime.max_episodes"
	}

	countQuery := "SELECT COUNT(*) FROM anime" + whereSQL
	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count anime v2: %w", err)
	}

	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	offset := (filter.Page - 1) * filter.PerPage
	displayTitleExpr := primaryNormalizedTitleSQL("anime.id", "anime.slug")

	listQuery := fmt.Sprintf(`
		SELECT
			anime.id,
			%s AS display_title,
			at.name,
			%s AS status,
			anime.year,
			poster.file_path,
			%s AS max_episodes,
			%s AS content_type
		FROM anime
		LEFT JOIN anime_types at ON at.id = anime.anime_type_id
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = anime.id
			  AND mt.name = 'poster'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) poster ON true
		%s
		ORDER BY display_title ASC
		LIMIT $%d OFFSET $%d
	`, displayTitleExpr, statusSelect, maxEpisodesSelect, contentTypeSelect, whereSQL, limitPos, offsetPos)

	rows, err := r.db.Query(ctx, listQuery, append(args, filter.PerPage, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("query anime v2 list: %w", err)
	}
	defer rows.Close()

	items := make([]models.AnimeListItem, 0, filter.PerPage)
	for rows.Next() {
		var item models.AnimeListItem
		var animeType *string
		if err := rows.Scan(&item.ID, &item.Title, &animeType, &item.Status, &item.Year, &item.CoverImage, &item.MaxEpisodes, &item.ContentType); err != nil {
			return nil, 0, fmt.Errorf("scan anime v2 row: %w", err)
		}
		item.Type = mapAnimeTypeNameToAPI(animeType)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate anime v2 rows: %w", err)
	}

	return items, total, nil
}

func (r *AnimeRepository) getByIDV2(ctx context.Context, id int64, includeDisabled bool, schema animeV2SchemaInfo) (*models.AnimeDetail, error) {
	contentTypeSelect := `'anime'::text`
	if schema.HasContentType {
		contentTypeSelect = "anime.content_type"
	}
	statusSelect := `'ongoing'::text`
	if schema.HasStatus {
		statusSelect = "anime.status"
	}
	maxEpisodesSelect := `NULL::smallint`
	if schema.HasMaxEpisodes {
		maxEpisodesSelect = "anime.max_episodes"
	}

	query := `
		SELECT
			anime.id,
			COALESCE((
				SELECT at2.title
				FROM anime_titles at2
				JOIN languages l ON l.id = at2.language_id
				JOIN title_types tt ON tt.id = at2.title_type_id
				WHERE at2.anime_id = anime.id
				ORDER BY
					CASE l.code
						WHEN 'ja' THEN 0
						WHEN 'romaji' THEN 1
						WHEN 'en' THEN 2
						WHEN 'de' THEN 3
						ELSE 10
					END,
					CASE tt.name
						WHEN 'main' THEN 0
						WHEN 'romaji' THEN 1
						WHEN 'official' THEN 2
						WHEN 'synonym' THEN 3
						WHEN 'short' THEN 4
						ELSE 10
					END,
					at2.title ASC
				LIMIT 1
			), anime.slug) AS display_title,
			at.name,
			` + contentTypeSelect + ` AS content_type,
			` + statusSelect + ` AS status,
			anime.year,
			` + maxEpisodesSelect + ` AS max_episodes,
			anime.description,
			poster.file_path
		FROM anime
		LEFT JOIN anime_types at ON at.id = anime.anime_type_id
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = anime.id
			  AND mt.name = 'poster'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) poster ON true
		WHERE anime.id = $1
	`
	if !includeDisabled && schema.HasStatus {
		query += " AND anime.status <> 'disabled'"
	}

	var anime models.AnimeDetail
	var animeType *string
	if err := r.db.QueryRow(ctx, query, id).Scan(
		&anime.ID,
		&anime.Title,
		&animeType,
		&anime.ContentType,
		&anime.Status,
		&anime.Year,
		&anime.MaxEpisodes,
		&anime.Description,
		&anime.CoverImage,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query anime v2 detail %d: %w", id, err)
	}

	anime.Type = mapAnimeTypeNameToAPI(animeType)
	anime.ViewCount = 0
	anime.Episodes = []models.EpisodeListItem{}

	if normalized, err := r.loadNormalizedAnimeMetadata(ctx, anime.ID); err != nil {
		return nil, err
	} else if normalized != nil {
		if normalized.Title != "" {
			anime.Title = normalized.Title
		}
		anime.TitleDE = normalized.TitleDE
		anime.TitleEN = normalized.TitleEN
		anime.Genres = normalized.Genres
		if len(normalized.Genres) > 0 {
			joined := strings.Join(normalized.Genres, ", ")
			anime.Genre = animeStringPtr(joined)
		}
	}

	return &anime, nil
}

func (r *AnimeRepository) getMediaLookupByIDV2(ctx context.Context, id int64, includeDisabled bool, schema animeV2SchemaInfo) (*models.AnimeMediaLookup, error) {
	sourceSelect := `(
				SELECT 'jellyfin:' || me.external_id
				FROM anime_media am
				JOIN media_external me ON me.media_id = am.media_id
				WHERE am.anime_id = anime.id
				  AND me.provider = 'jellyfin'
				ORDER BY am.sort_order ASC, me.id ASC
				LIMIT 1
			)`
	if schema.HasSource {
		sourceSelect = "anime.source"
	}

	query := `
		SELECT
			COALESCE((
				SELECT at2.title
				FROM anime_titles at2
				JOIN languages l ON l.id = at2.language_id
				JOIN title_types tt ON tt.id = at2.title_type_id
				WHERE at2.anime_id = anime.id
				ORDER BY
					CASE l.code
						WHEN 'ja' THEN 0
						WHEN 'romaji' THEN 1
						WHEN 'en' THEN 2
						WHEN 'de' THEN 3
						ELSE 10
					END,
					CASE tt.name
						WHEN 'main' THEN 0
						WHEN 'romaji' THEN 1
						WHEN 'official' THEN 2
						WHEN 'synonym' THEN 3
						WHEN 'short' THEN 4
						ELSE 10
					END,
					at2.title ASC
				LIMIT 1
			), anime.slug) AS display_title,
			anime.folder_name,
			` + sourceSelect + ` AS source
		FROM anime
		WHERE anime.id = $1
	`
	if !includeDisabled && schema.HasStatus {
		query += " AND anime.status <> 'disabled'"
	}

	var lookup models.AnimeMediaLookup
	if err := r.db.QueryRow(ctx, query, id).Scan(&lookup.Title, &lookup.FolderName, &lookup.Source); err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query anime v2 media lookup %d: %w", id, err)
	}

	if normalized, err := r.loadNormalizedAnimeMetadata(ctx, id); err != nil {
		return nil, err
	} else if normalized != nil {
		if normalized.Title != "" {
			lookup.Title = normalized.Title
		}
		lookup.TitleDE = normalized.TitleDE
		lookup.TitleEN = normalized.TitleEN
	}

	return &lookup, nil
}

func buildAnimeListWhereV2(filter models.AnimeFilter) (string, []any) {
	return buildAnimeListWhereV2WithSchema(filter, animeV2SchemaInfo{
		HasContentType: true,
		HasStatus:      true,
	})
}

func buildAnimeListWhereV2WithSchema(filter models.AnimeFilter, schema animeV2SchemaInfo) (string, []any) {
	conditions := make([]string, 0, 5)
	args := make([]any, 0, 5)
	argPos := 1
	displayTitleExpr := primaryNormalizedTitleSQL("anime.id", "anime.slug")

	if filter.HasCover != nil {
		coverExistsSQL := `
			EXISTS (
				SELECT 1
				FROM anime_media am
				JOIN media_assets ma ON ma.id = am.media_id
				JOIN media_types mt ON mt.id = ma.media_type_id
				WHERE am.anime_id = anime.id
				  AND mt.name = 'poster'
				  AND ma.file_path IS NOT NULL
				  AND btrim(ma.file_path) <> ''
			)
		`
		if *filter.HasCover {
			conditions = append(conditions, coverExistsSQL)
		} else {
			conditions = append(conditions, "NOT "+coverExistsSQL)
		}
	}

	if schema.HasContentType && filter.ContentType != "" {
		conditions = append(conditions, fmt.Sprintf("anime.content_type = $%d", argPos))
		args = append(args, filter.ContentType)
		argPos++
	}

	if schema.HasStatus && filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("anime.status = $%d", argPos))
		args = append(args, filter.Status)
		argPos++
	} else if schema.HasStatus && !filter.IncludeDisabled {
		conditions = append(conditions, "anime.status <> 'disabled'")
	}

	if filter.Q != "" {
		conditions = append(
			conditions,
			fmt.Sprintf("(%s ILIKE $%d OR EXISTS (SELECT 1 FROM anime_titles at WHERE at.anime_id = anime.id AND at.title ILIKE $%d))", displayTitleExpr, argPos, argPos),
		)
		args = append(args, "%"+filter.Q+"%")
		argPos++
	}

	if filter.Letter != "" {
		if filter.Letter == "0" {
			conditions = append(conditions, fmt.Sprintf("%s ~ '^[0-9]'", displayTitleExpr))
		} else {
			conditions = append(conditions, fmt.Sprintf("UPPER(LEFT(%s, 1)) = $%d", displayTitleExpr, argPos))
			args = append(args, strings.ToUpper(filter.Letter))
			argPos++
		}
	}

	if len(conditions) == 0 {
		return "", args
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}

func mapAnimeTypeNameToAPI(name *string) string {
	if name == nil {
		return "tv"
	}

	switch strings.ToLower(strings.TrimSpace(*name)) {
	case "tv":
		return "tv"
	case "movie":
		return "film"
	case "ova":
		return "ova"
	case "ona":
		return "ona"
	case "special":
		return "special"
	case "bonus":
		return "bonus"
	case "web":
		return "web"
	default:
		return "tv"
	}
}
