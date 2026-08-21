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

const phase137DSNEnv = "TEAM4S_PHASE137_TEST_DSN"

var (
	phase137DatabasePattern = regexp.MustCompile(`^team4s_phase137_test_[a-z0-9]+$`)
	phase137SchemaPattern   = regexp.MustCompile(`^phase137_[a-z0-9_]+$`)
)

// OpenPhase137Postgres opens the dedicated Phase-137 fixture and prepares the
// minimal member/app_user/fansub_group/membership stand-in tables plus the
// real migration chain (0085, 0100, 0108, 0112, 0146, 0150) that together
// build the exact action_definitions/role_definitions/role_capabilities/
// user_group_capability_overrides/user_group_capability_override_history
// schema the Phase-137 repository primitives are tested against.
func OpenPhase137Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase137DSNEnv,
		phase137DatabasePattern,
		"phase137_",
		phase137SchemaPattern,
		createPhase137Prerequisites,
	)
}

func validatePhase137DatabaseName(name string) error {
	if !phase137DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase137DatabasePattern)
	}
	return nil
}

func validatePhase137SchemaName(name string) error {
	if !phase137SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase137SchemaPattern)
	}
	return nil
}

func createPhase137Prerequisites(t testing.TB, pool *pgxpool.Pool) {
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
CREATE TABLE fansub_group_members (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    member_id BIGINT NULL REFERENCES members(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT uq_fansub_group_members_group_user UNIQUE (fansub_group_id, app_user_id),
    CONSTRAINT chk_fansub_group_members_status CHECK (status IN ('active', 'disabled'))
);
-- Minimal stand-in required before migration 0085's Step 4 ALTER TABLE
-- hist_group_member_roles ADD CONSTRAINT fk_hist_group_member_roles_role_code
-- FOREIGN KEY (role_code) REFERENCES role_definitions(code), and before
-- migration 0112's historical role_code rewrite (Schritt 3).
CREATE TABLE hist_group_member_roles (role_code TEXT);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-137 prerequisites: %v", err)
	}
	for _, migration := range []string{
		// role_definitions (fansub_lead, group_history roles, techadmin/gfxler, assignable).
		"0085_role_definitions_seed.up.sql",
		"0100_role_definitions_fansub_lead.up.sql",
		// action_definitions + role_capabilities creation and seed.
		"0108_capability_registry.up.sql",
		"0112_role_model_cleanup.up.sql",
		// Phase-136: user_overridable catalog flag + override/history schema.
		"0146_capability_policy_catalog.up.sql",
		// Phase-137 Plan 01: management capability + pilot overridable set.
		"0150_effective_rights_overrides.up.sql",
	} {
		ApplySQLFile(t, pool, phase137MigrationPath(t, migration))
	}
}

func phase137MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-137 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
