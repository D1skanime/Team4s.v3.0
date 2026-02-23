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

type EpisodeVersionRepository struct {
	db *pgxpool.Pool
}

func NewEpisodeVersionRepository(db *pgxpool.Pool) *EpisodeVersionRepository {
	return &EpisodeVersionRepository{db: db}
}

func (r *EpisodeVersionRepository) ListGroupedByAnimeID(
	ctx context.Context,
	animeID int64,
) (*models.GroupedEpisodesData, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	episodeTitlesByNumber, err := r.listEpisodeTitlesByAnimeID(ctx, animeID)
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			ev.id, ev.anime_id, ev.episode_number, ev.title, ev.media_provider, ev.media_item_id,
			ev.video_quality, ev.subtitle_type, ev.release_date, ev.stream_url, ev.created_at, ev.updated_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM episode_versions ev
		LEFT JOIN fansub_groups fg ON fg.id = ev.fansub_group_id
		WHERE ev.anime_id = $1
		ORDER BY ev.episode_number ASC, ev.release_date DESC NULLS LAST, ev.id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query grouped episode versions for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	groupMap := make(map[int32]*models.GroupedEpisode, 32)
	for rows.Next() {
		item, err := scanEpisodeVersion(rows)
		if err != nil {
			return nil, err
		}

		group, ok := groupMap[item.EpisodeNumber]
		if !ok {
			episodeTitle := episodeTitlesByNumber[item.EpisodeNumber]
			group = &models.GroupedEpisode{
				EpisodeNumber: item.EpisodeNumber,
				EpisodeTitle:  episodeTitle,
				Versions:      make([]models.EpisodeVersion, 0, 2),
			}
			groupMap[item.EpisodeNumber] = group
		}
		group.Versions = append(group.Versions, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate grouped episode version rows: %w", err)
	}

	episodeNumbers := make([]int32, 0, len(groupMap))
	for episodeNumber := range groupMap {
		episodeNumbers = append(episodeNumbers, episodeNumber)
	}
	sort.Slice(episodeNumbers, func(i, j int) bool {
		return episodeNumbers[i] < episodeNumbers[j]
	})

	grouped := make([]models.GroupedEpisode, 0, len(groupMap))
	for _, episodeNumber := range episodeNumbers {
		group := groupMap[episodeNumber]
		group.VersionCount = int32(len(group.Versions))
		if len(group.Versions) > 0 {
			defaultID := group.Versions[0].ID
			group.DefaultVersionID = &defaultID
		}
		grouped = append(grouped, *group)
	}

	return &models.GroupedEpisodesData{
		AnimeID:  animeID,
		Episodes: grouped,
	}, nil
}

func (r *EpisodeVersionRepository) listEpisodeTitlesByAnimeID(
	ctx context.Context,
	animeID int64,
) (map[int32]*string, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT episode_number, title
		FROM episodes
		WHERE anime_id = $1
		  AND episode_number ~ '^[0-9]+$'
		`,
		animeID,
	)
	if err != nil {
		return nil, fmt.Errorf("query episode titles for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	result := make(map[int32]*string, 32)
	for rows.Next() {
		var episodeNumberRaw string
		var title *string
		if err := rows.Scan(&episodeNumberRaw, &title); err != nil {
			return nil, fmt.Errorf("scan episode title row for anime %d: %w", animeID, err)
		}

		episodeNumber, parseErr := strconv.Atoi(strings.TrimSpace(episodeNumberRaw))
		if parseErr != nil || episodeNumber <= 0 {
			continue
		}
		normalizedTitle := normalizeOptionalText(title)
		result[int32(episodeNumber)] = normalizedTitle
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate episode title rows for anime %d: %w", animeID, err)
	}

	return result, nil
}

func (r *EpisodeVersionRepository) GetByID(
	ctx context.Context,
	versionID int64,
) (*models.EpisodeVersion, error) {
	row := r.db.QueryRow(
		ctx,
		`
		SELECT
			ev.id, ev.anime_id, ev.episode_number, ev.title, ev.media_provider, ev.media_item_id,
			ev.video_quality, ev.subtitle_type, ev.release_date, ev.stream_url, ev.created_at, ev.updated_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM episode_versions ev
		LEFT JOIN fansub_groups fg ON fg.id = ev.fansub_group_id
		WHERE ev.id = $1
		`,
		versionID,
	)

	item, err := scanEpisodeVersionRow(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get episode version %d: %w", versionID, err)
	}

	return item, nil
}

func (r *EpisodeVersionRepository) Create(
	ctx context.Context,
	input models.EpisodeVersionCreateInput,
) (*models.EpisodeVersion, error) {
	query := `
		WITH inserted AS (
			INSERT INTO episode_versions (
				anime_id, episode_number, title, fansub_group_id, media_provider, media_item_id,
				video_quality, subtitle_type, release_date, stream_url
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING
				id, anime_id, episode_number, title, fansub_group_id, media_provider, media_item_id,
				video_quality, subtitle_type, release_date, stream_url, created_at, updated_at
		)
		SELECT
			i.id, i.anime_id, i.episode_number, i.title, i.media_provider, i.media_item_id,
			i.video_quality, i.subtitle_type, i.release_date, i.stream_url, i.created_at, i.updated_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM inserted i
		LEFT JOIN fansub_groups fg ON fg.id = i.fansub_group_id
	`

	row := r.db.QueryRow(
		ctx,
		query,
		input.AnimeID,
		input.EpisodeNumber,
		input.Title,
		input.FansubGroupID,
		input.MediaProvider,
		input.MediaItemID,
		input.VideoQuality,
		input.SubtitleType,
		input.ReleaseDate,
		input.StreamURL,
	)

	item, err := scanEpisodeVersionRow(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create episode version anime=%d episode=%d: %w", input.AnimeID, input.EpisodeNumber, err)
	}

	return item, nil
}

func (r *EpisodeVersionRepository) Update(
	ctx context.Context,
	versionID int64,
	input models.EpisodeVersionPatchInput,
) (*models.EpisodeVersion, error) {
	assignments := make([]string, 0, 9)
	args := make([]any, 0, 9)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.Title.Set {
		assignments = append(assignments, fmt.Sprintf("title = $%d", argPos))
		args = append(args, input.Title.Value)
		argPos++
	}
	if input.FansubGroupID.Set {
		assignments = append(assignments, fmt.Sprintf("fansub_group_id = $%d", argPos))
		args = append(args, input.FansubGroupID.Value)
		argPos++
	}
	if input.MediaProvider.Set {
		assignments = append(assignments, fmt.Sprintf("media_provider = $%d", argPos))
		args = append(args, input.MediaProvider.Value)
		argPos++
	}
	if input.MediaItemID.Set {
		assignments = append(assignments, fmt.Sprintf("media_item_id = $%d", argPos))
		args = append(args, input.MediaItemID.Value)
		argPos++
	}
	if input.VideoQuality.Set {
		assignments = append(assignments, fmt.Sprintf("video_quality = $%d", argPos))
		args = append(args, input.VideoQuality.Value)
		argPos++
	}
	if input.SubtitleType.Set {
		assignments = append(assignments, fmt.Sprintf("subtitle_type = $%d", argPos))
		args = append(args, input.SubtitleType.Value)
		argPos++
	}
	if input.ReleaseDate.Set {
		assignments = append(assignments, fmt.Sprintf("release_date = $%d", argPos))
		args = append(args, input.ReleaseDate.Value)
		argPos++
	}
	if input.StreamURL.Set {
		assignments = append(assignments, fmt.Sprintf("stream_url = $%d", argPos))
		args = append(args, input.StreamURL.Value)
		argPos++
	}

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update episode version %d: no patch fields provided", versionID)
	}

	query := fmt.Sprintf(`
		WITH updated AS (
			UPDATE episode_versions
			SET %s
			WHERE id = $%d
			RETURNING
				id, anime_id, episode_number, title, fansub_group_id, media_provider, media_item_id,
				video_quality, subtitle_type, release_date, stream_url, created_at, updated_at
		)
		SELECT
			u.id, u.anime_id, u.episode_number, u.title, u.media_provider, u.media_item_id,
			u.video_quality, u.subtitle_type, u.release_date, u.stream_url, u.created_at, u.updated_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM updated u
		LEFT JOIN fansub_groups fg ON fg.id = u.fansub_group_id
	`, strings.Join(assignments, ", "), argPos)
	args = append(args, versionID)

	item, err := scanEpisodeVersionRow(r.db.QueryRow(ctx, query, args...))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("update episode version %d: %w", versionID, err)
	}

	return item, nil
}

func (r *EpisodeVersionRepository) Delete(ctx context.Context, versionID int64) error {
	commandTag, err := r.db.Exec(ctx, `DELETE FROM episode_versions WHERE id = $1`, versionID)
	if err != nil {
		return fmt.Errorf("delete episode version %d: %w", versionID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// DeleteByAnimeAndProvider deletes all episode versions for the given anime and media provider.
// Returns the number of deleted rows.
func (r *EpisodeVersionRepository) DeleteByAnimeAndProvider(
	ctx context.Context,
	animeID int64,
	provider string,
) (int64, error) {
	commandTag, err := r.db.Exec(ctx, `
		DELETE FROM episode_versions
		WHERE anime_id = $1 AND media_provider = $2
	`, animeID, provider)
	if err != nil {
		return 0, fmt.Errorf("delete episode versions anime=%d provider=%s: %w", animeID, provider, err)
	}

	return commandTag.RowsAffected(), nil
}

// CountByAnimeAndProvider counts all episode versions for the given anime and media provider.
func (r *EpisodeVersionRepository) CountByAnimeAndProvider(
	ctx context.Context,
	animeID int64,
	provider string,
) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM episode_versions
		WHERE anime_id = $1 AND media_provider = $2
	`, animeID, provider).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count episode versions anime=%d provider=%s: %w", animeID, provider, err)
	}

	return count, nil
}

