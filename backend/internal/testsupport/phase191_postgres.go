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

const phase191DSNEnv = "TEAM4S_PHASE191_TEST_DSN"

var (
	phase191DatabasePattern = regexp.MustCompile(`^team4s_phase191_test_[a-z0-9]+$`)
	phase191SchemaPattern   = regexp.MustCompile(`^phase191_[a-z0-9_]+$`)
)

// OpenPhase191Postgres opens the dedicated Phase-191 fixture and applies the REAL
// migrations 0187 (fansub_group_hints) and 0188 (D-09 schema cut: drops hint_type/
// requested_role_code, related_anime_id becomes NOT NULL) against an isolated schema,
// on top of minimal real-column stand-ins for the tables these migrations reference as
// foreign keys (anime, hist_fansub_group_members, fansub_group_member_roles) and a few
// additional display-context columns the repository's enrichment query needs
// (app_users.display_name/email, fansub_groups.name).
func OpenPhase191Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase191DSNEnv,
		phase191DatabasePattern,
		"phase191_",
		phase191SchemaPattern,
		createPhase191Prerequisites,
	)
}

func validatePhase191DatabaseName(name string) error {
	if !phase191DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase191DatabasePattern)
	}
	return nil
}

func validatePhase191SchemaName(name string) error {
	if !phase191SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase191SchemaPattern)
	}
	return nil
}

// createPhase191Prerequisites builds on top of the Phase-107 base layer
// (members/app_users/fansub_groups/release_versions/fansub_group_members/member_claims/
// role_definitions-with-'fansub_lead' via createPhase107Prerequisites), widens a few
// existing stand-in tables with the display-context columns the repository's
// enrichment query reads (app_users.display_name/email, fansub_groups.name), adds the
// anime and hist_fansub_group_members stand-ins migration 0187 needs as FK targets, then
// applies the REAL migration 0187 file via ApplySQLFile — the actual migration under test,
// not a hand-copied inline SQL string. Additionally adds a fansub_group_member_roles
// stand-in (real production shape from migration 0073/0106, matching
// phase137_postgres.go's identical precedent) because the D-11 "hat die Gruppe eine
// aktive Leitung" predicate (HasActiveLead/ListWithoutActiveLead, Plan 191-11) needs a
// real join target with that exact column layout to prove the predicate is computed
// from fansub_group_member_roles rather than trusted as a client-supplied flag. Also adds
// an anime_fansub_groups stand-in (real production shape from migration 0011) because the
// D-23 "gehört dieses Projekt tatsächlich zur Zielgruppe" check
// (ensureHintAnimeFansubContext, called from CreateHint) needs a real join target to prove
// the check is computed from anime_fansub_groups rather than trusted as a client-supplied
// pairing. Applies the REAL migration 0188 file (D-09 schema cut) so every test built on
// this fixture runs against the post-0188 schema. Finally adds real-shaped episodes/
// fansub_releases/release_version_groups stand-ins and widens the Phase-107 base layer's
// minimal release_versions stand-in with release_id/version/title -- the D-31 release/anime/
// group consistency check (ensureHintReleaseContext) and the D-34 release-label JOIN both
// need real join targets with the real column shape, not just an opaque release_versions.id
// -- then applies the REAL migration 0189 file (D-32 release-scoped unique index).
func createPhase191Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	createPhase107Prerequisites(t, pool)

	const standInSQL = `
ALTER TABLE app_users ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE app_users ADD COLUMN display_name VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE fansub_groups ADD COLUMN name VARCHAR(120) NOT NULL DEFAULT '';
CREATE TABLE anime (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL
);
CREATE TABLE hist_fansub_group_members (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT
);
CREATE TABLE fansub_group_member_roles (
    fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
    role TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE RESTRICT,
    PRIMARY KEY (fansub_group_member_id, role)
);
CREATE TABLE anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, fansub_group_id)
);
CREATE TABLE episodes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    sort_index INT,
    episode_number TEXT,
    number_decimal DECIMAL(5,1),
    title TEXT
);
CREATE TABLE fansub_releases (
    id BIGINT PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE
);
ALTER TABLE release_versions ADD COLUMN release_id BIGINT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE;
ALTER TABLE release_versions ADD COLUMN version VARCHAR(20) NOT NULL DEFAULT 'v1';
ALTER TABLE release_versions ADD COLUMN title TEXT NULL;
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (release_version_id, fansub_group_id)
);`
	if err := validatePhase106SQL(standInSQL); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), standInSQL); err != nil {
		t.Fatalf("create Phase-191 anime/hist_fansub_group_members/fansub_group_member_roles/anime_fansub_groups/episodes/fansub_releases/release_version_groups stand-ins: %v", err)
	}

	ApplySQLFile(t, pool, phase191MigrationPath(t, "0187_fansub_group_hints.up.sql"))
	ApplySQLFile(t, pool, phase191MigrationPath(t, "0188_fansub_group_hints_drop_membership_request.up.sql"))
	ApplySQLFile(t, pool, phase191MigrationPath(t, "0189_fansub_group_hints_release_scope.up.sql"))
}

func phase191MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-191 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
