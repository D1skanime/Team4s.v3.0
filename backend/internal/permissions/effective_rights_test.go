package permissions

// Phase 137 Plan 04 — pure-Go precedence/provenance matrix for the central
// GroupRightsResolution/ResolveGroupRights resolver (137-CONTEXT.md D01-D05).
//
// These tests exercise the full ResolveGroupRights orchestration (not only the internal
// evaluator) against an in-memory effectiveRightsFakeResolver that implements every
// optional interface the resolver consults (GroupRightsMembershipResolver,
// GroupRightsOverridesResolver, ReviewContextResolver) so the batch-loading wiring itself
// is proven, not just the precedence switch. No HTTP/DB is touched.

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// effectiveRightsFakeResolver is a full in-memory double covering every source category
// ResolveGroupRights batch-loads: role grants (Resolver), active-membership state
// (GroupRightsMembershipResolver), user overrides (GroupRightsOverridesResolver) and
// specialized review-delegation grants (ReviewContextResolver, already an established
// interface implemented in production by AuthzRepository).
type effectiveRightsFakeResolver struct {
	roles            []string
	activeMembership bool
	overrides        []UserCapabilityOverride
	reviewContext    *ReviewGrantContext
}

func (f *effectiveRightsFakeResolver) ResolveFansubGroup(context.Context, int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}}, nil
}

func (f *effectiveRightsFakeResolver) ResolveRelease(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *effectiveRightsFakeResolver) ResolveReleaseVersion(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *effectiveRightsFakeResolver) ResolveReleaseVersionMedia(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *effectiveRightsFakeResolver) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return f.roles, nil
}

func (f *effectiveRightsFakeResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

func (f *effectiveRightsFakeResolver) ResolveActorGroupMembership(_ context.Context, _ int64, _ int64) (*GroupMembershipState, error) {
	return &GroupMembershipState{ActiveMembership: f.activeMembership}, nil
}

func (f *effectiveRightsFakeResolver) ResolveActorUserOverrides(_ context.Context, _ int64, _ int64) ([]UserCapabilityOverride, error) {
	return f.overrides, nil
}

func (f *effectiveRightsFakeResolver) ResolveActorReviewGrantContext(_ context.Context, appUserID int64, fansubGroupID int64) (*ReviewGrantContext, error) {
	if f.reviewContext == nil {
		return nil, nil
	}
	return f.reviewContext, nil
}

var (
	_ Resolver                       = (*effectiveRightsFakeResolver)(nil)
	_ GroupRightsMembershipResolver  = (*effectiveRightsFakeResolver)(nil)
	_ GroupRightsOverridesResolver   = (*effectiveRightsFakeResolver)(nil)
	_ ReviewContextResolver          = (*effectiveRightsFakeResolver)(nil)
)

const effectiveRightsTestGroupID int64 = 88

func TestResolveGroupRightsPlatformAdminAlwaysAllowsNonDeniable(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: false,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active", IsPlatformAdmin: true}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupMediaUpload)
	assert.True(t, state.Allowed, "platform_admin must be non-deniable even against a stored user_deny")
	assert.Equal(t, ProvenancePlatformAdmin, state.DecisiveSource)
	assert.Equal(t, ReasonPlatformAdmin, state.ReasonCode)
	assert.True(t, state.NonDeniable)
}

func TestResolveGroupRightsDisabledActorDenies(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "disabled"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupMediaUpload)
	assert.False(t, state.Allowed)
	assert.Equal(t, ReasonDisabledUser, state.ReasonCode)
	assert.Equal(t, ProvenanceNoGrant, state.DecisiveSource)
	assert.False(t, state.NonDeniable)
}

func TestResolveGroupRightsNoActiveMembershipDeniesDespiteDormantAllow(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: false,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "allow"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupMediaUpload)
	assert.False(t, state.Allowed, "a dormant user_allow must not grant access without active membership")
	assert.Equal(t, ReasonNoMembership, state.ReasonCode)
	assert.Equal(t, ProvenanceNoGrant, state.DecisiveSource)
	assert.True(t, state.UserAllow, "the dormant override must still be visible as stored data (D02)")
}

func TestResolveGroupRightsUserDenyBeatsAllowRoleAndSpecializedGrant(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionReviewTextDecide, Effect: "deny"},
		},
		reviewContext: &ReviewGrantContext{
			MembershipID: 700, AppUserID: 10, MemberID: 701, FansubGroupID: effectiveRightsTestGroupID,
			GrantedActions: []Action{ActionReviewTextDecide},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionReviewTextDecide)
	assert.False(t, state.Allowed)
	assert.Equal(t, ProvenanceUserDeny, state.DecisiveSource)
	assert.Equal(t, ReasonCodeUserDeny, state.ReasonCode)
	assert.Contains(t, state.GrantingRoles, RoleFansubLead, "losing role-grant provenance must remain visible")
	assert.Contains(t, state.SpecializedGrants, reviewDelegationGrantSource, "losing specialized-grant provenance must remain visible")
}

