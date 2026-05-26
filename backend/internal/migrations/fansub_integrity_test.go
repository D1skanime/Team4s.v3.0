package migrations

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAnimeFansubJoinMigration_FansubDeleteCascadesDetach(t *testing.T) {
	content := readMigrationFile(t, "0011_anime_fansub_groups.up.sql")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "fansub_group_id bigint not null references fansub_groups (id) on delete cascade") {
		t.Fatalf("expected anime_fansub_groups.fansub_group_id foreign key with ON DELETE CASCADE")
	}
}

func TestReleaseVersionGroupsLegacyFansubgroupIDMigrationDropsOnlyAfterSafetyCheck(t *testing.T) {
	content := readMigrationFile(t, "0057_drop_release_version_groups_fansubgroup_id.up.sql")
	normalized := strings.ToLower(content)

	requiredPatterns := []string{
		"mismatched_rows",
		"fansubgroup_id <> fansub_group_id",
		"drop column if exists fansubgroup_id",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(normalized, pattern) {
			t.Fatalf("expected migration 0057 to include %q", pattern)
		}
	}
}

func readMigrationFile(t *testing.T, filename string) string {
	t.Helper()

	path := filepath.Join("..", "..", "..", "database", "migrations", filename)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file %s failed: %v", filename, err)
	}

	return string(content)
}
