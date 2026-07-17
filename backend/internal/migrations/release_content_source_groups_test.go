package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestReleaseContentSourceGroupsMigrationIsSafeAndReversible(t *testing.T) {
	up, err := os.ReadFile("../../../database/migrations/0130_release_content_source_groups.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := os.ReadFile("../../../database/migrations/0130_release_content_source_groups.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	u := string(up)
	for _, needle := range []string{
		"release_version_media", "release_version_notes", "fansub_group_id BIGINT NULL",
		"REFERENCES fansub_groups(id) ON DELETE SET NULL",
		"HAVING COUNT(DISTINCT ac.fansub_group_id) = 1",
		"release_version_groups", "claim_status = 'verified'",
	} {
		if !strings.Contains(u, needle) {
			t.Fatalf("UP missing %q", needle)
		}
	}
	if strings.Contains(u, "MIN(rvg.fansub_group_id)") {
		t.Fatal("must not choose an arbitrary release group")
	}
	d := string(down)
	if !strings.Contains(d, "DROP COLUMN IF EXISTS fansub_group_id") || !strings.Contains(d, "DROP INDEX IF EXISTS") {
		t.Fatal("DOWN must remove indexes and columns")
	}
}
