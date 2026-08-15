package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

func (r *MemberProfileRepository) loadLatestContributions(ctx context.Context, memberID int64) ([]models.PublicMemberLatestContribution, error) {
	rows, err := r.db.Query(ctx, `
		WITH text_rows AS (
			SELECT
				'text'::text AS type,
				release_version_notes.id AS id,
				COALESCE(release_version_notes.updated_at, release_version_notes.created_at) AS occurred_at,
				a.id AS anime_id,
				COALESCE(a.title_de, a.title_en, a.title, '') AS anime_title,
				rv.id AS release_version_id,
				COALESCE(NULLIF(rv.title, ''), NULLIF(rv.version, ''), CONCAT('#', rv.id::text)) AS release_version_label,
				NULLIF(BTRIM(release_version_notes.title), '') AS contribution_title,
				LEFT(COALESCE(NULLIF(BTRIM(body_text), ''), NULLIF(BTRIM(body_html), '')), 280) AS text_preview,
				NULLIF(BTRIM(body_html), '') AS body_html,
				NULL::text AS image_path,
				NULL::text AS thumbnail_path,
				NULL::text AS media_category
			FROM release_version_notes
			JOIN release_versions rv ON rv.id = release_version_notes.release_version_id
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes e ON e.id = fr.episode_id
			JOIN anime a ON a.id = e.anime_id
			WHERE release_version_notes.member_id = $1
			  AND release_version_notes.visibility = 'public'
			  AND release_version_notes.status = 'published'
			  AND release_version_notes.deleted_at IS NULL
			  AND (NULLIF(BTRIM(body_text), '') IS NOT NULL OR NULLIF(BTRIM(body_html), '') IS NOT NULL)
		),
		media_rows AS (
			SELECT DISTINCT ON (rvm.id)
				'media'::text AS type,
				rvm.id,
				rvm.created_at AS occurred_at,
				a.id AS anime_id,
				COALESCE(a.title_de, a.title_en, a.title, '') AS anime_title,
				rv.id AS release_version_id,
				COALESCE(NULLIF(rv.title, ''), NULLIF(rv.version, ''), CONCAT('#', rv.id::text)) AS release_version_label,
				NULL::text AS contribution_title,
				NULLIF(BTRIM(COALESCE(rvm.caption, ma.caption, '')), '') AS text_preview,
				NULL::text AS body_html,
				mf.path AS image_path,
				COALESCE(mf_thumb.path, mf.path) AS thumbnail_path,
				rvm.category::text AS media_category
			FROM release_version_media rvm
			JOIN media_assets ma ON ma.id = rvm.media_asset_id
			JOIN visibilities v ON v.id = ma.visibility_id AND v.name = 'public'
			JOIN review_statuses rs ON rs.id = ma.review_status_id AND rs.code = 'approved'
			JOIN media_files mf ON mf.media_id = rvm.media_asset_id AND mf.status = 'ready'
			LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
			JOIN release_versions rv ON rv.id = rvm.release_version_id
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes e ON e.id = fr.episode_id
			JOIN anime a ON a.id = e.anime_id
			WHERE rvm.uploaded_by_user_id IN (
				SELECT au.legacy_user_id
				FROM member_claims mc
				JOIN app_users au ON au.id = mc.app_user_id
				WHERE mc.member_id = $1
				  AND mc.claim_status = 'verified'
				  AND au.legacy_user_id IS NOT NULL
			)
			  AND rvm.release_version_id IS NOT NULL
			  AND rvm.deleted_at IS NULL
			  AND ma.status = 'ready'
			ORDER BY rvm.id, rvm.created_at DESC, CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id ASC
		),
		latest AS (
			SELECT * FROM text_rows
			UNION ALL
			SELECT * FROM media_rows
		)
		SELECT
			type,
			id,
			occurred_at,
			anime_id,
			anime_title,
			release_version_id,
			release_version_label,
			contribution_title,
			text_preview,
			body_html,
			image_path,
			thumbnail_path,
			media_category
		FROM latest
		ORDER BY occurred_at DESC, id DESC
		LIMIT 3
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load latest contributions for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.PublicMemberLatestContribution, 0)
	for rows.Next() {
		var item models.PublicMemberLatestContribution
		var imagePath *string
		var thumbnailPath *string
		if err := rows.Scan(
			&item.Type,
			&item.ID,
			&item.OccurredAt,
			&item.AnimeID,
			&item.AnimeTitle,
			&item.ReleaseVersionID,
			&item.ReleaseVersionLabel,
			&item.Title,
			&item.TextPreview,
			&item.BodyHTML,
			&imagePath,
			&thumbnailPath,
			&item.MediaCategory,
		); err != nil {
			return nil, fmt.Errorf("scan latest contribution row: %w", err)
		}
		if imagePath != nil {
			if url := r.publicURLForPath(*imagePath); url != "" {
				item.ImageURL = &url
			}
		}
		if thumbnailPath != nil {
			if url := r.publicURLForPath(*thumbnailPath); url != "" {
				item.ThumbnailURL = &url
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate latest contributions for member %d: %w", memberID, err)
	}
	return items, nil
}

func (r *MemberProfileRepository) loadPreviousContributions(ctx context.Context, memberID int64) ([]models.PublicMemberPreviousContribution, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			a.id,
			COALESCE(a.title_de, a.title_en, a.title, ''),
			fg.id,
			COALESCE(fg.name, ''),
			COALESCE(
				jsonb_agg(DISTINCT jsonb_build_object('code', acr.role_code, 'label_de', COALESCE(rd.label_de, acr.role_code)))
					FILTER (WHERE acr.role_code IS NOT NULL),
				'[]'::jsonb
			) AS roles,
			MIN(ac.started_year)::int,
			MAX(ac.ended_year)::int AS ended_year
		FROM anime_contributions ac
		LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN anime a ON a.id = ac.anime_id
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
		  AND ac.status = 'confirmed'
		  AND ac.is_public_on_member_profile = true
		  AND ac.ended_year IS NOT NULL
		GROUP BY a.id, a.title_de, a.title_en, a.title, fg.id, fg.name
		-- Domain sort keys first (most-recently-ended, then title, then group name).
		-- Trailing (a.id DESC, fg.id DESC) is the UNIQUE tie-breaker: (anime_id,
		-- fansub_group_id) is exactly this query's GROUP BY grouping key, so equal
		-- ended_year rows keep a deterministic, stable order across loads (D-02).
		ORDER BY MAX(ac.ended_year) DESC, a.title ASC, fg.name ASC, a.id DESC, fg.id DESC
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load previous contributions for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.PublicMemberPreviousContribution, 0)
	for rows.Next() {
		var item models.PublicMemberPreviousContribution
		var rolesJSON []byte
		if err := rows.Scan(
			&item.AnimeID,
			&item.AnimeTitle,
			&item.FansubGroupID,
			&item.FansubGroupName,
			&rolesJSON,
			&item.StartedYear,
			&item.EndedYear,
		); err != nil {
			return nil, fmt.Errorf("scan previous contribution row: %w", err)
		}
		item.Roles = decodeMemberRoles(rolesJSON)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate previous contributions for member %d: %w", memberID, err)
	}
	return items, nil
}
