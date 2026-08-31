package permissions

// Phase 138 Plan 07 — unit tests for PreviewGroupRightsCapabilityChange /
// evaluateGroupRightsWithHypotheticalGrant (138-CONTEXT.md CAP-09, binding D-20).
//
// Pure Go, no Postgres, fixture-driven -- same style as effective_rights_test.go, but this
// preview must independently resolve MULTIPLE real holders across MULTIPLE fansub groups in
// one call, so the fake resolver here is keyed by (appUserID, fansubGroupID) instead of
// effective_rights_test.go's single fixed-state effectiveRightsFakeResolver.

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// capabilityImpactHolderKey identifies one (actor, group) pair's fixture state.
type capabilityImpactHolderKey struct {
	appUserID     int64
	fansubGroupID int64
}

// capabilityImpactHolderState is one holder's fixture: real (unmodified) role grants, active
// membership, and personal overrides for that exact (actor, group) pair.
type capabilityImpactHolderState struct {
	roles            []string
	activeMembership bool
	overrides        []UserCapabilityOverride
}

// capabilityImpactPreviewFakeResolver implements every optional interface
// PreviewGroupRightsCapabilityChange's loadGroupRightsSources call consults
// (Resolver, GroupRightsMembershipResolver, GroupRightsOverridesResolver), keyed per
// (appUserID, fansubGroupID) so a single test can prove multiple real holders, across
// multiple groups, are resolved independently in one batch call.
type capabilityImpactPreviewFakeResolver struct {
	states map[capabilityImpactHolderKey]capabilityImpactHolderState
}

func (f *capabilityImpactPreviewFakeResolver) stateFor(appUserID, fansubGroupID int64) capabilityImpactHolderState {
	if f.states == nil {
		return capabilityImpactHolderState{}
	}
	return f.states[capabilityImpactHolderKey{appUserID, fansubGroupID}]
}

func (f *capabilityImpactPreviewFakeResolver) ResolveFansubGroup(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *capabilityImpactPreviewFakeResolver) ResolveRelease(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *capabilityImpactPreviewFakeResolver) ResolveReleaseVersion(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *capabilityImpactPreviewFakeResolver) ResolveReleaseVersionMedia(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *capabilityImpactPreviewFakeResolver) ListActorGroupRoles(_ context.Context, appUserID int64, fansubGroupID int64) ([]string, error) {
	return f.stateFor(appUserID, fansubGroupID).roles, nil
}

func (f *capabilityImpactPreviewFakeResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

func (f *capabilityImpactPreviewFakeResolver) ResolveActorGroupMembership(_ context.Context, appUserID int64, fansubGroupID int64) (*GroupMembershipState, error) {
	return &GroupMembershipState{ActiveMembership: f.stateFor(appUserID, fansubGroupID).activeMembership}, nil
}

func (f *capabilityImpactPreviewFakeResolver) ResolveActorUserOverrides(_ context.Context, appUserID int64, fansubGroupID int64) ([]UserCapabilityOverride, error) {
	return f.stateFor(appUserID, fansubGroupID).overrides, nil
}

var (
	_ Resolver                      = (*capabilityImpactPreviewFakeResolver)(nil)
	_ GroupRightsMembershipResolver = (*capabilityImpactPreviewFakeResolver)(nil)
	_ GroupRightsOverridesResolver  = (*capabilityImpactPreviewFakeResolver)(nil)
)

// TestPreviewGroupRightsCapabilityChangeGrantsNewActionForHolderWithNoOtherSource proves the
// "gained" case: a holder whose only role does NOT currently grant the action goes from
// Allowed=false to Allowed=true when previewing a Grant of that action to that role.
func TestPreviewGroupRightsCapabilityChangeGrantsNewActionForHolderWithNoOtherSource(t *testing.T) {
	resolver := &capabilityImpactPreviewFakeResolver{
		states: map[capabilityImpactHolderKey]capabilityImpactHolderState{
			{appUserID: 10, fansubGroupID: 5}: {roles: []string{RoleEditor}, activeMembership: true},
		},
	}
	service := NewService(resolver)

	results, err := service.PreviewGroupRightsCapabilityChange(
		context.Background(), RoleEditor, ActionFansubGroupEdit, true,
		[]RoleHolderTarget{{AppUserID: 10, FansubGroupID: 5}},
	)
	require.NoError(t, err)
	require.Len(t, results, 1)

	assert.False(t, results[0].Before.Allowed, "before: RoleEditor does not grant this action yet")
	assert.True(t, results[0].After.Allowed, "after: hypothetically granting it to RoleEditor must flip Allowed to true")
	assert.Equal(t, ProvenanceGroupRole, results[0].After.DecisiveSource)
	assert.Contains(t, results[0].After.GrantingRoles, RoleEditor)
}

// TestPreviewGroupRightsCapabilityChangeRevokeRetainsAccessViaSecondRole proves CAP-09's
// exact "behalten über eine andere Rolle" case: a holder with TWO roles both granting the
// action stays Allowed=true after revoking the FIRST role's grant, with the SECOND role still
// listed in GrantingRoles.
func TestPreviewGroupRightsCapabilityChangeRevokeRetainsAccessViaSecondRole(t *testing.T) {
	resolver := &capabilityImpactPreviewFakeResolver{
		states: map[capabilityImpactHolderKey]capabilityImpactHolderState{
			{appUserID: 20, fansubGroupID: 6}: {
				roles:            []string{RoleFansubLead, RoleProjectLead},
				activeMembership: true,
			},
		},
	}
	service := NewService(resolver)

	results, err := service.PreviewGroupRightsCapabilityChange(
		context.Background(), RoleFansubLead, ActionFansubGroupEdit, false,
		[]RoleHolderTarget{{AppUserID: 20, FansubGroupID: 6}},
	)
	require.NoError(t, err)
	require.Len(t, results, 1)

	assert.True(t, results[0].Before.Allowed)
	assert.ElementsMatch(t, []string{RoleFansubLead, RoleProjectLead}, results[0].Before.GrantingRoles)

	assert.True(t, results[0].After.Allowed, "after: still allowed via the remaining role -- the honest 'kept' case")
	assert.NotContains(t, results[0].After.GrantingRoles, RoleFansubLead)
	assert.Contains(t, results[0].After.GrantingRoles, RoleProjectLead)
}

// TestPreviewGroupRightsCapabilityChangeUserDenyWinsOverHypotheticalGrant proves precedence
// still wins: a holder with a stored personal user_deny override for the action stays
// Allowed=false in BOTH before and after regardless of the hypothetical grant -- proving no
// second, independently-computed decision engine was accidentally built (D-20).
func TestPreviewGroupRightsCapabilityChangeUserDenyWinsOverHypotheticalGrant(t *testing.T) {
	resolver := &capabilityImpactPreviewFakeResolver{
		states: map[capabilityImpactHolderKey]capabilityImpactHolderState{
			{appUserID: 30, fansubGroupID: 7}: {
				roles:            []string{RoleEditor},
				activeMembership: true,
				overrides: []UserCapabilityOverride{
					{ActionCode: ActionFansubGroupEdit, Effect: "deny"},
				},
			},
		},
	}
	service := NewService(resolver)

	results, err := service.PreviewGroupRightsCapabilityChange(
		context.Background(), RoleEditor, ActionFansubGroupEdit, true,
		[]RoleHolderTarget{{AppUserID: 30, FansubGroupID: 7}},
	)
	require.NoError(t, err)
	require.Len(t, results, 1)

	assert.False(t, results[0].Before.Allowed, "before: user_deny already blocks this action")
	assert.Equal(t, ProvenanceUserDeny, results[0].Before.DecisiveSource)

	assert.False(t, results[0].After.Allowed, "after: user_deny must still win over the hypothetical grant")
	assert.Equal(t, ProvenanceUserDeny, results[0].After.DecisiveSource)
	assert.True(t, results[0].After.UserDeny)
}

// TestPreviewGroupRightsCapabilityChangeProcessesMultipleHoldersIndependently proves the
// function processes multiple holders across multiple groups independently in one call with
// zero cross-contamination: holder A gains the action via the hypothetical grant while
// holder B, who does not hold the previewed role at all, is completely unaffected by the same
// call.
func TestPreviewGroupRightsCapabilityChangeProcessesMultipleHoldersIndependently(t *testing.T) {
	resolver := &capabilityImpactPreviewFakeResolver{
		states: map[capabilityImpactHolderKey]capabilityImpactHolderState{
			{appUserID: 101, fansubGroupID: 5}: {roles: []string{RoleEditor}, activeMembership: true},
			{appUserID: 102, fansubGroupID: 6}: {roles: []string{RoleTranslator}, activeMembership: true},
		},
	}
	service := NewService(resolver)

	results, err := service.PreviewGroupRightsCapabilityChange(
		context.Background(), RoleEditor, ActionFansubGroupEdit, true,
		[]RoleHolderTarget{
			{AppUserID: 101, FansubGroupID: 5},
			{AppUserID: 102, FansubGroupID: 6},
		},
	)
	require.NoError(t, err)
	require.Len(t, results, 2)

	byUser := make(map[int64]CapabilityImpactResult, len(results))
	for _, result := range results {
		byUser[result.TargetUserID] = result
	}

	holderA := byUser[101]
	assert.False(t, holderA.Before.Allowed)
	assert.True(t, holderA.After.Allowed, "holder A holds RoleEditor and must gain the action")

	holderB := byUser[102]
	assert.False(t, holderB.Before.Allowed)
	assert.False(t, holderB.After.Allowed, "holder B does not hold RoleEditor at all -- unaffected by holder A's grant")
}

// TestPreviewGroupRightsCapabilityChangeServiceUnavailableReturnsError proves the
// misconfiguration guard: a nil resolver returns an error rather than a silently-empty result
// set, since this batch preview has no single actor to build a denied-result shape around.
func TestPreviewGroupRightsCapabilityChangeServiceUnavailableReturnsError(t *testing.T) {
	service := NewService(nil)

	_, err := service.PreviewGroupRightsCapabilityChange(
		context.Background(), RoleEditor, ActionFansubGroupEdit, true,
		[]RoleHolderTarget{{AppUserID: 1, FansubGroupID: 1}},
	)
	require.Error(t, err)
}
