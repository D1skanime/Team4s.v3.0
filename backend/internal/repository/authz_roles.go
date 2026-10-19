package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/permissions"
)

func (r *AuthzRepository) ListActorGroupRoles(ctx context.Context, appUserID int64, fansubGroupID int64) ([]string, error) {
	if appUserID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT fgr.role
		FROM fansub_group_members fgm
		JOIN fansub_group_member_roles fgr ON fgr.fansub_group_member_id = fgm.id
		WHERE fgm.app_user_id = $1
		  AND fgm.fansub_group_id = $2
		  AND fgm.status = 'active'
		ORDER BY fgr.role
	`, appUserID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list actor group roles app_user=%d fansub_group=%d: %w", appUserID, fansubGroupID, err)
	}
	defer rows.Close()

	roles := make([]string, 0)
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("list actor group roles app_user=%d fansub_group=%d: scan: %w", appUserID, fansubGroupID, err)
		}
		roles = append(roles, strings.TrimSpace(role))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list actor group roles app_user=%d fansub_group=%d: iterate: %w", appUserID, fansubGroupID, err)
	}

	return roles, nil
}

// LoadFansubGroupRoles lädt alle Rollen, die in aktiven Gruppen-/Arbeitskontexten
// als Gruppenmitglied-Rolle gespeichert werden dürfen. Reine Spezialfälle ohne
// aktiven Kontext bleiben draußen; historische offene Rollen können so beim
// Verknüpfen eines App-Mitglieds übernommen werden.
// Phase 145: `AND NOT reserved` excludes reserved pseudo-roles (e.g. the
// membership-baseline pseudo-role group_member) from this assignable catalog even
// though they carry the fansub_group context that otherwise satisfies the OR predicate
// -- reserved roles remain capability-editable via LoadCapabilityRoles below, they are
// just never assignable to a real member.
// Implementiert das permissions.CatalogLoader-Interface für den Startup-Load (D-12).
func (r *AuthzRepository) LoadFansubGroupRoles(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT code FROM role_definitions
		WHERE (assignable = true
		   OR 'fansub_group' = ANY(contexts)
		   OR 'anime_contribution' = ANY(contexts))
		  AND NOT reserved
		ORDER BY sort_order, code
	`)
	if err != nil {
		return nil, fmt.Errorf("load fansub group roles: %w", err)
	}
	defer rows.Close()

	var result []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, fmt.Errorf("load fansub group roles: scan: %w", err)
		}
		result = append(result, strings.TrimSpace(code))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load fansub group roles: iterate: %w", err)
	}
	return result, nil
}

// LoadCapabilityRoles lädt ausschließlich Rollen mit fansub_group-Kontext. Beitrags- und historische Rollen sind Credits beziehungsweise Dokumentation, keine Standardberechtigungsträger.
func (r *AuthzRepository) LoadCapabilityRoles(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT code FROM role_definitions
		WHERE 'fansub_group' = ANY(contexts)
		  AND code <> 'founder'
		ORDER BY sort_order, code
	`)
	if err != nil {
		return nil, fmt.Errorf("load capability roles: %w", err)
	}
	defer rows.Close()

	var result []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, fmt.Errorf("load capability roles: scan: %w", err)
		}
		result = append(result, strings.TrimSpace(code))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load capability roles: iterate: %w", err)
	}
	return result, nil
}

// Compile-Zeit-Assertion: AuthzRepository implementiert CatalogLoader (D-12).
var _ permissions.CatalogLoader = (*AuthzRepository)(nil)

func (r *AuthzRepository) ListActorContributionRolesForVersion(ctx context.Context, appUserID int64, releaseVersionID int64) ([]string, error) {
	if appUserID <= 0 || releaseVersionID <= 0 {
		return nil, nil
	}

	// Schritt 1: versions-spezifische Contributions des Actors für diese Release-Version.
	// fansub_group_id-Scope via JOIN auf fansub_group_members verhindert Cross-Gruppen-Leckage (T-83-01).
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT acr.role_code
		FROM anime_contributions ac
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		JOIN fansub_group_members fgm ON fgm.member_id = ac.member_id
		  AND fgm.fansub_group_id = ac.fansub_group_id
		WHERE ac.release_version_id = $1
		  AND fgm.app_user_id = $2
		  AND fgm.status = 'active'
		ORDER BY acr.role_code
	`, releaseVersionID, appUserID)
	if err != nil {
		return nil, fmt.Errorf("list actor contribution roles version=%d user=%d step=%d: %w", releaseVersionID, appUserID, 1, err)
	}
	defer rows.Close()

	roleCodes := make([]string, 0)
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, fmt.Errorf("list actor contribution roles version=%d user=%d step=%d: scan: %w", releaseVersionID, appUserID, 1, err)
		}
		roleCodes = append(roleCodes, strings.TrimSpace(code))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list actor contribution roles version=%d user=%d step=%d: iterate: %w", releaseVersionID, appUserID, 1, err)
	}
	if len(roleCodes) > 0 {
		// A release-specific assignment replaces the project-wide role set for
		// this exact version. Do not leak a replaced project role into the
		// contributor's capabilities.
		return roleCodes, nil
	}

	// Schritt 2 (Fallback anime-weit): role_codes aus anime_contributions mit
	// release_version_id IS NULL, wenn Schritt 1 kein Ergebnis lieferte.
	// anime_id wird über release_versions → fansub_releases → episodes ermittelt.
	// fansub_group_id-Scope: IN (SELECT fansub_group_id FROM release_version_groups) verhindert
	// Cross-Gruppen-Leckage (T-83-CROSSGROUP).
	rows2, err := r.db.Query(ctx, `
		SELECT DISTINCT acr.role_code
		FROM anime_contributions ac
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		JOIN fansub_group_members fgm ON fgm.member_id = ac.member_id
		  AND fgm.fansub_group_id = ac.fansub_group_id
		JOIN release_versions rv ON rv.id = $1
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE ac.release_version_id IS NULL
		  AND ac.anime_id = ep.anime_id
		  AND ac.fansub_group_id IN (
		      SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1
		  )
		  AND fgm.app_user_id = $2
		  AND fgm.status = 'active'
		ORDER BY acr.role_code
	`, releaseVersionID, appUserID)
	if err != nil {
		return nil, fmt.Errorf("list actor contribution roles version=%d user=%d step=%d: %w", releaseVersionID, appUserID, 2, err)
	}
	defer rows2.Close()

	for rows2.Next() {
		var code string
		if err := rows2.Scan(&code); err != nil {
			return nil, fmt.Errorf("list actor contribution roles version=%d user=%d step=%d: scan: %w", releaseVersionID, appUserID, 2, err)
		}
		roleCodes = append(roleCodes, strings.TrimSpace(code))
	}
	if err := rows2.Err(); err != nil {
		return nil, fmt.Errorf("list actor contribution roles version=%d user=%d step=%d: iterate: %w", releaseVersionID, appUserID, 2, err)
	}

	return roleCodes, nil
}
