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

	techadminCountAfterFirstUp := countTechadminCapabilities(t, ctx, freshPool)
	require.Equal(t, int64(12), techadminCountAfterFirstUp, "expected the 12 techadmin rows from migration 0153 to survive migration 0159's up.sql")

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

	techadminCountAfterDown := countTechadminCapabilities(t, ctx, freshPool)
	require.Equal(t, int64(12), techadminCountAfterDown, "expected the 12 techadmin rows from migration 0153 to survive migration 0159's down.sql")
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
