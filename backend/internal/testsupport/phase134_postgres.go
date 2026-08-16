package testsupport

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// phase134MigrationDSNEnv is the dedicated, mandatory env var pointing at the
// `postgres` maintenance database on team4sv30-db. It never falls back to
// DATABASE_URL or any other DSN source; PMQA-03's fresh/up/down proof must be
// visibly broken (t.Fatalf), never silently skipped, when misconfigured.
const phase134MigrationDSNEnv = "TEAM4S_PHASE134_MIGRATION_DSN"

// phase134FreshDBName is the single, fixed ephemeral database the Phase-134
// migration fresh/up/down proof test DROPs and CREATEs. Unlike the
// phase128/phase106 per-run suffixed database/schema names, only one test
// ever targets this database, so an exact-match (not prefix) pattern is used.
const phase134FreshDBName = "team4s_phase134_migration_fresh"

var phase134FreshDBNamePattern = regexp.MustCompile(`^team4s_phase134_migration_fresh$`)

// OpenPhase134MaintenancePool opens a pgxpool against PostgreSQL's `postgres`
// maintenance database. DROP DATABASE / CREATE DATABASE must run from a
// connection that is not itself connected to the database being
// dropped/created, so the DSN's database is validated to be exactly
// "postgres" twice: once from the parsed config, once via a live
// current_database() round-trip (mirrors phase106_postgres.go's
// openPhasePostgres double-guard shape).
func OpenPhase134MaintenancePool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv(phase134MigrationDSNEnv)
	if strings.TrimSpace(dsn) == "" {
		t.Fatalf("%s is required for the Phase-134 migration fresh/up/down proof test", phase134MigrationDSNEnv)
	}

	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase134MigrationDSNEnv)
	require.Equalf(t, "postgres", config.ConnConfig.Database,
		"%s must connect to the postgres maintenance database, not the database being dropped/created", phase134MigrationDSNEnv)

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoError(t, err, "open Phase-134 maintenance pool")

	var runtimeDatabase string
	if err := pool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDatabase); err != nil {
		pool.Close()
		t.Fatalf("read current_database(): %v", err)
	}
	if runtimeDatabase != "postgres" {
		pool.Close()
		t.Fatalf("runtime database %q differs from required maintenance database \"postgres\"", runtimeDatabase)
	}

	return pool
}

// DropAndCreatePhase134FreshDatabase drops (if present) and recreates the
// single dedicated ephemeral database used by the migration fresh/up/down
// proof test. It first terminates any lingering connections to the target
// database so DROP DATABASE never blocks on stale sessions from a prior run.
func DropAndCreatePhase134FreshDatabase(t *testing.T, maintPool *pgxpool.Pool) {
	t.Helper()

	if !phase134FreshDBNamePattern.MatchString(phase134FreshDBName) {
		t.Fatalf("refusing to operate on unsafe database name %q", phase134FreshDBName)
	}

	ctx := context.Background()

	_, err := maintPool.Exec(
		ctx,
		`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
		phase134FreshDBName,
	)
	require.NoErrorf(t, err, "terminate lingering connections to %s", phase134FreshDBName)

	dropSQL := "DROP DATABASE IF EXISTS " + pgx.Identifier{phase134FreshDBName}.Sanitize()
	_, err = maintPool.Exec(ctx, dropSQL)
	require.NoErrorf(t, err, "drop database %s", phase134FreshDBName)

	createSQL := "CREATE DATABASE " + pgx.Identifier{phase134FreshDBName}.Sanitize() + " OWNER team4s"
	_, err = maintPool.Exec(ctx, createSQL)
	require.NoErrorf(t, err, "create database %s", phase134FreshDBName)
}

// Phase134FreshDatabaseDSN rewrites maintDSN's database-name path segment to
// point at the dedicated ephemeral fresh-proof database, reusing the host,
// port, credentials, and query parameters of the maintenance DSN.
func Phase134FreshDatabaseDSN(maintDSN string) (string, error) {
	parsed, err := url.Parse(maintDSN)
	if err != nil {
		return "", fmt.Errorf("parse maintenance DSN: %w", err)
	}

	parsed.Path = "/" + phase134FreshDBName

	return parsed.String(), nil
}
