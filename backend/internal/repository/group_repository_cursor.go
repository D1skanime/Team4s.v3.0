package repository

// GetGroupReleasesCursor (AO4-03/AO4-24) ist die additive Seek-Cursor-Variante der
// vollstaendigen Release-Liste, ausgelagert aus group_repository.go wegen des
// 450-Zeilen-Limits. Die Offset-Methode GetGroupReleases in group_repository.go
// bleibt unveraendert — beide Modi teilen sich buildReleasesWhere; der Cursor
// verwendet einen stabilen, gemischten Sortierschluessel.

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"team4s.v3/backend/internal/models"
)

// GroupReleasesCursorPage ist das Ergebnis der Seek-Pagination fuer die vollstaendige
// Release-Liste. Additiv neben GetGroupReleases (Offset) — die alte Offset-
// `releases/page.tsx` bleibt unveraendert und nutzt weiterhin GetGroupReleases.
type GroupReleasesCursorPage struct {
	Items      []models.EpisodeReleaseSummary `json:"items"`
	NextCursor *string                        `json:"next_cursor"`
	HasMore    bool                           `json:"has_more"`
}

// GetGroupReleasesCursor liefert eine Seek-paginierte (Cursor-)Seite der
// vollstaendigen Release-Liste, additiv neben GetGroupReleases. Der Default
// sortiert numerische Episoden aufsteigend und danach Specials/OVAs
// nach Veroeffentlichungsdatum absteigend. Optional sind Aktivitaet und
// Veroeffentlichungsdatum als rein absteigende Sortierungen verfuegbar.
func (r *GroupRepository) GetGroupReleasesCursor(
	ctx context.Context,
	animeID int64,
	groupID int64,
	filter models.GroupReleasesFilter,
	cursor string,
	limit int,
) (*GroupReleasesCursorPage, error) {
	limit = clampCursorLimit(limit)

	whereSQL, args := r.buildReleasesWhere(animeID, groupID, filter)
	const (
		numericEpisodeSQL = "e.episode_number ~ '^[0-9]+$'"
		releaseDateSQL    = "COALESCE(rev.release_date, fr.release_date, '1970-01-01 00:00:00+00'::timestamptz)"
	)
	orderSQL := fmt.Sprintf(`
		CASE WHEN %[1]s THEN 0 ELSE 1 END ASC,
		CASE WHEN %[1]s THEN e.episode_number::BIGINT END ASC NULLS LAST,
		CASE WHEN NOT (%[1]s) THEN %[2]s END DESC NULLS LAST,
		CASE WHEN %[1]s THEN rev.id END ASC NULLS LAST,
		CASE WHEN NOT (%[1]s) THEN rev.id END DESC NULLS LAST
	`, numericEpisodeSQL, releaseDateSQL)
	cursorFn := func(ep models.EpisodeReleaseSummary) string {
		releasedAt := time.Unix(0, 0).UTC()
		if ep.ReleasedAt != nil {
			releasedAt = *ep.ReleasedAt
		}
		kind := 1
		if ep.EpisodeNumber > 0 {
			kind = 0
		}
		return encodeMixedReleaseCursor(mixedReleaseCursor{
			Kind:             kind,
			EpisodeNumber:    ep.EpisodeNumber,
			ReleaseDate:      releasedAt,
			ReleaseVersionID: ep.ID,
		})
	}

	if filter.Sort == "activity" {
		orderSQL = "COALESCE(release_activity.last_activity_at, '0001-01-01 00:00:00+00'::timestamptz) DESC, rev.id DESC"
		if activityAt, revID, ok := decodeTimeInt64Cursor(cursor); ok {
			seekPos := len(args) + 1
			whereSQL = fmt.Sprintf(
				"%s AND (COALESCE(release_activity.last_activity_at, '0001-01-01 00:00:00+00'::timestamptz), rev.id) < ($%d, $%d)",
				whereSQL,
				seekPos,
				seekPos+1,
			)
			args = append(args, activityAt, revID)
		}
		cursorFn = func(ep models.EpisodeReleaseSummary) string {
			activityAt := time.Date(1, time.January, 1, 0, 0, 0, 0, time.UTC)
			if ep.LastActivityAt != nil {
				activityAt = *ep.LastActivityAt
			}
			return encodeTimeInt64Cursor(activityAt, ep.ID)
		}
	} else if filter.Sort == "release_date" {
		orderSQL = releaseDateSQL + " DESC, rev.id DESC"
		if releasedAt, revID, ok := decodeTimeInt64Cursor(cursor); ok {
			seekPos := len(args) + 1
			whereSQL = fmt.Sprintf("%s AND (%s, rev.id) < ($%d, $%d)", whereSQL, releaseDateSQL, seekPos, seekPos+1)
			args = append(args, releasedAt, revID)
		}
		cursorFn = func(ep models.EpisodeReleaseSummary) string {
			releasedAt := time.Unix(0, 0).UTC()
			if ep.ReleasedAt != nil {
				releasedAt = *ep.ReleasedAt
			}
			return encodeTimeInt64Cursor(releasedAt, ep.ID)
		}
	} else if position, ok := decodeMixedReleaseCursor(cursor); ok {
		seekPos := len(args) + 1
		if position.Kind == 0 {
			whereSQL = fmt.Sprintf(`%s AND (
				(%s AND (e.episode_number::BIGINT, rev.id) > ($%d, $%d))
				OR NOT (%s)
			)`, whereSQL, numericEpisodeSQL, seekPos, seekPos+1, numericEpisodeSQL)
			args = append(args, position.EpisodeNumber, position.ReleaseVersionID)
		} else {
			whereSQL = fmt.Sprintf(
				"%s AND NOT (%s) AND (%s, rev.id) < ($%d, $%d)",
				whereSQL,
				numericEpisodeSQL,
				releaseDateSQL,
				seekPos,
				seekPos+1,
			)
			args = append(args, position.ReleaseDate, position.ReleaseVersionID)
		}
	}

	limitPos := len(args) + 1
	listQuery := fmt.Sprintf(`
		SELECT
			rev.id,
			e.id AS episode_id,
			COALESCE(CASE WHEN e.episode_number ~ '^[0-9]+$' THEN e.episode_number::INTEGER END, 0) AS episode_number,
			e.episode_number AS episode_number_label,
			%s AS title,
			NULLIF(BTRIM(rev.version), '') AS version_label,
			COALESCE(rev.release_date, fr.release_date) AS release_date,
			0::BIGINT AS screenshot_count,
			(
				SELECT COALESCE(mf_thumb.path, mf_orig.path, ma.file_path)
				FROM release_version_media rvm_preview
				JOIN media_assets ma ON ma.id = rvm_preview.media_asset_id
				LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
				LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
				JOIN visibilities v_preview ON v_preview.id = ma.visibility_id
				JOIN review_statuses rs_preview ON rs_preview.id = ma.review_status_id
				WHERE rvm_preview.release_version_id = rev.id
				  AND rvm_preview.deleted_at IS NULL
				  AND rvm_preview.is_preview_candidate = TRUE
				  AND ma.status = 'ready'
				  AND v_preview.name = 'public'
				  AND rs_preview.code = 'approved'
				ORDER BY rvm_preview.sort_order ASC, rvm_preview.id ASC
				LIMIT 1
			) AS thumbnail_url,
			(
				SELECT rv.duration_seconds
				FROM release_variants rv
				WHERE rv.release_version_id = rev.id
				ORDER BY rv.duration_seconds IS NOT NULL DESC, rv.id ASC
				LIMIT 1
			) AS duration_seconds,
			COALESCE(release_images.images_count, 0)::BIGINT AS images_count,
			COALESCE(release_notes.notes_count, 0)::BIGINT AS notes_count,
			0::BIGINT AS contributors_count,
			release_activity.last_activity_at
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
		JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS images_count, MAX(COALESCE(rvm.updated_at, rvm.created_at)) AS latest_at
			FROM release_version_media rvm
			JOIN media_assets ma ON ma.id = rvm.media_asset_id
			JOIN visibilities v_img ON v_img.id = ma.visibility_id
			JOIN review_statuses rs_img ON rs_img.id = ma.review_status_id
			WHERE rvm.release_version_id = rev.id
			  AND rvm.deleted_at IS NULL
			  AND ma.status = 'ready'
			  AND v_img.name = 'public'
			  AND rs_img.code = 'approved'
		) release_images ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS notes_count, MAX(COALESCE(rvn.updated_at, rvn.created_at)) AS latest_at
			FROM release_version_notes rvn
			WHERE rvn.release_version_id = rev.id
			  AND rvn.deleted_at IS NULL
			  AND rvn.visibility = 'public'
			  AND rvn.status = 'published'
		) release_notes ON TRUE
		LEFT JOIN LATERAL (
			SELECT CASE
				WHEN release_images.latest_at IS NULL AND release_notes.latest_at IS NULL THEN NULL
				ELSE GREATEST(
					COALESCE(release_images.latest_at, release_notes.latest_at),
					COALESCE(release_notes.latest_at, release_images.latest_at)
				)
			END AS last_activity_at
		) release_activity ON TRUE
		%s
		ORDER BY %s
		LIMIT $%d
	`, publicReleaseTitleSQL("rev", "e", "fg"), whereSQL, orderSQL, limitPos)

	rows, err := r.db.Query(ctx, listQuery, append(args, limit+1)...)
	if err != nil {
		return nil, fmt.Errorf("query group releases cursor (%d,%d): %w", animeID, groupID, err)
	}
	defer rows.Close()

	episodes := make([]models.EpisodeReleaseSummary, 0, limit+1)
	for rows.Next() {
		var ep models.EpisodeReleaseSummary
		var episodeID sql.NullInt64
		var screenshotCount int64
		var durationSeconds sql.NullInt64
		var imagesCount int64
		var notesCount int64
		var contributorsCount int64
		var lastActivityAt sql.NullTime
		if err := rows.Scan(
			&ep.ID,
			&episodeID,
			&ep.EpisodeNumber,
			&ep.EpisodeNumberLabel,
			&ep.Title,
			&ep.VersionLabel,
			&ep.ReleasedAt,
			&screenshotCount,
			&ep.ThumbnailURL,
			&durationSeconds,
			&imagesCount,
			&notesCount,
			&contributorsCount,
			&lastActivityAt,
		); err != nil {
			return nil, fmt.Errorf("scan cursor episode release row: %w", err)
		}
		if ep.ThumbnailURL != nil {
			ep.ThumbnailURL = publicMediaURLForPath(*ep.ThumbnailURL, r.mediaStorageDir)
		}
		if episodeID.Valid {
			id := episodeID.Int64
			ep.EpisodeID = &id
		}
		ep.HasOP = false
		ep.HasED = false
		ep.KaraokeCount = 0
		ep.InsertCount = 0
		ep.ScreenshotCount = int32(screenshotCount)
		if durationSeconds.Valid {
			value := int32(durationSeconds.Int64)
			ep.DurationSeconds = &value
		}
		ep.TimelineSegments = make([]models.ReleaseTimelineSegment, 0)
		ep.ImagesCount = int32(imagesCount)
		ep.NotesCount = int32(notesCount)
		ep.ContributorsCount = int32(contributorsCount)
		if lastActivityAt.Valid {
			value := lastActivityAt.Time
			ep.LastActivityAt = &value
		}
		episodes = append(episodes, ep)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate cursor group release rows: %w", err)
	}
	rows.Close()

	releaseVersionIDs := make([]int64, 0, len(episodes))
	for _, episode := range episodes {
		releaseVersionIDs = append(releaseVersionIDs, episode.ID)
	}
	contributorsByRelease, err := loadPublicEffectiveContributors(ctx, r.db, releaseVersionIDs)
	if err != nil {
		return nil, fmt.Errorf("load cursor release contributors (%d,%d): %w", animeID, groupID, err)
	}
	for index := range episodes {
		episodes[index].ContributorsCount = int32(len(contributorsByRelease[episodes[index].ID]))
	}

	if err := r.attachReleaseTimelineSegments(ctx, animeID, groupID, episodes); err != nil {
		return nil, err
	}

	page, nextCursor, hasMore := trimCursorPage(episodes, limit, cursorFn)

	return &GroupReleasesCursorPage{
		Items:      page,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

