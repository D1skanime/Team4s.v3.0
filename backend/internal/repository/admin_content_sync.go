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
		SELECT id, title, title_de, title_en, source, folder_name, year, max_episodes, description
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
	year *int16,
	description *string,
	maxEpisodes *int16,
	forceSourceUpdate bool,
) error {
	query, args := buildApplyJellyfinSyncMetadataQuery(
		animeID,
		sourceTag,
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
	year *int16,
	description *string,
	maxEpisodes *int16,
	forceSourceUpdate bool,
) (string, []any) {
	query := `
		UPDATE anime
		SET
			source = CASE
				WHEN $6 = true AND $2 <> '' THEN $2
				WHEN (source IS NULL OR btrim(source) = '') AND $2 <> '' THEN $2
				ELSE source
			END,
			year = COALESCE(year, $3::smallint),
			description = CASE
				WHEN description IS NULL OR btrim(description) = '' THEN $4::text
				ELSE description
			END,
			max_episodes = COALESCE(max_episodes, $5::smallint),
			updated_at = NOW()
		WHERE id = $1
	`

	args := []any{
		animeID,
		strings.TrimSpace(sourceTag),
		year,
		description,
		maxEpisodes,
		forceSourceUpdate,
	}

	return query, args
}
