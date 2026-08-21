package repository

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPhase137AuthzUserOverridesValidation proves every mutation/read primitive
// rejects invalid input (nil repository, nil db, non-positive IDs, blank
// action codes) with repository.ErrValidation before ever touching the
// database -- these do not need a real Postgres connection.
func TestPhase137AuthzUserOverridesValidation(t *testing.T) {
	ctx := context.Background()
	for name, run := range map[string]func(*AuthzUserOverridesRepository) error{
		"load current overrides nil db": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.LoadCurrentOverrides(ctx, 1, 1)
			return err
		},
		"load current overrides invalid user": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.LoadCurrentOverrides(ctx, 0, 1)
			return err
		},
		"load current overrides invalid group": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.LoadCurrentOverrides(ctx, 1, 0)
			return err
		},
		"lock target membership nil db": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.LockTargetMembership(ctx, 1, 1)
			return err
		},
		"lock target membership invalid ids": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.LockTargetMembership(ctx, -1, 1)
			return err
		},
		"load override policy nil db": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.LoadOverridePolicy(ctx, "fansub_group_media.upload")
			return err
		},
		"load override policy blank action": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.LoadOverridePolicy(ctx, "  ")
			return err
		},
		"upsert override nil db": func(repo *AuthzUserOverridesRepository) error {
			_, _, err := repo.UpsertOverride(ctx, 1, 1, "fansub_group_media.upload", "allow", 1)
			return err
		},
		"upsert override invalid effect": func(repo *AuthzUserOverridesRepository) error {
			_, _, err := repo.UpsertOverride(ctx, 1, 1, "fansub_group_media.upload", "maybe", 1)
			return err
		},
		"delete override nil db": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.DeleteOverride(ctx, 1, 1, "fansub_group_media.upload")
			return err
		},
		"append history nil db": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.AppendHistory(ctx, UserGroupCapabilityOverrideHistoryEntry{
				AppUserID: 1, FansubGroupID: 1, ActionCode: "fansub_group_media.upload", ActorAppUserID: 1,
			})
			return err
		},
		"list history nil db": func(repo *AuthzUserOverridesRepository) error {
			_, err := repo.ListHistoryForSubject(ctx, 1, 1, 10, 0)
			return err
		},
	} {
		t.Run(name, func(t *testing.T) {
			assert.ErrorIs(t, run(NewAuthzUserOverridesRepository(nil)), ErrValidation)
		})
	}
}

func openPhase137OverridesPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return testsupport.OpenPhase137Postgres(t)
}

func seedPhase137Membership(
	t *testing.T,
	pool *pgxpool.Pool,
	memberID, appUserID, fansubGroupID, membershipID int64,
	appUserStatus, membershipStatus string,
) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO app_users (id, status) VALUES ($1, $2)`, appUserID, appUserStatus)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, member_id, status)
		VALUES ($1, $2, $3, $4, $5)
	`, membershipID, fansubGroupID, appUserID, memberID, membershipStatus)
	require.NoError(t, err)
}

// TestPhase137AuthzUserOverridesLoadCurrentOverridesGroupScoped proves the
// batched load returns every current override for exactly one
// (app_user_id, fansub_group_id) pair and that a foreign group's override
// row never leaks into the result, even for the same app_user_id.
func TestPhase137AuthzUserOverridesLoadCurrentOverridesGroupScoped(t *testing.T) {
	pool := openPhase137OverridesPool(t)
	ctx := context.Background()

	seedPhase137Membership(t, pool, 101, 11, 21, 31, "active", "active")
	seedPhase137Membership(t, pool, 101, 11, 22, 32, "active", "active")

	_, err := pool.Exec(ctx, `
		INSERT INTO user_group_capability_overrides
			(app_user_id, fansub_group_id, action_code, effect, created_by_app_user_id, updated_by_app_user_id)
		VALUES
			(11, 21, 'fansub_group_media.upload', 'deny', 11, 11),
			(11, 21, 'fansub_group_media.update', 'allow', 11, 11),
			(11, 22, 'fansub_group_media.upload', 'allow', 11, 11)
	`)
	require.NoError(t, err)

	repo := NewAuthzUserOverridesRepository(pool)
	overrides, err := repo.LoadCurrentOverrides(ctx, 11, 21)
	require.NoError(t, err)
	require.Len(t, overrides, 2)
	for _, o := range overrides {
		assert.EqualValues(t, 21, o.FansubGroupID, "foreign group 22's override row must never leak into group 21's result")
	}
}

