package repository

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
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

// TestRoleDefinitionsContextQueryIsGeneric proves RoleCodeExistsForContext's SQL is genuinely
// parameterized/generic (CLAUDE.md Teststil-Regel) by exercising it against a real, migrated
// Postgres schema with more than one (code, context) pair — instead of reading the query's SQL
// text for a single hardcoded fragment. This is a test-quality rewrite only; it does not expand
// Criterion 3's locked scope (no filter-rule change to RoleCodeExistsForContext).
func TestRoleDefinitionsContextQueryIsGeneric(t *testing.T) {
	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de, contexts, sort_order)
		VALUES ('karaoke_fx', 'Karaoke-FX', ARRAY['group_history'], 200)
		ON CONFLICT (code) DO UPDATE SET contexts = EXCLUDED.contexts`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de, contexts, sort_order)
		VALUES ('typer', 'Typer', ARRAY['anime_contribution'], 210)
		ON CONFLICT (code) DO UPDATE SET contexts = EXCLUDED.contexts`)
	require.NoError(t, err)

	repo := NewHistGroupMemberRolesRepository(pool)

	exists, err := repo.RoleCodeExistsForContext(ctx, "karaoke_fx", "group_history")
	require.NoError(t, err)
	assert.True(t, exists, "karaoke_fx must be found for its own seeded context")

	exists, err = repo.RoleCodeExistsForContext(ctx, "typer", "anime_contribution")
	require.NoError(t, err)
	assert.True(t, exists, "typer must be found for its own seeded context -- proves the query is parameterized per code, not hardcoded to karaoke_fx")

	exists, err = repo.RoleCodeExistsForContext(ctx, "karaoke_fx", "anime_contribution")
	require.NoError(t, err)
	assert.False(t, exists, "karaoke_fx must not be found for a context it was not seeded with")

	exists, err = repo.RoleCodeExistsForContext(ctx, "does_not_exist", "group_history")
	require.NoError(t, err)
	assert.False(t, exists, "an unknown role code must never be found for any context")
}
