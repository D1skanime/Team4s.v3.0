package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AdminContentRepository) CreateEpisode(
	ctx context.Context,
	input models.AdminEpisodeCreateInput,
) (*models.AdminEpisodeItem, error) {
	exists, err := r.animeExists(ctx, input.AnimeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	query := `
		INSERT INTO episodes (anime_id, episode_number, title, status, stream_links)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, anime_id, episode_number, title, status, stream_links[1]
	`

	var item models.AdminEpisodeItem
	if err := r.db.QueryRow(
		ctx,
		query,
		input.AnimeID,
		input.EpisodeNumber,
		input.Title,
		input.Status,
		streamLinksFromOptionalString(input.StreamLink),
	).Scan(
		&item.ID,
		&item.AnimeID,
		&item.EpisodeNumber,
		&item.Title,
		&item.Status,
		&item.StreamLink,
	); err != nil {
		return nil, fmt.Errorf("create episode for anime %d: %w", input.AnimeID, err)
	}

	return &item, nil
}

func (r *AdminContentRepository) UpdateEpisode(
	ctx context.Context,
	id int64,
	input models.AdminEpisodePatchInput,
) (*models.AdminEpisodeItem, error) {
	assignments := make([]string, 0, 5)
	args := make([]any, 0, 5)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.EpisodeNumber.Set {
		assignments = append(assignments, fmt.Sprintf("episode_number = $%d", argPos))
		args = append(args, input.EpisodeNumber.Value)
		argPos++
	}
	if input.Title.Set {
		assignments = append(assignments, fmt.Sprintf("title = $%d", argPos))
		args = append(args, input.Title.Value)
		argPos++
	}
	if input.Status.Set {
		assignments = append(assignments, fmt.Sprintf("status = $%d", argPos))
		args = append(args, input.Status.Value)
		argPos++
	}
	if input.StreamLink.Set {
		assignments = append(assignments, fmt.Sprintf("stream_links = $%d", argPos))
		args = append(args, streamLinksFromOptionalString(input.StreamLink.Value))
		argPos++
	}

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update episode %d: no patch fields provided", id)
	}

	query := fmt.Sprintf(`
		UPDATE episodes
		SET %s
		WHERE id = $%d
		RETURNING id, anime_id, episode_number, title, status, stream_links[1]
	`, strings.Join(assignments, ", "), argPos)
	args = append(args, id)

	var item models.AdminEpisodeItem
	if err := r.db.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.AnimeID,
		&item.EpisodeNumber,
		&item.Title,
		&item.Status,
		&item.StreamLink,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("update episode %d: %w", id, err)
	}

	return &item, nil
}

func (r *AdminContentRepository) DeleteEpisode(
	ctx context.Context,
	id int64,
) (*models.AdminEpisodeDeleteResult, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin delete episode tx %d: %w", id, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var animeID int64
	var episodeNumber string
	if err := tx.QueryRow(
		ctx,
		`SELECT anime_id, episode_number FROM episodes WHERE id = $1 FOR UPDATE`,
		id,
	).Scan(&animeID, &episodeNumber); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load episode %d for delete: %w", id, err)
	}

	deleteEpisodeTag, err := tx.Exec(ctx, `DELETE FROM episodes WHERE id = $1`, id)
	if err != nil {
		return nil, fmt.Errorf("delete episode %d: %w", id, err)
	}
	if deleteEpisodeTag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	var deletedEpisodeVersions int64
	if episodeNumberValue, ok := parseNumericEpisodeNumber(episodeNumber); ok {
		var siblingCount int64
		if err := tx.QueryRow(
			ctx,
			`
			SELECT COUNT(*) FROM episodes
			WHERE anime_id = $1
			  AND episode_number ~ '^[0-9]+$'
			  AND CAST(episode_number AS INTEGER) = $2
			`,
			animeID,
			episodeNumberValue,
		).Scan(&siblingCount); err != nil {
			return nil, fmt.Errorf(
				"count sibling episodes for anime=%d episode_number=%s: %w",
				animeID,
				episodeNumber,
				err,
			)
		}

		if siblingCount == 0 {
			deleteVersionTag, err := tx.Exec(
				ctx,
				`
				DELETE FROM episode_versions ev
				WHERE ev.anime_id = $1
				  AND ev.episode_number = $2
				  AND NOT EXISTS (
				      SELECT 1 FROM episode_version_episodes eve
				      WHERE eve.episode_version_id = ev.id
				  )
				`,
				animeID,
				episodeNumberValue,
			)
			if err != nil {
				return nil, fmt.Errorf(
					"delete episode versions for anime=%d episode_number=%d: %w",
					animeID,
					episodeNumberValue,
					err,
				)
			}
			deletedEpisodeVersions = deleteVersionTag.RowsAffected()
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit delete episode tx %d: %w", id, err)
	}

	return &models.AdminEpisodeDeleteResult{
		EpisodeID:              id,
		AnimeID:                animeID,
		EpisodeNumber:          episodeNumber,
		DeletedEpisodeVersions: int32(deletedEpisodeVersions),
	}, nil
}