func (r *EpisodeVersionRepository) UpsertByMediaSource(
	ctx context.Context,
	input models.EpisodeVersionCreateInput,
	_ bool,
) (*models.EpisodeVersion, bool, error) {
	exists, err := r.animeExists(ctx, input.AnimeID)
	if err != nil {
		return nil, false, err
	}
	if !exists {
		return nil, false, ErrNotFound
	}

	row := r.db.QueryRow(
		ctx,
		`
		SELECT id
		FROM episode_versions
		WHERE anime_id = $1
		  AND media_provider = $2
		  AND media_item_id = $3
		ORDER BY id ASC
		LIMIT 1
		`,
		input.AnimeID,
		input.MediaProvider,
		input.MediaItemID,
	)

	var existingID int64
	if err := row.Scan(&existingID); errors.Is(err, pgx.ErrNoRows) {
		created, createErr := r.Create(ctx, input)
		if createErr != nil {
			return nil, false, createErr
		}
		return created, true, nil
	} else if err != nil {
		return nil, false, fmt.Errorf(
			"find episode version anime=%d provider=%s item=%s: %w",
			input.AnimeID,
			input.MediaProvider,
			input.MediaItemID,
			err,
		)
	}

	updatedRow := r.db.QueryRow(
		ctx,
		`
		WITH updated AS (
			UPDATE episode_versions
			SET
				title = COALESCE(title, $2),
				fansub_group_id = COALESCE(fansub_group_id, $3),
				video_quality = COALESCE(video_quality, $4),
				subtitle_type = COALESCE(subtitle_type, $5),
				release_date = COALESCE(release_date, $6),
				stream_url = COALESCE(stream_url, $7),
				updated_at = NOW()
			WHERE id = $1
			RETURNING
				id, anime_id, episode_number, title, fansub_group_id, media_provider, media_item_id,
				video_quality, subtitle_type, release_date, stream_url, created_at, updated_at
		)
		SELECT
			u.id, u.anime_id, u.episode_number, u.title, u.media_provider, u.media_item_id,
			u.video_quality, u.subtitle_type, u.release_date, u.stream_url, u.created_at, u.updated_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM updated u
		LEFT JOIN fansub_groups fg ON fg.id = u.fansub_group_id
		`,
		existingID,
		input.Title,
		input.FansubGroupID,
		input.VideoQuality,
		input.SubtitleType,
		input.ReleaseDate,
		input.StreamURL,
	)

	item, updateErr := scanEpisodeVersionRow(updatedRow)
	if updateErr != nil {
		if isUniqueViolation(updateErr) {
			return nil, false, ErrConflict
		}
		if isForeignKeyViolation(updateErr) {
			return nil, false, ErrNotFound
		}
		return nil, false, fmt.Errorf("update episode version by media source %d: %w", existingID, updateErr)
	}

	return item, false, nil
}

