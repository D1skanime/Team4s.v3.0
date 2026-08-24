package permissions

// Phase 139 Plan 05, Task 1 -- proves EvaluateGroupRightsFromSources/ResolveGroupRightsBatch are
// a pure re-projection of the existing single-group precedence engine (D21), not a second
// decision path, and that ResolveGroupRightsBatch genuinely batches (constant call count
// regardless of group count) rather than looping ResolveGroupRights per group.

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// effectiveRightsBatchFakeResolver is a full in-memory double covering every BATCH source
// category ResolveGroupRightsBatch consults: batched active-membership state
// (GroupRightsMembershipBatchResolver), batched user overrides
// (GroupRightsOverridesBatchResolver) and batched specialized (review-delegation-shaped)
// grants (SpecializedGrantBatchProvider). Call counters prove genuine batching -- a resolver
// that answers via a Go loop internally would still only ever be invoked once per
// ResolveGroupRightsBatch call from this fake's perspective.
type effectiveRightsBatchFakeResolver struct {
	membershipByGroup map[int64]*GroupMembershipState
	overridesByGroup  map[int64][]UserCapabilityOverride
	grantsByGroup     map[int64][]SpecializedGrant

	membershipCalls int
	overridesCalls  int
	grantsCalls     int
}

func (f *effectiveRightsBatchFakeResolver) ResolveFansubGroup(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *effectiveRightsBatchFakeResolver) ResolveRelease(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *effectiveRightsBatchFakeResolver) ResolveReleaseVersion(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *effectiveRightsBatchFakeResolver) ResolveReleaseVersionMedia(context.Context, int64) (*Context, error) {
	return nil, nil
}