func (r *AdminContentRepository) UpsertEpisodeByAnimeAndNumber(
	ctx context.Context,
	animeID int64,
	episodeNumber string,
	title *string,
	status string,
	_ bool,
) (*models.AdminEpisodeItem, bool, error) {
	if exists, err := r.animeExists(ctx, animeID); err != nil {
		return nil, false, err
	} else if !exists {
		return nil, false, ErrNotFound
	}

	normalizedEpisodeNumber := strings.TrimSpace(episodeNumber)
	if normalizedEpisodeNumber == "" {
		return nil, false, fmt.Errorf("upsert episode anime=%d: episode number is required", animeID)
	}

	existing := r.db.QueryRow(
		ctx,
		`
		SELECT id, anime_id, episode_number, title, status, stream_links[1]
		FROM episodes
		WHERE anime_id = $1 AND episode_number = $2
		ORDER BY id ASC
		LIMIT 1
		`,
		animeID,
		normalizedEpisodeNumber,
	)

	item, err := scanAdminEpisodeItem(existing)
	if errors.Is(err, pgx.ErrNoRows) {
		created, createErr := r.CreateEpisode(ctx, models.AdminEpisodeCreateInput{
			AnimeID:       animeID,
			EpisodeNumber: normalizedEpisodeNumber,
			Title:         title,
			Status:        status,
		})
		if createErr != nil {
			return nil, false, createErr
		}
		return created, true, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("query episode anime=%d number=%s: %w", animeID, normalizedEpisodeNumber, err)
	}

	updated := r.db.QueryRow(
		ctx,
		`
		UPDATE episodes
		SET
			title = COALESCE(title, $1),
			updated_at = NOW()
		WHERE id = $2
		RETURNING id, anime_id, episode_number, title, status, stream_links[1]
		`,
		title,
		item.ID,
	)

	updatedItem, updateErr := scanAdminEpisodeItem(updated)
	if updateErr != nil {
		return nil, false, fmt.Errorf("update episode %d from jellyfin: %w", item.ID, updateErr)
	}

	return updatedItem, false, nil
}

func streamLinksFromOptionalString(value *string) []string {
	if value == nil {
		return []string{}
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return []string{}
	}

	return []string{trimmed}
}

func parseNumericEpisodeNumber(raw string) (int32, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return 0, false
	}

	for _, ch := range trimmed {
		if ch < '0' || ch > '9' {
			return 0, false
		}
	}

	parsed, err := strconv.Atoi(trimmed)
	if err != nil || parsed <= 0 {
		return 0, false
	}

	return int32(parsed), true
}

func scanAdminEpisodeItem(scanner interface {
	Scan(dest ...any) error
}) (*models.AdminEpisodeItem, error) {
	var item models.AdminEpisodeItem
	if err := scanner.Scan(
		&item.ID,
		&item.AnimeID,
		&item.EpisodeNumber,
		&item.Title,
		&item.Status,
		&item.StreamLink,
	); err != nil {
		return nil, err
	}

	return &item, nil
}

// DeleteOrphanedEpisodes deletes all episodes for the given anime that have no episode_versions.
// Returns the number of deleted episodes.
func (r *AdminContentRepository) DeleteOrphanedEpisodes(
	ctx context.Context,
	animeID int64,
) (int64, error) {
	commandTag, err := r.db.Exec(ctx, `
		DELETE FROM episodes
		WHERE anime_id = $1
		  AND episode_number ~ '^[0-9]+$'
		  AND NOT EXISTS (
		      SELECT 1 FROM episode_versions ev
		      LEFT JOIN episode_version_episodes eve ON eve.episode_version_id = ev.id
		      WHERE ev.anime_id = episodes.anime_id
		        AND (
		            eve.episode_id = episodes.id
		            OR (
		                eve.episode_id IS NULL
		                AND ev.episode_number = CAST(episodes.episode_number AS INTEGER)
		            )
		        )
		  )
	`, animeID)
	if err != nil {
		return 0, fmt.Errorf("delete orphaned episodes anime=%d: %w", animeID, err)
	}

	return commandTag.RowsAffected(), nil
}

// CountOrphanedEpisodes counts all episodes for the given anime that have no episode_versions.
func (r *AdminContentRepository) CountOrphanedEpisodes(
	ctx context.Context,
	animeID int64,
) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM episodes
		WHERE anime_id = $1
		  AND episode_number ~ '^[0-9]+$'
		  AND NOT EXISTS (
		      SELECT 1 FROM episode_versions ev
		      LEFT JOIN episode_version_episodes eve ON eve.episode_version_id = ev.id
		      WHERE ev.anime_id = episodes.anime_id
		        AND (
		            eve.episode_id = episodes.id
		            OR (
		                eve.episode_id IS NULL
		                AND ev.episode_number = CAST(episodes.episode_number AS INTEGER)
		            )
		        )
		  )
	`, animeID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count orphaned episodes anime=%d: %w", animeID, err)
	}

	return count, nil
}

// CountEpisodesWithOnlyProvider counts episodes that have versions ONLY from the given provider.
// These episodes would become orphaned if all versions from that provider are deleted.
func (r *AdminContentRepository) CountEpisodesWithOnlyProvider(
	ctx context.Context,
	animeID int64,
	provider string,
) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM episodes e
		WHERE e.anime_id = $1
		  AND e.episode_number ~ '^[0-9]+$'
		  AND EXISTS (
		      SELECT 1 FROM episode_versions ev
		      LEFT JOIN episode_version_episodes eve ON eve.episode_version_id = ev.id
		      WHERE ev.anime_id = e.anime_id
		        AND (
		            eve.episode_id = e.id
		            OR (
		                eve.episode_id IS NULL
		                AND ev.episode_number = CAST(e.episode_number AS INTEGER)
		            )
		        )
		        AND ev.media_provider = $2
		  )
		  AND NOT EXISTS (
		      SELECT 1 FROM episode_versions ev
		      LEFT JOIN episode_version_episodes eve ON eve.episode_version_id = ev.id
		      WHERE ev.anime_id = e.anime_id
		        AND (
		            eve.episode_id = e.id
		            OR (
		                eve.episode_id IS NULL
		                AND ev.episode_number = CAST(e.episode_number AS INTEGER)
		            )
		        )
		        AND ev.media_provider <> $2
		  )
	`, animeID, provider).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count episodes with only provider anime=%d provider=%s: %w", animeID, provider, err)
	}

	return count, nil
}
