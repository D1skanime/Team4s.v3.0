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

const phase187DSNEnv = "TEAM4S_PHASE187_TEST_DSN"

var (
	phase187DatabasePattern = regexp.MustCompile(`^team4s_phase187_test_[a-z0-9]+$`)
	phase187SchemaPattern   = regexp.MustCompile(`^phase187_[a-z0-9_]+$`)
)

// OpenPhase187Postgres opens the dedicated Phase-187 fixture and prepares the
// release_version_groups composite-key schema (plus the real migration 0137
// release_crew_snapshots/release_role_credit_lifecycles tables and trimmed
// release_version_media/release_version_notes stand-ins) the group-change
// dependents guard (release_version_group_guard.go) needs for its tests.
func OpenPhase187Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase187DSNEnv,
		phase187DatabasePattern,
		"phase187_",
		phase187SchemaPattern,
		createPhase187Prerequisites,
	)
}

func validatePhase187DatabaseName(name string) error {
	if !phase187DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase187DatabasePattern)
	}
	return nil
}

func validatePhase187SchemaName(name string) error {
	if !phase187SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase187SchemaPattern)
	}
	return nil
}

// createPhase187Prerequisites builds on top of the Phase-107 base layer
// (members/app_users/fansub_groups/release_versions/point_ledger_entries/
// point_rules via createPhase107Prerequisites), then adds exactly the schema
// the Phase-187 dependents guard needs: the anime/release_version_groups/
// anime_fansub_groups stand-ins migration 0137 requires as FK targets (mirrors
// phase108_contribution_sources_test.go's openPhase108Pool shape verbatim),
// migration 0137 itself (release_crew_snapshots CASCADE,
// release_role_credit_lifecycles RESTRICT -- both against the composite
// release_version_groups key), and trimmed-but-real-column stand-ins for
// release_version_media/release_version_notes.
func createPhase187Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	createPhase107Prerequisites(t, pool)

	const standInSQL = `
CREATE TABLE anime (
    id BIGINT PRIMARY KEY
);
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (release_version_id, fansub_group_id)
);
CREATE TABLE anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (anime_id, fansub_group_id)
);`
	if err := validatePhase106SQL(standInSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), standInSQL); err != nil {
		t.Fatalf("create Phase-187 anime/release_version_groups/anime_fansub_groups stand-ins: %v", err)
	}

	ApplySQLFile(t, pool, phase187MigrationPath(t, "0137_phase108_contribution_sources.up.sql"))

	// release_version_media/release_version_notes below are DELIBERATELY
	// TRIMMED stand-ins, not the full real schema -- only the columns this
	// guard's SQL and its tests need (release_version_id, fansub_group_id,
	// category/role_id FK targets, deleted_at). The real, complete column
	// shapes live in:
	//   - database/migrations/0059_release_version_media_schema.up.sql
	//   - database/migrations/0064_release_version_notes.up.sql
	//   - database/migrations/0130_release_content_source_groups.up.sql
	//     (adds the nullable fansub_group_id ON DELETE SET NULL column to both
	//     tables -- column shape only, its own backfill UPDATE is NOT applied
	//     here since it joins app_users/member_claims/anime_contributions/
	//     episodes/fansub_releases, none of which this minimal fixture needs)
	// A future reader extending this fixture should not mistake this trimmed
	// shape for the full production schema.
	const mediaNotesSQL = `
CREATE TABLE release_version_media (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL,
    deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE contributor_roles (
    id BIGINT PRIMARY KEY,
    name VARCHAR(80) NOT NULL
);
CREATE TABLE release_version_notes (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE SET NULL,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES contributor_roles(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    deleted_at TIMESTAMPTZ NULL
);`
	if err := validatePhase106SQL(mediaNotesSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), mediaNotesSQL); err != nil {
		t.Fatalf("create Phase-187 release_version_media/release_version_notes stand-ins: %v", err)
	}
}

func phase187MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-187 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
