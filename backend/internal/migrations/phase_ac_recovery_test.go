package migrations

import (
	"strings"
	"testing"
)

func TestPhaseCBackfillMigration_CreatesReleaseGraphRows(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0036_backfill_releases_from_episode"+"_versions.up.sql"))

	required := []string{
		"insert into fansub_releases",
		"insert into release_versions",
		"insert into release_variants",
		"insert into streams",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0036 to contain %q", fragment)
		}
	}
}

func TestPhaseCBackfillMigration_UsesDistinctOnForReleaseVariantStreamCollapse(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0036_backfill_releases_from_episode"+"_versions.up.sql"))

	required := []string{
		"insert into fansub_releases",
		"insert into release_variants",
		"insert into streams",
		"select distinct on (e.id, ev.fansub_group_id)",
		"select distinct on (rv.id)",
		"select distinct on (rvar.id)",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0036 to contain %q", fragment)
		}
	}
}
