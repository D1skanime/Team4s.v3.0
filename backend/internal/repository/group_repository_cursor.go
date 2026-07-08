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
// vollstaendigen Release-Liste, additiv neben GetGroupReleases. Sortierschluessel
// identisch zur Offset-Variante: (episode_number, rev.id), damit beide Modi
// konsistent sortieren (group_repository.go Zeile ~172/188).
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

	if epNum, revID, ok := decodeInt32Int64Cursor(cursor); ok {
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
			COALESCE(rev.title, e.title) AS title,
			NULLIF(BTRIM(rev.version), '') AS version_label,
			COALESCE(rev.release_date, fr.release_date) AS release_date,
			0::BIGINT AS screenshot_count,
			NULL::TEXT AS thumbnail_url,
			(
				SELECT COUNT(*)
				FROM release_version_media rvm
				JOIN media_assets ma ON ma.id = rvm.media_asset_id
				JOIN visibilities v_img ON v_img.id = ma.visibility_id
				JOIN review_statuses rs_img ON rs_img.id = ma.review_status_id
				WHERE rvm.release_version_id = rev.id
				  AND rvm.deleted_at IS NULL
				  AND ma.status = 'ready'
				  AND v_img.name = 'public'
				  AND rs_img.code = 'approved'
			) AS images_count,
			(
				SELECT COUNT(*)
				FROM release_version_notes rvn
				WHERE rvn.release_version_id = rev.id
				  AND rvn.deleted_at IS NULL
				  AND rvn.visibility = 'public'
				  AND rvn.status = 'published'
			) AS notes_count
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id AND e.episode_number ~ '^[0-9]+$'
		JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
		%s
		ORDER BY CAST(e.episode_number AS INTEGER) ASC, rev.id ASC
		LIMIT $%d
	`, whereSQL, limitPos)

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
		var imagesCount int64
		var notesCount int64
		if err := rows.Scan(
			&ep.ID,
			&episodeID,
			&ep.EpisodeNumber,
			&ep.Title,
			&ep.VersionLabel,
			&ep.ReleasedAt,
			&screenshotCount,
			&ep.ThumbnailURL,
			&imagesCount,
			&notesCount,
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
		ep.ImagesCount = int32(imagesCount)
		ep.NotesCount = int32(notesCount)
		episodes = append(episodes, ep)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate cursor group release rows: %w", err)
	}

	page, nextCursor, hasMore := trimCursorPage(episodes, limit, func(ep models.EpisodeReleaseSummary) string {
		return encodeInt32Int64Cursor(ep.EpisodeNumber, ep.ID)
	})

	return &GroupReleasesCursorPage{
		Items:      page,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}
