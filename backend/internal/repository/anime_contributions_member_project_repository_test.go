package repository

import (
	"os"
	"strings"
	"testing"
)

func TestMemberProjectDetailRepositorySourceInvariants(t *testing.T) {
	content, err := os.ReadFile("anime_contributions_member_project_repository.go")
	if err != nil {
		t.Fatalf("read repository source: %v", err)
	}
	src := strings.ToLower(string(content))

	required := []string{
		"offset 1",
		"count(ac.id) > 0 as has_own_contribution",
		"from release_version_notes rvn",
		"from release_version_media rvm",
		"rvm.uploaded_by_user_id = $2",
		"coalesce(ac.member_id, hfgm.member_id) = $1",
		"ac.status = 'confirmed'",
	}
	for _, fragment := range required {
		if !strings.Contains(src, fragment) {
			t.Fatalf("expected source to contain %q", fragment)
		}
	}
}
