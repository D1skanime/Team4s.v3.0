package permissions

// Phase 138 Plan 14 — unit tests for PreviewClaimActivationImpact (138-CONTEXT.md D-24).
//
// Pure Go, no Postgres: PreviewClaimActivationImpact's only dependency is s.resolver, faked
// exactly like effective_rights_test.go's effectiveRightsFakeResolver already does.

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const claimActivationTestGroupID int64 = 88

// TestPreviewClaimActivationImpactZeroSourcesGainsEveryRoleGrantedAction proves the core
// "gained" case: a target with zero current sources (no membership, no roles, no
// overrides, no specialized grants) goes from "before" = no_active_membership deny-all to
// "after" = allowed for every action any of roleCodes grants.
func TestPreviewClaimActivationImpactZeroSourcesGainsEveryRoleGrantedAction(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{activeMembership: false}
	service := NewService(resolver)

	before, after, err := service.PreviewClaimActivationImpact(context.Background(), 42, claimActivationTestGroupID, []string{RoleFansubLead})
	require.NoError(t, err)

	beforeState := before.Can(ActionFansubGroupMediaUpload)
	assert.False(t, beforeState.Allowed, "before: target is not yet an active member, everything must be denied")
	assert.Equal(t, ReasonNoMembership, beforeState.ReasonCode)
	assert.False(t, before.ActiveMembership)

	afterState := after.Can(ActionFansubGroupMediaUpload)
	assert.True(t, afterState.Allowed, "after: activation grants the role, action must become allowed")
	assert.Equal(t, ProvenanceGroupRole, afterState.DecisiveSource)
	assert.Contains(t, afterState.GrantingRoles, RoleFansubLead)
	assert.True(t, after.ActiveMembership)
}

// TestPreviewClaimActivationImpactPreservesExistingSpecializedGrant proves the target may
// already hold a specialized grant (e.g. review delegation) in that group even before
// activation -- the "after" override does not erase pre-existing specialized-grant sources,
// it only replaces ActiveMembership/Roles.
func TestPreviewClaimActivationImpactPreservesExistingSpecializedGrant(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{
		activeMembership: false,
		reviewContext: &ReviewGrantContext{
			MembershipID: 700, AppUserID: 42, MemberID: 701, FansubGroupID: claimActivationTestGroupID,
			GrantedActions: []Action{ActionReviewImageDecide},
		},
	}
	service := NewService(resolver)

	before, after, err := service.PreviewClaimActivationImpact(context.Background(), 42, claimActivationTestGroupID, []string{})
	require.NoError(t, err)

	// Sanity: the specialized grant alone is not enough to escape the no_active_membership
	// deny-all state before activation.
	beforeReviewState := before.Can(ActionReviewImageDecide)
	assert.False(t, beforeReviewState.Allowed, "before: no active membership yet, specialized grant does not override that")

	afterReviewState := after.Can(ActionReviewImageDecide)
	assert.True(t, afterReviewState.Allowed, "after: the pre-existing specialized grant must still be reflected once membership is active")
	assert.Equal(t, ProvenanceSpecializedGrant, afterReviewState.DecisiveSource)
	assert.NotEmpty(t, afterReviewState.SpecializedGrants)
}

// TestPreviewClaimActivationImpactEmptyRoleCodesStillFlipsActiveMembership proves an empty
// roleCodes slice still correctly flips ActiveMembership to true in "after" -- membership
// alone can matter for actions gated only on !ActiveMembership.
func TestPreviewClaimActivationImpactEmptyRoleCodesStillFlipsActiveMembership(t *testing.T) {
	resolver := &effectiveRightsFakeResolver{activeMembership: false}
	service := NewService(resolver)

	before, after, err := service.PreviewClaimActivationImpact(context.Background(), 42, claimActivationTestGroupID, []string{})
	require.NoError(t, err)

	assert.False(t, before.ActiveMembership)
	assert.True(t, after.ActiveMembership)

	afterState := after.Can(ActionFansubGroupMediaUpload)
	assert.False(t, afterState.Allowed, "no role granted, action must still be denied even though membership is now active")
	assert.Equal(t, ReasonCodeNoGrant, afterState.ReasonCode)
}
