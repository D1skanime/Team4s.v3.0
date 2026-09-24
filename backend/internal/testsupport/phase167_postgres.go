package testsupport

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase167DSNEnv = "TEAM4S_PHASE167_TEST_DSN"

var (
	phase167DatabasePattern = regexp.MustCompile(`^team4s_phase167_test_[a-z0-9]+$`)
	phase167SchemaPattern   = regexp.MustCompile(`^phase167_[a-z0-9_]+$`)
)

// OpenPhase167Postgres opens the dedicated Phase-167 fixture and prepares minimal
// stand-in `fansub_groups`/`fansub_group_aliases` tables mirroring
// database/migrations/0009_fansub_groups.up.sql and 0014_fansub_group_aliases.up.sql,
// plus a schema-local `f_unaccent` wrapper (see createPhase167Prerequisites) so the
// isolated schema can exercise the exact-match batch query without needing `public` in
// its search_path. Reused by Plan 167-06's alias write-path tests.
func OpenPhase167Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase167DSNEnv,
		phase167DatabasePattern,
		"phase167_",
		phase167SchemaPattern,
		createPhase167Prerequisites,
	)
}

func validatePhase167DatabaseName(name string) error {
	if !phase167DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase167DatabasePattern)
	}
	return nil
}

func validatePhase167SchemaName(name string) error {
	if !phase167SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase167SchemaPattern)
	}
	return nil
}

// createPhase167Prerequisites creates, inside the already-active isolated schema, a
// minimal `fansub_groups`/`fansub_group_aliases` pair mirroring the real migrations'
// columns/constraints exactly, plus a schema-local `f_unaccent` wrapper whose body is
// byte-identical to database/migrations/0152_f_unaccent_search_path_fix.up.sql's
// production wrapper. The `unaccent` extension itself is created once per-database
// already by prior migrations -- this does NOT re-run CREATE EXTENSION.
func createPhase167Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE fansub_groups (
	id BIGSERIAL PRIMARY KEY,
	slug VARCHAR(120) NOT NULL,
	name VARCHAR(120) NOT NULL,
	kuerzel VARCHAR(32),
	normalized_kuerzel VARCHAR(32),
	logo_id BIGINT,
	banner_id BIGINT,
	logo_url TEXT,
	banner_url TEXT,
	founded_year INTEGER,
	dissolved_year INTEGER,
	closed_year INTEGER,
	website_url TEXT,
	discord_url TEXT,
	irc_url TEXT,
	country VARCHAR(80),
	status VARCHAR(20) NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_fansub_groups_slug ON fansub_groups (slug);
CREATE UNIQUE INDEX idx_fansub_groups_name ON fansub_groups (name);
CREATE UNIQUE INDEX uq_fansub_groups_normalized_kuerzel ON fansub_groups (normalized_kuerzel) WHERE normalized_kuerzel IS NOT NULL;

CREATE TABLE fansub_group_aliases (
	id BIGSERIAL PRIMARY KEY,
	fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
	alias VARCHAR(120) NOT NULL,
	normalized_alias VARCHAR(120) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT uq_fansub_group_aliases_normalized_alias UNIQUE (normalized_alias),
	CONSTRAINT uq_fansub_group_aliases_group_normalized UNIQUE (fansub_group_id, normalized_alias)
);
CREATE INDEX idx_fansub_group_aliases_group_id ON fansub_group_aliases (fansub_group_id);

-- Minimal empty stand-ins for the tables FansubRepository.hydrateFansubGroup's
-- attachGroupCounts/attachGroupLinks query when the full UpdateGroup/GetGroupByID/
-- GetGroupBySlug read paths run against this fixture (needed starting with the
-- Kürzel conflict tests, which call those exported methods directly instead of
-- only the lower-level learn/apply helpers prior fixtures exercised). Kept
-- empty/unpopulated by every test -- their sole purpose is to let the COUNT(*)
-- queries return zero rows without erroring on a missing relation.
CREATE TABLE app_users (id BIGSERIAL PRIMARY KEY);
CREATE TABLE anime (id BIGSERIAL PRIMARY KEY, status VARCHAR(20) NOT NULL DEFAULT 'active');
CREATE TABLE anime_fansub_groups (
	anime_id BIGINT NOT NULL,
	fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);
CREATE TABLE release_version_groups (
	fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE
);
CREATE TABLE fansub_group_members (
	fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
	app_user_id BIGINT NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'active'
);
CREATE TABLE hist_fansub_group_members (
	fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
	status VARCHAR(20) NOT NULL DEFAULT 'historical',
	visibility VARCHAR(20) NOT NULL DEFAULT 'public'
);
CREATE TABLE fansub_group_links (
	id BIGSERIAL PRIMARY KEY,
	group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
	link_type VARCHAR(20) NOT NULL,
	name TEXT,
	url TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION f_unaccent(text)
	RETURNS text
	LANGUAGE sql
	IMMUTABLE
	PARALLEL SAFE
	STRICT
AS $$
	SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-167 prerequisites: %v", err)
	}
}
