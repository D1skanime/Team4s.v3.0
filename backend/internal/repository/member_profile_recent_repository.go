package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

func (r *MemberProfileRepository) loadRecentMedia(ctx context.Context, memberID int64) ([]models.MemberProfileRecentMedia, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvm.id,
			rvm.category,
			COALESCE(NULLIF(BTRIM(rvm.caption), ''), ''),
			COALESCE(mf_thumb.path, mf_orig.path, ''),
			a.title,
			rv.id,
			COALESCE(NULLIF(rv.title, ''), NULLIF(rv.version, ''), CONCAT('#', rv.id::text))
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		JOIN visibilities v ON v.id = ma.visibility_id AND v.name = 'public'
		JOIN review_statuses rs ON rs.id = ma.review_status_id AND rs.code = 'approved'
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN anime a ON a.id = e.anime_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = rvm.media_asset_id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		WHERE EXISTS (
			SELECT 1
			FROM member_claims owner_claim
			WHERE owner_claim.member_id = $1
			  AND owner_claim.app_user_id = rvm.uploaded_by_user_id
			  AND owner_claim.claim_status = 'verified'
		)
		  AND rvm.deleted_at IS NULL
		  AND ma.status = 'ready'
		  AND (mf_thumb.id IS NOT NULL OR mf_orig.id IS NOT NULL)
		ORDER BY rvm.created_at DESC
		LIMIT 3
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load recent media for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileRecentMedia, 0)
	for rows.Next() {
		var item models.MemberProfileRecentMedia
		var thumbnailPath string
		if err := rows.Scan(
			&item.ID,
			&item.Category,
			&item.Caption,
			&thumbnailPath,
			&item.AnimeTitle,
			&item.ReleaseVersionID,
			&item.ReleaseVersionLabel,
		); err != nil {
			return nil, fmt.Errorf("scan recent media row: %w", err)
		}
		item.ThumbnailURL = r.publicURLForPath(thumbnailPath)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent media for member %d: %w", memberID, err)
	}
	return items, nil
}

