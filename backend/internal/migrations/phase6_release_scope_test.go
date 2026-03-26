package migrations

import (
	"strings"
	"testing"
)

func TestPhase6ReleaseDecompositionMigration_CreatesAdditiveTablesOnly(t *testing.T) {
	content := strings.ToLower(readMigrationFile(t, "0034_add_release_decomposition_tables.up.sql"))

	required := []string{
		"create table if not exists release_sources",
		"create table if not exists fansub_releases",
		"create table if not exists release_versions",
		"create table if not exists release_variants",
		"create table if not exists release_streams",
		"create table if not exists stream_sources",
		"create table if not exists stream_types",
		"create table if not exists visibilities",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected migration 0034 to contain %q", fragment)
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
			t.Fatalf("expected migration 0034 to exclude %q", fragment)
		}
	}
}
