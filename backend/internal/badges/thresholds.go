// Package badges is the ONE authoritative Go threshold registry for every badge family used
// anywhere in the Team4s backend (Phase 150, D-01). Every badge-family threshold literal that
// today lives scattered across backend/internal/repository/*.go and
// backend/internal/services/badge_service.go is meant to be replaced, in later plans of this
// phase (150-02/150-03), by a lookup into one of the Family values exported here. This package
// itself changes no call site -- it only makes the numbers exist in exactly one place.
//
// D-02/D-04: the exact numbers below were verified against the current production code
// (team4s-linux, commit 016da485, 2026-09-06) as named in 150-01-PLAN.md's <interfaces> block.
// A change to any threshold in this phase's target architecture happens HERE and nowhere else.
package badges

// Tier is one named threshold step within a Family, in ascending Threshold order.
type Tier struct {
	// Code is the stable tier/badge-code token used by the family's existing call sites (full
	// badge codes for Points/Progress/Membership, bare tier tokens for the Contribution families
	// and RoleVolume -- matching each family's own pre-existing naming convention; D-03: no
	// renaming, only a change of origin).
	Code string
	// Threshold is the minimum count at or above which Code is considered reached.
	Threshold int64
}

// Family holds one badge family's complete tier ladder, ascending by Threshold. All exported
// Family values in this file are the sole source of truth for their numbers (D-01).
type Family struct {
	Tiers []Tier
}

// RoleVolume: bronze/silver/gold/platinum role-volume tiers
// (member_profile_role_volume_repository.go:15-28,71-121). Below the first tier (12), current
// production behavior returns "" from CurrentTier (highestRoleVolumeTier) -- the "entry"
// relabeling used by roleVolumeProgressBadge stays local to role_volume_repository.go (D-03: no
// behavior change here).
var RoleVolume = Family{Tiers: []Tier{
	{Code: "bronze", Threshold: 12},
	{Code: "silver", Threshold: 108},
	{Code: "gold", Threshold: 320},
	{Code: "platinum", Threshold: 510},
}}

// Points: tier codes are themselves the full badge codes
// (member_profile_progress_repository.go:70-73).
var Points = Family{Tiers: []Tier{
	{Code: "point_milestone_first", Threshold: 1},
	{Code: "point_milestone_active", Threshold: 50},
	{Code: "point_milestone_experienced", Threshold: 200},
	{Code: "point_milestone_engaged", Threshold: 500},
	{Code: "point_milestone_veteran", Threshold: 1000},
	{Code: "point_milestone_legend", Threshold: 2500},
}}

// Progress: "productive"-family thresholds (member_profile_progress_repository.go:67-69), reused
// a second time with the same three codes by services/badge_service.go's computeProductiveTiers.
var Progress = Family{Tiers: []Tier{
	{Code: "first_contribution", Threshold: 1},
	{Code: "productive_bronze", Threshold: 10},
	{Code: "productive_silver", Threshold: 25},
	{Code: "productive_gold", Threshold: 50},
}}

// ContributionProjects: member_profile_contribution_badges_repository.go:22-33 +
// member_profile_progress_repository.go:74 + member_profile_dashboard_repository.go:104.
var ContributionProjects = Family{Tiers: []Tier{
	{Code: "bronze", Threshold: 1},
	{Code: "silver", Threshold: 5},
	{Code: "gold", Threshold: 15},
}}

// ContributionChronicle: contribution_badges_repository.go:40-51 + progress_repository.go:75 +
// dashboard_repository.go:105.
var ContributionChronicle = Family{Tiers: []Tier{
	{Code: "bronze", Threshold: 10},
	{Code: "silver", Threshold: 50},
	{Code: "gold", Threshold: 150},
}}

// ContributionArchivist: contribution_badges_repository.go:59-70 + progress_repository.go:76 +
// dashboard_repository.go:106. Same numbers as ContributionChronicle but a SEPARATE
// family/count source -- deliberately not merged with it.
var ContributionArchivist = Family{Tiers: []Tier{
	{Code: "bronze", Threshold: 10},
	{Code: "silver", Threshold: 50},
	{Code: "gold", Threshold: 150},
}}

// Membership: progress_repository.go:77-79 + services/badge_service.go:35-36,144-160.
// long_term_member is currently a literal `INTERVAL '5 years'` SQL fragment (appearing twice in
// the same query); membership_7_years/membership_10_years are currently passed as bare Go int
// arguments to computeMembershipMilestone. All three years values are also exposed below as bare
// int64 constants for those SQL-argument call sites.
var Membership = Family{Tiers: []Tier{
	{Code: "long_term_member", Threshold: 5},
	{Code: "membership_7_years", Threshold: 7},
	{Code: "membership_10_years", Threshold: 10},
}}

// MembershipLongTermYears, Membership7Years, and Membership10Years mirror the Membership
// family's three tier thresholds exactly (proven by TestMembershipYearConstantsMatchFamily in
// thresholds_test.go). They exist as bare int64 constants -- rather than being read off
// Membership.Tiers at the call site -- because Go const declarations cannot be derived from a
// package-level var (Family/Tier are struct types with no compile-time-constant expression form,
// and Go has no const struct-field-projection over a slice); services/badge_service.go's
// 7/10-year call sites need a plain int argument, and its 5-year call site needs a value it can
// interpolate into a literal SQL `INTERVAL` fragment (Plan 150-02/150-03), neither of which can
// range over Membership.Tiers directly without restructuring that unrelated code beyond this
// phase's D-03 scope (no behavior change to existing functions). The two are kept in lockstep by
// the test, not by construction.
const (
	MembershipLongTermYears int64 = 5
	Membership7Years        int64 = 7
	Membership10Years       int64 = 10
)

// CurrentTier returns the Code of the highest tier whose Threshold is <= count, or "" if count is
// below every tier's Threshold (i.e. no tier reached yet).
func (f Family) CurrentTier(count int64) string {
	current := ""
	for _, tier := range f.Tiers {
		if count >= tier.Threshold {
			current = tier.Code
		}
	}
	return current
}

// NextTier returns the first tier whose Threshold is > count, and ok=true. Once count already
// meets or exceeds the highest tier's Threshold, ok is false and the zero Tier is returned.
func (f Family) NextTier(count int64) (Tier, bool) {
	for _, tier := range f.Tiers {
		if count < tier.Threshold {
			return tier, true
		}
	}
	return Tier{}, false
}

// Remaining returns how many more count are needed to reach the next tier: 0 once count is at or
// above the highest tier's Threshold, otherwise the next tier's Threshold minus count (never
// negative).
func (f Family) Remaining(count int64) int64 {
	next, ok := f.NextTier(count)
	if !ok {
		return 0
	}
	remaining := next.Threshold - count
	if remaining < 0 {
		return 0
	}
	return remaining
}
