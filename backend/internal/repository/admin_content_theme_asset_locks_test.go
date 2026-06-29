package repository

import (
	"os"
	"strings"
	"testing"
)

func TestThemeAssetUploadLocks_SourceInvariants(t *testing.T) {
	src, err := os.ReadFile("admin_content_anime_themes.go")
	if err != nil {
		t.Fatalf("repository source nicht lesbar: %v", err)
	}
	content := string(src)

	if !strings.Contains(content, "func (r *AdminContentRepository) HasReleaseAssetSegmentUploadBlockedForRelease") {
		t.Fatal("release_asset-Segmente brauchen einen eigenen Upload-Lock fuer Nicht-Start-Episoden")
	}
	if !strings.Contains(content, "ts.source_type = 'release_asset'") {
		t.Fatal("release_asset-Lock muss explizit auf release_asset-Segmente pruefen")
	}
	if !strings.Contains(content, "ts.start_episode <> rc.episode_anchor") {
		t.Fatal("release_asset-Lock darf den Segmentstart selbst nicht sperren")
	}
	if strings.Contains(content, "COALESCE(NULLIF(BTRIM(ts.source_type), ''), '') <> ''") {
		t.Fatal("globaler Segment-Lock darf release_asset nicht pauschal als globale Quelle behandeln")
	}
}
