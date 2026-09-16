package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// episodeClassificationReturningSQL liest die Einstufung der gerade
// aktualisierten Zeile innerhalb von UPDATE episodes ... RETURNING.
const episodeClassificationReturningSQL = `
	(SELECT eft.name FROM episode_filler_types eft WHERE eft.id = episodes.filler_type_id),
	episodes.filler_source,
	(SELECT et.name FROM episode_types et WHERE et.id = episodes.episode_type_id),
	episodes.episode_type_source`

const episodeClassificationSelectSQL = `
	SELECT e.id, e.episode_number, eft.name, e.filler_source, et.name, e.episode_type_source
	FROM episodes e
	LEFT JOIN episode_filler_types eft ON eft.id = e.filler_type_id
	LEFT JOIN episode_types et ON et.id = e.episode_type_id`

// appendEpisodeClassificationAssignments ergänzt ein Episode-PATCH um
// Canon/Filler und Episodentyp. Jeder gesetzte Wert wird als manuell markiert.
func (r *AdminContentRepository) appendEpisodeClassificationAssignments(
	ctx context.Context,
	assignments []string,
	args []any,
	argPos int,
	input models.AdminEpisodePatchInput,
) ([]string, []any, int, error) {
	if !input.FillerType.Set && !input.EpisodeType.Set {
		return assignments, args, argPos, nil
	}

	if input.FillerType.Set {
		fillerTypeID, err := r.lookupEpisodeClassificationID(ctx, "episode_filler_types", input.FillerType.Value)
		if err != nil {
			return nil, nil, 0, err
		}
		assignments = append(assignments,
			fmt.Sprintf("filler_type_id = $%d", argPos),
			fmt.Sprintf("filler_source = '%s'", models.EpisodeMetadataSourceManual),
		)
		args = append(args, fillerTypeID)
		argPos++
	}
	if input.EpisodeType.Set {
		episodeTypeID, err := r.lookupEpisodeClassificationID(ctx, "episode_types", input.EpisodeType.Value)
		if err != nil {
			return nil, nil, 0, err
		}
		assignments = append(assignments,
			fmt.Sprintf("episode_type_id = $%d", argPos),
			fmt.Sprintf("episode_type_source = '%s'", models.EpisodeMetadataSourceManual),
		)
		args = append(args, episodeTypeID)
		argPos++
	}

	assignments = append(assignments,
		"modified_at = NOW()",
		fmt.Sprintf("modified_by = COALESCE((SELECT u.id FROM users u WHERE u.id = $%d), modified_by)", argPos),
	)
	args = append(args, input.ActorUserID)
	argPos++

	return assignments, args, argPos, nil
}

// lookupEpisodeClassificationID löst einen bereits validierten Namen auf.
// table ist ausschließlich ein fester interner Tabellenname.
func (r *AdminContentRepository) lookupEpisodeClassificationID(ctx context.Context, table string, name *string) (int64, error) {
	if name == nil {
		return 0, fmt.Errorf("lookup %s: empty name: %w", table, ErrConflict)
	}
	var id int64
	err := r.db.QueryRow(ctx, `SELECT id FROM `+table+` WHERE name = $1`, *name).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, fmt.Errorf("lookup %s %q: %w", table, *name, ErrConflict)
	}
	if err != nil {
		return 0, fmt.Errorf("lookup %s %q: %w", table, *name, err)
	}
	return id, nil
}

// ListEpisodeClassificationsByAnime liefert die Einstufung aller Episoden eines Anime.
func (r *AdminContentRepository) ListEpisodeClassificationsByAnime(
	ctx context.Context,
	animeID int64,
) ([]models.EpisodeClassification, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, episodeClassificationSelectSQL+`
		WHERE e.anime_id = $1
		ORDER BY e.sort_index NULLS LAST, e.id
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("list episode classifications anime=%d: %w", animeID, err)
	}
	defer rows.Close()

	items := make([]models.EpisodeClassification, 0)
	for rows.Next() {
		item, err := scanEpisodeClassification(rows)
		if err != nil {
			return nil, fmt.Errorf("scan episode classification anime=%d: %w", animeID, err)
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate episode classifications anime=%d: %w", animeID, err)
	}
	return items, nil
}

// GetEpisodeClassificationByReleaseVersion liefert die Einstufung der Episode,
// zu der eine Release-Version gehört (fansub_releases.episode_id).
func (r *AdminContentRepository) GetEpisodeClassificationByReleaseVersion(
	ctx context.Context,
	releaseVersionID int64,
) (*models.EpisodeClassification, error) {
	row := r.db.QueryRow(ctx, episodeClassificationSelectSQL+`
		JOIN fansub_releases fr ON fr.episode_id = e.id
		JOIN release_versions rev ON rev.release_id = fr.id
		WHERE rev.id = $1
	`, releaseVersionID)
	item, err := scanEpisodeClassification(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get episode classification release_version=%d: %w", releaseVersionID, err)
	}
	return item, nil
}

func scanEpisodeClassification(scanner interface{ Scan(dest ...any) error }) (*models.EpisodeClassification, error) {
	var item models.EpisodeClassification
	if err := scanner.Scan(
		&item.EpisodeID,
		&item.EpisodeNumber,
		&item.FillerType,
		&item.FillerTypeSource,
		&item.EpisodeType,
		&item.EpisodeTypeSource,
	); err != nil {
		return nil, err
	}
	return &item, nil
}
