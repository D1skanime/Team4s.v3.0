package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
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

func (r *AdminContentRepository) CreateAnime(
	ctx context.Context,
	input models.AdminAnimeCreateInput,
) (*models.AdminAnimeItem, error) {
	query := `
		INSERT INTO anime (
			title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING
			id, title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image
	`

	var item models.AdminAnimeItem
	if err := r.db.QueryRow(
		ctx,
		query,
		input.Title,
		input.TitleDE,
		input.TitleEN,
		input.Type,
		input.ContentType,
		input.Status,
		input.Year,
		input.MaxEpisodes,
		input.Genre,
		input.Description,
		input.CoverImage,
	).Scan(
		&item.ID,
		&item.Title,
		&item.TitleDE,
		&item.TitleEN,
		&item.Type,
		&item.ContentType,
		&item.Status,
		&item.Year,
		&item.MaxEpisodes,
		&item.Genre,
		&item.Description,
		&item.CoverImage,
	); err != nil {
		return nil, fmt.Errorf("create anime: %w", err)
	}

	return &item, nil
}

func (r *AdminContentRepository) UpdateAnime(
	ctx context.Context,
	id int64,
	input models.AdminAnimePatchInput,
) (*models.AdminAnimeItem, error) {
	assignments := make([]string, 0, 11)
	args := make([]any, 0, 11)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.Title.Set {
		assignments = append(assignments, fmt.Sprintf("title = $%d", argPos))
		args = append(args, input.Title.Value)
		argPos++
	}
	if input.TitleDE.Set {
		assignments = append(assignments, fmt.Sprintf("title_de = $%d", argPos))
		args = append(args, input.TitleDE.Value)
		argPos++
	}
	if input.TitleEN.Set {
		assignments = append(assignments, fmt.Sprintf("title_en = $%d", argPos))
		args = append(args, input.TitleEN.Value)
		argPos++
	}
	if input.Type.Set {
		assignments = append(assignments, fmt.Sprintf("type = $%d", argPos))
		args = append(args, input.Type.Value)
		argPos++
	}
	if input.ContentType.Set {
		assignments = append(assignments, fmt.Sprintf("content_type = $%d", argPos))
		args = append(args, input.ContentType.Value)
		argPos++
	}
	if input.Status.Set {
		assignments = append(assignments, fmt.Sprintf("status = $%d", argPos))
		args = append(args, input.Status.Value)
		argPos++
	}
	if input.Year.Set {
		assignments = append(assignments, fmt.Sprintf("year = $%d", argPos))
		args = append(args, input.Year.Value)
		argPos++
	}
	if input.MaxEpisodes.Set {
		assignments = append(assignments, fmt.Sprintf("max_episodes = $%d", argPos))
		args = append(args, input.MaxEpisodes.Value)
		argPos++
	}
	if input.Genre.Set {
		assignments = append(assignments, fmt.Sprintf("genre = $%d", argPos))
		args = append(args, input.Genre.Value)
		argPos++
	}
	if input.Description.Set {
		assignments = append(assignments, fmt.Sprintf("description = $%d", argPos))
		args = append(args, input.Description.Value)
		argPos++
	}
	if input.CoverImage.Set {
		assignments = append(assignments, fmt.Sprintf("cover_image = $%d", argPos))
		args = append(args, input.CoverImage.Value)
		argPos++
	}

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update anime %d: no patch fields provided", id)
	}

	query := fmt.Sprintf(`
		UPDATE anime
		SET %s
		WHERE id = $%d
		RETURNING
			id, title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image
	`, strings.Join(assignments, ", "), argPos)
	args = append(args, id)

	var item models.AdminAnimeItem
	if err := r.db.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.Title,
		&item.TitleDE,
		&item.TitleEN,
		&item.Type,
		&item.ContentType,
		&item.Status,
		&item.Year,
		&item.MaxEpisodes,
		&item.Genre,
		&item.Description,
		&item.CoverImage,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("update anime %d: %w", id, err)
	}

	return &item, nil
}

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
				`DELETE FROM episode_versions WHERE anime_id = $1 AND episode_number = $2`,
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

	commandTag, err := r.db.Exec(
		ctx,
		query,
		args...,
	)
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

func (r *AdminContentRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
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
		  AND NOT EXISTS (
		      SELECT 1 FROM episode_versions ev
		      WHERE ev.anime_id = episodes.anime_id
		        AND ev.episode_number = CAST(episodes.episode_number AS INTEGER)
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
		  AND NOT EXISTS (
		      SELECT 1 FROM episode_versions ev
		      WHERE ev.anime_id = episodes.anime_id
		        AND ev.episode_number = CAST(episodes.episode_number AS INTEGER)
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
		      WHERE ev.anime_id = e.anime_id
		        AND ev.episode_number = CAST(e.episode_number AS INTEGER)
		        AND ev.media_provider = $2
		  )
		  AND NOT EXISTS (
		      SELECT 1 FROM episode_versions ev
		      WHERE ev.anime_id = e.anime_id
		        AND ev.episode_number = CAST(e.episode_number AS INTEGER)
		        AND ev.media_provider <> $2
		  )
	`, animeID, provider).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count episodes with only provider anime=%d provider=%s: %w", animeID, provider, err)
	}

	return count, nil
}

func (r *AdminContentRepository) ListGenreTokens(
	ctx context.Context,
	query string,
	limit int,
) ([]models.GenreToken, error) {
	rows, err := r.db.Query(ctx, `SELECT genre FROM anime WHERE genre IS NOT NULL AND btrim(genre) <> ''`)
	if err != nil {
		return nil, fmt.Errorf("query genres: %w", err)
	}
	defer rows.Close()

	counts := make(map[string]int64)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("scan genre: %w", err)
		}

		parts := strings.Split(raw, ",")
		for _, part := range parts {
			token := strings.TrimSpace(part)
			if token == "" {
				continue
			}
			counts[token]++
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate genres: %w", err)
	}

	q := strings.ToLower(strings.TrimSpace(query))
	tokens := make([]models.GenreToken, 0, len(counts))
	for name, count := range counts {
		if q != "" && !strings.Contains(strings.ToLower(name), q) {
			continue
		}
		tokens = append(tokens, models.GenreToken{
			Name:  name,
			Count: count,
		})
	}

	sort.Slice(tokens, func(i, j int) bool {
		leftName := strings.ToLower(tokens[i].Name)
		rightName := strings.ToLower(tokens[j].Name)

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

		return tokens[i].Count > tokens[j].Count
	})

	if limit > 0 && len(tokens) > limit {
		tokens = tokens[:limit]
	}

	return tokens, nil
}
