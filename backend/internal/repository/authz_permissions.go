package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/permissions"
)

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
