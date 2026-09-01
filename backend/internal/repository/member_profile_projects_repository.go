package repository

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
)

// knownForTopRolesLimit caps the "Schwerpunkte" role list to the highest-frequency
// top-3, matching the pre-existing client-side TOP_ROLES_LIMIT this backend query
// replaces (Phase 132 D-06).
const knownForTopRolesLimit = 3

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
					FILTER (WHERE acr.role_code IS NOT NULL AND ac.release_version_id IS NULL),
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
		-- Domain sort keys first (most-recently-active, then title, then group name).
		-- Trailing (a.id DESC, fg.id DESC) is the UNIQUE tie-breaker: (anime_id,
		-- fansub_group_id) is exactly this query's GROUP BY grouping key, so it makes the
		-- total order deterministic and offset pages stable across repeated loads (D-02).
		ORDER BY MAX(ac.updated_at) DESC, a.title ASC, fg.name ASC, a.id DESC, fg.id DESC
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
				for versionIndex := range versions {
					versions[versionIndex].IsReleaseSpecific = !sameMemberRoleSets(items[i].Roles, versions[versionIndex].Roles)
				}
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

// loadKnownFor computes the "Schwerpunkte" aggregate (top roles, known groups,
// active-year span) over the member's COMPLETE approved current-project set --
// never just the first paginated page (Phase 132 D-06/D-07, PMFE-11).
//
// MUST stay filter-identical to countCurrentProjects: same joins, same WHERE
// clause (status='confirmed', is_public_on_member_profile=true, ended_year IS
// NULL). A looser filter here would leak role/group data the rest of the public
// profile does not expose (threat T-132-01).
func (r *MemberProfileRepository) loadKnownFor(ctx context.Context, memberID int64) (models.PublicMemberKnownFor, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			acr.role_code,
			COALESCE(rd.label_de, acr.role_code) AS role_label,
			fg.name AS group_name,
			ac.started_year
		FROM anime_contributions ac
		LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
		  AND ac.status = 'confirmed'
		  AND ac.is_public_on_member_profile = true
		  AND ac.ended_year IS NULL
		  AND (
			ac.release_version_id IS NULL
			OR NOT EXISTS (
				SELECT 1
				FROM anime_contributions project_ac
				LEFT JOIN hist_fansub_group_members project_hfgm ON project_hfgm.id = project_ac.fansub_group_member_id
				WHERE COALESCE(project_ac.member_id, project_hfgm.member_id) = $1
				  AND project_ac.anime_id = ac.anime_id
				  AND project_ac.fansub_group_id = ac.fansub_group_id
				  AND project_ac.release_version_id IS NULL
				  AND project_ac.status = 'confirmed'
				  AND project_ac.is_public_on_member_profile = true
				  AND project_ac.ended_year IS NULL
			)
		  )
		ORDER BY ac.started_year DESC NULLS LAST, fg.name ASC, ac.id DESC
	`, memberID)
	if err != nil {
		return models.PublicMemberKnownFor{}, fmt.Errorf("load known-for for member %d: %w", memberID, err)
	}
	defer rows.Close()

	roleCounts := make(map[string]int)
	groupSeen := make(map[string]bool)
	groups := make([]string, 0)
	var minYear, maxYear *int32
	for rows.Next() {
		var roleCode, roleLabel, groupName string
		var startedYear *int32
		if err := rows.Scan(&roleCode, &roleLabel, &groupName, &startedYear); err != nil {
			return models.PublicMemberKnownFor{}, fmt.Errorf("scan known-for row for member %d: %w", memberID, err)
		}
		if strings.TrimSpace(roleLabel) != "" {
			roleCounts[roleLabel]++
		}
		if strings.TrimSpace(groupName) != "" && !groupSeen[groupName] {
			groupSeen[groupName] = true
			groups = append(groups, groupName)
		}
		if startedYear != nil {
			if minYear == nil || *startedYear < *minYear {
				minYear = startedYear
			}
			if maxYear == nil || *startedYear > *maxYear {
				maxYear = startedYear
			}
		}
	}
	if err := rows.Err(); err != nil {
		return models.PublicMemberKnownFor{}, fmt.Errorf("iterate known-for rows for member %d: %w", memberID, err)
	}

	topRoles := make([]string, 0, len(roleCounts))
	for label := range roleCounts {
		topRoles = append(topRoles, label)
	}
	sort.Slice(topRoles, func(i, j int) bool {
		if roleCounts[topRoles[i]] != roleCounts[topRoles[j]] {
			return roleCounts[topRoles[i]] > roleCounts[topRoles[j]]
		}
		return strings.Compare(topRoles[i], topRoles[j]) < 0
	})
	if len(topRoles) > knownForTopRolesLimit {
		topRoles = topRoles[:knownForTopRolesLimit]
	}

	activeYears := ""
	if minYear != nil && maxYear != nil {
		if *minYear == *maxYear {
			activeYears = strconv.Itoa(int(*minYear))
		} else {
			activeYears = strconv.Itoa(int(*minYear)) + "–" + strconv.Itoa(int(*maxYear))
		}
	}

	return models.PublicMemberKnownFor{
		ActiveYears: activeYears,
		TopRoles:    topRoles,
		KnownGroups: groups,
	}, nil
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

// memberProjectKey, loadCurrentProjectReleaseVersionsBatch, sameMemberRoleSets und
// decodeMemberRoles sind ausgelagert in member_profile_projects_release_versions_repository.go
// (Phase 143, 450-Zeilen-Limit).
