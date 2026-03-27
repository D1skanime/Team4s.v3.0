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
