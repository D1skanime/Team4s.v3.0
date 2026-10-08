package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// TestRoleCodeIsAssignableForContext proves, against real PostgreSQL, that
// RoleCodeIsAssignableForContext rejects role codes that exist in the requested context but
// are marked non-assignable (role_definitions.assignable = false) — the production state of
// admin/other since migration 0148_role_catalog_uat_corrections (176 scope addition 1) — while
// still allowing genuinely assignable role codes through, and resolving neutrally (false, nil)
// for blank/unknown codes, mirroring RoleCodeExistsForContext's existing neutral-failure contract.
func TestRoleCodeIsAssignableForContext(t *testing.T) {
	pool := testsupport.OpenPhase145Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de, contexts, sort_order, assignable)
		VALUES ('admin_like', 'Administration (Test)', ARRAY['anime_contribution'], 300, false)
		ON CONFLICT (code) DO UPDATE SET contexts = EXCLUDED.contexts, assignable = EXCLUDED.assignable`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de, contexts, sort_order, assignable)
		VALUES ('other_like', 'Sonstiges (Test)', ARRAY['anime_contribution'], 310, false)
		ON CONFLICT (code) DO UPDATE SET contexts = EXCLUDED.contexts, assignable = EXCLUDED.assignable`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de, contexts, sort_order, assignable)
		VALUES ('translator_like', 'Übersetzung (Test)', ARRAY['anime_contribution'], 320, true)
		ON CONFLICT (code) DO UPDATE SET contexts = EXCLUDED.contexts, assignable = EXCLUDED.assignable`)
	require.NoError(t, err)

	repo := NewHistGroupMemberRolesRepository(pool)

	assignable, err := repo.RoleCodeIsAssignableForContext(ctx, "admin_like", "anime_contribution")
	require.NoError(t, err)
	assert.False(t, assignable, "a role seeded with assignable=false must never be reported assignable, even though it exists in the context")

	assignable, err = repo.RoleCodeIsAssignableForContext(ctx, "other_like", "anime_contribution")
	require.NoError(t, err)
	assert.False(t, assignable, "a second role seeded with assignable=false must also resolve non-assignable")

	assignable, err = repo.RoleCodeIsAssignableForContext(ctx, "translator_like", "anime_contribution")
	require.NoError(t, err)
	assert.True(t, assignable, "a role seeded with assignable=true in the requested context must resolve assignable")

	assignable, err = repo.RoleCodeIsAssignableForContext(ctx, "admin_like", "group_history")
	require.NoError(t, err)
	assert.False(t, assignable, "a role must resolve non-assignable for a context it was not seeded with, independent of its assignable flag")

	assignable, err = repo.RoleCodeIsAssignableForContext(ctx, "", "anime_contribution")
	require.NoError(t, err)
	assert.False(t, assignable, "a blank role code must resolve neutrally to false, not error")

	assignable, err = repo.RoleCodeIsAssignableForContext(ctx, "does_not_exist_xyz", "anime_contribution")
	require.NoError(t, err)
	assert.False(t, assignable, "an unknown role code must resolve neutrally to false, not error")
}
