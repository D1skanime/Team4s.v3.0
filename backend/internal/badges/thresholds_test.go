package badges

import "testing"

// familyCases enumerates every exported Family alongside the exact numbers named in
// 150-01-PLAN.md's <interfaces> block, so a single table-driven test proves every family's
// boundary math without any Postgres dependency (pure functions, real calls -- not
// source-substring inspection, per CLAUDE.md's Teststil rule).
func familyCases() []struct {
	name        string
	family      Family
	firstCode   string
	firstThresh int64
	maxCode     string
	maxThresh   int64
} {
	return []struct {
		name        string
		family      Family
		firstCode   string
		firstThresh int64
		maxCode     string
		maxThresh   int64
	}{
		{"RoleVolume", RoleVolume, "bronze", 12, "platinum", 510},
		{"Points", Points, "point_milestone_first", 1, "point_milestone_legend", 2500},
		{"Progress", Progress, "first_contribution", 1, "productive_gold", 50},
		{"ContributionProjects", ContributionProjects, "bronze", 1, "gold", 15},
		{"ContributionChronicle", ContributionChronicle, "bronze", 10, "gold", 150},
		{"ContributionArchivist", ContributionArchivist, "bronze", 10, "gold", 150},
		{"Membership", Membership, "long_term_member", 5, "membership_10_years", 10},
	}
}

func TestFamily_CurrentTier_BelowFirstTierReturnsEmpty(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.family.CurrentTier(tc.firstThresh - 1); got != "" {
				t.Fatalf("CurrentTier(%d) = %q, want \"\" (below first tier %d)", tc.firstThresh-1, got, tc.firstThresh)
			}
			if got := tc.family.CurrentTier(0); got != "" {
				t.Fatalf("CurrentTier(0) = %q, want \"\"", got)
			}
		})
	}
}

func TestFamily_CurrentTier_ExactThresholdReturnsThatTier(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			for _, tier := range tc.family.Tiers {
				if got := tc.family.CurrentTier(tier.Threshold); got != tier.Code {
					t.Fatalf("CurrentTier(%d) = %q, want %q", tier.Threshold, got, tier.Code)
				}
			}
		})
	}
}

func TestFamily_CurrentTier_OneBelowMaxReturnsPreviousTier(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			tiers := tc.family.Tiers
			if len(tiers) < 2 {
				t.Fatalf("family %s must have >=2 tiers for this test", tc.name)
			}
			max := tiers[len(tiers)-1]
			previous := tiers[len(tiers)-2]
			if got := tc.family.CurrentTier(max.Threshold - 1); got != previous.Code {
				t.Fatalf("CurrentTier(%d) = %q, want %q (previous tier)", max.Threshold-1, got, previous.Code)
			}
		})
	}
}

func TestFamily_NextTier_BelowFirstTierReturnsFirstTier(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			next, ok := tc.family.NextTier(0)
			if !ok {
				t.Fatalf("NextTier(0) ok = false, want true")
			}
			if next.Code != tc.firstCode || next.Threshold != tc.firstThresh {
				t.Fatalf("NextTier(0) = %+v, want {%q %d}", next, tc.firstCode, tc.firstThresh)
			}
		})
	}
}

func TestFamily_NextTier_AtMaxReturnsNotOK(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			_, ok := tc.family.NextTier(tc.maxThresh)
			if ok {
				t.Fatalf("NextTier(%d) ok = true, want false (already at max tier %q)", tc.maxThresh, tc.maxCode)
			}
			_, ok = tc.family.NextTier(tc.maxThresh + 1_000_000)
			if ok {
				t.Fatalf("NextTier(above max) ok = true, want false")
			}
		})
	}
}

func TestFamily_NextTier_OneBelowMaxReturnsMaxTier(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			next, ok := tc.family.NextTier(tc.maxThresh - 1)
			if !ok {
				t.Fatalf("NextTier(%d) ok = false, want true", tc.maxThresh-1)
			}
			if next.Code != tc.maxCode || next.Threshold != tc.maxThresh {
				t.Fatalf("NextTier(%d) = %+v, want {%q %d}", tc.maxThresh-1, next, tc.maxCode, tc.maxThresh)
			}
		})
	}
}

func TestFamily_Remaining_AtMaxIsZero(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.family.Remaining(tc.maxThresh); got != 0 {
				t.Fatalf("Remaining(%d) = %d, want 0", tc.maxThresh, got)
			}
			if got := tc.family.Remaining(tc.maxThresh + 1_000_000); got != 0 {
				t.Fatalf("Remaining(above max) = %d, want 0 (never negative)", got)
			}
		})
	}
}

