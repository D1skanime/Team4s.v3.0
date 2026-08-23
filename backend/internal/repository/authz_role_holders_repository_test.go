package repository

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func openPhase137RoleHoldersPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return testsupport.OpenPhase137Postgres(t)
}

// seedPhase138RoleHolderMembership seeds one fansub-group membership with a
// display identity (email/display_name/preferred_username) and one role
// assignment in fansub_group_member_roles.
func seedPhase138RoleHolderMembership(
	t *testing.T,
	pool *pgxpool.Pool,
	appUserID, fansubGroupID, membershipID int64,
	email, displayName, groupName, membershipStatus, roleCode string,
) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO app_users (id, status, email, display_name)
		VALUES ($1, 'active', $2, $3)
		ON CONFLICT (id) DO NOTHING
	`, appUserID, email, displayName)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_groups (id, name) VALUES ($1, $2)
		ON CONFLICT (id) DO NOTHING
	`, fansubGroupID, groupName)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, status)
		VALUES ($1, $2, $3, $4)
	`, membershipID, fansubGroupID, appUserID, membershipStatus)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_member_roles (fansub_group_member_id, role)
		VALUES ($1, $2)
	`, membershipID, roleCode)
	require.NoError(t, err)
}

// TestListRoleHolders proves ListRoleHolders answers "who holds fansub-group
// role X, in which group, with what membership status and override
// presence" (138-RESEARCH.md R-03, D-07): a seeded fansub_lead holder is
// returned with the correct group name and has_overrides=false, an inserted
// user_group_capability_overrides row for the same (app_user_id,
// fansub_group_id) flips has_overrides to true, a role code with zero
// holders returns an empty (not nil-panicking) slice, and the query never
// returns a row for a different role code than requested.
func TestListRoleHolders(t *testing.T) {
	pool := openPhase137RoleHoldersPool(t)
	ctx := context.Background()
	repo := NewAuthzRepository(pool)

	seedPhase138RoleHolderMembership(
		t, pool,
		301, 401, 501,
		"lead@example.test", "Fansub Lead", "Chocolate Subs", "active", "fansub_lead",
	)
	// Second membership with a DIFFERENT role to prove cross-role leakage never happens.
	seedPhase138RoleHolderMembership(
		t, pool,
		302, 401, 502,
		"encoder@example.test", "Encoder Person", "Chocolate Subs", "active", "encoder",
	)

	t.Run("returns seeded holder with correct group and has_overrides=false", func(t *testing.T) {
		holders, err := repo.ListRoleHolders(ctx, "fansub_lead")
		require.NoError(t, err)
		require.Len(t, holders, 1)
		holder := holders[0]
		assert.EqualValues(t, 301, holder.AppUserID)
		assert.Equal(t, "Fansub Lead", holder.DisplayName)
		assert.Equal(t, "lead@example.test", holder.Email)
		assert.EqualValues(t, 401, holder.FansubGroupID)
		assert.Equal(t, "Chocolate Subs", holder.FansubGroupName)
		assert.Equal(t, "active", holder.MembershipStatus)
		assert.False(t, holder.HasOverrides)
	})

	t.Run("has_overrides flips to true after an override row exists for the same subject", func(t *testing.T) {
		_, err := pool.Exec(ctx, `
			INSERT INTO user_group_capability_overrides
				(app_user_id, fansub_group_id, action_code, effect, created_by_app_user_id, updated_by_app_user_id)
			VALUES (301, 401, 'fansub_group_media.upload', 'allow', 301, 301)
		`)
		require.NoError(t, err)

		holders, err := repo.ListRoleHolders(ctx, "fansub_lead")
		require.NoError(t, err)
		require.Len(t, holders, 1)
		assert.True(t, holders[0].HasOverrides)
	})

	t.Run("a role code with zero holders returns an empty, non-nil slice", func(t *testing.T) {
		holders, err := repo.ListRoleHolders(ctx, "raw_provider")
		require.NoError(t, err)
		require.NotNil(t, holders)
		assert.Empty(t, holders)
	})

	t.Run("never returns a row for a different role code than requested", func(t *testing.T) {
		holders, err := repo.ListRoleHolders(ctx, "encoder")
		require.NoError(t, err)
		require.Len(t, holders, 1)
		assert.EqualValues(t, 302, holders[0].AppUserID)
	})
}
