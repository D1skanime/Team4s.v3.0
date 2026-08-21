package permissions

// Phase 137 Plan 05 — regression coverage proving every existing PUBLIC
// group-scoped enforcement entry point (CanForFansubGroup, CanForRelease,
// CanForReleaseVersion, CanForReleaseVersionMedia, CanReviewForFansubGroup)
// derives its group decision from ResolveGroupRights instead of running an
// independent, override-blind role loop (137-CONTEXT.md D01; 137-RESEARCH.md
// Pitfall 2 / Open Question 4).
//
// These tests exercise the PUBLIC methods directly (not ResolveGroupRights
// itself, which effective_rights_test.go already covers exhaustively) so a
// regression that reintroduces a parallel decision path inside permissions.go
// is caught even if ResolveGroupRights itself stays correct.

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// integrationFakeResolver is a full in-memory double covering every source
// category the public entry points under test may consult: role grants
// (Resolver), active-membership state (GroupRightsMembershipResolver), user
// overrides (GroupRightsOverridesResolver), specialized review-delegation
// grants (ReviewContextResolver) and contribution roles for the
// release-version fallback step (ListActorContributionRolesForVersion).
type integrationFakeResolver struct {
	fansubGroupID     int64
	roles             []string
	activeMembership  bool
	overrides         []UserCapabilityOverride
	reviewContext     *ReviewGrantContext
	ownerAppUserID    *int64
	contributionRoles []string
}

func (f *integrationFakeResolver) ResolveFansubGroup(context.Context, int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{f.fansubGroupID}}, nil
}

func (f *integrationFakeResolver) ResolveRelease(context.Context, int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{f.fansubGroupID}}, nil
}

func (f *integrationFakeResolver) ResolveReleaseVersion(context.Context, int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{f.fansubGroupID}}, nil
}

func (f *integrationFakeResolver) ResolveReleaseVersionMedia(context.Context, int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{f.fansubGroupID}, OwnerAppUserID: f.ownerAppUserID}, nil
}

func (f *integrationFakeResolver) ListActorGroupRoles(_ context.Context, _ int64, fansubGroupID int64) ([]string, error) {
	if fansubGroupID != f.fansubGroupID {
		return nil, nil
	}
	return f.roles, nil
}

func (f *integrationFakeResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return f.contributionRoles, nil
}

func (f *integrationFakeResolver) ResolveActorGroupMembership(_ context.Context, _ int64, fansubGroupID int64) (*GroupMembershipState, error) {
	if fansubGroupID != f.fansubGroupID {
		return &GroupMembershipState{ActiveMembership: false}, nil
	}
	return &GroupMembershipState{ActiveMembership: f.activeMembership}, nil
}

func (f *integrationFakeResolver) ResolveActorUserOverrides(_ context.Context, _ int64, fansubGroupID int64) ([]UserCapabilityOverride, error) {
	if fansubGroupID != f.fansubGroupID {
		return nil, nil
	}
	return f.overrides, nil
}

func (f *integrationFakeResolver) ResolveActorReviewGrantContext(_ context.Context, appUserID int64, fansubGroupID int64) (*ReviewGrantContext, error) {
	if f.reviewContext == nil || f.reviewContext.AppUserID != appUserID || f.reviewContext.FansubGroupID != fansubGroupID {
		return nil, nil
	}
	return f.reviewContext, nil
}

var (
	_ Resolver                      = (*integrationFakeResolver)(nil)
	_ GroupRightsMembershipResolver = (*integrationFakeResolver)(nil)
	_ GroupRightsOverridesResolver  = (*integrationFakeResolver)(nil)
	_ ReviewContextResolver         = (*integrationFakeResolver)(nil)
)

const integrationTestGroupID int64 = 88

// TestIntegrationCanForFansubGroupUserDenyOverridesRoleGrant proves a stored
// user_deny changes the result CanForFansubGroup returns even though the
// actor's group role would otherwise allow the action.
func TestIntegrationCanForFansubGroupUserDenyOverridesRoleGrant(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForFansubGroup(context.Background(), actor, ActionFansubGroupMediaUpload, integrationTestGroupID)
	require.NoError(t, err)

	assert.False(t, result.Allowed, "a stored user_deny must override an otherwise-granting group role")
	assert.Equal(t, ReasonCodeUserDeny, result.ReasonCode)
}

// TestIntegrationCanForFansubGroupUserAllowGrantsWithoutRole proves a stored
// user_allow grants access through CanForFansubGroup even with zero roles.
func TestIntegrationCanForFansubGroupUserAllowGrantsWithoutRole(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "allow"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForFansubGroup(context.Background(), actor, ActionFansubGroupMediaUpload, integrationTestGroupID)
	require.NoError(t, err)

	assert.True(t, result.Allowed, "a stored user_allow must grant access without any role")
	assert.Equal(t, ReasonAllowed, result.ReasonCode)
}

