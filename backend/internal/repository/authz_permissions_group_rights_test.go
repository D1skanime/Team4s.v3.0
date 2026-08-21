package repository

// Phase 137 Plan 05 -- proves AuthzRepository.ResolveActorGroupMembership and
// .ResolveActorUserOverrides (the production wiring closing 137-04-SUMMARY.md's
// documented "Known Gap") against a real PostgreSQL database, not just a Go
// fake. Without this wiring, ResolveGroupRights falls back to inferring
// active membership from a non-empty role set alone and always sees zero
// user overrides in production, even though the precedence engine itself
// (effective_rights.go) is correct.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/permissions"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPhase137ResolveActorGroupMembershipDistinguishesActiveInactiveAndNonMember
// proves ResolveActorGroupMembership reports true only for a genuinely active
// membership row, independent of whether that membership carries any role --
// exactly the fact ResolveGroupRights needs for D02's dormant-override model.
func TestPhase137ResolveActorGroupMembershipDistinguishesActiveInactiveAndNonMember(t *testing.T) {
	pool := openPhase137OverridesPool(t)
	ctx := context.Background()

	seedPhase137Membership(t, pool, 401, 91, 101, 111, "active", "active")
	seedPhase137Membership(t, pool, 402, 92, 101, 112, "active", "disabled")
	// Non-member: app_user 93 exists but has no fansub_group_members row for group 101.
	_, err := pool.Exec(ctx, `INSERT INTO app_users (id, status) VALUES (93, 'active')`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)

	active, err := repo.ResolveActorGroupMembership(ctx, 91, 101)
	require.NoError(t, err)
	require.NotNil(t, active)
	assert.True(t, active.ActiveMembership, "an active fansub_group_members row must report ActiveMembership=true even with zero assigned roles")

	inactive, err := repo.ResolveActorGroupMembership(ctx, 92, 101)
	require.NoError(t, err)
	require.NotNil(t, inactive)
	assert.False(t, inactive.ActiveMembership, "a disabled membership row must never report ActiveMembership=true")

	nonMember, err := repo.ResolveActorGroupMembership(ctx, 93, 101)
	require.NoError(t, err)
	require.NotNil(t, nonMember)
	assert.False(t, nonMember.ActiveMembership, "no membership row at all must report ActiveMembership=false, not error")

	// Manipulated/foreign group id for an otherwise-active member must not
	// resolve true (BOLA/IDOR-safe by construction, mirrors LockTargetMembership).
	foreignGroup, err := repo.ResolveActorGroupMembership(ctx, 91, 999)
	require.NoError(t, err)
	assert.False(t, foreignGroup.ActiveMembership)
}

// TestPhase137ResolveActorUserOverridesReturnsGroupScopedRowsOnly proves
// ResolveActorUserOverrides returns every current override for exactly one
// (app_user_id, fansub_group_id) pair, correctly typed as
// permissions.UserCapabilityOverride, with zero cross-group leakage --
// exercising the exact same underlying query as
// AuthzUserOverridesRepository.LoadCurrentOverrides through the production
// AuthzRepository seam ResolveGroupRights actually calls.
func TestPhase137ResolveActorUserOverridesReturnsGroupScopedRowsOnly(t *testing.T) {
	pool := openPhase137OverridesPool(t)
	ctx := context.Background()

	seedPhase137Membership(t, pool, 501, 111, 121, 131, "active", "active")
	seedPhase137Membership(t, pool, 501, 111, 122, 132, "active", "active")

	_, err := pool.Exec(ctx, `
		INSERT INTO user_group_capability_overrides
			(app_user_id, fansub_group_id, action_code, effect, created_by_app_user_id, updated_by_app_user_id)
		VALUES
			(111, 121, 'fansub_group_media.upload', 'deny', 111, 111),
			(111, 121, 'fansub_group_media.update', 'allow', 111, 111),
			(111, 122, 'fansub_group_media.upload', 'allow', 111, 111)
	`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)

	overrides, err := repo.ResolveActorUserOverrides(ctx, 111, 121)
	require.NoError(t, err)
	require.Len(t, overrides, 2, "foreign group 122's override row must never leak into group 121's result")

	byAction := make(map[permissions.Action]string, len(overrides))
	for _, o := range overrides {
		byAction[o.ActionCode] = o.Effect
	}
	assert.Equal(t, "deny", byAction[permissions.ActionFansubGroupMediaUpload])
	assert.Equal(t, "allow", byAction[permissions.ActionFansubGroupMediaUpdate])

	// No overrides at all for a valid actor/group pair must return an empty
	// slice, not an error.
	empty, err := repo.ResolveActorUserOverrides(ctx, 111, 122+1000)
	require.NoError(t, err)
	assert.Empty(t, empty)
}

// TestPhase137AuthzRepositoryImplementsGroupRightsOptionalInterfaces is a
// compile-time-adjacent runtime proof that the production Resolver type
// wired in cmd/server/main.go now satisfies both new optional interfaces
// ResolveGroupRights type-asserts against, closing the exact gap
// 137-04-SUMMARY.md flagged and instructed 137-05 to resolve.
func TestPhase137AuthzRepositoryImplementsGroupRightsOptionalInterfaces(t *testing.T) {
	var resolver permissions.Resolver = NewAuthzRepository(nil)
	_, membershipOK := resolver.(permissions.GroupRightsMembershipResolver)
	_, overridesOK := resolver.(permissions.GroupRightsOverridesResolver)
	assert.True(t, membershipOK, "AuthzRepository must implement GroupRightsMembershipResolver")
	assert.True(t, overridesOK, "AuthzRepository must implement GroupRightsOverridesResolver")
}
