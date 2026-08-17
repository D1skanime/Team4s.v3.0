package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDiffKeycloakGlobalRoleSync(t *testing.T) {
	t.Run("token grants admin without env or prior row", func(t *testing.T) {
		toAssign, toRevoke := diffKeycloakGlobalRoleSync(nil, []string{"platform_admin"})
		assert.Equal(t, []string{"platform_admin"}, toAssign)
		assert.Empty(t, toRevoke)
	})

	t.Run("no token role means never granted", func(t *testing.T) {
		toAssign, toRevoke := diffKeycloakGlobalRoleSync(nil, nil)
		assert.Empty(t, toAssign)
		assert.Empty(t, toRevoke)
	})

	t.Run("revoked realm role is removed bidirectionally", func(t *testing.T) {
		toAssign, toRevoke := diffKeycloakGlobalRoleSync([]string{"platform_admin"}, nil)
		assert.Empty(t, toAssign)
		assert.Equal(t, []string{"platform_admin"}, toRevoke)
	})

	t.Run("unmanaged default Keycloak roles are ignored", func(t *testing.T) {
		toAssign, toRevoke := diffKeycloakGlobalRoleSync(nil, []string{"platform_admin", "offline_access", "uma_authorization"})
		assert.Equal(t, []string{"platform_admin"}, toAssign)
		assert.Empty(t, toRevoke)
	})

	t.Run("multi-role sync is additive and preserving", func(t *testing.T) {
		toAssign, toRevoke := diffKeycloakGlobalRoleSync([]string{"content_admin"}, []string{"platform_admin", "content_admin"})
		assert.Equal(t, []string{"platform_admin"}, toAssign)
		assert.Empty(t, toRevoke)
	})

	t.Run("no-op when current already equals managed subset of realm roles", func(t *testing.T) {
		toAssign, toRevoke := diffKeycloakGlobalRoleSync([]string{"platform_admin"}, []string{"platform_admin"})
		assert.Empty(t, toAssign)
		assert.Empty(t, toRevoke)
	})
}

// openPhase107AuthzKeycloakSyncPool extends the shared Phase-107 fixture
// (already used by authz_permissions_test.go) with the app_user_global_roles
// table from migration 0072, mirroring its schema and CHECK constraint. Like
// every other Phase-107 test in this package, it skips (not fails) when
// TEAM4S_PHASE107_TEST_DSN is unset, consistent with the existing convention.
func openPhase107AuthzKeycloakSyncPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openPhase107AuthzRepositoryPool(t)
	_, err := pool.Exec(context.Background(), `
		CREATE TABLE app_user_global_roles (
			app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
			role VARCHAR(40) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (app_user_id, role),
			CONSTRAINT chk_app_user_global_roles_role CHECK (role IN ('platform_admin', 'content_admin', 'user'))
		)
	`)
	require.NoError(t, err)
	return pool
}

func TestSyncGlobalRolesFromKeycloak(t *testing.T) {
	pool := openPhase107AuthzKeycloakSyncPool(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO app_users(id, status) VALUES (901, 'active');
	`)
	require.NoError(t, err)

	repo := NewAuthzRepository(pool)

	roles, err := repo.SyncGlobalRolesFromKeycloak(context.Background(), 901, []string{"platform_admin"})
	require.NoError(t, err)
	assert.Equal(t, []string{"platform_admin"}, roles)

	has, err := repo.AppUserHasGlobalRole(context.Background(), 901, "platform_admin")
	require.NoError(t, err)
	assert.True(t, has, "platform_admin must be granted purely from the JIT sync, no bootstrap env or manual insert")

	roles, err = repo.SyncGlobalRolesFromKeycloak(context.Background(), 901, nil)
	require.NoError(t, err)
	assert.Empty(t, roles)

	has, err = repo.AppUserHasGlobalRole(context.Background(), 901, "platform_admin")
	require.NoError(t, err)
	assert.False(t, has, "revoking the realm role must remove the app_user_global_roles row on next sync")
}
