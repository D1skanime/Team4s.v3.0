package repository

// episode_version_public_flags.go was split out of episode_version_public_query.go
// to keep both files under CLAUDE.md's 450-line cap (same convention as
// release_detail_public_repository_helpers.go being split out of
// release_detail_public_repository.go).
//
// resolvePublicEpisodeFlags batch-resolves has_images/has_notes/has_karaoke for a
// page's release_version_ids in one round trip (D-24), reusing the exact
// visibility-gate literals already established by
// release_detail_public_repository_helpers.go's countImagesByCategory/countNotes
// (v.name='public', rs.code='approved', ma.status='ready', deleted_at IS NULL for
// images/karaoke; visibility='public', status='published', deleted_at IS NULL for
// notes) so this preview flag and the release-detail page's own counters can never
// disagree. Live-measured at 0.23ms for 5 rows (164-RESEARCH.md).
//
// Its ONLY caller is ListPublicGroupedByAnimeID (episode_version_public_query.go),
// and its only argument source is the release_version_ids already scanned from that
// same request's already-visibility-gated publicEpisodeQuery -- never a
// caller-supplied ID list (T-164-01, IDOR containment).

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

const publicEpisodeFlagsQuery = `
SELECT rv.release_version_id,
 EXISTS (
   SELECT 1 FROM release_version_media rvm
   JOIN media_assets ma ON ma.id = rvm.media_asset_id
   JOIN visibilities v ON v.id = ma.visibility_id
   JOIN review_statuses rs ON rs.id = ma.review_status_id
   WHERE rvm.release_version_id = rv.release_version_id AND rvm.deleted_at IS NULL
     AND rvm.category <> 'typesetting_karaoke'
     AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'
 ) AS has_images,
 EXISTS (
   SELECT 1 FROM release_version_media rvm
   JOIN media_assets ma ON ma.id = rvm.media_asset_id
   JOIN visibilities v ON v.id = ma.visibility_id
   JOIN review_statuses rs ON rs.id = ma.review_status_id
   WHERE rvm.release_version_id = rv.release_version_id AND rvm.deleted_at IS NULL
     AND rvm.category = 'typesetting_karaoke'
     AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'
 ) AS has_karaoke,
 EXISTS (
   SELECT 1 FROM release_version_notes rvn
   WHERE rvn.release_version_id = rv.release_version_id AND rvn.deleted_at IS NULL
     AND rvn.visibility = 'public' AND rvn.status = 'published'
 ) AS has_notes
FROM (SELECT id FROM release_versions) AS rv (release_version_id)
WHERE rv.release_version_id = ANY($1)`

// resolvePublicEpisodeFlags returns an empty map (no query) when releaseVersionIDs
// is empty -- callers must not pay for a zero-length ANY($1) round trip.
func resolvePublicEpisodeFlags(ctx context.Context, db pgxQuerier, releaseVersionIDs []int64) (map[int64]models.PublicEpisodeFlags, error) {
	if len(releaseVersionIDs) == 0 {
		return map[int64]models.PublicEpisodeFlags{}, nil
	}
	rows, err := db.Query(ctx, publicEpisodeFlagsQuery, releaseVersionIDs)
	if err != nil {
		return nil, fmt.Errorf("resolve public episode flags: %w", err)
	}
	defer rows.Close()
	result := make(map[int64]models.PublicEpisodeFlags, len(releaseVersionIDs))
	for rows.Next() {
		var id int64
		var flags models.PublicEpisodeFlags
		if err := rows.Scan(&id, &flags.HasImages, &flags.HasKaraoke, &flags.HasNotes); err != nil {
			return nil, fmt.Errorf("scan public episode flags: %w", err)
		}
		result[id] = flags
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read public episode flags: %w", err)
	}
	return result, nil
}
