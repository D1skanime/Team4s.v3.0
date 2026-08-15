package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"team4s.v3/backend/internal/models"
)

func (r *MemberProfileRepository) loadCurrentProjects(ctx context.Context, memberID int64, limit int, offset int) ([]models.PublicMemberCurrentProject, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			a.id,
			COALESCE(a.title_de, a.title_en, a.title, ''),
			COALESCE(
				NULLIF(BTRIM(a.cover_image), ''),
				NULLIF(BTRIM(cover_file.path), ''),
				NULLIF(BTRIM(cover_asset.file_path), ''),
				NULLIF(BTRIM(anime_poster.path), '')
			) AS cover_path,
			fg.id,
			COALESCE(fg.name, ''),
			COALESCE(
				jsonb_agg(DISTINCT jsonb_build_object('code', acr.role_code, 'label_de', COALESCE(rd.label_de, acr.role_code)))
					FILTER (WHERE acr.role_code IS NOT NULL),
				'[]'::jsonb
			) AS roles,
			BOOL_OR(ac.release_version_id IS NULL) AS is_project_level,
			'confirmed'::text AS contribution_status,
			MIN(ac.started_year)::int,
			MAX(ac.ended_year)::int
		FROM anime_contributions ac
		LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN anime a ON a.id = ac.anime_id
		LEFT JOIN media_assets cover_asset
			ON cover_asset.id = a.cover_asset_id
		   AND cover_asset.status = 'ready'
		LEFT JOIN LATERAL (
			SELECT mf.path
			FROM media_files mf
			WHERE mf.media_id = cover_asset.id
			  AND mf.status = 'ready'
			ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id ASC
			LIMIT 1
		) cover_file ON true
		LEFT JOIN LATERAL (
			SELECT COALESCE(anime_media_file.path, anime_media_asset.file_path) AS path
			FROM anime_media am
			JOIN media_assets anime_media_asset
				ON anime_media_asset.id = am.media_id
			   AND anime_media_asset.status = 'ready'
			JOIN media_types anime_media_type
				ON anime_media_type.id = anime_media_asset.media_type_id
			   AND anime_media_type.name = 'poster'
			LEFT JOIN LATERAL (
				SELECT mf.path
				FROM media_files mf
				WHERE mf.media_id = anime_media_asset.id
				  AND mf.status = 'ready'
				ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id ASC
				LIMIT 1
			) anime_media_file ON true
			WHERE am.anime_id = a.id
			ORDER BY am.sort_order, anime_media_asset.id
			LIMIT 1
		) anime_poster ON true
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
		  AND ac.status = 'confirmed'
		  AND ac.is_public_on_member_profile = true
		  AND ac.ended_year IS NULL
		GROUP BY a.id, a.title_de, a.title_en, a.title, a.cover_image, cover_file.path, cover_asset.file_path, anime_poster.path, fg.id, fg.name
		ORDER BY MAX(ac.updated_at) DESC, a.title ASC, fg.name ASC
		LIMIT $2 OFFSET $3
	`, memberID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("load current projects for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.PublicMemberCurrentProject, 0)
	for rows.Next() {
		var item models.PublicMemberCurrentProject
		var coverPath *string
		var rolesJSON []byte
		if err := rows.Scan(
			&item.AnimeID,
			&item.AnimeTitle,
			&coverPath,
			&item.FansubGroupID,
			&item.FansubGroupName,
			&rolesJSON,
			&item.IsProjectLevel,
			&item.ContributionStatus,
			&item.StartedYear,
			&item.EndedYear,
		); err != nil {
			return nil, fmt.Errorf("scan current project row: %w", err)
		}
		item.Roles = decodeMemberRoles(rolesJSON)
		if coverPath != nil {
			if url := r.publicURLForPath(*coverPath); url != "" {
				item.CoverURL = &url
			}
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate current projects for member %d: %w", memberID, err)
	}

	// Batch the per-card release-version reads into ONE set-based query for the whole
	// page instead of one round-trip per project (former loadCurrentProjectReleaseVersions
	// N+1). This keeps the profile-load query count CONSTANT regardless of project count
	// (PMPF-01, D-07 SC1). Attach the batched results back to their project in Go.
	if len(items) > 0 {
		animeIDs := make([]int64, len(items))
		fansubGroupIDs := make([]int64, len(items))
		for i := range items {
			animeIDs[i] = items[i].AnimeID
			fansubGroupIDs[i] = items[i].FansubGroupID
		}
		byProject, err := r.loadCurrentProjectReleaseVersionsBatch(ctx, memberID, animeIDs, fansubGroupIDs)
		if err != nil {
			return nil, err
		}
		for i := range items {
			key := memberProjectKey{animeID: items[i].AnimeID, fansubGroupID: items[i].FansubGroupID}
			if versions := byProject[key]; versions != nil {
				items[i].ReleaseVersions = versions
			} else {
				items[i].ReleaseVersions = make([]models.PublicMemberProjectReleaseVersion, 0)
			}
		}
	}
	return items, nil
}

func (r *MemberProfileRepository) countCurrentProjects(ctx context.Context, memberID int64) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM (
			SELECT ac.anime_id, ac.fansub_group_id
			FROM anime_contributions ac
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
			  AND ac.status = 'confirmed'
			  AND ac.is_public_on_member_profile = true
			  AND ac.ended_year IS NULL
			  AND EXISTS (
				SELECT 1 FROM anime_contribution_roles acr
				WHERE acr.anime_contribution_id = ac.id
			  )
			GROUP BY ac.anime_id, ac.fansub_group_id
		) projects
	`, memberID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("count current projects for member %d: %w", memberID, err)
	}
	return total, nil
}

