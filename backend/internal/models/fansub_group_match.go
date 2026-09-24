package models

// FansubGroupMatch is one exact-tier (alias/name/slug) resolution of a filename-derived
// candidate group string against fansub_groups/fansub_group_aliases (D-08). Only exact
// matches are eligible for auto-selection at preview time (D-03) -- never a
// FansubGroupSuggestion.
type FansubGroupMatch struct {
	RowOrdinal   int
	RawCandidate string
	GroupID      int64
	GroupName    string
	GroupSlug    string
	// MatchedVia is one of "kuerzel", "alias", "name", "slug".
	MatchedVia string
	// MatchedAlias/MatchedAliasID are populated only when MatchedVia == "alias".
	// MatchedAliasID is needed by Plan 07/08 to call reassignFansubAlias when an admin
	// triggers "Trotzdem umhängen" on a conflicting kürzel.
	MatchedAlias   *string
	MatchedAliasID *int64
}

// FansubGroupSuggestion is a fuzzy "did you mean" trigram suggestion (D-03) for a
// candidate with no exact-tier match. Suggestions are never auto-applied.
type FansubGroupSuggestion struct {
	RowOrdinal   int
	RawCandidate string
	GroupID      int64
	GroupName    string
	GroupSlug    string
}

// LearnedFansubAlias describes an alias to be written for a fansub group when an admin
// resolves an unknown kürzel during import mapping (D-01). Declared here so Plan 06's
// alias-learning write path and this plan's matching read path share one type-ownership
// file instead of duplicating it.
type LearnedFansubAlias struct {
	FansubGroupID int64
	Alias         string
}
