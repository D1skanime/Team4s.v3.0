package migrations

import (
	"strings"
	"testing"
)

func TestPhaseCBackfillMigration_PreservesEpisodeVersionsTransitionLink(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0036_backfill_releases_from_episode_versions.up.sql"))

	required := []string{
		"alter table episode_versions add column if not exists fansub_release_id bigint references fansub_releases(id)",
		"comment on column episode_versions.fansub_release_id is 'reference to migrated fansub_release (transition period)'",
		"join episode_versions ev on ev.anime_id = e.anime_id",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0036 to contain %q", fragment)
		}
	}
}

func TestPhaseCBackfillMigration_UsesDistinctOnForReleaseVariantStreamCollapse(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0036_backfill_releases_from_episode_versions.up.sql"))

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
