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

// TestMemberContributionWithProposalRow_HasWorkedTotalFields stellt sicher, dass das
// Member-Contribution-DTO die worked/total Release-Versionen-Felder traegt (D-01),
// die ListByMemberIDWithProposalFields per korrelierter Subquery auf ac.anime_id +
// ac.fansub_group_id befuellt.
func TestMemberContributionWithProposalRow_HasWorkedTotalFields(t *testing.T) {
	var row MemberContributionWithProposalRow

	if row.WorkedReleaseVersionCount != 0 {
		t.Fatalf("WorkedReleaseVersionCount sollte initial 0 sein")
	}
	if row.TotalReleaseVersionCount != 0 {
		t.Fatalf("TotalReleaseVersionCount sollte initial 0 sein")
	}

	row.WorkedReleaseVersionCount = 3
	row.TotalReleaseVersionCount = 12

	if row.WorkedReleaseVersionCount != 3 || row.TotalReleaseVersionCount != 12 {
		t.Fatalf("worked/total Felder nicht korrekt gesetzt: got %v / %v", row.WorkedReleaseVersionCount, row.TotalReleaseVersionCount)
	}
}

// TestListByMemberIDWithProposalFields_SelectsWorkedTotalSubqueries prueft per
// Source-Inspektion, dass die Query in ListByMemberIDWithProposalFields die
// korrelierten worked/total Subqueries auf ac.anime_id/ac.fansub_group_id enthaelt
// (analog member_profile_repository.go loadRecentContributions, siehe PLAN <interfaces>).
func TestListByMemberIDWithProposalFields_SelectsWorkedTotalSubqueries(t *testing.T) {
	source := readProposalRepositorySource(t, "anime_contributions_proposal_repository.go")

	required := []string{
		"total_release_version_count",
		"worked_release_version_count",
		"ep.anime_id = ac.anime_id",
		"rvg.fansub_group_id = ac.fansub_group_id",
		"n.member_id = $1",
		"mc.claim_status = 'verified'",
	}
	for _, fragment := range required {
		if !strings.Contains(source, fragment) {
			t.Fatalf("ListByMemberIDWithProposalFields muss worked/total Subqueries enthalten; Fragment fehlt: %q", fragment)
		}
	}
}

func TestCreateProposal_IsRoleScopedAndSerialized(t *testing.T) {
	source := readProposalRepositorySource(t, "anime_contributions_proposal_repository.go") +
		readProposalRepositorySource(t, "anime_contributions_proposal_merge_repository.go")

	required := []string{
		"lockProposalContext(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID)",
		"findExistingProposalRoles(ctx, tx, fansubGroupID, animeID, input.MemberID, input.ReleaseVersionID, input.RoleCodes)",
		"SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
		"acr.role_code = ANY($5::text[])",
		"AND status IN ('draft', 'proposed')",
		"member_id",
		"&row.FansubGroupMemberID",
	}
	for _, fragment := range required {
		if !strings.Contains(source, fragment) {
			t.Fatalf("CreateProposal muss rollenbezogene Duplikate serialisiert pruefen; Fragment fehlt: %q", fragment)
		}
	}

	oldFragment := "SELECT member_id FROM hist_fansub_group_members WHERE id = $3 AND fansub_group_id = $1"
	if strings.Contains(source, oldFragment) {
		t.Fatalf("CreateProposal darf member_id nicht mehr per hist-only Subquery ableiten; verbotenes Fragment gefunden: %q", oldFragment)
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