// TestPhase137AuthzUserOverridesLockTargetMembershipDistinguishesInactiveAndMissing
// proves an active membership resolves and locks normally, an inactive
// membership is returned (not hidden) so the caller can distinguish it from
// a genuinely missing membership, and a non-member returns ErrNotFound.
func TestPhase137AuthzUserOverridesLockTargetMembershipDistinguishesInactiveAndMissing(t *testing.T) {
	pool := openPhase137OverridesPool(t)
	ctx := context.Background()

	seedPhase137Membership(t, pool, 201, 41, 51, 61, "active", "active")
	seedPhase137Membership(t, pool, 202, 42, 51, 62, "active", "disabled")
	// Non-member: app_user 43 exists but has no fansub_group_members row for group 51.
	_, err := pool.Exec(ctx, `INSERT INTO app_users (id, status) VALUES (43, 'active')`)
	require.NoError(t, err)

	repo := NewAuthzUserOverridesRepository(pool)

	active, err := repo.LockTargetMembership(ctx, 41, 51)
	require.NoError(t, err)
	require.NotNil(t, active)
	assert.Equal(t, "active", active.Status)
	assert.EqualValues(t, 61, active.MembershipID)

	inactive, err := repo.LockTargetMembership(ctx, 42, 51)
	require.NoError(t, err)
	require.NotNil(t, inactive)
	assert.Equal(t, "disabled", inactive.Status, "an existing-but-inactive membership must be returned, not hidden as not-found")

	_, err = repo.LockTargetMembership(ctx, 43, 51)
	assert.ErrorIs(t, err, ErrNotFound)

	// Manipulated/foreign group id for an otherwise-valid user must not
	// resolve any row (BOLA/IDOR guard at the query level).
	_, err = repo.LockTargetMembership(ctx, 41, 999)
	assert.ErrorIs(t, err, ErrNotFound)
}

// TestPhase137AuthzUserOverridesLoadOverridePolicy proves the catalog fact is
// read correctly for an overridable action, a non-overridable action, and
// rejected as ErrNotFound for an unknown action code.
func TestPhase137AuthzUserOverridesLoadOverridePolicy(t *testing.T) {
	pool := openPhase137OverridesPool(t)
	ctx := context.Background()
	repo := NewAuthzUserOverridesRepository(pool)

	overridable, err := repo.LoadOverridePolicy(ctx, "fansub_group_media.upload")
	require.NoError(t, err)
	assert.True(t, overridable.UserOverridable)

	nonOverridable, err := repo.LoadOverridePolicy(ctx, "fansub_group.edit")
	require.NoError(t, err)
	assert.False(t, nonOverridable.UserOverridable)

	_, err = repo.LoadOverridePolicy(ctx, "unknown.action.code")
	assert.ErrorIs(t, err, ErrNotFound)
}

