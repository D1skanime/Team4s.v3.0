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
-- Minimal stand-in required before migration 0085's Step 4 ALTER TABLE
-- hist_group_member_roles ADD CONSTRAINT fk_hist_group_member_roles_role_code
-- FOREIGN KEY (role_code) REFERENCES role_definitions(code) -- mirrors
-- phase137_postgres.go's identical precedent for the same migration step.
CREATE TABLE hist_group_member_roles (role_code TEXT);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-107 prerequisites: %v", err)
	}
	// D-06 (176-09): action_definitions/role_definitions/role_capabilities used to be
	// hand-rolled stub tables here with zero role_capabilities rows and no
	// user_group_capability_overrides/user_group_capability_override_history tables at
	// all. permissions.Service.ResolveGroupRights' GroupRightsOverridesResolver path
	// (AuthzRepository.ResolveActorUserOverrides) queries user_group_capability_overrides
	// unconditionally for every CanForFansubGroup/CanReviewForFansubGroup check, so every
	// real-Postgres consumer of this fixture that did not hand-roll its own copy of that
	// table failed with "relation \"user_group_capability_overrides\" does not exist".
	// This now runs the same real migration chain phase137_postgres.go already proved for
	// the identical capability-registry schema (role_definitions, action_definitions,
	// role_capabilities, user_group_capability_overrides, user_group_capability_override_history),
	// applied ADDITIVELY on top of the hand-rolled identity tables above -- schema
	// extension, not replacement, per D-06's explicit constraint.
	for _, migration := range []string{
		// role_definitions (fansub_lead, assignable/reserved metadata).
		"0085_role_definitions_seed.up.sql",
		"0100_role_definitions_fansub_lead.up.sql",
		// action_definitions + role_capabilities creation and seed (fansub_lead gets
		// fansub_group.members.manage here -- the exact grant GrantDelegation/
		// RevokeDelegation's authorization step checks).
		"0108_capability_registry.up.sql",
		"0112_role_model_cleanup.up.sql",
		// Phase-136: user_overridable catalog flag + override/history schema.
		"0146_capability_policy_catalog.up.sql",
		// Phase-137 Plan 01: management capability + pilot overridable set.
		"0150_effective_rights_overrides.up.sql",
	} {
		ApplySQLFile(t, pool, phase107MigrationPath(t, migration))
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
