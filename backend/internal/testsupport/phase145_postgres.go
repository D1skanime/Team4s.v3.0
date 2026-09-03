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

const phase145DSNEnv = "TEAM4S_PHASE145_TEST_DSN"

var (
	phase145DatabasePattern = regexp.MustCompile(`^team4s_phase145_test_[a-z0-9]+$`)
	phase145SchemaPattern   = regexp.MustCompile(`^phase145_[a-z0-9_]+$`)
)

// OpenPhase145Postgres opens the dedicated Phase-145 fixture and applies the real migration
// chain (0085, 0100, 0108, 0112) that builds the role_definitions/action_definitions/
// role_capabilities schema Plan 145-02's tests apply/roll back migration 0160 against.
// Deliberately stops BEFORE migration 0160 -- the tests themselves apply and roll it back to
// prove idempotency/rollback (see membership_baseline_registry_test.go).
func OpenPhase145Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase145DSNEnv,
		phase145DatabasePattern,
		"phase145_",
		phase145SchemaPattern,
		createPhase145Prerequisites,
	)
}

func validatePhase145DatabaseName(name string) error {
	if !phase145DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase145DatabasePattern)
	}
	return nil
}

func validatePhase145SchemaName(name string) error {
	if !phase145SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase145SchemaPattern)
	}
	return nil
}

func createPhase145Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()

	// Minimal stand-in required before migration 0085's Step 4 ALTER TABLE
	// hist_group_member_roles ADD CONSTRAINT fk_hist_group_member_roles_role_code FOREIGN KEY
	// (role_code) REFERENCES role_definitions(code), and before migration 0112's historical
	// role_code rewrite -- mirrors phase137_postgres.go's identical stand-in.
	const preMigrationSQL = `CREATE TABLE hist_group_member_roles (role_code TEXT);`
	if err := validatePhase106SQL(preMigrationSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), preMigrationSQL); err != nil {
		t.Fatalf("create Phase-145 pre-migration prerequisites: %v", err)
	}

	for _, migration := range []string{
		// role_definitions (fansub_lead, group_history roles, techadmin/gfxler, assignable).
		"0085_role_definitions_seed.up.sql",
		"0100_role_definitions_fansub_lead.up.sql",
		// action_definitions + role_capabilities creation and seed.
		"0108_capability_registry.up.sql",
		"0112_role_model_cleanup.up.sql",
	} {
		ApplySQLFile(t, pool, phase145MigrationPath(t, migration))
	}

	// Migration 0160 (applied/rolled-back by the tests themselves, not here) seeds
	// role_capabilities rows referencing action_definitions('fansub_group_media.view',
	// 'fansub_group_media.upload') and ListCapabilityMatrix (Task 3) selects
	// role_definitions.color_key/icon_key and action_definitions.description_de/
	// help_text_de/user_overridable. Those columns/rows are real production migrations
	// 0109/0146 respectively -- both pull in unrelated production tables (fansub_group_media,
	// users) outside this fixture's blast radius, so only the exact columns/rows this plan's
	// tests actually touch are replicated here as a minimal stand-in, mirroring
	// phase137_postgres.go's own post-migration-SQL precedent. Without this, applying
	// migration 0160's up.sql would fail with a role_capabilities -> action_definitions FK
	// violation, and Task 3's ListCapabilityMatrix query would fail to compile against the
	// schema (missing columns).
	const postMigrationSQL = `
ALTER TABLE role_definitions
	ADD COLUMN IF NOT EXISTS color_key TEXT NOT NULL DEFAULT 'other',
	ADD COLUMN IF NOT EXISTS icon_key TEXT NOT NULL DEFAULT 'other';
ALTER TABLE action_definitions
	ADD COLUMN IF NOT EXISTS description_de TEXT,
	ADD COLUMN IF NOT EXISTS help_text_de TEXT,
	ADD COLUMN IF NOT EXISTS user_overridable BOOLEAN NOT NULL DEFAULT false;
INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
	('fansub_group_media.view', 'Gruppenmedien anzeigen', 'gruppe', 100),
	('fansub_group_media.upload', 'Gruppenmedien hochladen', 'gruppe', 110)
ON CONFLICT (code) DO NOTHING;`
	if err := validatePhase106SQL(postMigrationSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), postMigrationSQL); err != nil {
		t.Fatalf("create Phase-145 post-migration prerequisites: %v", err)
	}
}

func phase145MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-145 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