func (r *MemberProfileRepository) loadRecentContributions(ctx context.Context, memberID int64, publicOnly bool) ([]models.MemberProfileRecentContribution, error) {
	rows, err := r.db.Query(ctx, `
		WITH release_credit_rows AS (
			SELECT
				rmr.release_id,
				rmr.role_id,
				fg.id     AS fansub_group_id,
				rv.id     AS release_version_id,
				e.id      AS episode_id,
				rmr.created_at,
				a.title   AS anime_title,
				a.id      AS anime_id,
				fg.name::text   AS fansub_group_name,
				cr.name::text   AS role_name,
				cr.label::text  AS role_label
			FROM release_member_roles rmr
			JOIN contributor_roles cr ON cr.id = rmr.role_id
			JOIN fansub_releases fr ON fr.id = rmr.release_id
			JOIN episodes e ON e.id = fr.episode_id
			JOIN anime a ON a.id = e.anime_id
			JOIN release_versions rv ON rv.release_id = rmr.release_id
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
			WHERE rmr.member_id = $1
		),
		contribution_credit_rows AS (
			SELECT
				NULL::bigint  AS release_id,
				cr.id         AS role_id,
				fg.id         AS fansub_group_id,
				ac.release_version_id,
				NULL::bigint  AS episode_id,
				ac.created_at,
				a.title       AS anime_title,
				a.id          AS anime_id,
				fg.name::text AS fansub_group_name,
				cr.name::text AS role_name,
				cr.label::text AS role_label
			FROM anime_contributions ac
			JOIN anime a ON a.id = ac.anime_id
			JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
			JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
			JOIN contributor_roles cr ON cr.name = acr.role_code
			WHERE ac.member_id = $1 AND ac.status = 'confirmed'
			  AND (NOT $2 OR ac.is_public_on_member_profile = true)
		),
		all_credit_rows AS (
			SELECT * FROM release_credit_rows
			UNION ALL
			SELECT * FROM contribution_credit_rows
		),
		deduped AS (
			SELECT DISTINCT ON (anime_id, release_id, role_id, fansub_group_id)
				release_id,
				release_version_id,
				episode_id,
				created_at,
				anime_title,
				anime_id,
				fansub_group_id,
				fansub_group_name,
				role_name,
				role_label
			FROM all_credit_rows
			ORDER BY anime_id, release_id, role_id, fansub_group_id, created_at DESC
		),
		project_rows AS (
			SELECT
				anime_id AS id,
				anime_title,
				anime_id,
				fansub_group_id,
				(ARRAY_AGG(DISTINCT fansub_group_name ORDER BY fansub_group_name))[1] AS fansub_group_name,
				COALESCE(ARRAY_AGG(DISTINCT fansub_group_name ORDER BY fansub_group_name), ARRAY[]::text[]) AS fansub_group_names,
				(ARRAY_AGG(DISTINCT role_name ORDER BY role_name))[1] AS role_name,
				COALESCE(ARRAY_AGG(DISTINCT role_name ORDER BY role_name), ARRAY[]::text[]) AS role_names,
				(ARRAY_AGG(DISTINCT role_label ORDER BY role_label))[1] AS role_label,
				COALESCE(ARRAY_AGG(DISTINCT role_label ORDER BY role_label), ARRAY[]::text[]) AS role_labels,
				COUNT(DISTINCT release_version_id)::int AS release_version_count,
				COUNT(DISTINCT episode_id)::int AS episode_count,
				MAX(created_at) AS created_at
			FROM deduped
			GROUP BY anime_id, anime_title, fansub_group_id
		)
		SELECT
			id,
			anime_title,
			anime_id,
			fansub_group_id,
			fansub_group_name,
			fansub_group_names,
			role_name,
			role_names,
			role_label,
			role_labels,
			release_version_count,
			episode_count,
			(SELECT COUNT(DISTINCT rv.id) FROM release_versions rv
			 JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			 JOIN fansub_releases fr ON fr.id = rv.release_id
			 JOIN episodes ep ON ep.id = fr.episode_id
			 WHERE ep.anime_id = project_rows.anime_id
			   AND rvg.fansub_group_id = project_rows.fansub_group_id)::int AS total_release_version_count,
			(SELECT COUNT(DISTINCT rv.id) FROM release_versions rv
			 JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			 JOIN fansub_releases fr ON fr.id = rv.release_id
			 JOIN episodes ep ON ep.id = fr.episode_id
			 WHERE ep.anime_id = project_rows.anime_id
			   AND rvg.fansub_group_id = project_rows.fansub_group_id
			   AND (
			     EXISTS (
			       SELECT 1 FROM release_version_notes n
			       WHERE n.release_version_id = rv.id
			         AND n.member_id = $1
			         AND n.deleted_at IS NULL
			     )
			     OR EXISTS (
			       SELECT 1 FROM release_version_media m
			       WHERE m.release_version_id = rv.id
			         AND m.deleted_at IS NULL
			         AND m.uploaded_by_user_id IN (
			           SELECT mc.app_user_id FROM member_claims mc
			           WHERE mc.member_id = $1 AND mc.claim_status = 'verified'
			         )
			     )
			   ))::int AS worked_release_version_count
		FROM project_rows
		ORDER BY created_at DESC
		LIMIT 3
	`, memberID, publicOnly)
	if err != nil {
		return nil, fmt.Errorf("load recent contributions for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileRecentContribution, 0)
	for rows.Next() {
		var item models.MemberProfileRecentContribution
		if err := rows.Scan(
			&item.ID,
			&item.AnimeTitle,
			&item.AnimeID,
			&item.FansubGroupID,
			&item.FansubGroupName,
			&item.FansubGroupNames,
			&item.RoleName,
			&item.RoleNames,
			&item.RoleLabel,
			&item.RoleLabels,
			&item.ReleaseVersionCount,
			&item.EpisodeCount,
			&item.TotalReleaseVersionCount,
			&item.WorkedReleaseVersionCount,
		); err != nil {
			return nil, fmt.Errorf("scan recent contribution row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent contributions for member %d: %w", memberID, err)
	}
	return items, nil
}