// GetPublicMemberProjects is a temporary public-only compatibility entry point.
// New handlers resolve optional viewer access explicitly, then call the ID loader.
func (r *MemberProfileRepository) GetPublicMemberProjects(ctx context.Context, slug string, limit int, offset int) (*models.PublicMemberProjectsPage, error) {
	access, err := r.ResolvePublicMemberAccess(ctx, slug, 0)
	if err != nil {
		return nil, err
	}
	page, err := r.GetPublicMemberProjectsByID(ctx, access.MemberID, limit, offset)
	if err != nil {
		return nil, err
	}
	page.ProfileVisibility = models.ProfileVisibilityPublic
	page.IsOwner = access.IsOwner
	page.IsPrivatePreview = access.IsPrivatePreview
	return page, nil
}

func (r *MemberProfileRepository) GetPublicMemberProjectsByID(ctx context.Context, memberID int64, limit int, offset int) (*models.PublicMemberProjectsPage, error) {
	if memberID <= 0 {
		return nil, ErrNotFound
	}
	items, err := r.loadCurrentProjects(ctx, memberID, limit, offset)
	if err != nil {
		return nil, err
	}
	total, err := r.countCurrentProjects(ctx, memberID)
	if err != nil {
		return nil, err
	}
	return &models.PublicMemberProjectsPage{
		Items: items, Total: total, Limit: limit, Offset: offset,
	}, nil
}
// memberProjectKey identifies a current project by its (anime, fansub group) pair, the
// grouping key used to attach batch-loaded release versions back to their project card.
type memberProjectKey struct {
	animeID       int64
	fansubGroupID int64
}

