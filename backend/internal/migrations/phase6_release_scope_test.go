package migrations

import (
	"strings"
	"testing"
)

func TestPhase6ReleaseDecompositionMigration_CreatesAdditiveTablesOnly(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0037_add_release_decomposition_tables.up.sql"))

	required := []string{
		"alter table release_sources",
		"add column if not exists type varchar(40)",
		"create index if not exists idx_release_sources_type",
		"alter table fansub_releases",
		"add column if not exists updated_at timestamptz not null default now()",
		"alter table release_versions",
		"add column if not exists legacy_episode_version_id bigint",
		"add column if not exists release_date timestamptz",
		"add column if not exists title varchar(255)",
		"alter table release_variants",
		"add column if not exists subtitle_type varchar(20)",
		"create table if not exists visibilities",
		"create table if not exists stream_sources",
		"create table if not exists release_streams",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0037 to contain %q", fragment)
		}
	}

	forbidden := []string{
		"drop table episode_versions",
		"alter table episode_versions drop",
		"delete from episode_versions",
		"insert into fansub_releases select",
		"insert into release_versions select",
		"insert into release_variants select",
		"insert into release_streams select",
	}
	for _, fragment := range forbidden {
		if strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0037 to exclude %q", fragment)
	}
}
}
