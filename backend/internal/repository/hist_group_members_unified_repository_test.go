package repository

import (
	"strings"
	"testing"
)

func TestUnifiedGroupMembersUsesAppMemberAnchors(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "hist_group_members_unified_repository.go"))

	required := []string{
		"app_members as",
		"left join members fgm_member on fgm_member.id = fgm.member_id",
		"left join members claimed_m on claimed_m.id = claimed.member_id",
		"left join members legacy_m on legacy_m.user_id = au.legacy_user_id",
		"coalesce(fgm_member.id, claimed_m.id, legacy_m.id) as member_id",
		"and coalesce(fgm_member.id, claimed_m.id, legacy_m.id) is not null",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected unified members query to include app member anchor fragment %q", fragment)
		}
	}
}