// loadCurrentProjectReleaseVersionsBatch loads the release versions for EVERY project on
// the page in a SINGLE set-based query (unnest of the paired (anime_id, fansub_group_id)
// arrays), replacing the former per-project loadCurrentProjectReleaseVersions N+1. Results
// are grouped in Go by (anime_id, fansub_group_id). The per-project ORDER BY
// (ep.sort_index, ep.id, rv.version, rv.id) is preserved inside each group -- the outer
// ORDER BY simply keeps each project's rows contiguous so append() rebuilds the identical
// per-project ordering the old loader produced.
func (r *MemberProfileRepository) loadCurrentProjectReleaseVersionsBatch(
	ctx context.Context,
	memberID int64,
	animeIDs []int64,
	fansubGroupIDs []int64,
) (map[memberProjectKey][]models.PublicMemberProjectReleaseVersion, error) {
	result := make(map[memberProjectKey][]models.PublicMemberProjectReleaseVersion)
	if len(animeIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT
			p.anime_id AS grp_anime_id,
			p.fansub_group_id AS grp_fansub_group_id,
			rv.id,
			COALESCE(NULLIF(rv.title, ''), NULLIF(rv.version, ''), CONCAT('#', rv.id::text)) AS release_version_label,
			COALESCE(NULLIF(rv.version, ''), CONCAT('#', rv.id::text)) AS version,
			NULLIF(rv.title, '') AS title,
			COALESCE(ep.episode_number, '') AS episode_number,
			ep.title AS episode_title,
			COALESCE(own.roles, '[]'::jsonb) AS roles
		FROM unnest($2::bigint[], $3::bigint[]) AS p(anime_id, fansub_group_id)
		JOIN release_version_groups rvg ON rvg.fansub_group_id = p.fansub_group_id
		JOIN release_versions rv ON rv.id = rvg.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id AND ep.anime_id = p.anime_id
		LEFT JOIN LATERAL (
			SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('code', acr.role_code, 'label_de', COALESCE(rd.label_de, acr.role_code))) FILTER (WHERE acr.role_code IS NOT NULL), '[]'::jsonb) AS roles
			FROM anime_contributions ac
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
			LEFT JOIN role_definitions rd ON rd.code = acr.role_code
			WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
			  AND ac.anime_id = p.anime_id
			  AND ac.fansub_group_id = p.fansub_group_id
			  AND ac.status = 'confirmed'
			  AND ac.is_public_on_member_profile = true
			  AND ac.ended_year IS NULL
			  AND (ac.release_version_id = rv.id OR ac.release_version_id IS NULL)
		) own ON true
		WHERE COALESCE(jsonb_array_length(own.roles), 0) > 0
		ORDER BY p.anime_id, p.fansub_group_id, COALESCE(ep.sort_index, 2147483647), ep.id, rv.version, rv.id
	`, memberID, animeIDs, fansubGroupIDs)
	if err != nil {
		return nil, fmt.Errorf("load current project release versions batch member=%d: %w", memberID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var key memberProjectKey
		var item models.PublicMemberProjectReleaseVersion
		var rolesJSON []byte
		if err := rows.Scan(
			&key.animeID,
			&key.fansubGroupID,
			&item.ReleaseVersionID,
			&item.ReleaseVersionLabel,
			&item.Version,
			&item.Title,
			&item.EpisodeNumber,
			&item.EpisodeTitle,
			&rolesJSON,
		); err != nil {
			return nil, fmt.Errorf("scan current project release version row: %w", err)
		}
		item.Roles = decodeMemberRoles(rolesJSON)
		result[key] = append(result[key], item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate current project release versions batch member=%d: %w", memberID, err)
	}
	return result, nil
}

// decodeMemberRoles wandelt eine serverseitig aggregierte jsonb-Rollenliste
// ([{code,label_de}, ...]) in []models.PublicMemberRole; nil/leer -> leeres Slice
// (nie null im JSON). Serverautoritative Code+Label-Paare (D-06).
func decodeMemberRoles(raw []byte) []models.PublicMemberRole {
	roles := make([]models.PublicMemberRole, 0)
	if len(raw) == 0 {
		return roles
	}
	if err := json.Unmarshal(raw, &roles); err != nil || roles == nil {
		return []models.PublicMemberRole{}
	}
	return roles
}
