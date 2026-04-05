package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AdminContentRepository) GetAnimeSyncSource(
	ctx context.Context,
	animeID int64,
) (*models.AdminAnimeSyncSource, error) {
	schema, err := r.loadAnimeV2SchemaInfo(ctx)
	if err != nil {
		return nil, err
	}
	if schema.HasSlug {
		return r.getAnimeSyncSourceV2(ctx, animeID, schema)
	}

	query := `
		SELECT id, title, title_de, title_en, source, folder_name, year, max_episodes, description, cover_image
		FROM anime
		WHERE id = $1
	`

	var item models.AdminAnimeSyncSource
	if err := r.db.QueryRow(ctx, query, animeID).Scan(
		&item.ID,
		&item.Title,
		&item.TitleDE,
		&item.TitleEN,
		&item.Source,
		&item.FolderName,
		&item.Year,
		&item.MaxEpisodes,
		&item.Description,
		&item.CoverImage,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get anime sync source %d: %w", animeID, err)
	}

	return &item, nil
}

func (r *AdminContentRepository) loadAnimeV2SchemaInfo(ctx context.Context) (animeV2SchemaInfo, error) {
	return loadAnimeV2SchemaInfo(ctx, r.db)
}

func (r *AdminContentRepository) getAnimeSyncSourceV2(ctx context.Context, animeID int64, schema animeV2SchemaInfo) (*models.AdminAnimeSyncSource, error) {
	maxEpisodesSelect := `NULL::smallint`
	if schema.HasMaxEpisodes {
		maxEpisodesSelect = "anime.max_episodes"
	}
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
			` + sourceSelect + ` AS source,
			anime.folder_name,
			anime.year,
			` + maxEpisodesSelect + ` AS max_episodes,
			anime.description,
			poster.file_path
		FROM anime
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

	var item models.AdminAnimeSyncSource
	if err := r.db.QueryRow(ctx, query, animeID).Scan(
		&item.ID,
		&item.Title,
		&item.Source,
		&item.FolderName,
		&item.Year,
		&item.MaxEpisodes,
		&item.Description,
		&item.CoverImage,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get v2 anime sync source %d: %w", animeID, err)
	}

	if normalized, err := r.loadNormalizedAnimeMetadata(ctx, animeID); err != nil {
		return nil, err
	} else if normalized != nil {
		if normalized.Title != "" {
			item.Title = normalized.Title
		}
		item.TitleDE = normalized.TitleDE
		item.TitleEN = normalized.TitleEN
	}

	return &item, nil
}

func (r *AdminContentRepository) ApplyJellyfinSyncMetadata(
	ctx context.Context,
	animeID int64,
	sourceTag string,
	folderName *string,
	year *int16,
	description *string,
	maxEpisodes *int16,
	forceSourceUpdate bool,
) error {
	query, args := buildApplyJellyfinSyncMetadataQuery(
		animeID,
		sourceTag,
		folderName,
		year,
		description,
		maxEpisodes,
		forceSourceUpdate,
	)

	commandTag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("apply jellyfin metadata anime=%d: %w", animeID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func buildApplyJellyfinSyncMetadataQuery(
	animeID int64,
	sourceTag string,
	folderName *string,
	year *int16,
	description *string,
	maxEpisodes *int16,
	forceSourceUpdate bool,
) (string, []any) {
	var normalizedFolderName *string
	if folderName != nil {
		trimmed := strings.TrimSpace(*folderName)
		if trimmed != "" {
			normalizedFolderName = &trimmed
		}
	}

	query := `
		UPDATE anime
		SET
			source = CASE
				WHEN $7 = true AND $2 <> '' THEN $2
				WHEN (source IS NULL OR btrim(source) = '') AND $2 <> '' THEN $2
				ELSE source
			END,
			folder_name = CASE
				WHEN $7 = true AND COALESCE($3::text, '') <> '' THEN $3::text
				WHEN (folder_name IS NULL OR btrim(folder_name) = '') AND COALESCE($3::text, '') <> '' THEN $3::text
				ELSE folder_name
			END,
			year = COALESCE(year, $4::smallint),
			description = CASE
				WHEN description IS NULL OR btrim(description) = '' THEN $5::text
				ELSE description
			END,
			max_episodes = COALESCE(max_episodes, $6::smallint),
			updated_at = NOW()
		WHERE id = $1
	`

	args := []any{
		animeID,
		strings.TrimSpace(sourceTag),
		normalizedFolderName,
		year,
		description,
		maxEpisodes,
		forceSourceUpdate,
	}

	return query, args
}
