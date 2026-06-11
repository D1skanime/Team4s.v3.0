package repository

import (
	"os"
	"strings"
	"testing"
)

func TestAnimeContributionDisplayRowsExposeMemberAvatarURL(t *testing.T) {
	contentBytes, err := os.ReadFile("anime_contributions_repository.go")
	if err != nil {
		t.Fatalf("read anime contributions repository: %v", err)
	}
	content := strings.ToLower(string(contentBytes))

	requiredFragments := []string{
		"memberavatarurl",
		"json:\"member_avatar_url,omitempty\"",
		"left join media_assets member_avatar on member_avatar.id = m.avatar_media_id",
		"member_avatar.file_path",
		"enrichanimecontributiondisplayrow",
		"publicurlforpath",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected anime contribution display avatar fragment %q", fragment)
		}
	}
}
