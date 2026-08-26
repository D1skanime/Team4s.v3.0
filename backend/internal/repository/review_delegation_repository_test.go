package repository

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type phase107DelegationRow func(...any) error

func (row phase107DelegationRow) Scan(dest ...any) error {
	return row(dest...)
}

type phase107DelegationDB struct {
	query       string
	queryArgs   []any
	row         pgx.Row
	execQueries []string
	execArgs    [][]any
	execTags    []pgconn.CommandTag
	execErr     error
}

func (db *phase107DelegationDB) QueryRow(_ context.Context, query string, args ...any) pgx.Row {
	db.query = query
	db.queryArgs = args
	return db.row
}

func (db *phase107DelegationDB) Exec(_ context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	db.execQueries = append(db.execQueries, query)
	db.execArgs = append(db.execArgs, args)
	if db.execErr != nil {
		return pgconn.CommandTag{}, db.execErr
	}
	tag := db.execTags[0]
	db.execTags = db.execTags[1:]
	return tag, nil
}

func TestPhase107ReviewDelegationLockReturnsPolicySnapshot(t *testing.T) {
	memberID := int64(44)
	db := &phase107DelegationDB{
		row: phase107DelegationRow(func(dest ...any) error {
			*dest[0].(*int64) = 31
			*dest[1].(*int64) = 21
			*dest[2].(*int64) = 11
			*dest[3].(**int64) = &memberID
			*dest[4].(*string) = "active"
			*dest[5].(*string) = "active"
			*dest[6].(*bool) = true
			return nil
		}),
	}

	got, err := NewReviewDelegationRepository(db).LockMembership(context.Background(), 31)

	require.NoError(t, err)
	require.NotNil(t, got)
	assert.EqualValues(t, 31, got.MembershipID)
	assert.EqualValues(t, 21, got.FansubGroupID)
	assert.EqualValues(t, 11, got.AppUserID)
	require.NotNil(t, got.MemberID)
	assert.EqualValues(t, 44, *got.MemberID)
	assert.Equal(t, "active", got.MembershipStatus)
	assert.Equal(t, "active", got.AppUserStatus)
	assert.True(t, got.HasVerifiedMemberClaim)
	assert.Contains(t, strings.ToUpper(db.query), "FOR UPDATE")
	assert.Equal(t, []any{int64(31)}, db.queryArgs)
}

func TestPhase107ReviewDelegationLockValidationAndMissingMembership(t *testing.T) {
	for name, repo := range map[string]*ReviewDelegationRepository{
		"nil repository": nil,
		"nil database":   NewReviewDelegationRepository(nil),
	} {
		t.Run(name, func(t *testing.T) {
			_, err := repo.LockMembership(context.Background(), 1)
			assert.ErrorIs(t, err, ErrValidation)
		})
	}

	db := &phase107DelegationDB{
		row: phase107DelegationRow(func(...any) error { return pgx.ErrNoRows }),
	}
	_, err := NewReviewDelegationRepository(db).LockMembership(context.Background(), 31)
	assert.ErrorIs(t, err, ErrNotFound)

	_, err = NewReviewDelegationRepository(db).LockMembership(context.Background(), 0)
	assert.ErrorIs(t, err, ErrValidation)
}

func TestPhase107ReviewDelegationGrantChangedAndIdempotent(t *testing.T) {
	db := &phase107DelegationDB{
		execTags: []pgconn.CommandTag{
			pgconn.NewCommandTag("INSERT 0 1"),
			pgconn.NewCommandTag("INSERT 0 0"),
		},
	}
	repo := NewReviewDelegationRepository(db)

	changed, err := repo.GrantAction(context.Background(), 31, " review.text.decide ")
	require.NoError(t, err)
	assert.True(t, changed)
	changed, err = repo.GrantAction(context.Background(), 31, "review.text.decide")
	require.NoError(t, err)
	assert.False(t, changed)

	require.Len(t, db.execQueries, 2)
	assert.Contains(t, strings.ToUpper(db.execQueries[0]), "ON CONFLICT DO NOTHING")
	assert.Equal(t, []any{int64(31), "review.text.decide"}, db.execArgs[0])
}

