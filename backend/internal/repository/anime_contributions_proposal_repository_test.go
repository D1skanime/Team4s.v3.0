package repository

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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

func TestCreateProposal_IsRoleScopedAndSerialized(t *testing.T) {
	source := readProposalRepositorySource(t, "anime_contributions_proposal_repository.go") +
		readProposalRepositorySource(t, "anime_contributions_proposal_merge_repository.go")

	required := []string{
		"lockProposalContext(ctx, tx, fansubGroupID, animeID, input.FansubGroupMemberID, input.ReleaseVersionID)",
		"findExistingProposalRoles(ctx, tx, fansubGroupID, animeID, input.FansubGroupMemberID, input.ReleaseVersionID, input.RoleCodes)",
		"SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
		"acr.role_code = ANY($5::text[])",
		"AND status IN ('draft', 'proposed')",
		"member_id",
		"SELECT member_id FROM hist_fansub_group_members WHERE id = $3 AND fansub_group_id = $1",
	}
	for _, fragment := range required {
		if !strings.Contains(source, fragment) {
			t.Fatalf("CreateProposal muss rollenbezogene Duplikate serialisiert pruefen; Fragment fehlt: %q", fragment)
		}
	}
}

func readProposalRepositorySource(t *testing.T, filename string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Join(".", filename))
	if err != nil {
		t.Fatalf("repository source %s lesen: %v", filename, err)
	}
	return string(content)
}
