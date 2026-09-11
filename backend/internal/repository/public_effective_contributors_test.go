package repository

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResolvePublicEffectiveContributors_FallsBackToThreeProjectDefaults(t *testing.T) {
	candidates := []publicContributionCandidate{
		{ReleaseVersionID: 1, ContributionID: 1, FansubGroupID: 1, MemberID: 1, Name: "CSubs Leader", RoleLabels: []string{"Projektleitung"}, IsPublic: true},
		{ReleaseVersionID: 1, ContributionID: 2, FansubGroupID: 1, MemberID: 2, Name: "Sheppert", RoleLabels: []string{"Typesetting"}, IsPublic: true},
		{ReleaseVersionID: 1, ContributionID: 5, FansubGroupID: 2, MemberID: 5, Name: "honto aki", RoleLabels: []string{"Encoding", "Timing", "Übersetzung"}, IsPublic: true},
	}

	resolved := resolvePublicEffectiveContributors(candidates)

	require.Len(t, resolved[1], 3)
	assert.Equal(t, []string{"CSubs Leader", "Sheppert", "honto aki"}, []string{
		resolved[1][0].Name,
		resolved[1][1].Name,
		resolved[1][2].Name,
	})
}

func TestResolvePublicEffectiveContributors_AppliesOverridePerAttachedGroup(t *testing.T) {
	candidates := []publicContributionCandidate{
		{ReleaseVersionID: 9, ContributionID: 1, FansubGroupID: 1, MemberID: 1, Name: "Group One Default", IsPublic: true},
		{ReleaseVersionID: 9, ContributionID: 2, FansubGroupID: 1, MemberID: 2, Name: "Group One Override", IsOverride: true, IsPublic: true},
		{ReleaseVersionID: 9, ContributionID: 3, FansubGroupID: 2, MemberID: 3, Name: "Group Two Default", IsPublic: true},
	}

	resolved := resolvePublicEffectiveContributors(candidates)

	require.Len(t, resolved[9], 2)
	assert.Equal(t, []string{"Group One Override", "Group Two Default"}, []string{
		resolved[9][0].Name,
		resolved[9][1].Name,
	})
}

func TestResolvePublicEffectiveContributors_AppliesVisibilityAfterPrecedenceAndDeduplicates(t *testing.T) {
	candidates := []publicContributionCandidate{
		{ReleaseVersionID: 12, ContributionID: 1, FansubGroupID: 1, MemberID: 1, Name: "Visible Default", IsPublic: true},
		{ReleaseVersionID: 12, ContributionID: 2, FansubGroupID: 1, MemberID: 2, Name: "Hidden Override", IsOverride: true, IsPublic: false},
		{ReleaseVersionID: 12, ContributionID: 3, FansubGroupID: 2, MemberID: 5, Name: "Shared Member", RoleLabels: []string{"Timing"}, IsPublic: true},
		{ReleaseVersionID: 12, ContributionID: 4, FansubGroupID: 2, MemberID: 5, Name: "Shared Member", RoleLabels: []string{"Encoding", "Timing"}, IsPublic: true},
	}

	resolved := resolvePublicEffectiveContributors(candidates)

	require.Len(t, resolved[12], 1)
	assert.Equal(t, int64(2), resolved[12][0].FansubGroupID)
	assert.Equal(t, int64(5), resolved[12][0].MemberID)
	assert.Equal(t, "Encoding, Timing", resolved[12][0].RoleLabel)
}

// TestResolvePublicEffectiveContributors_PreservesRoleCodesAlongsideLabels proves the
// raw role_code set survives aggregation, not just the joined German label string
// (156-05 Test 1: multi-role contributor, unique/order-independent RoleCodes).
func TestResolvePublicEffectiveContributors_PreservesRoleCodesAlongsideLabels(t *testing.T) {
	candidates := []publicContributionCandidate{
		{
			ReleaseVersionID: 20, ContributionID: 1, FansubGroupID: 1, MemberID: 1, Name: "Multi Role",
			RoleLabels: []string{"Übersetzung", "Timing"}, RoleCodes: []string{"translator", "timer"}, IsPublic: true,
		},
	}

	resolved := resolvePublicEffectiveContributors(candidates)

	require.Len(t, resolved[20], 1)
	assert.Equal(t, "Timing, Übersetzung", resolved[20][0].RoleLabel)
	assert.ElementsMatch(t, []string{"translator", "timer"}, resolved[20][0].RoleCodes)
}

// TestResolvePublicEffectiveContributors_CarriesMemberSlugWhenPublic proves a
// visibility-gated member_slug (already nil-or-populated by the SQL CASE before
// reaching this function) survives aggregation (156-05 Test 2).
func TestResolvePublicEffectiveContributors_CarriesMemberSlugWhenPublic(t *testing.T) {
	slug := "sheppert"
	candidates := []publicContributionCandidate{
		{ReleaseVersionID: 21, ContributionID: 1, FansubGroupID: 1, MemberID: 1, Name: "Public Profile", MemberSlug: &slug, IsPublic: true},
	}

	resolved := resolvePublicEffectiveContributors(candidates)

	require.Len(t, resolved[21], 1)
	require.NotNil(t, resolved[21][0].MemberSlug)
	assert.Equal(t, "sheppert", *resolved[21][0].MemberSlug)
}

// TestResolvePublicEffectiveContributors_MemberSlugNilWhenProfileNotPublic proves the
// contributor is still returned (role/credit visibility gate) even though its
// member_slug is nil (independent profile-visibility gate, 156-05 Test 3).
func TestResolvePublicEffectiveContributors_MemberSlugNilWhenProfileNotPublic(t *testing.T) {
	candidates := []publicContributionCandidate{
		{ReleaseVersionID: 22, ContributionID: 1, FansubGroupID: 1, MemberID: 1, Name: "Non Public Profile", MemberSlug: nil, IsPublic: true},
	}

	resolved := resolvePublicEffectiveContributors(candidates)

	require.Len(t, resolved[22], 1)
	assert.Nil(t, resolved[22][0].MemberSlug)
}
