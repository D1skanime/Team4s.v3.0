package repository

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// TestRoleCatalogRepositoryUsesBoundedPresentationProjection proves the public role catalog
// projection is bounded and correct by actually calling ListPublicRoleDefinitions against a
// real, migrated Postgres schema (CLAUDE.md Teststil-Regel) — replacing the former 9-fragment
// source-substring presence loop, which asserted the SQL text without ever executing the query.
// Only the forbidden-table absence check remains as source inspection, which CLAUDE.md's own
// exception 1 (absence checks) permits unchanged.
func TestRoleCatalogRepositoryUsesBoundedPresentationProjection(t *testing.T) {
	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()

	// Migration 0160 adds role_definitions.reserved, which
	// ListPublicRoleDefinitions' WHERE clause filters on (AND NOT rd.reserved). Applying it
	// here mirrors the established real-Postgres pattern in membership_baseline_registry_test.go.
	testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.up.sql"))

	// Migration 0112 already seeds 'techadmin' (contexts=[fansub_group], sort_order=5,
	// assignable=true). Add one deterministic role_capabilities row so the projection's
	// operative_capability_count/has_operative_capabilities fields have real, non-zero content
	// to assert against.
	_, err := pool.Exec(ctx, `
		INSERT INTO action_definitions (code, label_de, category, sort_order)
		VALUES ('fansub_group.members.view', 'Mitglieder anzeigen', 'gruppe', 1)
		ON CONFLICT (code) DO NOTHING`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO role_capabilities (role_code, action_code)
		VALUES ('techadmin', 'fansub_group.members.view')
		ON CONFLICT DO NOTHING`)
	require.NoError(t, err)

	repo := NewRoleCatalogRepository(pool)
	rows, err := repo.ListPublicRoleDefinitions(ctx, "fansub_group")
	require.NoError(t, err)

	var techadmin *PublicRoleDefinition
	for i := range rows {
		if rows[i].Code == "techadmin" {
			techadmin = &rows[i]
		}
	}
	require.NotNil(t, techadmin, "expected role_definitions seed row 'techadmin' (contexts=[fansub_group], migration 0112) in the bounded public projection")
	assert.Equal(t, "Techadmin", techadmin.LabelDE)
	assert.Contains(t, techadmin.Contexts, "fansub_group")
	assert.Equal(t, 5, techadmin.SortOrder)
	assert.True(t, techadmin.Assignable)
	assert.Equal(t, 1, techadmin.OperativeCapabilityCount)
	assert.True(t, techadmin.HasOperativeCapabilities)

	// Sanctioned absence check (CLAUDE.md Teststil exception 1): the repository's own SQL
	// source must never reference tables carrying authorization overrides, override audit
	// history, or IdP global roles — an identifier-must-never-appear claim, not a stand-in for
	// behavior.
	source, err := os.ReadFile("role_catalog_repository.go")
	require.NoError(t, err)
	text := string(source)
	for _, forbidden := range []string{"user_group_capability_overrides", "user_group_capability_override_history", "app_user_global_roles"} {
		if strings.Contains(text, forbidden) {
			t.Errorf("public role projection must not reference %q", forbidden)
		}
	}
}
