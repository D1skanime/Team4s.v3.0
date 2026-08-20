package repository

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRoleDefinitionsContextKaraokeFXFollowsSeededContexts(t *testing.T) {
	migrationPath := filepath.Join("..", "..", "..", "database", "migrations", "0146_capability_policy_catalog.up.sql")
	migrationBytes, err := os.ReadFile(migrationPath)
	if err != nil {
		t.Fatal(err)
	}
	migration := string(migrationBytes)
	start := strings.Index(migration, "'karaoke_fx'")
	if start < 0 {
		t.Fatal("karaoke_fx seed missing")
	}
	karaokeSeed := migration[start:]
	end := strings.Index(karaokeSeed, "ON CONFLICT")
	if end < 0 {
		t.Fatal("karaoke_fx seed boundary missing")
	}
	karaokeSeed = karaokeSeed[:end]

	if !strings.Contains(karaokeSeed, "ARRAY['fansub_group', 'anime_contribution']") {
		t.Fatal("karaoke_fx must retain its canonical seeded contexts")
	}
	if strings.Contains(karaokeSeed, "group_history") {
		t.Fatal("karaoke_fx must not leak into group_history without catalog metadata")
	}
}

func TestRoleDefinitionsContextQueryIsGeneric(t *testing.T) {
	sourceBytes, err := os.ReadFile("hist_group_member_roles_repository.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(sourceBytes)
	if !strings.Contains(source, "WHERE code = $1 AND $2 = ANY(contexts)") {
		t.Fatal("role context acceptance must be parameterized for karaoke_fx, typer and future codes")
	}
}