func TestPhase107ReviewDelegationRevokeChangedAndIdempotent(t *testing.T) {
	db := &phase107DelegationDB{
		execTags: []pgconn.CommandTag{
			pgconn.NewCommandTag("DELETE 1"),
			pgconn.NewCommandTag("DELETE 0"),
		},
	}
	repo := NewReviewDelegationRepository(db)

	changed, err := repo.RevokeAction(context.Background(), 31, "review.text.decide")
	require.NoError(t, err)
	assert.True(t, changed)
	changed, err = repo.RevokeAction(context.Background(), 31, "review.text.decide")
	require.NoError(t, err)
	assert.False(t, changed)

	require.Len(t, db.execQueries, 2)
	assert.Contains(t, strings.ToUpper(db.execQueries[0]), "DELETE FROM FANSUB_GROUP_MEMBER_REVIEW_CAPABILITIES")
	assert.Equal(t, []any{int64(31), "review.text.decide"}, db.execArgs[0])
}

func TestPhase107ReviewDelegationGrantRevokeValidation(t *testing.T) {
	for name, run := range map[string]func(*ReviewDelegationRepository) error{
		"grant nil database": func(repo *ReviewDelegationRepository) error {
			_, err := repo.GrantAction(context.Background(), 1, "review.text.decide")
			return err
		},
		"grant invalid membership": func(repo *ReviewDelegationRepository) error {
			_, err := repo.GrantAction(context.Background(), 0, "review.text.decide")
			return err
		},
		"grant blank action": func(repo *ReviewDelegationRepository) error {
			_, err := repo.GrantAction(context.Background(), 1, "\u00a0")
			return err
		},
		"revoke nil database": func(repo *ReviewDelegationRepository) error {
			_, err := repo.RevokeAction(context.Background(), 1, "review.text.decide")
			return err
		},
		"revoke invalid membership": func(repo *ReviewDelegationRepository) error {
			_, err := repo.RevokeAction(context.Background(), -1, "review.text.decide")
			return err
		},
		"revoke blank action": func(repo *ReviewDelegationRepository) error {
			_, err := repo.RevokeAction(context.Background(), 1, "\u2028")
			return err
		},
	} {
		t.Run(name, func(t *testing.T) {
			assert.ErrorIs(t, run(NewReviewDelegationRepository(nil)), ErrValidation)
		})
	}
}

func TestPhase107ReviewDelegationLockGrantRevokeIdempotentInactive(t *testing.T) {
	pool := openPhase107ReviewRepositoryPool(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO members(id) VALUES (101);
		INSERT INTO app_users(id, status) VALUES (11, 'active');
		INSERT INTO fansub_groups(id) VALUES (21);
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
		VALUES (31, 21, 11, 101, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES (41, 101, 11, 'verified', NOW());
	`)
	require.NoError(t, err)

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	repo := NewReviewDelegationRepository(tx)
	snapshot, err := repo.LockMembership(ctx, 31)
	require.NoError(t, err)
	assert.True(t, snapshot.HasVerifiedMemberClaim)

	lockCtx, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancel()
	_, lockErr := pool.Exec(lockCtx, `UPDATE fansub_group_members SET status = 'disabled' WHERE id = 31`)
	require.Error(t, lockErr, "FOR UPDATE must hold the exact membership row")

	changed, err := repo.GrantAction(ctx, 31, "review.text.decide")
	require.NoError(t, err)
	assert.True(t, changed)
	changed, err = repo.GrantAction(ctx, 31, "review.text.decide")
	require.NoError(t, err)
	assert.False(t, changed)
	require.NoError(t, tx.Commit(ctx))

	_, err = pool.Exec(ctx, `UPDATE fansub_group_members SET status = 'disabled' WHERE id = 31`)
	require.NoError(t, err)
	var grantCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM fansub_group_member_review_capabilities
		WHERE fansub_group_member_id = 31 AND action_code = 'review.text.decide'
	`).Scan(&grantCount))
	assert.Equal(t, 1, grantCount, "membership inactivity must not erase the stored grant")

	tx, err = pool.Begin(ctx)
	require.NoError(t, err)
	repo = NewReviewDelegationRepository(tx)
	changed, err = repo.RevokeAction(ctx, 31, "review.text.decide")
	require.NoError(t, err)
	assert.True(t, changed)
	changed, err = repo.RevokeAction(ctx, 31, "review.text.decide")
	require.NoError(t, err)
	assert.False(t, changed)
	require.NoError(t, tx.Commit(ctx))
}

func openPhase107ReviewRepositoryPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve review repository test path")
	}
	testsupport.ApplySQLFile(
		t,
		pool,
		filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0134_review_foundation.up.sql"),
	)
	return pool
}

// 260826-6vu -- LoadDelegationSnapshot tests, closing 140-VERIFICATION.md
// Gap 2 (no fake-DBTX unit test and no real-Postgres integration test for the
// non-locking read model).

