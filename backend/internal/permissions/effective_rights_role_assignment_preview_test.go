package permissions

// Phase 138 Plan 04 — unit tests for PreviewGroupRightsWithRoleChange (138-CONTEXT.md D-22).
//
// Pure Go, no Postgres: PreviewGroupRightsWithRoleChange's only dependency is s.resolver,
// faked exactly like effective_rights_test.go's effectiveRightsFakeResolver already does.

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const previewTestGroupID int64 = 88

// TestPreviewGroupRightsWithRoleChangeAddGrantsNewAction proves the "gained" case: adding a
// role that grants action X flips X's Allowed from false to true in `after` when no other
// source already grants it.
func TestPreviewGroupRightsWithRoleChangeAddGrantsNewAction(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	before, after, err := service.PreviewGroupRightsWithRoleChange(context.Background(), actor, previewTestGroupID, RoleFansubLead, true)
	require.NoError(t, err)

	beforeState := before.Can(ActionFansubGroupEdit)
	assert.False(t, beforeState.Allowed, "before: no role assigned yet, action must be denied")

	afterState := after.Can(ActionFansubGroupEdit)
	assert.True(t, afterState.Allowed, "after: adding a granting role must flip Allowed to true")
	assert.Equal(t, ProvenanceGroupRole, afterState.DecisiveSource)
	assert.Contains(t, afterState.GrantingRoles, RoleFansubLead)
}

// TestPreviewGroupRightsWithRoleChangeAddRedundantRoleKeepsExistingGrantingRole proves D-22's
// "behalten über eine andere Rolle" case: adding a role that grants an action the user
// ALREADY has via another role leaves after.Allowed true with the OTHER role still listed in
// GrantingRoles.
func TestPreviewGroupRightsWithRoleChangeAddRedundantRoleKeepsExistingGrantingRole(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleProjectLead},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	before, after, err := service.PreviewGroupRightsWithRoleChange(context.Background(), actor, previewTestGroupID, RoleFansubLead, true)
	require.NoError(t, err)

	beforeState := before.Can(ActionFansubGroupEdit)
	assert.True(t, beforeState.Allowed, "before: RoleProjectLead already grants this action")
	assert.Contains(t, beforeState.GrantingRoles, RoleProjectLead)

	afterState := after.Can(ActionFansubGroupEdit)
	assert.True(t, afterState.Allowed, "after: still allowed, retained via the other role")
	assert.Contains(t, afterState.GrantingRoles, RoleProjectLead, "the pre-existing granting role must remain visible")
	assert.Contains(t, afterState.GrantingRoles, RoleFansubLead, "the newly added role also grants and must be visible")
}

// TestPreviewGroupRightsWithRoleChangeRemoveOnlyGrantingRoleDenies proves the "lost" case:
// removing the user's only role granting action Y flips Y's Allowed to false in `after`.
func TestPreviewGroupRightsWithRoleChangeRemoveOnlyGrantingRoleDenies(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	before, after, err := service.PreviewGroupRightsWithRoleChange(context.Background(), actor, previewTestGroupID, RoleFansubLead, false)
	require.NoError(t, err)

	beforeState := before.Can(ActionFansubGroupEdit)
	assert.True(t, beforeState.Allowed)

	afterState := after.Can(ActionFansubGroupEdit)
	assert.False(t, afterState.Allowed, "after: removing the only granting role must deny")
	assert.Equal(t, ProvenanceNoGrant, afterState.DecisiveSource)
	assert.Empty(t, afterState.GrantingRoles)
}

// TestPreviewGroupRightsWithRoleChangeRemoveOneOfTwoGrantingRolesRetainsAccess mirrors D-16's
// guided-revoke narrative for role removal: removing one of two roles both granting action Y
// leaves Y Allowed true in `after` -- the honest "no full removal" case.
func TestPreviewGroupRightsWithRoleChangeRemoveOneOfTwoGrantingRolesRetainsAccess(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead, RoleProjectLead},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	before, after, err := service.PreviewGroupRightsWithRoleChange(context.Background(), actor, previewTestGroupID, RoleFansubLead, false)
	require.NoError(t, err)

	beforeState := before.Can(ActionFansubGroupEdit)
	assert.True(t, beforeState.Allowed)
	assert.ElementsMatch(t, []string{RoleFansubLead, RoleProjectLead}, beforeState.GrantingRoles)

	afterState := after.Can(ActionFansubGroupEdit)
	assert.True(t, afterState.Allowed, "after: still allowed via the remaining role, this is the honest 'no full removal' case")
	assert.NotContains(t, afterState.GrantingRoles, RoleFansubLead)
	assert.Contains(t, afterState.GrantingRoles, RoleProjectLead)
}

// TestPreviewGroupRightsWithRoleChangePlatformAdminReturnsUnchanged proves the fast-path
// passthrough: a platform-admin target returns before==after unchanged (a role change is
// meaningless for a platform admin).
func TestPreviewGroupRightsWithRoleChangePlatformAdminReturnsUnchanged(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: false,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active", IsPlatformAdmin: true}

	before, after, err := service.PreviewGroupRightsWithRoleChange(context.Background(), actor, previewTestGroupID, RoleFansubLead, true)
	require.NoError(t, err)

	beforeState := before.Can(ActionFansubGroupEdit)
	afterState := after.Can(ActionFansubGroupEdit)
	assert.Equal(t, beforeState, afterState, "platform admin: role change must be a no-op, before and after identical")
	assert.True(t, afterState.Allowed)
	assert.Equal(t, ProvenancePlatformAdmin, afterState.DecisiveSource)
}

// TestPreviewGroupRightsWithRoleChangeDisabledActorReturnsUnchanged mirrors the disabled-
// actor fast-path case: before==after, both denied.
func TestPreviewGroupRightsWithRoleChangeDisabledActorReturnsUnchanged(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "disabled"}

	before, after, err := service.PreviewGroupRightsWithRoleChange(context.Background(), actor, previewTestGroupID, RoleProjectLead, true)
	require.NoError(t, err)

	beforeState := before.Can(ActionFansubGroupEdit)
	afterState := after.Can(ActionFansubGroupEdit)
	assert.Equal(t, beforeState, afterState, "disabled actor: role change must be a no-op, before and after identical")
	assert.False(t, afterState.Allowed)
}