// TestIntegrationCanForFansubGroupRoleGrantStillWorksUnchanged is a
// regression-parity test: a plain role-based grant with zero overrides in
// play must keep returning exactly the pre-Phase-137 Result shape (D04's
// "existing Result shapes/reason behavior remain compatible" requirement).
func TestIntegrationCanForFansubGroupRoleGrantStillWorksUnchanged(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForFansubGroup(context.Background(), actor, ActionFansubGroupMembersManage, integrationTestGroupID)
	require.NoError(t, err)

	assert.True(t, result.Allowed)
	assert.Equal(t, ReasonAllowed, result.ReasonCode)
	assert.Equal(t, RoleFansubLead, result.MatchedRole)
	assert.Equal(t, "group:88", result.MatchedScope)
}

// TestIntegrationCanForReleaseUserDenyOverridesRoleGrant proves the same
// precedence applies to CanForRelease, which resolves to the group through
// ResolveRelease before delegating to the shared group-context path.
func TestIntegrationCanForReleaseUserDenyOverridesRoleGrant(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForRelease(context.Background(), actor, ActionFansubGroupMediaUpload, 500)
	require.NoError(t, err)

	assert.False(t, result.Allowed, "CanForRelease must honor a stored user_deny for its resolved group")
	assert.Equal(t, ReasonCodeUserDeny, result.ReasonCode)
}

// TestIntegrationCanForReleaseVersionMediaUserDenyOverridesRoleGrant proves
// the same precedence applies to CanForReleaseVersionMedia.
func TestIntegrationCanForReleaseVersionMediaUserDenyOverridesRoleGrant(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForReleaseVersionMedia(context.Background(), actor, ActionFansubGroupMediaUpload, 700)
	require.NoError(t, err)

	assert.False(t, result.Allowed, "CanForReleaseVersionMedia must honor a stored user_deny for its resolved group")
	assert.Equal(t, ReasonCodeUserDeny, result.ReasonCode)
}

// TestIntegrationCanForReleaseVersionGroupRoleStepUserDenyOverridesRoleGrant
// proves CanForReleaseVersion's group-role step (step 2, the shared
// group-context path) becomes override-aware, even though its contribution-role
// fallback (step 3) remains its own, separate, unchanged domain per the
// plan's minimal-edit scope.
func TestIntegrationCanForReleaseVersionGroupRoleStepUserDenyOverridesRoleGrant(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForReleaseVersion(context.Background(), actor, ActionFansubGroupMediaUpload, 900)
	require.NoError(t, err)

	assert.False(t, result.Allowed, "CanForReleaseVersion's group-role step must honor a stored user_deny")
	assert.Equal(t, ReasonCodeUserDeny, result.ReasonCode)
}

// TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny
// is GAP-06's (137-UAT.md) regression test. Unlike the test above (whose fake
// resolver leaves contributionRoles nil/empty and therefore never reaches Step
// 3), this test populates contributionRoles with a role code that independently
// satisfies roleAllows(code, action) for the SAME action Step 2's stored
// user_deny targets -- i.e. it actually exercises the conflict: Step 2 is
// user_deny AND Step 3 would independently grant.
//
// 137-12-PLAN.md's investigation (see permissions.go's Step-3 comment in
// CanForReleaseVersion) found that 137-CONTEXT.md's D01 precedence list and its
// Section 2 binding Phase-136 rules never mention "contribution role" as a
// resolver source category at all -- this is Fall C (an unresolved design
// question), not Fall A or Fall B. Per 137-UAT.md's explicit instruction not to
// resolve this unilaterally, this test proves and locks TODAY'S ACTUAL,
// UNCHANGED behavior: a stored user_deny does not currently block the
// contribution-role fallback. See 137-12-SUMMARY.md's
// "DECISION REQUIRED — Contribution Role vs User Deny" section.
func TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
		contributionRoles: []string{RoleProjectLead},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForReleaseVersion(context.Background(), actor, ActionFansubGroupMediaUpload, 900)
	require.NoError(t, err)

	assert.True(t, result.Allowed, "Fall C: contribution-role fallback (Step 3) is not currently blocked by Step 2's stored user_deny")
	assert.Equal(t, ReasonAllowed, result.ReasonCode)
	assert.Equal(t, RoleProjectLead, result.MatchedRole)
}

