package repository

import "testing"

// TestMemberContributionWithProposalRow_HasEpisodeFields stellt sicher, dass das
// Member-Contribution-DTO die Episode-Felder traegt, die ListByMemberIDWithProposalFields
// aus dem rv->fansub_releases->episodes JOIN befuellt (Compile-Zeit-Sicherung gegen
// versehentliches Entfernen). Die Live-Datenpruefung erfolgt gegen :8092.
func TestMemberContributionWithProposalRow_HasEpisodeFields(t *testing.T) {
	var row MemberContributionWithProposalRow

	if row.EpisodeNumber != nil {
		t.Fatalf("EpisodeNumber sollte als nullable Pointer initial nil sein")
	}
	if row.EpisodeSortIndex != nil {
		t.Fatalf("EpisodeSortIndex sollte als nullable Pointer initial nil sein")
	}

	ep := "1"
	idx := 1
	row.EpisodeNumber = &ep
	row.EpisodeSortIndex = &idx

	if *row.EpisodeNumber != "1" || *row.EpisodeSortIndex != 1 {
		t.Fatalf("Episode-Felder nicht korrekt gesetzt: got %v / %v", *row.EpisodeNumber, *row.EpisodeSortIndex)
	}
}
