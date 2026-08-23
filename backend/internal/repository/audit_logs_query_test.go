package repository

import (
	"context"
	"testing"
	"time"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func openPhase138ChangesListPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return testsupport.OpenPhase137Postgres(t)
}

// seedPhase138AuditLog inserts one audit_logs row with the given actor,
// scope, and target, using the real production INSERT shape.
func seedPhase138AuditLog(
	t *testing.T,
	pool *pgxpool.Pool,
	eventType string,
	actorAppUserID *int64,
	scopeType string,
	scopeID *int64,
	targetType string,
	targetID *int64,
) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO audit_logs (
			actor_app_user_id, event_type, scope_type, scope_id,
			target_type, target_id, action_name, outcome, payload
		)
		VALUES ($1, $2, NULLIF($3, ''), $4, NULLIF($5, ''), $6, 'test_action', 'allowed', '{}'::jsonb)
	`, actorAppUserID, eventType, scopeType, scopeID, targetType, targetID)
	require.NoError(t, err)
}

// TestListChanges proves ListChanges answers D-25/D-28's cross-group
// Aenderungen workspace query: benutzer filter matches both actor AND
// target rows (mirroring GetUserAudit's OR semantics), gruppe filter scopes
// to scope_type='group' rows only, date range filtering works at the
// documented inclusive/inclusive boundary, and pagination clamps correctly.
func TestListChanges(t *testing.T) {
	pool := openPhase138ChangesListPool(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `INSERT INTO app_users (id, status) VALUES (1001, 'active'), (1002, 'active') ON CONFLICT (id) DO NOTHING`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES (2001) ON CONFLICT (id) DO NOTHING`)
	require.NoError(t, err)

	repo := NewAuditLogRepository(pool)

	// Row 1: actor=1001, scope=group/2001, target=member_claim
	seedPhase138AuditLog(t, pool, "member_claim.verified", int64Ptr(1001), "group", int64Ptr(2001), "member_claim", int64Ptr(9001))
	// Row 2: no actor, target=app_user/1002 (benutzer=1002 should match via target OR-clause)
	seedPhase138AuditLog(t, pool, "app_user.status_changed", nil, "", nil, "app_user", int64Ptr(1002))
	// Row 3: actor=1002, no scope
	seedPhase138AuditLog(t, pool, "role_capability.granted", int64Ptr(1002), "", nil, "role_capability", nil)

	t.Run("benutzer filter matches both actor and target rows", func(t *testing.T) {
		benutzer := int64(1002)
		rows, total, err := repo.ListChanges(ctx, ChangeListFilter{AppUserID: &benutzer})
		require.NoError(t, err)
		assert.Equal(t, 2, total)
		require.Len(t, rows, 2)
		eventTypes := []string{rows[0].EventType, rows[1].EventType}
		assert.Contains(t, eventTypes, "app_user.status_changed")
		assert.Contains(t, eventTypes, "role_capability.granted")
	})

	t.Run("gruppe filter scopes to scope_type='group' rows only", func(t *testing.T) {
		gruppe := int64(2001)
		rows, total, err := repo.ListChanges(ctx, ChangeListFilter{ScopeGroupID: &gruppe})
		require.NoError(t, err)
		require.Len(t, rows, 1)
		assert.Equal(t, 1, total)
		assert.Equal(t, "member_claim.verified", rows[0].EventType)
		assert.Equal(t, "group", rows[0].ScopeType)
	})

	t.Run("target_type filter scopes correctly", func(t *testing.T) {
		targetType := "role_capability"
		rows, _, err := repo.ListChanges(ctx, ChangeListFilter{TargetType: &targetType})
		require.NoError(t, err)
		require.Len(t, rows, 1)
		assert.Equal(t, "role_capability.granted", rows[0].EventType)
	})

	t.Run("date range filtering: inclusive from/to boundary", func(t *testing.T) {
		now := time.Now().UTC()
		past := now.Add(-1 * time.Hour)
		future := now.Add(1 * time.Hour)
		rows, total, err := repo.ListChanges(ctx, ChangeListFilter{From: &past, To: &future})
		require.NoError(t, err)
		assert.Equal(t, 3, total)
		assert.Len(t, rows, 3)

		// A window strictly in the future excludes everything.
		windowFrom := future
		rowsEmpty, totalEmpty, err := repo.ListChanges(ctx, ChangeListFilter{From: &windowFrom})
		require.NoError(t, err)
		assert.NotNil(t, rowsEmpty)
		assert.Empty(t, rowsEmpty)
		assert.Equal(t, 0, totalEmpty)
	})

	t.Run("pagination clamps correctly", func(t *testing.T) {
		rows, total, err := repo.ListChanges(ctx, ChangeListFilter{Limit: 2, Offset: 0})
		require.NoError(t, err)
		require.Len(t, rows, 2)
		assert.Equal(t, 3, total)

		limit, _ := ClampAdminListPage(99999, -5)
		assert.Equal(t, adminListMaxLimit, limit)
	})
}
