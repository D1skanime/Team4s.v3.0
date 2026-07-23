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

const phase107DSNEnv = "TEAM4S_PHASE107_TEST_DSN"

var (
	phase107DatabasePattern = regexp.MustCompile(`^team4s_phase107_test_[a-z0-9]+$`)
	phase107SchemaPattern   = regexp.MustCompile(`^phase107_[a-z0-9_]+$`)
)

// OpenPhase107Postgres opens the dedicated Phase-107 fixture and prepares only
// the current tables needed by the Phase-106 point foundation and Phase 107.
func OpenPhase107Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase107DSNEnv,
		phase107DatabasePattern,
		"phase107_",
		phase107SchemaPattern,
		createPhase107Prerequisites,
	)
}

func validatePhase107DatabaseName(name string) error {
	if !phase107DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase107DatabasePattern)
	}
	return nil
}

func validatePhase107SchemaName(name string) error {
	if !phase107SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase107SchemaPattern)
	}
	return nil
}

func createPhase107Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE members (
    id BIGINT PRIMARY KEY
);
CREATE TABLE app_users (
    id BIGINT PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    CONSTRAINT chk_app_users_status CHECK (status IN ('pending', 'active', 'disabled'))
);
CREATE TABLE fansub_groups (
    id BIGINT PRIMARY KEY
);
CREATE TABLE release_versions (
    id BIGINT PRIMARY KEY
);
CREATE TABLE fansub_group_members (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    member_id BIGINT NULL REFERENCES members(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT uq_fansub_group_members_group_user UNIQUE (fansub_group_id, app_user_id),
    CONSTRAINT chk_fansub_group_members_status CHECK (status IN ('active', 'disabled'))
);
CREATE TABLE member_claims (
    id BIGINT PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    claim_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_member_claims_member_user UNIQUE (member_id, app_user_id),
    CONSTRAINT chk_member_claims_status CHECK (claim_status IN ('pending', 'verified', 'rejected'))
);
CREATE TABLE action_definitions (
    code TEXT PRIMARY KEY,
    label_de TEXT NOT NULL,
    category TEXT,
    sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE role_definitions (
    code TEXT PRIMARY KEY,
    label_de TEXT NOT NULL,
    contexts TEXT[] NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE role_capabilities (
    role_code TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
    action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_code, action_code)
);
INSERT INTO role_definitions (code, label_de, contexts, sort_order)
VALUES ('fansub_lead', 'Fansub-Leitung', ARRAY['fansub_group'], 1);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-107 prerequisites: %v", err)
	}
	for _, migration := range []string{
		"0131_member_point_foundation.up.sql",
		"0132_member_point_foundation_review_hardening.up.sql",
		"0133_member_point_whitespace_hardening.up.sql",
	} {
		ApplySQLFile(t, pool, phase107MigrationPath(t, migration))
	}
}

func phase107MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-107 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