func TestResolveGroupRightsUserAllowGrantsWithoutRoleWithActiveMembership(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "allow"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupMediaUpload)
	assert.True(t, state.Allowed)
	assert.Equal(t, ProvenanceUserAllow, state.DecisiveSource)
	assert.Empty(t, state.GrantingRoles)
}

func TestResolveGroupRightsMultipleRoleGrantsAreORCombinedAndVisible(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead, RoleProjectLead},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupMediaUpload)
	assert.True(t, state.Allowed)
	assert.Equal(t, ProvenanceGroupRole, state.DecisiveSource)
	assert.ElementsMatch(t, []string{RoleFansubLead, RoleProjectLead}, state.GrantingRoles)
}

func TestResolveGroupRightsSpecializedGrantAllowsOnlyWithoutHigherPrecedenceDeny(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: true,
		reviewContext: &ReviewGrantContext{
			MembershipID: 700, AppUserID: 10, MemberID: 701, FansubGroupID: effectiveRightsTestGroupID,
			GrantedActions: []Action{ActionReviewImageDecide},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionReviewImageDecide)
	assert.True(t, state.Allowed)
	assert.Equal(t, ProvenanceSpecializedGrant, state.DecisiveSource)
	assert.Equal(t, ReasonCodeSpecializedGrant, state.ReasonCode)
	assert.Contains(t, state.SpecializedGrants, reviewDelegationGrantSource)
}

func TestResolveGroupRightsDefaultDenyDeterministicReasonAndSource(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleDesigner},
		activeMembership: true,
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupHistoricalMembersManage)
	assert.False(t, state.Allowed)
	assert.Equal(t, ProvenanceNoGrant, state.DecisiveSource)
	assert.Equal(t, ReasonCodeNoGrant, state.ReasonCode)
	assert.Empty(t, state.GrantingRoles)
	assert.Empty(t, state.SpecializedGrants)
	assert.False(t, state.UserAllow)
	assert.False(t, state.UserDeny)
}

func TestResolveGroupRightsProvenancePreservesLosingLowerPrecedenceSources(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead},
		activeMembership: false,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "allow"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupMediaUpload)
	assert.False(t, state.Allowed)
	assert.Equal(t, ReasonNoMembership, state.ReasonCode)
	assert.True(t, state.UserAllow, "losing user-allow provenance must remain visible even though membership denies")
	assert.Contains(t, state.GrantingRoles, RoleFansubLead, "losing role-grant provenance must remain visible even though membership denies")
}

func TestResolveGroupRightsReactivatedMembershipRestoresRetainedOverride(t *testing.T) {
	overrides := []UserCapabilityOverride{{ActionCode: ActionFansubGroupMediaUpload, Effect: "allow"}}
	actor := Actor{AppUserID: 10, Status: "active"}

	dormantService := NewService(&effectiveRightsFakeResolver{activeMembership: false, overrides: overrides})
	dormant, err := dormantService.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)
	assert.False(t, dormant.Can(ActionFansubGroupMediaUpload).Allowed)

	reactivatedService := NewService(&effectiveRightsFakeResolver{activeMembership: true, overrides: overrides})
	reactivated, err := reactivatedService.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)
	state := reactivated.Can(ActionFansubGroupMediaUpload)
	assert.True(t, state.Allowed)
	assert.Equal(t, ProvenanceUserAllow, state.DecisiveSource)
}

func TestResolveGroupRightsAmbiguousUserAllowAndDenyResolvesDenyDeterministically(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "allow"},
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionFansubGroupMediaUpload)
	assert.False(t, state.Allowed, "an ambiguous stored allow+deny representation must deterministically deny")
	assert.Equal(t, ProvenanceUserDeny, state.DecisiveSource)
	assert.True(t, state.UserAllow)
	assert.True(t, state.UserDeny)
}

