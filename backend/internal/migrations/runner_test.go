package migrations

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseMigrationFilename(t *testing.T) {
	version, name, direction, ok := parseMigrationFilename("0004_add_comments.up.sql")
	if !ok {
		t.Fatalf("expected valid filename")
	}
	if version != 4 {
		t.Fatalf("expected version 4, got %d", version)
	}
	if name != "add_comments" {
		t.Fatalf("expected name add_comments, got %s", name)
	}
	if direction != "up" {
		t.Fatalf("expected direction up, got %s", direction)
	}

	if _, _, _, ok := parseMigrationFilename("invalid.sql"); ok {
		t.Fatalf("expected invalid filename to fail")
	}
}

func TestLoadMigrations(t *testing.T) {
	tmpDir := t.TempDir()
	writeTestFile(t, filepath.Join(tmpDir, "0002_init_episodes.up.sql"), "SELECT 1;")
	writeTestFile(t, filepath.Join(tmpDir, "0002_init_episodes.down.sql"), "SELECT 1;")
	writeTestFile(t, filepath.Join(tmpDir, "0001_init_anime.up.sql"), "SELECT 1;")
	writeTestFile(t, filepath.Join(tmpDir, "0001_init_anime.down.sql"), "SELECT 1;")
	writeTestFile(t, filepath.Join(tmpDir, "README.md"), "ignore me")

	migrations, err := loadMigrations(tmpDir)
	if err != nil {
		t.Fatalf("load migrations failed: %v", err)
	}

	if len(migrations) != 2 {
		t.Fatalf("expected 2 migrations, got %d", len(migrations))
	}

	if migrations[0].Version != 1 || migrations[1].Version != 2 {
		t.Fatalf("expected sorted migrations by version, got %d then %d", migrations[0].Version, migrations[1].Version)
	}

	if migrations[0].UpPath == "" || migrations[0].DownPath == "" {
		t.Fatalf("expected both up/down paths for migration 1")
	}
}

func TestResolveMigrationsDir_CustomDir(t *testing.T) {
	tmpDir := t.TempDir()
	resolved, err := ResolveMigrationsDir(tmpDir)
	if err != nil {
		t.Fatalf("resolve migrations dir failed: %v", err)
	}

	absTmp, _ := filepath.Abs(tmpDir)
	if resolved != absTmp {
		t.Fatalf("expected %s, got %s", absTmp, resolved)
	}
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write file %s failed: %v", path, err)
	}
}
