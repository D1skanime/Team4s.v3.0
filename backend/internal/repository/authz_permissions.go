package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/permissions"
)

func (r *AuthzRepository) ResolveFansubGroup(ctx context.Context, fansubGroupID int64) (*permissions.Context, error) {
	if fansubGroupID <= 0 {
		return nil, nil
	}

	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)
	`, fansubGroupID).Scan(&exists); err != nil {
		return nil, fmt.Errorf("resolve fansub group %d: %w", fansubGroupID, err)
	}
	if !exists {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: []int64{fansubGroupID},
	}, nil
}

func (r *AuthzRepository) ResolveRelease(ctx context.Context, releaseID int64) (*permissions.Context, error) {
	if releaseID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT rvg.fansub_group_id
		FROM release_versions rv
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE rv.release_id = $1
		ORDER BY rvg.fansub_group_id
	`, releaseID)
	if err != nil {
		return nil, fmt.Errorf("resolve release %d: %w", releaseID, err)
	}
	defer rows.Close()

	groupIDs := make([]int64, 0)
	for rows.Next() {
		var groupID int64
		if err := rows.Scan(&groupID); err != nil {
			return nil, fmt.Errorf("resolve release %d: scan: %w", releaseID, err)
		}
		groupIDs = append(groupIDs, groupID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve release %d: iterate: %w", releaseID, err)
	}
	if len(groupIDs) == 0 {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: groupIDs,
	}, nil
}

func (r *AuthzRepository) ResolveReleaseVersion(ctx context.Context, releaseVersionID int64) (*permissions.Context, error) {
	if releaseVersionID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT fansub_group_id
		FROM release_version_groups
		WHERE release_version_id = $1
		ORDER BY fansub_group_id
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("resolve release version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	groupIDs := make([]int64, 0)
	for rows.Next() {
		var groupID int64
		if err := rows.Scan(&groupID); err != nil {
			return nil, fmt.Errorf("resolve release version %d: scan: %w", releaseVersionID, err)
		}
		groupIDs = append(groupIDs, groupID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve release version %d: iterate: %w", releaseVersionID, err)
	}
	if len(groupIDs) == 0 {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: groupIDs,
	}, nil
}

func (r *AuthzRepository) ResolveReleaseVersionMedia(ctx context.Context, relationID int64) (*permissions.Context, error) {
	if relationID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT
			rvg.fansub_group_id,
			au.id
		FROM release_version_media rvm
		JOIN release_version_groups rvg ON rvg.release_version_id = rvm.release_version_id
		LEFT JOIN app_users au ON au.legacy_user_id = rvm.uploaded_by_user_id
		WHERE rvm.id = $1
		  AND rvm.deleted_at IS NULL
		ORDER BY rvg.fansub_group_id
	`, relationID)
	if err != nil {
		return nil, fmt.Errorf("resolve release version media %d: %w", relationID, err)
	}
	defer rows.Close()

	groupIDs := make([]int64, 0)
	var ownerAppUserID *int64
	for rows.Next() {
		var groupID int64
		var ownerID *int64
		if err := rows.Scan(&groupID, &ownerID); err != nil {
			return nil, fmt.Errorf("resolve release version media %d: scan: %w", relationID, err)
		}
		groupIDs = append(groupIDs, groupID)
		if ownerID != nil && *ownerID > 0 {
			value := *ownerID
			ownerAppUserID = &value
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve release version media %d: iterate: %w", relationID, err)
	}
	if len(groupIDs) == 0 {
		return nil, nil
	}

	return &permissions.Context{
		ScopeType:      permissions.ScopeTypeGroup,
		FansubGroupIDs: groupIDs,
		OwnerAppUserID: ownerAppUserID,
	}, nil
}

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

// ListActorContributionRolesForVersion gibt die role_codes zurück, die dem Actor
// für eine Release-Version zustehen.
// Auflösungsreihenfolge (D-02):
//  1. versions-spezifische anime_contributions (release_version_id = versionID)
//  2. Fallback: anime-weite Contributions (release_version_id IS NULL, anime_id aus Episode ermittelt)
//
// Gibt leere Liste zurück wenn keine Contribution existiert (→ D-04: kein Recht).
// LoadRoleCapabilities lädt die vollständige Rolle→Action-Matrix aus role_capabilities.
// Implementiert das permissions.CacheLoader-Interface für den Startup-Load (D-04, D-06).
// Compile-Zeit-Assertion: var _ permissions.CacheLoader = (*AuthzRepository)(nil)
func (r *AuthzRepository) LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role_code, action_code
		FROM role_capabilities
		ORDER BY role_code, action_code
	`)
	if err != nil {
		return nil, fmt.Errorf("load role capabilities: %w", err)
	}
	defer rows.Close()

	result := make(map[string][]permissions.Action)
	for rows.Next() {
		var role, action string
		if err := rows.Scan(&role, &action); err != nil {
			return nil, fmt.Errorf("load role capabilities: scan: %w", err)
		}
		result[role] = append(result[role], permissions.Action(action))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load role capabilities: iterate: %w", err)
	}
	return result, nil
}

// Compile-Zeit-Sicherstellung, dass AuthzRepository das CacheLoader-Interface implementiert.
var _ permissions.CacheLoader = (*AuthzRepository)(nil)

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

	// Schritt 1 lieferte Ergebnisse → versions-spezifischer Satz gilt (D-02/D-03).
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
