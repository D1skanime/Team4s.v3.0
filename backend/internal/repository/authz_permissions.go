package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
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
		SELECT DISTINCT rvg.fansub_group_id, e.anime_id
		FROM release_version_groups rvg
		JOIN release_versions rv ON rv.id = rvg.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		WHERE rvg.release_version_id = $1
		ORDER BY rvg.fansub_group_id
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("resolve release version %d: %w", releaseVersionID, err)
	}
	defer rows.Close()

	groupIDs := make([]int64, 0)
	var animeID int64
	for rows.Next() {
		var groupID int64
		if err := rows.Scan(&groupID, &animeID); err != nil {
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
		AnimeID:        &animeID,
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

func (r *AuthzRepository) ResolveActorReviewGrantContext(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
) (*permissions.ReviewGrantContext, error) {
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	var resolved permissions.ReviewGrantContext
	var grantedActionCodes []string
	err := r.db.QueryRow(ctx, `
		WITH locked_membership AS MATERIALIZED (
			SELECT
				fgm.id AS membership_id,
				fgm.app_user_id,
				fgm.member_id,
				fgm.fansub_group_id
			FROM fansub_group_members fgm
			JOIN app_users au
			  ON au.id = fgm.app_user_id
			 AND au.status = 'active'
			JOIN member_claims mc
			  ON mc.app_user_id = fgm.app_user_id
			 AND mc.member_id = fgm.member_id
			 AND mc.claim_status = 'verified'
			WHERE fgm.app_user_id = $1
			  AND fgm.fansub_group_id = $2
			  AND fgm.status = 'active'
			  AND fgm.member_id > 0
			FOR SHARE OF fgm
		)
		SELECT
			lm.membership_id,
			lm.app_user_id,
			lm.member_id,
			lm.fansub_group_id,
			COALESCE(
				ARRAY_AGG(cap.action_code ORDER BY cap.action_code)
					FILTER (WHERE cap.action_code IS NOT NULL),
				ARRAY[]::TEXT[]
			)
		FROM locked_membership lm
		LEFT JOIN fansub_group_member_review_capabilities cap
		  ON cap.fansub_group_member_id = lm.membership_id
		 AND cap.action_code IN (
			'review.text.decide',
			'review.image.decide',
			'review.contribution.decide'
		 )
		GROUP BY
			lm.membership_id,
			lm.app_user_id,
			lm.member_id,
			lm.fansub_group_id
	`, appUserID, fansubGroupID).Scan(
		&resolved.MembershipID,
		&resolved.AppUserID,
		&resolved.MemberID,
		&resolved.FansubGroupID,
		&grantedActionCodes,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf(
			"resolve actor review grant context app_user=%d fansub_group=%d: %w",
			appUserID,
			fansubGroupID,
			err,
		)
	}

	resolved.GrantedActions = make([]permissions.Action, 0, len(grantedActionCodes))
	for _, actionCode := range grantedActionCodes {
		resolved.GrantedActions = append(resolved.GrantedActions, permissions.Action(strings.TrimSpace(actionCode)))
	}
	return &resolved, nil
}

func (r *AuthzRepository) ResolveVerifiedActorMemberIDs(
	ctx context.Context,
	appUserID int64,
) ([]int64, error) {
	if r == nil || r.db == nil || appUserID <= 0 {
		return []int64{}, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT member_id
		FROM member_claims
		WHERE app_user_id = $1
		  AND claim_status = 'verified'
		  AND member_id > 0
		ORDER BY member_id
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("resolve verified actor member ids app_user=%d: %w", appUserID, err)
	}
	defer rows.Close()

	memberIDs := make([]int64, 0)
	for rows.Next() {
		var memberID int64
		if err := rows.Scan(&memberID); err != nil {
			return nil, fmt.Errorf("resolve verified actor member ids app_user=%d: scan: %w", appUserID, err)
		}
		memberIDs = append(memberIDs, memberID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve verified actor member ids app_user=%d: iterate: %w", appUserID, err)
	}
	return memberIDs, nil
}

var _ permissions.ReviewContextResolver = (*AuthzRepository)(nil)

// ResolveActorGroupMembership implements permissions.GroupRightsMembershipResolver
// (Plan 137-05). It answers the exact D02 dormant-override question
// ResolveGroupRights needs -- "is this actor currently an ACTIVE member of
// this fansub group" -- independent of whether that membership carries any
// assigned role, so a verified active member with zero roles is no longer
// indistinguishable from "no membership" through the len(roles)>0 fallback
// ResolveGroupRights otherwise uses (see effective_rights.go's file-level
// doc comment and 137-04-SUMMARY.md's "Known Gap"). This closes that gap
// for real production HTTP traffic: 137-05 is the first plan that routes
// existing Can* entry points through ResolveGroupRights.
func (r *AuthzRepository) ResolveActorGroupMembership(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
) (*permissions.GroupMembershipState, error) {
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 {
		return &permissions.GroupMembershipState{ActiveMembership: false}, nil
	}

	var active bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM fansub_group_members
			WHERE app_user_id = $1
			  AND fansub_group_id = $2
			  AND status = 'active'
		)
	`, appUserID, fansubGroupID).Scan(&active); err != nil {
		return nil, fmt.Errorf(
			"resolve actor group membership app_user=%d fansub_group=%d: %w",
			appUserID, fansubGroupID, err,
		)
	}

	return &permissions.GroupMembershipState{ActiveMembership: active}, nil
}

// ResolveActorUserOverrides implements permissions.GroupRightsOverridesResolver
// (Plan 137-05), giving ResolveGroupRights the real, currently-stored
// per-user allow/deny rows for one (actor, fansubGroupID) pair in a single
// batched read. This delegates to the already-shipped, Plan-137-03
// AuthzUserOverridesRepository.LoadCurrentOverrides rather than duplicating
// its query -- AuthzDBTX (Exec+Query+QueryRow) is a superset of
// authzUserOverridesDBTX (DBTX+Query), so r.db can be reused directly on
// both a pool and a caller-owned transaction.
func (r *AuthzRepository) ResolveActorUserOverrides(
	ctx context.Context,
	appUserID int64,
	fansubGroupID int64,
) ([]permissions.UserCapabilityOverride, error) {
	if r == nil || r.db == nil || appUserID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	rows, err := NewAuthzUserOverridesRepository(r.db).LoadCurrentOverrides(ctx, appUserID, fansubGroupID)
	if err != nil {
		return nil, err
	}

	overrides := make([]permissions.UserCapabilityOverride, 0, len(rows))
	for _, row := range rows {
		overrides = append(overrides, permissions.UserCapabilityOverride{
			ActionCode: permissions.Action(strings.TrimSpace(row.ActionCode)),
			Effect:     strings.TrimSpace(row.Effect),
		})
	}
	return overrides, nil
}

// Compile-Zeit-Assertion: AuthzRepository implementiert die beiden neuen
// optionalen ResolveGroupRights-Interfaces (Plan 137-05, schließt die in
// 137-04-SUMMARY.md dokumentierte Known-Gap-Lücke).
var (
	_ permissions.GroupRightsMembershipResolver = (*AuthzRepository)(nil)
	_ permissions.GroupRightsOverridesResolver  = (*AuthzRepository)(nil)
)

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

// LoadFansubGroupRoles lädt alle Rollen, die in aktiven Gruppen-/Arbeitskontexten
// als Gruppenmitglied-Rolle gespeichert werden dürfen. Reine Spezialfälle ohne
// aktiven Kontext bleiben draußen; historische offene Rollen können so beim
// Verknüpfen eines App-Mitglieds übernommen werden.
// Implementiert das permissions.CatalogLoader-Interface für den Startup-Load (D-12).
func (r *AuthzRepository) LoadFansubGroupRoles(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT code FROM role_definitions
		WHERE assignable = true
		   OR 'fansub_group' = ANY(contexts)
		   OR 'anime_contribution' = ANY(contexts)
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