func (r *EpisodeVersionRepository) GetReleaseStreamSource(
	ctx context.Context,
	versionID int64,
) (*models.ReleaseStreamSource, error) {
	query := `
		SELECT id, anime_id, media_provider, media_item_id, stream_url
		FROM episode_versions
		WHERE id = $1
	`

	var item models.ReleaseStreamSource
	if err := r.db.QueryRow(ctx, query, versionID).Scan(
		&item.ID,
		&item.AnimeID,
		&item.MediaProvider,
		&item.MediaItemID,
		&item.StreamURL,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("get release stream source %d: %w", versionID, err)
	}

	return &item, nil
}

func (r *EpisodeVersionRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`,
		animeID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
}

func scanEpisodeVersion(rows pgx.Rows) (*models.EpisodeVersion, error) {
	item, err := scanEpisodeVersionWithScanner(rows)
	if err != nil {
		return nil, fmt.Errorf("scan episode version row: %w", err)
	}
	return item, nil
}

func scanEpisodeVersionRow(row pgx.Row) (*models.EpisodeVersion, error) {
	item, err := scanEpisodeVersionWithScanner(row)
	if err != nil {
		return nil, err
	}
	return item, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanEpisodeVersionWithScanner(scanner rowScanner) (*models.EpisodeVersion, error) {
	var item models.EpisodeVersion
	var groupID *int64
	var groupSlug *string
	var groupName *string
	var groupLogoURL *string

	if err := scanner.Scan(
		&item.ID,
		&item.AnimeID,
		&item.EpisodeNumber,
		&item.Title,
		&item.MediaProvider,
		&item.MediaItemID,
		&item.VideoQuality,
		&item.SubtitleType,
		&item.ReleaseDate,
		&item.StreamURL,
		&item.CreatedAt,
		&item.UpdatedAt,
		&groupID,
		&groupSlug,
		&groupName,
		&groupLogoURL,
	); err != nil {
		return nil, err
	}

	if groupID != nil && groupSlug != nil && groupName != nil {
		item.FansubGroup = &models.FansubGroupSummary{
			ID:      *groupID,
			Slug:    *groupSlug,
			Name:    *groupName,
			LogoURL: groupLogoURL,
		}
	}

	return &item, nil
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
