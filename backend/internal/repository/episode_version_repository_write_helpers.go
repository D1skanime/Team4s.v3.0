package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

type episodeVersionWriteState struct {
	VariantID        int64
	ReleaseVersionID int64
	ReleaseID        int64
	AnimeID          int64
	Title            *string
	ReleaseDate      *time.Time
	VideoQuality     *string
	SubtitleType     *string
	DurationSeconds  *int32
	MediaProvider    string
	MediaItemID      string
	StreamURL        *string
}

func loadEpisodeVersionStateForUpdate(ctx context.Context, tx pgx.Tx, versionID int64) (*episodeVersionWriteState, error) {
	state := episodeVersionWriteState{}
	if err := tx.QueryRow(ctx, `
		SELECT
			rv.id,
			rev.id,
			fr.id,
			e.anime_id,
			rev.title,
			COALESCE(rev.release_date, fr.release_date) AS release_date,
			COALESCE(rv.video_quality, rv.resolution) AS video_quality,
			rv.subtitle_type,
			rv.duration_seconds,
			COALESCE(ss.provider_type, ''),
			COALESCE(ss.external_id, rs.jellyfin_item_id, ''),
			ss.url
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id
		WHERE rv.id = $1 OR rev.id = $1
		ORDER BY rv.id ASC
		LIMIT 1
		FOR UPDATE OF rv, rev, fr
	`, versionID).Scan(
		&state.VariantID,
		&state.ReleaseVersionID,
		&state.ReleaseID,
		&state.AnimeID,
		&state.Title,
		&state.ReleaseDate,
		&state.VideoQuality,
		&state.SubtitleType,
		&state.DurationSeconds,
		&state.MediaProvider,
		&state.MediaItemID,
		&state.StreamURL,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load release version state %d: %w", versionID, err)
	}
	return &state, nil
}

func applyEpisodeVersionReleaseMetadata(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	title *string,
	releaseDate *time.Time,
) error {
	if _, err := tx.Exec(ctx, `
		UPDATE release_versions
		SET title = $1,
		    release_date = $2,
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = $3
	`, title, releaseDate, releaseVersionID); err != nil {
		return fmt.Errorf("update release version metadata version=%d: %w", releaseVersionID, err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE fansub_releases
		SET release_date = $1,
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = (SELECT release_id FROM release_versions WHERE id = $2)
	`, releaseDate, releaseVersionID); err != nil {
		return fmt.Errorf("update release metadata version=%d: %w", releaseVersionID, err)
	}
	return nil
}

func applyEpisodeVersionVariantMetadata(
	ctx context.Context,
	tx pgx.Tx,
	variantID int64,
	videoQuality *string,
	subtitleType *string,
	title *string,
	durationSeconds *int32,
) error {
	filename := strings.TrimSpace(derefString(title))
	container := strings.TrimPrefix(strings.ToLower(pathExt(filename)), ".")
	if _, err := tx.Exec(ctx, `
		UPDATE release_variants
		SET resolution = $1,
		    video_quality = $1,
		    subtitle_type = $2,
		    filename = NULLIF($3, ''),
		    container = NULLIF($4, ''),
		    duration_seconds = $5,
		    updated_at = NOW(),
		    modified_at = NOW()
		WHERE id = $6
	`, videoQuality, subtitleType, filename, container, durationSeconds, variantID); err != nil {
		return fmt.Errorf("update release variant metadata variant=%d: %w", variantID, err)
	}
	return nil
}

func ensureEpisodeStreamTypeID(ctx context.Context, tx pgx.Tx) (int64, error) {
	var streamTypeID int64
	if err := tx.QueryRow(ctx, `SELECT id FROM stream_types WHERE name = 'episode' LIMIT 1`).Scan(&streamTypeID); err != nil {
		return 0, fmt.Errorf("lookup episode stream type: %w", err)
	}
	return streamTypeID, nil
}

func ensureEpisodeVersionStream(
	ctx context.Context,
	tx pgx.Tx,
	variantID int64,
	mediaProvider string,
	mediaItemID string,
	streamURL *string,
) error {
	streamTypeID, err := ensureEpisodeStreamTypeID(ctx, tx)
	if err != nil {
		return err
	}
	streamSourceID, err := ensureStreamSourceID(ctx, tx, mediaProvider, mediaItemID, streamURL)
	if err != nil {
		return err
	}
	if err := upsertNormalizedReleaseStream(ctx, tx, variantID, streamTypeID, streamSourceID, mediaItemID); err != nil {
		return fmt.Errorf("upsert release stream variant=%d: %w", variantID, err)
	}
	return nil
}

func syncEpisodeVersionSelectedGroups(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	animeID int64,
	fansubGroups []models.SelectedFansubGroupInput,
	fansubGroupID *int64,
	reset bool,
) error {
	if !reset {
		return nil
	}

	var selection *resolvedImportFansubSelection
	var err error
	switch {
	case len(fansubGroups) > 0:
		selection, err = resolveImportFansubSelectionFromInputs(ctx, tx, fansubGroups)
	case fansubGroupID != nil && *fansubGroupID > 0:
		selection = &resolvedImportFansubSelection{
			EffectiveGroup: &resolvedImportFansubGroup{ID: *fansubGroupID},
			MemberGroups:   []resolvedImportFansubGroup{{ID: *fansubGroupID}},
		}
	default:
		selection = nil
	}
	if err != nil {
		return err
	}
	if selection == nil || selection.EffectiveGroup == nil {
		if _, err := tx.Exec(ctx, `DELETE FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID); err != nil {
			return fmt.Errorf("clear release version groups version=%d: %w", releaseVersionID, err)
		}
		return nil
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_groups
		WHERE release_version_id = $1
		  AND fansub_group_id <> $2
	`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
		return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $2)
		ON CONFLICT (release_version_id, fansub_group_id) DO UPDATE
		SET fansub_group_id = EXCLUDED.fansub_group_id
	`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
		return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, selection.EffectiveGroup.ID, err)
	}
	return ensureAnimeFansubGroupLinks(ctx, tx, animeID, *selection)
}