func TestFamily_Remaining_OneBelowMaxIsOne(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.family.Remaining(tc.maxThresh - 1); got != 1 {
				t.Fatalf("Remaining(%d) = %d, want 1", tc.maxThresh-1, got)
			}
		})
	}
}

func TestFamily_Remaining_BelowFirstTierMatchesFirstThreshold(t *testing.T) {
	for _, tc := range familyCases() {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.family.Remaining(0); got != tc.firstThresh {
				t.Fatalf("Remaining(0) = %d, want %d", got, tc.firstThresh)
			}
		})
	}
}

// TestExactFamilyValues locks every number named in 150-01-PLAN.md's <interfaces> block
// verbatim -- a future accidental edit to any threshold or code in thresholds.go fails this
// test immediately.
func TestExactFamilyValues(t *testing.T) {
	assertTiers := func(t *testing.T, name string, got []Tier, want []Tier) {
		t.Helper()
		if len(got) != len(want) {
			t.Fatalf("%s: got %d tiers, want %d", name, len(got), len(want))
		}
		for i, w := range want {
			if got[i] != w {
				t.Fatalf("%s: tier[%d] = %+v, want %+v", name, i, got[i], w)
			}
		}
	}

	assertTiers(t, "RoleVolume", RoleVolume.Tiers, []Tier{
		{"bronze", 12}, {"silver", 108}, {"gold", 320}, {"platinum", 510},
	})
	assertTiers(t, "Points", Points.Tiers, []Tier{
		{"point_milestone_first", 1}, {"point_milestone_active", 50}, {"point_milestone_experienced", 200},
		{"point_milestone_engaged", 500}, {"point_milestone_veteran", 1000}, {"point_milestone_legend", 2500},
	})
	assertTiers(t, "Progress", Progress.Tiers, []Tier{
		{"first_contribution", 1}, {"productive_bronze", 10}, {"productive_silver", 25}, {"productive_gold", 50},
	})
	assertTiers(t, "ContributionProjects", ContributionProjects.Tiers, []Tier{
		{"bronze", 1}, {"silver", 5}, {"gold", 15},
	})
	assertTiers(t, "ContributionChronicle", ContributionChronicle.Tiers, []Tier{
		{"bronze", 10}, {"silver", 50}, {"gold", 150},
	})
	assertTiers(t, "ContributionArchivist", ContributionArchivist.Tiers, []Tier{
		{"bronze", 10}, {"silver", 50}, {"gold", 150},
	})
	assertTiers(t, "Membership", Membership.Tiers, []Tier{
		{"long_term_member", 5}, {"membership_7_years", 7}, {"membership_10_years", 10},
	})
}

// TestContributionChronicleAndArchivistAreSeparateFamilies proves the two identically-numbered
// families are not accidentally aliased to the same underlying slice (D-02: "do not merge the
// two families into one").
func TestContributionChronicleAndArchivistAreSeparateFamilies(t *testing.T) {
	if &ContributionChronicle.Tiers[0] == &ContributionArchivist.Tiers[0] {
		t.Fatal("ContributionChronicle and ContributionArchivist must not share backing storage")
	}
	// Mutating one must not affect the other -- confirms they are independent value copies, not
	// aliases of a shared slice header.
	original := ContributionArchivist.Tiers[0].Threshold
	ContributionChronicle.Tiers[0].Threshold = 999
	if ContributionArchivist.Tiers[0].Threshold != original {
		t.Fatal("mutating ContributionChronicle.Tiers affected ContributionArchivist.Tiers -- families are aliased")
	}
	ContributionChronicle.Tiers[0].Threshold = 10 // restore
}

// TestMembershipYearConstantsMatchFamily proves MembershipLongTermYears/Membership7Years/
// Membership10Years read from the same source-of-truth values as the Membership family's tiers,
// as thresholds.go's doc comment requires since Go cannot derive the const trio directly from
// the Membership var.
func TestMembershipYearConstantsMatchFamily(t *testing.T) {
	cases := []struct {
		code  string
		years int64
	}{
		{"long_term_member", MembershipLongTermYears},
		{"membership_7_years", Membership7Years},
		{"membership_10_years", Membership10Years},
	}
	for _, tc := range cases {
		found := false
		for _, tier := range Membership.Tiers {
			if tier.Code == tc.code {
				found = true
				if tier.Threshold != tc.years {
					t.Fatalf("Membership tier %q has Threshold %d, but constant = %d", tc.code, tier.Threshold, tc.years)
				}
			}
		}
		if !found {
			t.Fatalf("Membership.Tiers has no tier with Code %q", tc.code)
		}
	}
}
