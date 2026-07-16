package repository

// GetGroupReleasesCursor (AO4-03/AO4-24) ist die additive Seek-Cursor-Variante der
// vollstaendigen Release-Liste, ausgelagert aus group_repository.go wegen des
// 450-Zeilen-Limits. Die Offset-Methode GetGroupReleases in group_repository.go
// bleibt unveraendert — beide Modi teilen sich buildReleasesWhere und den
// identischen Sortierschluessel (episode_number, rev.id).

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
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
// vollstaendigen Release-Liste, additiv neben GetGroupReleases. Standard-
// Sortierschluessel identisch zur Offset-Variante: (episode_number, rev.id).
// Optional sort=activity sortiert nach letzter oeffentlicher Text-/Bild-Aktivitaet.
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
	orderSQL := "CAST(e.episode_number AS INTEGER) ASC, rev.id ASC"
	cursorFn := func(ep models.EpisodeReleaseSummary) string {
		return encodeInt32Int64Cursor(ep.EpisodeNumber, ep.ID)
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
	} else if epNum, revID, ok := decodeInt32Int64Cursor(cursor); ok {
		seekPos := len(args) + 1
		whereSQL = fmt.Sprintf("%s AND (CAST(e.episode_number AS INTEGER), rev.id) > ($%d, $%d)", whereSQL, seekPos, seekPos+1)
		args = append(args, epNum, revID)
	}

	limitPos := len(args) + 1
	listQuery := fmt.Sprintf(`
		SELECT
			rev.id,
			e.id AS episode_id,
			CAST(e.episode_number AS INTEGER) AS episode_number,
			%s AS title,
			NULLIF(BTRIM(rev.version), '') AS version_label,
			COALESCE(rev.release_date, fr.release_date) AS release_date,
			0::BIGINT AS screenshot_count,
			NULL::TEXT AS thumbnail_url,
			(
				SELECT rv.duration_seconds
				FROM release_variants rv
				WHERE rv.release_version_id = rev.id
				ORDER BY rv.duration_seconds IS NOT NULL DESC, rv.id ASC
				LIMIT 1
			) AS duration_seconds,
			COALESCE(release_images.images_count, 0)::BIGINT AS images_count,
			COALESCE(release_notes.notes_count, 0)::BIGINT AS notes_count,
			COALESCE(release_contributors.contributors_count, 0)::BIGINT AS contributors_count,
			release_activity.last_activity_at
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id AND e.episode_number ~ '^[0-9]+$'
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
			SELECT COUNT(DISTINCT ac.member_id) AS contributors_count
			FROM anime_contributions ac
			LEFT JOIN visibilities v_contrib ON v_contrib.id = ac.visibility_id
			WHERE ac.release_version_id = rev.id
			  AND ac.is_public_on_anime_page = true
			  AND COALESCE(v_contrib.name, 'public') = 'public'
		) release_contributors ON TRUE
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

func (r *GroupRepository) attachReleaseTimelineSegments(
	ctx context.Context,
	animeID int64,
	groupID int64,
	episodes []models.EpisodeReleaseSummary,
) error {
	if len(episodes) == 0 {
		return nil
	}

	releaseIDs := make([]int64, 0, len(episodes))
	indexByReleaseID := make(map[int64]int, len(episodes))
	for index, episode := range episodes {
		releaseIDs = append(releaseIDs, episode.ID)
		indexByReleaseID[episode.ID] = index
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			rev.id AS release_version_id,
			ts.id AS segment_id,
			CASE
				WHEN LOWER(tt.name) LIKE '%op%' OR LOWER(tt.name) LIKE '%opening%' THEN 'OP'
				WHEN LOWER(tt.name) LIKE '%ed%' OR LOWER(tt.name) LIKE '%ending%' OR LOWER(tt.name) LIKE '%outro%' THEN 'ED'
				WHEN LOWER(tt.name) LIKE '%insert%' THEN 'INSERT'
				WHEN LOWER(tt.name) LIKE '%kara%' THEN 'KARA'
				ELSE UPPER(tt.name)
			END AS segment_type,
			COALESCE(NULLIF(BTRIM(t.title), ''), tt.name) AS title,
			ts.start_time::text AS start_time,
			ts.end_time::text AS end_time,
			LOWER(tt.name) LIKE '%kara%' AS is_karaoke
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id AND e.episode_number ~ '^[0-9]+$'
		JOIN theme_segments ts ON ts.fansub_group_id = $2
		JOIN themes t ON t.id = ts.theme_id AND t.anime_id = $1
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE rev.id = ANY($3::bigint[])
		  AND COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1') = COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1')
		  AND (ts.start_episode IS NULL OR ts.start_episode <= e.episode_number::int)
		  AND (ts.end_episode IS NULL OR ts.end_episode >= e.episode_number::int)
		ORDER BY rev.id, ts.start_time NULLS LAST, ts.id
	`, animeID, groupID, releaseIDs)
	if err != nil {
		return fmt.Errorf("query release timeline segments (%d,%d): %w", animeID, groupID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			releaseID int64
			segment   models.ReleaseTimelineSegment
			isKaraoke bool
		)
		if err := rows.Scan(
			&releaseID,
			&segment.ID,
			&segment.Type,
			&segment.Title,
			&segment.StartTime,
			&segment.EndTime,
			&isKaraoke,
		); err != nil {
			return fmt.Errorf("scan release timeline segment: %w", err)
		}

		index, ok := indexByReleaseID[releaseID]
		if !ok {
			continue
		}

		episodes[index].TimelineSegments = append(episodes[index].TimelineSegments, segment)
		switch strings.ToUpper(segment.Type) {
		case "OP":
			episodes[index].HasOP = true
		case "ED":
			episodes[index].HasED = true
		case "INSERT":
			episodes[index].InsertCount++
		}
		if isKaraoke {
			episodes[index].KaraokeCount++
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate release timeline segments: %w", err)
	}

	return nil
}
