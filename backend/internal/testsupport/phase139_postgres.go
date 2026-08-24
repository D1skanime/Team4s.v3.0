package testsupport

import (
	"context"
	"path/filepath"
	"regexp"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"team4s.v3/backend/internal/migrations"
)

const phase139DSNEnv = "TEAM4S_PHASE139_TEST_DSN"

var (
	phase139DatabasePattern = regexp.MustCompile(`^team4s_phase139_test_[a-z0-9]+$`)
	phase139SchemaPattern   = regexp.MustCompile(`^phase139_[a-z0-9_]+$`)
)

// OpenPhase139Postgres opens the dedicated Phase-139 fixture and applies the
// COMPLETE real migration chain via migrations.Runner.Up, instead of hand-
// assembled stand-in tables (Decision, resolves 139-RESEARCH.md Assumption
// A2 explicitly). anime_contributions/episodes/release_crew_snapshots/
// release_version_media's real FK dependency chain reaches back through
// migrations 0001, 0002, 0009, 0033, 0035, 0059, 0024, 0026, 0086-0091,
// 0137, 0146, 0150 — a much wider surface than any prior phaseNNN_postgres.go
// harness. Hand-assembling ~15+ stand-in tables risks silently diverging
// from the real FK/CHECK constraints those migrations encode; the migration
// runner already exists, is already proven end-to-end by Phase 134's
// fresh/up/down proof tooling, and requires zero new code beyond calling it.
func OpenPhase139Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase139DSNEnv,
		phase139DatabasePattern,
		"phase139_",
		phase139SchemaPattern,
		createPhase139Prerequisites,
	)
}

// createPhase139Prerequisites applies every unapplied migration in
// database/migrations, in filename order, inside the already-isolated
// per-test schema that openPhasePostgres set as this pool's search_path
// before calling this callback. No hand-written CREATE TABLE statements are
// needed here — the Runner creates every table (including its own
// schema_migrations tracking table) directly in that isolated schema.
func createPhase139Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	migrationsDir := phase139MigrationsDir(t)
	runner := migrations.NewRunner(pool, migrationsDir)
	if _, err := runner.Up(context.Background()); err != nil {
		t.Fatalf("apply full migration chain for Phase-139 fixture: %v", err)
	}
}

// phase139MigrationsDir resolves database/migrations relative to this
// source file's location (runtime.Caller(0)), mirroring
// phase137MigrationPath's convention — deterministic regardless of the
// working directory `go test` happens to use, unlike
// migrations.ResolveMigrationsDir's CWD-based candidate probing.
func phase139MigrationsDir(t testing.TB) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-139 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations")
}
