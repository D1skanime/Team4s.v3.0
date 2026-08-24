package repository

// Phase 139 Plan 05, Task 2 -- Batch resolver implementations AuthzRepository provides for
// permissions.Service.ResolveGroupRightsBatch (Task 1's façade, F-01/UADM-06). Each method
// here answers EVERY requested fansub_group_id in ONE query -- never one query per group,
// which is the exact anti-pattern RESEARCH.md names (moving the N+1 from HTTP to Postgres
// without fixing it). Kept in its own file rather than growing authz_permissions.go, which is
// already over CLAUDE.md's 450-line file-size cap (pre-existing Phase-137 debt, not grown
// further here).

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/permissions"
)

// ResolveActorGroupMembershipsForGroups implements permissions.GroupRightsMembershipBatchResolver
// -- the batched counterpart to ResolveActorGroupMembership (Plan 137-05, authz_permissions.go),
// answering EVERY requested group's active-membership fact in one query.
func (r *AuthzRepository) ResolveActorGroupMembershipsForGroups(
	ctx context.Context, appUserID int64, fansubGroupIDs []int64,
) (map[int64]*permissions.GroupMembershipState, error) {
	result := make(map[int64]*permissions.GroupMembershipState, len(fansubGroupIDs))
	if r == nil || r.db == nil || appUserID <= 0 || len(fansubGroupIDs) == 0 {
		return result, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT fansub_group_id, (status = 'active')
		FROM fansub_group_members
		WHERE app_user_id = $1 AND fansub_group_id = ANY($2::bigint[])
	`, appUserID, fansubGroupIDs)
	if err != nil {
		return nil, fmt.Errorf("resolve actor group memberships for groups app_user=%d: %w", appUserID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var groupID int64
		var active bool
		if err := rows.Scan(&groupID, &active); err != nil {
			return nil, fmt.Errorf("resolve actor group memberships for groups app_user=%d: scan: %w", appUserID, err)
		}
		result[groupID] = &permissions.GroupMembershipState{ActiveMembership: active}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve actor group memberships for groups app_user=%d: iterate: %w", appUserID, err)
	}
	return result, nil
}

// ResolveActorUserOverridesForGroups implements permissions.GroupRightsOverridesBatchResolver,
// delegating to the already-shipped AuthzUserOverridesRepository.LoadCurrentOverridesForGroups
// (Plan 139-05 Task 2, authz_user_overrides.go) rather than duplicating its query -- mirrors
// ResolveActorUserOverrides' identical single-group delegation pattern.
func (r *AuthzRepository) ResolveActorUserOverridesForGroups(
	ctx context.Context, appUserID int64, fansubGroupIDs []int64,
) (map[int64][]permissions.UserCapabilityOverride, error) {
	result := make(map[int64][]permissions.UserCapabilityOverride, len(fansubGroupIDs))
	if r == nil || r.db == nil || appUserID <= 0 || len(fansubGroupIDs) == 0 {
		return result, nil
	}

	byGroup, err := NewAuthzUserOverridesRepository(r.db).LoadCurrentOverridesForGroups(ctx, appUserID, fansubGroupIDs)
	if err != nil {
		return nil, err
	}
	for groupID, rows := range byGroup {
		overrides := make([]permissions.UserCapabilityOverride, 0, len(rows))
		for _, row := range rows {
			overrides = append(overrides, permissions.UserCapabilityOverride{
				ActionCode: permissions.Action(strings.TrimSpace(row.ActionCode)),
				Effect:     strings.TrimSpace(row.Effect),
			})
		}
		result[groupID] = overrides
	}
	return result, nil
}

// ResolveActorReviewGrantContextsForGroups is the batch sibling of
// ResolveActorReviewGrantContext (Plan 107, authz_permissions.go) -- same JOIN shape, but
// fgm.fansub_group_id = ANY($2::bigint[]) and GROUP BY fansub_group_id, dropping
// FOR SHARE OF fgm (read-only summary, no mutation follows this read).
func (r *AuthzRepository) ResolveActorReviewGrantContextsForGroups(
	ctx context.Context, appUserID int64, fansubGroupIDs []int64,
) (map[int64][]permissions.Action, error) {
	result := make(map[int64][]permissions.Action, len(fansubGroupIDs))
	if r == nil || r.db == nil || appUserID <= 0 || len(fansubGroupIDs) == 0 {
		return result, nil
	}

	rows, err := r.db.Query(ctx, `
		WITH locked_membership AS (
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
			  AND fgm.fansub_group_id = ANY($2::bigint[])
			  AND fgm.status = 'active'
			  AND fgm.member_id > 0
		)
		SELECT
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
		GROUP BY lm.fansub_group_id
	`, appUserID, fansubGroupIDs)
	if err != nil {
		return nil, fmt.Errorf("resolve actor review grant contexts for groups app_user=%d: %w", appUserID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var groupID int64
		var actionCodes []string
		if err := rows.Scan(&groupID, &actionCodes); err != nil {
			return nil, fmt.Errorf("resolve actor review grant contexts for groups app_user=%d: scan: %w", appUserID, err)
		}
		actions := make([]permissions.Action, 0, len(actionCodes))
		for _, code := range actionCodes {
			actions = append(actions, permissions.Action(strings.TrimSpace(code)))
		}
		result[groupID] = actions
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("resolve actor review grant contexts for groups app_user=%d: iterate: %w", appUserID, err)
	}
	return result, nil
}

// ResolveGroupGrantsForGroups implements permissions.SpecializedGrantBatchProvider, projecting
// ResolveActorReviewGrantContextsForGroups' granted action codes into SpecializedGrant entries
// -- the batched counterpart to reviewGrantProvider.ResolveGroupGrants
// (permissions/review_grant_provider.go), same "review_delegation" source string.
func (r *AuthzRepository) ResolveGroupGrantsForGroups(
	ctx context.Context, actorAppUserID int64, fansubGroupIDs []int64,
) (map[int64][]permissions.SpecializedGrant, error) {
	byGroup, err := r.ResolveActorReviewGrantContextsForGroups(ctx, actorAppUserID, fansubGroupIDs)
	if err != nil {
		return nil, err
	}
	result := make(map[int64][]permissions.SpecializedGrant, len(byGroup))
	for groupID, actions := range byGroup {
		grants := make([]permissions.SpecializedGrant, 0, len(actions))
		for _, action := range actions {
			grants = append(grants, permissions.SpecializedGrant{Action: action, Source: "review_delegation"})
		}
		result[groupID] = grants
	}
	return result, nil
}

// Compile-time assertions: AuthzRepository implements the three new optional batch interfaces
// permissions.Service.ResolveGroupRightsBatch discovers (Plan 139-05, closes the analogous
// 137-04/137-05 known-gap pattern for the batched path).
var (
	_ permissions.GroupRightsMembershipBatchResolver = (*AuthzRepository)(nil)
	_ permissions.GroupRightsOverridesBatchResolver   = (*AuthzRepository)(nil)
	_ permissions.SpecializedGrantBatchProvider        = (*AuthzRepository)(nil)
)
