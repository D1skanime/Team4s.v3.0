// Package migrations_test (external test package, mirrors fresh_proof_test.go's
// import-cycle rationale: testsupport imports the internal `migrations` package,
// so this file must live outside `package migrations` to call testsupport helpers).
package migrations_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/migrations"
	"team4s.v3/backend/internal/testsupport"
)

// TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible proves migration
// 0159's real .up.sql content is idempotent and that its .down.sql leaves the 12
// techadmin rows migration 0153 established intact.
//
// A bare second runner.Up(ctx) call would NOT prove idempotency: Runner.Up skips
// any version already recorded in schema_migrations regardless of that version's
// SQL content (see runner.go's appliedVersions[migration.Version] check). To
// force a genuine re-execution of 0159's raw DELETE + INSERT ... ON CONFLICT DO
// NOTHING SQL, this test deletes ONLY 0159's own schema_migrations tracking row
// directly against freshPool between the two Up() calls, leaving every other
// migration's tracking row (1..158) intact, then calls runner.Up(ctx) again.
func TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible(t *testing.T) {
	maintPool := testsupport.OpenPhase134MaintenancePool(t)
	// Registered before the drop-again cleanup below so it runs AFTER it:
	// t.Cleanup callbacks execute in LIFO order, and the final teardown drop
	// needs maintPool still open.
	t.Cleanup(func() {
		maintPool.Close()
	})

	testsupport.DropAndCreatePhase134FreshDatabase(t, maintPool)

	t.Cleanup(func() {
		testsupport.DropAndCreatePhase134FreshDatabase(t, maintPool)
	})

	freshDSN, err := testsupport.Phase134FreshDatabaseDSN(os.Getenv("TEAM4S_PHASE134_MIGRATION_DSN"))
	require.NoError(t, err, "build fresh-proof database DSN")

	freshPool, err := pgxpool.New(context.Background(), freshDSN)
	require.NoError(t, err, "open fresh-proof database pool")
	defer freshPool.Close()

	migrationsDir, err := migrations.ResolveMigrationsDir("")
	require.NoError(t, err, "resolve migrations dir")

	runner := migrations.NewRunner(freshPool, migrationsDir)
	ctx := context.Background()

	applied, err := runner.Up(ctx)
	require.NoError(t, err, "apply full migration chain to fresh database")
	require.Positive(t, applied, "expected at least one migration to apply to a genuinely empty database")

	firstCount := countRoleCapabilities(t, ctx, freshPool)
	require.Positive(t, firstCount, "expected role_capabilities to be populated after the full chain applies")

	// 13, not 12: migration 0153 grants techadmin its 12 baseline actions, and
	// migration 0155 separately grants 'fansub_group_media.update_own' to every
	// assignable role with a 'fansub_group' context (a broad, role-agnostic
	// SELECT ... FROM role_definitions grant, not a techadmin-specific one) --
	// techadmin qualifies, so it picks up that 13th action too. Migration 0159's
	// up.sql is additive-only (INSERT ... ON CONFLICT DO NOTHING, no DELETE,
	// per CR-02's fix) and its own 232-tuple catalog does not list
	// 'fansub_group_media.update_own' for techadmin, so it neither adds nor
	// removes that row -- it simply survives. (Before the CR-02 fix, 0159's
	// unconditional DELETE FROM role_capabilities silently destroyed this
	// legitimately-migrated 13th row on every application, which is exactly
	// the class of data loss CR-02 flagged.)
	techadminCountAfterFirstUp := countTechadminCapabilities(t, ctx, freshPool)
	require.Equal(t, int64(13), techadminCountAfterFirstUp, "expected the 12 techadmin rows from migration 0153 plus the 1 broad grant from migration 0155 to survive migration 0159's additive-only up.sql")

	// Force a genuine re-execution of 0159's raw .up.sql: remove only its own
	// tracking row, not any other migration's.
	_, err = freshPool.Exec(ctx, "DELETE FROM schema_migrations WHERE version = $1", int64(159))
	require.NoError(t, err, "clear migration 0159's tracking row to force re-application")

	appliedAgain, err := runner.Up(ctx)
	require.NoError(t, err, "re-apply migration 0159 after clearing its tracking row")
	require.Equal(t, 1, appliedAgain, "expected exactly one migration (0159) to re-apply")

	secondCount := countRoleCapabilities(t, ctx, freshPool)
	require.Equal(t, firstCount, secondCount, "expected role_capabilities row count to be unchanged after 0159's up.sql re-executed (idempotency)")

	// Revert exactly one migration (0159, since it is the only one tracked
	// again after the re-applied Up() above) and confirm the 12 techadmin
	// rows from migration 0153 survive.
	rolledBack, err := runner.Down(ctx, 1)
	require.NoError(t, err, "revert migration 0159")
	require.Equal(t, 1, rolledBack, "expected exactly one migration to be rolled back")

	// Still 13 (see the comment above techadminCountAfterFirstUp): 0159's
	// down.sql only deletes the 220 non-techadmin tuples its own up.sql
	// inserted -- it never touches any techadmin row, so the 13th row from
	// migration 0155 is untouched by the rollback either.
	techadminCountAfterDown := countTechadminCapabilities(t, ctx, freshPool)
	require.Equal(t, int64(13), techadminCountAfterDown, "expected all 13 techadmin rows (12 from migration 0153 plus 1 from migration 0155) to survive migration 0159's down.sql")
}

func countRoleCapabilities(t *testing.T, ctx context.Context, pool *pgxpool.Pool) int64 {
	t.Helper()

	var count int64
	err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM role_capabilities").Scan(&count)
	require.NoError(t, err, "count role_capabilities rows")

	return count
}

func countTechadminCapabilities(t *testing.T, ctx context.Context, pool *pgxpool.Pool) int64 {
	t.Helper()

	var count int64
	err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM role_capabilities WHERE role_code = 'techadmin'").Scan(&count)
	require.NoError(t, err, "count techadmin role_capabilities rows")

	return count
}