// TestPhase137AuthzUserOverridesUpsertDeleteExposeBeforeAfterState proves the
// upsert/delete primitives return before/after state to the caller in one
// atomic, row-locked round trip: none->allow, allow->deny, deny->(deleted).
func TestPhase137AuthzUserOverridesUpsertDeleteExposeBeforeAfterState(t *testing.T) {
	pool := openPhase137OverridesPool(t)
	ctx := context.Background()

	seedPhase137Membership(t, pool, 301, 71, 81, 91, "active", "active")

	repo := NewAuthzUserOverridesRepository(pool)
	const action = "fansub_group_media.upload"

	before, after, err := repo.UpsertOverride(ctx, 71, 81, action, "allow", 71)
	require.NoError(t, err)
	assert.Nil(t, before, "no prior row must report before=nil")
	assert.Equal(t, "allow", after)

	before, after, err = repo.UpsertOverride(ctx, 71, 81, action, "deny", 71)
	require.NoError(t, err)
	require.NotNil(t, before)
	assert.Equal(t, "allow", *before)
	assert.Equal(t, "deny", after)

	deletedBefore, err := repo.DeleteOverride(ctx, 71, 81, action)
	require.NoError(t, err)
	require.NotNil(t, deletedBefore)
	assert.Equal(t, "deny", *deletedBefore)

	// Deleting again is a true no-op: nil before, no error.
	noopBefore, err := repo.DeleteOverride(ctx, 71, 81, action)
	require.NoError(t, err)
	assert.Nil(t, noopBefore)

	var remaining int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM user_group_capability_overrides
		WHERE app_user_id = 71 AND fansub_group_id = 81 AND action_code = $1
	`, action).Scan(&remaining))
	assert.Equal(t, 0, remaining)
}

// TestPhase137AuthzUserOverridesAppendAndListHistoryGroupScoped proves history
// is inserted append-only (the DB trigger rejects UPDATE/DELETE independent
// of this repository) and listed only within an explicit
// (app_user_id, fansub_group_id) scope -- a foreign subject's history never
// leaks into another subject's list.
func TestPhase137AuthzUserOverridesAppendAndListHistoryGroupScoped(t *testing.T) {
	pool := openPhase137OverridesPool(t)
	ctx := context.Background()

	seedPhase137Membership(t, pool, 401, 91, 101, 111, "active", "active")
	seedPhase137Membership(t, pool, 402, 92, 101, 112, "active", "active")

	repo := NewAuthzUserOverridesRepository(pool)
	allow := "allow"
	deny := "deny"
	taskDelegation := "task_delegation"

	_, err := repo.AppendHistory(ctx, UserGroupCapabilityOverrideHistoryEntry{
		AppUserID: 91, FansubGroupID: 101, ActionCode: "fansub_group_media.upload",
		ActorAppUserID: 91, BeforeEffect: nil, AfterEffect: &allow, ReasonCategory: &taskDelegation,
	})
	require.NoError(t, err)
	_, err = repo.AppendHistory(ctx, UserGroupCapabilityOverrideHistoryEntry{
		AppUserID: 91, FansubGroupID: 101, ActionCode: "fansub_group_media.upload",
		ActorAppUserID: 91, BeforeEffect: &allow, AfterEffect: &deny, ReasonCategory: &taskDelegation,
	})
	require.NoError(t, err)
	// Different subject in the same group -- must not appear in subject 91's list.
	_, err = repo.AppendHistory(ctx, UserGroupCapabilityOverrideHistoryEntry{
		AppUserID: 92, FansubGroupID: 101, ActionCode: "fansub_group_media.upload",
		ActorAppUserID: 92, BeforeEffect: nil, AfterEffect: &allow, ReasonCategory: &taskDelegation,
	})
	require.NoError(t, err)

	entries, err := repo.ListHistoryForSubject(ctx, 91, 101, 10, 0)
	require.NoError(t, err)
	require.Len(t, entries, 2, "only subject 91's own two transitions must be listed")
	// Most recent first.
	require.NotNil(t, entries[0].AfterEffect)
	assert.Equal(t, "deny", *entries[0].AfterEffect)

	// The append-only trigger (migration 0146) rejects UPDATE/DELETE
	// independent of this repository's own discipline.
	_, err = pool.Exec(ctx, `UPDATE user_group_capability_override_history SET after_effect = 'allow' WHERE id = $1`, entries[0].ID)
	assert.Error(t, err, "append-only trigger must reject UPDATE")
}
