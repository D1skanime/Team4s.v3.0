package repository

import (
	"path/filepath"
	"strings"
)

// This file holds the scan/URL helper functions and shared SQL fragments
// release_review_query_repository.go's List/Counts/Detail/Next methods depend on. Split
// out (Plan 143-09) purely to keep release_review_query_repository.go under CLAUDE.md's
// 450-line modularity cap after PendingGroupMediaReviewAttention/PendingReleaseReviewAttention
// were added there -- zero behavior change, same package, same receiver type.

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func releaseReviewMediaURL(path *string) string {
	if path == nil || strings.TrimSpace(*path) == "" {
		return ""
	}
	normalized := filepath.ToSlash(strings.TrimSpace(*path))
	if index := strings.LastIndex(normalized, "/media/"); index >= 0 {
		return normalized[index:]
	}
	if strings.HasPrefix(normalized, "media/") {
		return "/" + normalized
	}
	return ""
}

func scanReleaseReviewQueueItem(
	scanner interface{ Scan(...any) error },
	item *ReleaseReviewQueueItem,
	key *ReleaseReviewSortKey,
) error {
	if err := scanner.Scan(releaseReviewQueueScanTargets(item, key)...); err != nil {
		return err
	}
	item.SubmittedAt = key.SubmittedAt
	id, err := EncodeReleaseReviewID(key.SourceType, key.SourceID)
	if err != nil {
		return err
	}
	item.ID = id
	return nil
}

func releaseReviewQueueScanTargets(item *ReleaseReviewQueueItem, key *ReleaseReviewSortKey) []any {
	return []any{
		&key.SourceType, &key.SourceID, &item.SourceRevision, &item.ReviewKind, &item.Category,
		&item.Status, &item.FansubGroupID, &item.AnimeID, &item.AnimeTitle,
		&item.EpisodeID, &item.EpisodeNumber, &item.ReleaseID, &item.ReleaseVersionID,
		&item.ReleaseVersion, &item.SubmitterAppUserID, &item.SubmitterMemberID,
		&item.SubmitterDisplayName, &key.SubmittedAt, &item.LastActivityAt, &item.DecidedAt,
	}
}

const releaseReviewQueueColumns = `
	source.source_type, source.source_id, source.source_revision, source.review_kind,
	COALESCE(source.category, ''), source.review_state, source.fansub_group_id,
	source.anime_id, source.anime_title, source.episode_id, source.episode_number,
	source.release_id, source.release_version_id, source.release_version,
	source.submitter_app_user_id, source.submitter_member_id, source.submitter_display_name,
	source.submitted_at, source.last_activity_at, source.decided_at`

const releaseReviewQueueBaseSQL = `
	WITH review_sources AS (
		SELECT lifecycle.source_type, lifecycle.source_id, lifecycle.source_revision,
		       lifecycle.review_kind, lifecycle.category, lifecycle.review_state,
		       COALESCE(note.fansub_group_id, media.fansub_group_id) AS fansub_group_id,
		       anime.id AS anime_id, COALESCE(anime.title_de, anime.title_en, anime.title, '') AS anime_title,
		       episode.id AS episode_id, COALESCE(episode.episode_number, '')::text AS episode_number,
		       release.id AS release_id, version.id AS release_version_id, version.version AS release_version,
		       lifecycle.submitter_app_user_id, lifecycle.submitter_member_id,
		       COALESCE(NULLIF(TRIM(member.display_name), ''), member.nickname, '') AS submitter_display_name,
		       lifecycle.submitted_at, lifecycle.last_activity_at, lifecycle.decided_at,
		       note.title AS note_title, note.body_html AS note_html, media.caption,
		       thumb.path AS thumbnail_path, original.path AS original_path,
		       CONCAT_WS(' ', COALESCE(anime.title_de, anime.title_en, anime.title, ''),
		           episode.episode_number::text, version.version,
		           COALESCE(NULLIF(TRIM(member.display_name), ''), member.nickname, '')) AS search_text
		FROM release_review_lifecycle_sources lifecycle
		LEFT JOIN release_version_notes note
		  ON lifecycle.source_type = 'release_version_note' AND note.id = lifecycle.source_id AND note.deleted_at IS NULL
		LEFT JOIN release_version_media media
		  ON lifecycle.source_type = 'release_version_media' AND media.id = lifecycle.source_id AND media.deleted_at IS NULL
		JOIN release_versions version ON version.id = COALESCE(note.release_version_id, media.release_version_id)
		JOIN release_version_groups version_group
		  ON version_group.release_version_id = version.id
		 AND version_group.fansub_group_id = COALESCE(note.fansub_group_id, media.fansub_group_id)
		JOIN fansub_releases release ON release.id = version.release_id
		JOIN episodes episode ON episode.id = release.episode_id
		JOIN anime anime ON anime.id = episode.anime_id
		JOIN members member ON member.id = lifecycle.submitter_member_id
		LEFT JOIN LATERAL (
			SELECT media_file.path
			FROM media_files media_file
			WHERE media_file.media_id = media.media_asset_id
			  AND media_file.variant = 'thumb'
			  AND media_file.status = 'ready'
			ORDER BY media_file.id
			LIMIT 1
		) thumb ON TRUE
		LEFT JOIN LATERAL (
			SELECT media_file.path
			FROM media_files media_file
			WHERE media_file.media_id = media.media_asset_id
			  AND media_file.variant = 'original'
			  AND media_file.status = 'ready'
			ORDER BY media_file.id
			LIMIT 1
		) original ON TRUE
	)`