// TestIntegrationCanForReleaseVersionGroupRoleStepUserAllowGrantsWithoutRole
// proves the positive direction for CanForReleaseVersion's group-role step.
func TestIntegrationCanForReleaseVersionGroupRoleStepUserAllowGrantsWithoutRole(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "allow"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForReleaseVersion(context.Background(), actor, ActionFansubGroupMediaUpload, 900)
	require.NoError(t, err)

	assert.True(t, result.Allowed, "CanForReleaseVersion's group-role step must honor a stored user_allow")
	assert.Equal(t, ReasonAllowed, result.ReasonCode)
}

// TestIntegrationCanReviewForFansubGroupUserDenyOverridesDelegatedGrant
// proves a review.*.decide user-deny changes CanReviewForFansubGroup even
// when Review Delegation independently grants the same action.
func TestIntegrationCanReviewForFansubGroupUserDenyOverridesDelegatedGrant(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionReviewTextDecide, Effect: "deny"},
		},
		reviewContext: &ReviewGrantContext{
			MembershipID: 700, AppUserID: 10, MemberID: 701, FansubGroupID: integrationTestGroupID,
			GrantedActions: []Action{ActionReviewTextDecide},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanReviewForFansubGroup(context.Background(), actor, ActionReviewTextDecide, integrationTestGroupID)
	require.NoError(t, err)

	assert.False(t, result.Allowed, "a personal user-deny must override an existing review delegation grant")
	assert.Equal(t, ReasonCodeUserDeny, result.ReasonCode)
}

// TestIntegrationCanReviewForFansubGroupRoleGrantStillWorksUnchanged is a
// regression-parity test for CanReviewForFansubGroup's role-based path.
func TestIntegrationCanReviewForFansubGroupRoleGrantStillWorksUnchanged(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		reviewContext: &ReviewGrantContext{
			MembershipID: 700, AppUserID: 10, MemberID: 701, FansubGroupID: integrationTestGroupID,
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanReviewForFansubGroup(context.Background(), actor, ActionReviewTextDecide, integrationTestGroupID)
	require.NoError(t, err)

	assert.True(t, result.Allowed)
	assert.Equal(t, ReasonAllowed, result.ReasonCode)
	assert.Equal(t, RoleFansubLead, result.MatchedRole)
	assert.EqualValues(t, 700, result.MembershipID)
	assert.EqualValues(t, 701, result.MemberID)
}

// TestIntegrationPlatformAdminBypassesUserDenyAcrossEntryPoints proves
// platform-admin behavior stays unchanged (non-deniable) for both
// CanForFansubGroup and CanReviewForFansubGroup even against a stored
// user_deny.
func TestIntegrationPlatformAdminBypassesUserDenyAcrossEntryPoints(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID: integrationTestGroupID,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
			{ActionCode: ActionReviewTextDecide, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active", IsPlatformAdmin: true}

	groupResult, err := service.CanForFansubGroup(context.Background(), actor, ActionFansubGroupMediaUpload, integrationTestGroupID)
	require.NoError(t, err)
	assert.True(t, groupResult.Allowed)
	assert.Equal(t, ReasonPlatformAdmin, groupResult.ReasonCode)
	assert.Equal(t, RolePlatformAdmin, groupResult.MatchedRole)

	reviewResult, err := service.CanReviewForFansubGroup(context.Background(), actor, ActionReviewTextDecide, integrationTestGroupID)
	require.NoError(t, err)
	assert.True(t, reviewResult.Allowed)
	assert.Equal(t, ReasonPlatformAdmin, reviewResult.ReasonCode)
}

// TestIntegrationCanForReleaseVersionMediaDeleteOwnStillRequiresRoleAndOwnership
// is a regression-parity test proving the delete_own owner-gated path (never
// part of the migration-0150 overridable pilot set) keeps its exact prior
// behavior after the canForContext rewrite.
func TestIntegrationCanForReleaseVersionMediaDeleteOwnStillRequiresRoleAndOwnership(t *testing.T) {
	owner := int64(12)
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleDesigner},
		activeMembership: true,
		ownerAppUserID:   &owner,
	}
	service := NewService(resolver)

	allowed, err := service.CanForReleaseVersionMediaDelete(context.Background(), Actor{AppUserID: 12, Status: "active"}, 99)
	require.NoError(t, err)
	assert.True(t, allowed.Allowed, "owner with delete_own-granting role must still be allowed")

	denied, err := service.CanForReleaseVersionMediaDelete(context.Background(), Actor{AppUserID: 77, Status: "active"}, 99)
	require.NoError(t, err)
	assert.False(t, denied.Allowed, "non-owner must still be denied")
	assert.Equal(t, ReasonOwnerMismatch, denied.ReasonCode)
}