func TestLoadDelegationSnapshotReturnsPolicySnapshot(t *testing.T) {
	memberID := int64(101)
	db := &phase107DelegationDB{
		row: phase107DelegationRow(func(dest ...any) error {
			*dest[0].(*int64) = 31
			*dest[1].(*int64) = 21
			*dest[2].(*int64) = 11
			*dest[3].(**int64) = &memberID
			*dest[4].(*string) = "active"
			*dest[5].(*string) = "active"
			*dest[6].(*bool) = true
			*dest[7].(*[]string) = []string{"review.image.decide", "review.text.decide"}
			return nil
		}),
	}

	got, err := NewReviewDelegationRepository(db).LoadDelegationSnapshot(context.Background(), 31)

	require.NoError(t, err)
	require.NotNil(t, got)
	assert.EqualValues(t, 31, got.MembershipID)
	assert.EqualValues(t, 21, got.FansubGroupID)
	assert.EqualValues(t, 11, got.AppUserID)
	require.NotNil(t, got.MemberID)
	assert.EqualValues(t, 101, *got.MemberID)
	assert.Equal(t, "active", got.MembershipStatus)
	assert.Equal(t, "active", got.AppUserStatus)
	assert.True(t, got.HasVerifiedMemberClaim)
	assert.ElementsMatch(t, []string{"review.image.decide", "review.text.decide"}, got.GrantedActionCodes)
	assert.NotContains(t, strings.ToUpper(db.query), "FOR UPDATE")
	assert.Equal(t, []any{int64(31)}, db.queryArgs)
}

func TestLoadDelegationSnapshotValidationAndNotFound(t *testing.T) {
	for name, repo := range map[string]*ReviewDelegationRepository{
		"nil repository": nil,
		"nil database":   NewReviewDelegationRepository(nil),
	} {
		t.Run(name, func(t *testing.T) {
			_, err := repo.LoadDelegationSnapshot(context.Background(), 1)
			assert.ErrorIs(t, err, ErrValidation)
		})
	}

	db := &phase107DelegationDB{
		row: phase107DelegationRow(func(...any) error { return pgx.ErrNoRows }),
	}
	repo := NewReviewDelegationRepository(db)

	_, err := repo.LoadDelegationSnapshot(context.Background(), 0)
	assert.ErrorIs(t, err, ErrValidation)

	_, err = repo.LoadDelegationSnapshot(context.Background(), -1)
	assert.ErrorIs(t, err, ErrValidation)
}

func TestLoadDelegationSnapshotWrapsNotFound(t *testing.T) {
	db := &phase107DelegationDB{
		row: phase107DelegationRow(func(...any) error { return pgx.ErrNoRows }),
	}
	_, err := NewReviewDelegationRepository(db).LoadDelegationSnapshot(context.Background(), 31)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestPhase107LoadDelegationSnapshotAgainstRealPostgres(t *testing.T) {
	pool := openPhase107ReviewRepositoryPool(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO members(id) VALUES (101);
		INSERT INTO app_users(id, status) VALUES (11, 'active');
		INSERT INTO fansub_groups(id) VALUES (21);
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
		VALUES (31, 21, 11, 101, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES (41, 101, 11, 'verified', NOW());
	`)
	require.NoError(t, err)

	repo := NewReviewDelegationRepository(pool)
	_, err = repo.GrantAction(ctx, 31, "review.text.decide")
	require.NoError(t, err)
	_, err = repo.GrantAction(ctx, 31, "review.image.decide")
	require.NoError(t, err)

	snapshot, err := repo.LoadDelegationSnapshot(ctx, 31)
	require.NoError(t, err)
	require.NotNil(t, snapshot)
	assert.ElementsMatch(t, []string{"review.text.decide", "review.image.decide"}, snapshot.GrantedActionCodes)
	assert.Equal(t, "active", snapshot.MembershipStatus)
	assert.Equal(t, "active", snapshot.AppUserStatus)
	assert.True(t, snapshot.HasVerifiedMemberClaim)
	require.NotNil(t, snapshot.MemberID)
	assert.EqualValues(t, 101, *snapshot.MemberID)

	_, err = repo.LoadDelegationSnapshot(ctx, 9999)
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestPhase107ReviewDelegationSourceBoundary(t *testing.T) {
	content, err := os.ReadFile("review_delegation_repository.go")
	if errors.Is(err, os.ErrNotExist) {
		t.Fatal("review delegation repository is not implemented")
	}
	require.NoError(t, err)
	source := strings.ToUpper(string(content))
	assert.NotContains(t, source, ".BEGIN(")
	assert.NotContains(t, source, ".COMMIT(")
	assert.NotContains(t, source, ".ROLLBACK(")
}
