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

const phase135DSNEnv = "TEAM4S_PHASE135_TEST_DSN"

var (
	phase135DatabasePattern = regexp.MustCompile(`^team4s_phase135_test_[a-z0-9]+$`)
	phase135SchemaPattern   = regexp.MustCompile(`^phase135_[a-z0-9_]+$`)
)

// OpenPhase135Postgres opens the dedicated Phase-135 fixture and prepares the
// minimal hist_group_member_roles stand-in table plus the real role_definitions
// migration chain (0085, 0100, 0103, 0112) needed to prove D-06's
// assignable=true-only fix against a genuinely migrated schema.
func OpenPhase135Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase135DSNEnv,
		phase135DatabasePattern,
		"phase135_",
		phase135SchemaPattern,
		createPhase135Prerequisites,
	)
}

func validatePhase135DatabaseName(name string) error {
	if !phase135DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase135DatabasePattern)
	}
	return nil
}

func validatePhase135SchemaName(name string) error {
	if !phase135SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase135SchemaPattern)
	}
	return nil
}

func createPhase135Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	// Minimal FK stand-in required before migration 0085's Step 4 ALTER TABLE
	// hist_group_member_roles ADD CONSTRAINT fk_hist_group_member_roles_role_code
	// FOREIGN KEY (role_code) REFERENCES role_definitions(code).
	//
	// role_capabilities is a second minimal empty FK-free stand-in, for
	// ListFansubGroupRoleDefinitions's LEFT JOIN role_capabilities rc ON
	// rc.role_code = rd.code; the table is kept empty so
	// COUNT(rc.action_code) resolves to 0 per role instead of erroring on a
	// missing relation.
	const sql = `CREATE TABLE hist_group_member_roles (role_code TEXT);
CREATE TABLE role_capabilities (role_code TEXT, action_code TEXT);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-135 prerequisites: %v", err)
	}
	for _, migration := range []string{
		"0085_role_definitions_seed.up.sql",
		"0100_role_definitions_fansub_lead.up.sql",
		"0103_fansub_roles_group_history_context.up.sql",
		"0112_role_model_cleanup.up.sql",
	} {
		ApplySQLFile(t, pool, phase135MigrationPath(t, migration))
	}
	// 185-07 deviation: ListFansubGroupRoleDefinitions (added after this
	// fixture's 0112 cutoff) also selects rd.color_key/rd.icon_key (migration
	// 0146) and filters WHERE NOT rd.reserved (migration 0160). Applying
	// either migration file in full would require action_definitions.
	// user_overridable/app_users/fansub_groups (0146) or an ON CONFLICT
	// (role_code, action_code) target on role_capabilities that this minimal,
	// constraint-free stand-in deliberately omits (0160's INSERT), so only
	// the three additive columns are mirrored here with each migration's own
	// defaults. No row is inserted for 0160's reserved-pseudo-role
	// ('group_member'): TestListFansubGroupRoleDefinitionsGroupContextRoles
	// never expects it in its result set regardless of presence, since the
	// production query excludes every reserved=true row.
	const colorIconReservedSQL = `ALTER TABLE role_definitions
    ADD COLUMN color_key TEXT NOT NULL DEFAULT 'other',
    ADD COLUMN icon_key TEXT NOT NULL DEFAULT 'other',
    ADD COLUMN reserved BOOLEAN NOT NULL DEFAULT false;`
	if err := validatePhase106SQL(colorIconReservedSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), colorIconReservedSQL); err != nil {
		t.Fatalf("add Phase-135 role_definitions color/icon/reserved columns: %v", err)
	}
}

func phase135MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-135 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