func (r *EpisodeVersionRepository) Delete(ctx context.Context, versionID int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin delete release version tx %d: %w", versionID, err)
	}
	defer tx.Rollback(ctx)

	var variantID int64
	var releaseVersionID int64
	var releaseID int64
	if err := tx.QueryRow(ctx, `
		SELECT rv.id, rev.id, rev.release_id
		FROM release_variants rv
		JOIN release_versions rev ON rev.id = rv.release_version_id
		WHERE rv.id = $1 OR rev.id = $1
		ORDER BY rv.id ASC
		LIMIT 1
	`, versionID).Scan(&variantID, &releaseVersionID, &releaseID); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("resolve delete release version target %d: %w", versionID, err)
	}

	streamSourceIDs := make([]int64, 0, 2)
	rows, err := tx.Query(ctx, `
		SELECT DISTINCT stream_source_id
		FROM release_streams
		WHERE variant_id = $1
		  AND stream_source_id IS NOT NULL
	`, variantID)
	if err != nil {
		return fmt.Errorf("query release stream sources variant=%d: %w", variantID, err)
	}
	for rows.Next() {
		var streamSourceID int64
		if err := rows.Scan(&streamSourceID); err != nil {
			rows.Close()
			return fmt.Errorf("scan release stream source variant=%d: %w", variantID, err)
		}
		streamSourceIDs = append(streamSourceIDs, streamSourceID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("iterate release stream sources variant=%d: %w", variantID, err)
	}
	rows.Close()

	if _, err := tx.Exec(ctx, `DELETE FROM release_variant_episodes WHERE release_variant_id = $1`, variantID); err != nil {
		return fmt.Errorf("delete release variant episodes variant=%d: %w", variantID, err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM release_streams WHERE variant_id = $1`, variantID); err != nil {
		return fmt.Errorf("delete release streams variant=%d: %w", variantID, err)
	}
	commandTag, err := tx.Exec(ctx, `DELETE FROM release_variants WHERE id = $1`, variantID)
	if err != nil {
		return fmt.Errorf("delete release variant %d: %w", variantID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	var remainingVariants int64
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM release_variants WHERE release_version_id = $1`, releaseVersionID).Scan(&remainingVariants); err != nil {
		return fmt.Errorf("count remaining release variants version=%d: %w", releaseVersionID, err)
	}
	if remainingVariants == 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID); err != nil {
			return fmt.Errorf("delete release version groups version=%d: %w", releaseVersionID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM release_versions WHERE id = $1`, releaseVersionID); err != nil {
			return fmt.Errorf("delete release version %d: %w", releaseVersionID, err)
		}

		var remainingReleaseVersions int64
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM release_versions WHERE release_id = $1`, releaseID).Scan(&remainingReleaseVersions); err != nil {
			return fmt.Errorf("count remaining release versions release=%d: %w", releaseID, err)
		}
		if remainingReleaseVersions == 0 {
			if _, err := tx.Exec(ctx, `DELETE FROM fansub_releases WHERE id = $1`, releaseID); err != nil {
				return fmt.Errorf("delete empty fansub release %d: %w", releaseID, err)
			}
		}
	}

	for _, streamSourceID := range streamSourceIDs {
		if _, err := tx.Exec(ctx, `
			DELETE FROM stream_sources ss
			WHERE ss.id = $1
			  AND NOT EXISTS (
				SELECT 1 FROM release_streams rs
				WHERE rs.stream_source_id = ss.id
			  )
		`, streamSourceID); err != nil {
			return fmt.Errorf("delete orphaned stream source %d after release delete: %w", streamSourceID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit delete release version %d: %w", versionID, err)
	}
	return nil
}


func lookupEpisodeIDByAnimeAndNumber(ctx context.Context, tx pgx.Tx, animeID int64, episodeNumber int32) (int64, error) {
	var episodeID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM episodes
		WHERE anime_id = $1 AND episode_number = $2
		ORDER BY id ASC
		LIMIT 1
		FOR UPDATE
	`, animeID, strconv.FormatInt(int64(episodeNumber), 10)).Scan(&episodeID); errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	} else if err != nil {
		return 0, fmt.Errorf("lookup episode anime=%d episode=%d: %w", animeID, episodeNumber, err)
	}
	return episodeID, nil
}

func ensureReleaseSourceID(ctx context.Context, tx pgx.Tx, provider string) (int64, error) {
	provider = strings.TrimSpace(provider)
	if provider == "" {
		return 0, fmt.Errorf("release source provider is required")
	}

	var sourceID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM release_sources
		WHERE LOWER(COALESCE(NULLIF(BTRIM(type), ''), NULLIF(BTRIM(source_type), ''), NULLIF(BTRIM(name), ''))) = LOWER($1)
		ORDER BY id ASC
		LIMIT 1
	`, provider).Scan(&sourceID); err == nil {
		return sourceID, nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return 0, fmt.Errorf("lookup release source provider=%s: %w", provider, err)
	}

	if err := tx.QueryRow(ctx, `
		INSERT INTO release_sources (name, source_type, type)
		VALUES ($1, $1, $1)
		RETURNING id
	`, provider).Scan(&sourceID); err != nil {
		return 0, fmt.Errorf("create release source provider=%s: %w", provider, err)
	}
	return sourceID, nil
}

func ensureStreamSourceID(
	ctx context.Context,
	tx pgx.Tx,
	mediaProvider string,
	mediaItemID string,
	streamURL *string,
) (int64, error) {
	var streamSourceID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO stream_sources (provider_type, external_id, url)
		VALUES ($1, $2, $3)
		ON CONFLICT (provider_type, external_id) DO UPDATE
		SET url = COALESCE(EXCLUDED.url, stream_sources.url)
		RETURNING id
	`, mediaProvider, mediaItemID, streamURL).Scan(&streamSourceID); err != nil {
		return 0, fmt.Errorf("upsert stream source provider=%s media=%s: %w", mediaProvider, mediaItemID, err)
	}
	return streamSourceID, nil
}

func pathExt(value string) string {
	lastSlash := strings.LastIndexAny(value, `/\`)
	if lastSlash >= 0 {
		value = value[lastSlash+1:]
	}
	lastDot := strings.LastIndex(value, ".")
	if lastDot < 0 {
		return ""
	}
	return value[lastDot:]
}

func phase20ReleaseImportDeferred(action string, id int64) error {
	return fmt.Errorf("%s %d is deferred until Phase 20 release-native import writes are implemented", action, id)
}
