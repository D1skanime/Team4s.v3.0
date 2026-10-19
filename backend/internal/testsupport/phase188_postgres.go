package testsupport

import (
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase188DSNEnv = "TEAM4S_PHASE188_TEST_DSN"

var (
	phase188DatabasePattern = regexp.MustCompile(`^team4s_phase188_test_[a-z0-9]+$`)
	phase188SchemaPattern   = regexp.MustCompile(`^phase188_[a-z0-9_]+$`)
)

// OpenPhase188Postgres opens the dedicated Phase-188 fixture and applies the
// REAL migration 0072 (app_users + app_user_global_roles foundation) against a
// schema-isolated test database, on top of a minimal users stand-in table
// (only the columns app_users.legacy_user_id references). Used by D-07's
// gated-Re-Subjecting Postgres tests (app_auth_repository_postgres_test.go),
// which need the real app_users UNIQUE/CHECK constraints -- unlike
// OpenPhase106Postgres's trimmed app_users(id BIGINT PRIMARY KEY) stand-in.
func OpenPhase188Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase188DSNEnv,
		phase188DatabasePattern,
		"phase188_",
		phase188SchemaPattern,
		createPhase188Prerequisites,
	)
}

func validatePhase188DatabaseName(name string) error {
	if !phase188DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase188DatabasePattern)
	}
	return nil
}

func validatePhase188SchemaName(name string) error {
	if !phase188SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase188SchemaPattern)
	}
	return nil
}

// createPhase188Prerequisites creates the minimal legacy users stand-in table
// migration 0072's app_users.legacy_user_id FK requires, then applies the real
// 0072 migration file so the resulting app_users table carries the production
// UNIQUE(keycloak_subject) and status CHECK constraints verbatim.
func createPhase188Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	const usersStandInSQL = `
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(120) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
	if err := validatePhase106SQL(usersStandInSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), usersStandInSQL); err != nil {
		t.Fatalf("create Phase-188 users stand-in: %v", err)
	}

	ApplySQLFile(t, pool, phase188MigrationPath(t, "0072_keycloak_app_users_foundation.up.sql"))
}

func phase188MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-188 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
