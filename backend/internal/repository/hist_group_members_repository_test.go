package repository

import (
	"strings"
	"testing"
)

func TestHistGroupMembersListHidesActiveClaimedAppMembers(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "hist_group_members_repository.go"))

	required := []string{
		"from member_claims mc",
		"mc.claim_status = 'verified'",
		"left join fansub_group_members active_group_member",
		"active_group_member.status = 'active'",
		"and active_group_member.id is null",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected hist group member list to contain %q", fragment)
		}
	}
}