func TestResolveGroupRightsNegativeSecurityMatrix(t *testing.T) {
	action := ActionFansubGroupMediaUpload // user_overridable=true pilot action (migration 0150)

	tests := []struct {
		name             string
		actor            Actor
		roles            []string
		activeMembership bool
		overrides        []UserCapabilityOverride
		wantAllowed      bool
		wantDecisive     string
	}{
		{
			name:             "one role grants capability",
			actor:            Actor{AppUserID: 10, Status: "active"},
			roles:            []string{RoleFansubLead},
			activeMembership: true,
			wantAllowed:      true,
			wantDecisive:     ProvenanceGroupRole,
		},
		{
			name:             "multiple roles, one grants",
			actor:            Actor{AppUserID: 10, Status: "active"},
			roles:            []string{RoleTranslator, RoleFansubLead},
			activeMembership: true,
			wantAllowed:      true,
			wantDecisive:     ProvenanceGroupRole,
		},
		{
			name:             "role grant + user allow",
			actor:            Actor{AppUserID: 10, Status: "active"},
			roles:            []string{RoleFansubLead},
			activeMembership: true,
			overrides:        []UserCapabilityOverride{{ActionCode: action, Effect: "allow"}},
			wantAllowed:      true,
			wantDecisive:     ProvenanceUserAllow,
		},
		{
			name:             "role grant + user deny",
			actor:            Actor{AppUserID: 10, Status: "active"},
			roles:            []string{RoleFansubLead},
			activeMembership: true,
			overrides:        []UserCapabilityOverride{{ActionCode: action, Effect: "deny"}},
			wantAllowed:      false,
			wantDecisive:     ProvenanceUserDeny,
		},
		{
			name:             "no role grant + user allow",
			actor:            Actor{AppUserID: 10, Status: "active"},
			activeMembership: true,
			overrides:        []UserCapabilityOverride{{ActionCode: action, Effect: "allow"}},
			wantAllowed:      true,
			wantDecisive:     ProvenanceUserAllow,
		},
		{
			name:             "platform admin + user deny",
			actor:            Actor{AppUserID: 10, Status: "active", IsPlatformAdmin: true},
			activeMembership: false,
			overrides:        []UserCapabilityOverride{{ActionCode: action, Effect: "deny"}},
			wantAllowed:      true,
			wantDecisive:     ProvenancePlatformAdmin,
		},
		{
			name:             "disabled user + role grant",
			actor:            Actor{AppUserID: 10, Status: "disabled"},
			roles:            []string{RoleFansubLead},
			activeMembership: true,
			wantAllowed:      false,
			wantDecisive:     ProvenanceNoGrant,
		},
		{
			name:             "inactive membership + stored user allow",
			actor:            Actor{AppUserID: 10, Status: "active"},
			activeMembership: false,
			overrides:        []UserCapabilityOverride{{ActionCode: action, Effect: "allow"}},
			wantAllowed:      false,
			wantDecisive:     ProvenanceNoGrant,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			resolver := &effectiveRightsFakeResolver{
				roles:            tc.roles,
				activeMembership: tc.activeMembership,
				overrides:        tc.overrides,
			}
			service := NewService(resolver)

			res, err := service.ResolveGroupRights(context.Background(), tc.actor, effectiveRightsTestGroupID)
			require.NoError(t, err)

			state := res.Can(action)
			assert.Equal(t, tc.wantAllowed, state.Allowed)
			assert.Equal(t, tc.wantDecisive, state.DecisiveSource)
		})
	}
}

// TestReviewGrantProviderUserDenyOverridesDelegatedGrant proves D05's explicit
// requirement in isolation (no role in play at all): a personal User-Deny still wins over
// an existing Review Delegation grant, and the losing review_delegation source remains
// visible in provenance.
func TestReviewGrantProviderUserDenyOverridesDelegatedGrant(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionReviewContributionDecide, Effect: "deny"},
		},
		reviewContext: &ReviewGrantContext{
			MembershipID: 700, AppUserID: 10, MemberID: 701, FansubGroupID: effectiveRightsTestGroupID,
			GrantedActions: []Action{ActionReviewContributionDecide},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	res, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	state := res.Can(ActionReviewContributionDecide)
	assert.False(t, state.Allowed, "a personal user-deny must override an existing review delegation grant (D01)")
	assert.Equal(t, ProvenanceUserDeny, state.DecisiveSource)
	assert.Empty(t, state.GrantingRoles)
	assert.Contains(t, state.SpecializedGrants, reviewDelegationGrantSource, "the losing review_delegation grant must remain visible in provenance")
}

func TestReviewGrantProviderSourceIsReviewDelegation(t *testing.T) {
	provider := newReviewGrantProvider(&effectiveRightsFakeResolver{})
	require.NotNil(t, provider)
	assert.Equal(t, "review_delegation", provider.Source())
}

func TestReviewGrantProviderNilResolverReturnsNilProvider(t *testing.T) {
	assert.Nil(t, newReviewGrantProvider(nil))
}
