package testsupport

import (
	"context"
	"path/filepath"
	"regexp"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5"
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
	// Migration 0152 (f_unaccent_search_path_fix) hard-codes a public.unaccent
	// dictionary lookup, but this fixture's isolated search_path deliberately
	// excludes "public" (see openPhasePostgres's safety check). The unaccent
	// extension can only live in one schema per database, so both migration
	// 0140 (search_foundation, which creates f_unaccent with an UNQUALIFIED
	// "unaccent(...)" call plus a functional GIN-trigram index over it) and
	// migration 0152 need to resolve it successfully from inside the same
	// isolated schema's connection -- 0140 via an unqualified lookup, 0152 via
	// an explicit public.unaccent lookup.
	//
	// Fix: create the extension schema-qualified in public (so 0152's
	// explicit public.unaccent reference resolves), then temporarily widen
	// this connection's search_path to [isolated schema, public] for the
	// duration of the migration run only -- unqualified CREATE TABLE/INDEX/
	// FUNCTION statements still target the isolated schema (it stays first
	// in the list), while unqualified name lookups like 0140's "unaccent(...)"
	// now also resolve via public. The search_path is narrowed back to the
	// isolated schema only immediately afterward, before this pool is handed
	// back to the caller, preserving the invariant for every query the test
	// itself issues afterward.
	ctx := context.Background()
	isolatedSchema := currentPhase139Schema(t, pool)

	if _, err := pool.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public"); err != nil {
		t.Fatalf("create public.unaccent extension for Phase-139 fixture: %v", err)
	}

	widenedSearchPath := pgx.Identifier{isolatedSchema}.Sanitize() + ", public"
	if _, err := pool.Exec(ctx, "SET search_path TO "+widenedSearchPath); err != nil {
		t.Fatalf("widen search_path for Phase-139 migration run: %v", err)
	}

	migrationsDir := phase139MigrationsDir(t)
	runner := migrations.NewRunner(pool, migrationsDir)
	_, migrateErr := runner.Up(ctx)

	narrowedSearchPath := pgx.Identifier{isolatedSchema}.Sanitize()
	if _, err := pool.Exec(ctx, "SET search_path TO "+narrowedSearchPath); err != nil {
		t.Fatalf("restore isolated search_path after Phase-139 migration run: %v", err)
	}

	if migrateErr != nil {
		t.Fatalf("apply full migration chain for Phase-139 fixture: %v", migrateErr)
	}
}

// currentPhase139Schema reads back the single isolated schema that
// openPhasePostgres already set as this pool's search_path (and already
// verified excludes "public") before calling createPhase139Prerequisites.
func currentPhase139Schema(t testing.TB, pool *pgxpool.Pool) string {
	t.Helper()
	var schemas []string
	if err := pool.QueryRow(context.Background(), "SELECT current_schemas(false)").Scan(&schemas); err != nil {
		t.Fatalf("read current schema for Phase-139 fixture: %v", err)
	}
	if len(schemas) != 1 || !phase139SchemaPattern.MatchString(schemas[0]) {
		t.Fatalf("unexpected isolated schema %v for Phase-139 fixture", schemas)
	}
	return schemas[0]
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
