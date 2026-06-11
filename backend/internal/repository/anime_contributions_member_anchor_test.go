package repository

import (
	"os"
	"strings"
	"testing"
)

func TestAnimeContributionsMeQueriesUseMemberIDAnchorFallback(t *testing.T) {
	memberSrc, err := os.ReadFile("anime_contributions_member_repository.go")
	if err != nil {
		t.Fatalf("read member repository: %v", err)
	}
	proposalSrc, err := os.ReadFile("anime_contributions_proposal_repository.go")
	if err != nil {
		t.Fatalf("read proposal repository: %v", err)
	}

	for name, src := range map[string]string{
		"member":   strings.ToLower(string(memberSrc)),
		"proposal": strings.ToLower(string(proposalSrc)),
	} {
		if !strings.Contains(src, "left join hist_fansub_group_members hfgm on hfgm.id = ac.fansub_group_member_id") {
			t.Fatalf("%s query must keep member_id-only anime_contributions visible with a LEFT JOIN", name)
		}
		if !strings.Contains(src, "where coalesce(ac.member_id, hfgm.member_id) = $1") {
			t.Fatalf("%s query must read the canonical member_id anchor before the legacy historical-member fallback", name)
		}
	}
}
