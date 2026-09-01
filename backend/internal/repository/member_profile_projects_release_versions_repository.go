package repository

// Ausgelagert aus member_profile_projects_repository.go für das 450-Zeilen-Limit
// (Phase 143). Enthält die batch-geladenen Release-Versionen pro Projekt sowie die
// zugehörigen Rollen-Hilfsfunktionen.

import (
	"context"
	"encoding/json"
	"fmt"

	"team4s.v3/backend/internal/models"
)

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
			SELECT
				COALESCE(jsonb_agg(DISTINCT jsonb_build_object('code', acr.role_code, 'label_de', COALESCE(rd.label_de, acr.role_code))) FILTER (WHERE acr.role_code IS NOT NULL), '[]'::jsonb) AS roles
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
			  AND (
				ac.release_version_id = rv.id
				OR (
					ac.release_version_id IS NULL
					AND NOT EXISTS (
						SELECT 1
						FROM anime_contributions specific_ac
						LEFT JOIN hist_fansub_group_members specific_hfgm ON specific_hfgm.id = specific_ac.fansub_group_member_id
						WHERE COALESCE(specific_ac.member_id, specific_hfgm.member_id) = $1
						  AND specific_ac.anime_id = p.anime_id
						  AND specific_ac.fansub_group_id = p.fansub_group_id
						  AND specific_ac.release_version_id = rv.id
						  AND specific_ac.status = 'confirmed'
						  AND specific_ac.is_public_on_member_profile = true
						  AND specific_ac.ended_year IS NULL
					)
				)
			  )
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

// sameMemberRoleSets compares role codes as sets because the database JSON aggregate has no
// semantic ordering. A copied project role is not a release-specific exception.
func sameMemberRoleSets(left []models.PublicMemberRole, right []models.PublicMemberRole) bool {
	if len(left) != len(right) {
		return false
	}
	leftCodes := make(map[string]struct{}, len(left))
	for _, role := range left {
		leftCodes[role.Code] = struct{}{}
	}
	for _, role := range right {
		if _, exists := leftCodes[role.Code]; !exists {
			return false
		}
	}
	return true
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