func (f *effectiveRightsBatchFakeResolver) ListActorGroupRoles(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

func (f *effectiveRightsBatchFakeResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

func (f *effectiveRightsBatchFakeResolver) ResolveActorGroupMembershipsForGroups(
	_ context.Context, _ int64, fansubGroupIDs []int64,
) (map[int64]*GroupMembershipState, error) {
	f.membershipCalls++
	result := make(map[int64]*GroupMembershipState, len(fansubGroupIDs))
	for _, groupID := range fansubGroupIDs {
		if membership, ok := f.membershipByGroup[groupID]; ok {
			result[groupID] = membership
		}
	}
	return result, nil
}

func (f *effectiveRightsBatchFakeResolver) ResolveActorUserOverridesForGroups(
	_ context.Context, _ int64, fansubGroupIDs []int64,
) (map[int64][]UserCapabilityOverride, error) {
	f.overridesCalls++
	result := make(map[int64][]UserCapabilityOverride, len(fansubGroupIDs))
	for _, groupID := range fansubGroupIDs {
		result[groupID] = f.overridesByGroup[groupID]
	}
	return result, nil
}

func (f *effectiveRightsBatchFakeResolver) ResolveGroupGrantsForGroups(
	_ context.Context, _ int64, fansubGroupIDs []int64,
) (map[int64][]SpecializedGrant, error) {
	f.grantsCalls++
	result := make(map[int64][]SpecializedGrant, len(fansubGroupIDs))
	for _, groupID := range fansubGroupIDs {
		result[groupID] = f.grantsByGroup[groupID]
	}
	return result, nil
}

var (
	_ Resolver                           = (*effectiveRightsBatchFakeResolver)(nil)
	_ GroupRightsMembershipBatchResolver  = (*effectiveRightsBatchFakeResolver)(nil)
	_ GroupRightsOverridesBatchResolver   = (*effectiveRightsBatchFakeResolver)(nil)
	_ SpecializedGrantBatchProvider       = (*effectiveRightsBatchFakeResolver)(nil)
)

// TestEvaluateGroupRightsFromSourcesMatchesResolveGroupRights proves EvaluateGroupRightsFromSources
// is a pure re-projection of the SAME facts ResolveGroupRights would batch-load for one group --
// byte-identical Can()/provenance/reason-code values for every action (D21).
func TestEvaluateGroupRightsFromSourcesMatchesResolveGroupRights(t *testing.T) {
	roles := []string{RoleFansubLead}
	overrides := []UserCapabilityOverride{{ActionCode: ActionReviewTextDecide, Effect: "deny"}}

	singleGroupResolver := &effectiveRightsFakeResolver{
		roles:            roles,
		activeMembership: true,
		overrides:        overrides,
		reviewContext: &ReviewGrantContext{
			MembershipID: 700, AppUserID: 10, MemberID: 701, FansubGroupID: effectiveRightsTestGroupID,
			GrantedActions: []Action{ActionReviewTextDecide},
		},
	}
	service := NewService(singleGroupResolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	want, err := service.ResolveGroupRights(context.Background(), actor, effectiveRightsTestGroupID)
	require.NoError(t, err)

	got := service.EvaluateGroupRightsFromSources(actor, effectiveRightsTestGroupID, GroupRightsSourcesInput{
		Roles:             roles,
		ActiveMembership:  true,
		Overrides:         overrides,
		SpecializedGrants: []SpecializedGrant{{Action: ActionReviewTextDecide, Source: reviewDelegationGrantSource}},
	})

	assert.Equal(t, want, got, "EvaluateGroupRightsFromSources must be a byte-identical re-projection of ResolveGroupRights given the same facts")
}

// TestResolveGroupRightsBatchMatchesPerGroupResolveGroupRights proves every entry
// ResolveGroupRightsBatch returns is byte-identical to calling ResolveGroupRights individually
// for that same group against an equivalent single-group fake resolver -- covering both the
// platform-admin fast path and a real user_deny override.
func TestResolveGroupRightsBatchMatchesPerGroupResolveGroupRights(t *testing.T) {
	t.Run("normal actor across three groups including a real user_deny", func(t *testing.T) {
		const g1, g2, g3 int64 = 101, 102, 103

		rolesByGroup := map[int64][]string{
			g1: {RoleFansubLead},
			g2: {RoleFansubLead},
			g3: nil,
		}

		batchResolver := &effectiveRightsBatchFakeResolver{
			membershipByGroup: map[int64]*GroupMembershipState{
				g1: {ActiveMembership: true},
				g2: {ActiveMembership: true},
				g3: {ActiveMembership: false},
			},
			overridesByGroup: map[int64][]UserCapabilityOverride{
				g2: {{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"}},
			},
			grantsByGroup: map[int64][]SpecializedGrant{
				g1: {{Action: ActionReviewTextDecide, Source: reviewDelegationGrantSource}},
			},
		}
		service := NewService(batchResolver)
		actor := Actor{AppUserID: 55, Status: "active"}

		got, err := service.ResolveGroupRightsBatch(context.Background(), actor, []int64{g1, g2, g3}, rolesByGroup)
		require.NoError(t, err)
		require.Len(t, got, 3)

		for _, groupID := range []int64{g1, g2, g3} {
			singleResolver := &effectiveRightsFakeResolver{
				roles:            rolesByGroup[groupID],
				activeMembership: batchResolver.membershipByGroup[groupID].ActiveMembership,
				overrides:        batchResolver.overridesByGroup[groupID],
			}
			if grants := batchResolver.grantsByGroup[groupID]; len(grants) > 0 {
				grantedActions := make([]Action, 0, len(grants))
				for _, grant := range grants {
					grantedActions = append(grantedActions, grant.Action)
				}
				singleResolver.reviewContext = &ReviewGrantContext{
					MembershipID: 1, AppUserID: actor.AppUserID, MemberID: 2, FansubGroupID: groupID,
					GrantedActions: grantedActions,
				}
			}
			singleService := NewService(singleResolver)

			want, err := singleService.ResolveGroupRights(context.Background(), actor, groupID)
			require.NoError(t, err)
			assert.Equal(t, want, got[groupID], "group %d must match its individual ResolveGroupRights result", groupID)
		}
	})

	t.Run("platform admin fast path skips every batch load", func(t *testing.T) {
		const g1, g2, g3 int64 = 201, 202, 203
		batchResolver := &effectiveRightsBatchFakeResolver{}
		service := NewService(batchResolver)
		actor := Actor{AppUserID: 77, Status: "active", IsPlatformAdmin: true}

		got, err := service.ResolveGroupRightsBatch(context.Background(), actor, []int64{g1, g2, g3}, map[int64][]string{})
		require.NoError(t, err)
		require.Len(t, got, 3)

		for _, groupID := range []int64{g1, g2, g3} {
			state := got[groupID].Can(ActionFansubGroupMediaUpload)
			assert.True(t, state.Allowed, "platform admin must be non-deniable in group %d", groupID)
			assert.Equal(t, ProvenancePlatformAdmin, state.DecisiveSource)
		}
		assert.Equal(t, 0, batchResolver.membershipCalls, "fast path must skip the membership batch load entirely")
		assert.Equal(t, 0, batchResolver.overridesCalls, "fast path must skip the overrides batch load entirely")
		assert.Equal(t, 0, batchResolver.grantsCalls, "fast path must skip the specialized-grant batch load entirely")
	})
}

// TestResolveGroupRightsBatchIssuesConstantFakeCallCount proves the fake batch resolver's batch
// methods are each called EXACTLY ONCE per ResolveGroupRightsBatch call regardless of whether 3
// or 30 group IDs are passed -- genuine batching, not a loop sharing one Go function.
func TestResolveGroupRightsBatchIssuesConstantFakeCallCount(t *testing.T) {
	batchResolver := &effectiveRightsBatchFakeResolver{
		membershipByGroup: map[int64]*GroupMembershipState{},
		overridesByGroup:  map[int64][]UserCapabilityOverride{},
		grantsByGroup:     map[int64][]SpecializedGrant{},
	}
	service := NewService(batchResolver)
	actor := Actor{AppUserID: 88, Status: "active"}

	threeGroups := []int64{1, 2, 3}
	rolesForThree := map[int64][]string{1: {RoleFansubLead}, 2: {RoleFansubLead}, 3: {RoleFansubLead}}
	_, err := service.ResolveGroupRightsBatch(context.Background(), actor, threeGroups, rolesForThree)
	require.NoError(t, err)
	assert.Equal(t, 1, batchResolver.membershipCalls)
	assert.Equal(t, 1, batchResolver.overridesCalls)
	assert.Equal(t, 1, batchResolver.grantsCalls)

	thirtyGroups := make([]int64, 30)
	rolesForThirty := make(map[int64][]string, 30)
	for i := range thirtyGroups {
		thirtyGroups[i] = int64(1000 + i)
		rolesForThirty[thirtyGroups[i]] = []string{RoleFansubLead}
	}
	_, err = service.ResolveGroupRightsBatch(context.Background(), actor, thirtyGroups, rolesForThirty)
	require.NoError(t, err)
	assert.Equal(t, 2, batchResolver.membershipCalls, "a second call adds exactly one more invocation, never one per group")
	assert.Equal(t, 2, batchResolver.overridesCalls, "a second call adds exactly one more invocation, never one per group")
	assert.Equal(t, 2, batchResolver.grantsCalls, "a second call adds exactly one more invocation, never one per group")
}
