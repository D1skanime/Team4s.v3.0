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

func readMigrationFile(t *testing.T, filename string) string {
	t.Helper()

	path := filepath.Join("..", "..", "..", "database", "migrations", filename)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration file %s failed: %v", filename, err)
	}

	return string(content)
}
