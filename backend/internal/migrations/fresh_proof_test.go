// Package migrations_test (external test package, not internal `package
// migrations`): fresh_proof_test.go is deliberately isolated here, not in the
// internal `package migrations` test files alongside it, because Phase 139
// added `testsupport.OpenPhase139Postgres`, which imports the `migrations`
// package directly (calls migrations.NewRunner(...).Up(...)). If this file
// stayed `package migrations` and kept importing `testsupport`, that would
// create a real import cycle: migrations(test) -> testsupport -> migrations.
// Moving only this file to the external test package breaks the cycle with
// zero behavior change (every symbol it calls, NewRunner/ResolveMigrationsDir,
// was already exported) — the standard Go idiom for this exact situation.
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

// TestPhase134MigrationFreshUpDownProof is the first place in this codebase
// where the full down-migration chain (database/migrations, 145 up/down
// pairs) runs end-to-end. It DROPs and CREATEs a dedicated ephemeral
// database (never team4s_v2), applies every migration via
// migrations.Runner.Up, asserts zero pending/missing migrations, rolls every
// migration back via migrations.Runner.Down, and asserts zero residual
// application tables remain (schema_migrations itself is intentionally kept
// by Runner.Down/EnsureTrackingTable and is excluded from that check).
//
// Pitfall (RESEARCH.md): if a specific down migration fails here, that is a
// genuine, previously-latent bug in that migration's .down.sql file — fix
// the migration directly. Do not skip, steps-limit, or otherwise weaken this
// test to work around a failing down migration; surfacing that failure is
// this test's entire purpose.
func TestPhase134MigrationFreshUpDownProof(t *testing.T) {
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
	require.NoError(t, err, "apply migrations to fresh database")
	require.Positive(t, applied, "expected at least one migration to apply to a genuinely empty database")

	status, err := runner.Status(ctx)
	require.NoError(t, err, "read status after Up")
	require.Zerof(t, status.PendingCount, "expected zero pending migrations after Up, got %d", status.PendingCount)
	require.Emptyf(t, status.MissingLocals, "expected zero DB-applied-but-locally-missing migrations, got %v", status.MissingLocals)

	rolledBack, err := runner.Down(ctx, applied)
	require.NoError(t, err, "roll back every applied migration")
	require.Equalf(t, applied, rolledBack, "expected every applied migration (%d) to roll back cleanly, got %d", applied, rolledBack)

	status, err = runner.Status(ctx)
	require.NoError(t, err, "read status after Down")
	require.Equalf(t, 0, status.AppliedCount, "expected zero applied migrations after full Down, got %d", status.AppliedCount)

	var residualCount int
	err = freshPool.QueryRow(
		ctx,
		`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations'`,
	).Scan(&residualCount)
	require.NoError(t, err, "count residual application tables")
	require.Zerof(t, residualCount, "expected zero residual application tables after full Down, found %d", residualCount)
}
