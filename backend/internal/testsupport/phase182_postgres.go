package testsupport

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase182DSNEnv = "TEAM4S_PHASE182_TEST_DSN"

var (
	phase182DatabasePattern = regexp.MustCompile(`^team4s_phase182_test_[a-z0-9]+$`)
	phase182SchemaPattern   = regexp.MustCompile(`^phase182_[a-z0-9_]+$`)
)

// OpenPhase182Postgres opens the dedicated Phase-182 fixture and prepares the minimal stand-in
// `anime`/`anime_media`/`media_assets`/`media_types`/`media_files`/`watchlist_entries`/
// `fansub_groups`/`anime_fansub_groups`/`anime_relations`/`relation_types`/`anime_titles` tables
// Plan 182-02's real-Postgres D-01/D-03 proofs need. Mirrors phase165_postgres.go/
// phase106_postgres.go's own precedent of minimal stand-in tables matching only the real columns
// the exercised SQL actually touches, rather than chaining the full production migration history
// purely to satisfy unrelated FK dependencies. Column names were re-verified against the live
// `team4s_v2` schema (via `docker compose exec team4sv30-db psql -d team4s_v2 -c "\d <table>"`)
// before writing this DDL, per 182-02-PLAN.md's instruction not to copy 182-CONTEXT.md's column
// lists verbatim.
func OpenPhase182Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase182DSNEnv,
		phase182DatabasePattern,
		"phase182_",
		phase182SchemaPattern,
		createPhase182Prerequisites,
	)
}

func validatePhase182DatabaseName(name string) error {
	if !phase182DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase182DatabasePattern)
	}
	return nil
}

func validatePhase182SchemaName(name string) error {
	if !phase182SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase182SchemaPattern)
	}
	return nil
}

func createPhase182Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE anime (
	id                  BIGINT PRIMARY KEY,
	slug                TEXT,
	title               TEXT NOT NULL,
	title_de            TEXT,
	title_en            TEXT,
	type                TEXT NOT NULL DEFAULT 'tv',
	status              TEXT NOT NULL DEFAULT 'ongoing',
	year                SMALLINT,
	max_episodes        SMALLINT,
	cover_image         TEXT,
	cover_resolved_url  TEXT,
	cover_asset_id      BIGINT,
	cover_source        TEXT,
	cover_provider_key  TEXT,
	source              TEXT,
	banner_resolved_url TEXT,
	banner_asset_id     BIGINT,
	updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_assets (id BIGINT PRIMARY KEY, media_type_id BIGINT, file_path TEXT);
CREATE TABLE media_files (id BIGINT PRIMARY KEY, media_id BIGINT, path TEXT, variant TEXT, status TEXT);
CREATE TABLE anime_media (anime_id BIGINT, media_id BIGINT, sort_order INT);
CREATE TABLE watchlist_entries (
	id         BIGINT PRIMARY KEY,
	user_id    BIGINT NOT NULL,
	anime_id   BIGINT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE fansub_groups (id BIGINT PRIMARY KEY, slug TEXT NOT NULL);
CREATE TABLE anime_fansub_groups (fansub_group_id BIGINT, anime_id BIGINT);
CREATE TABLE relation_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE anime_relations (source_anime_id BIGINT, target_anime_id BIGINT, relation_type_id BIGINT);
CREATE TABLE languages (id BIGINT PRIMARY KEY, code TEXT);
CREATE TABLE title_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE anime_titles (id BIGINT PRIMARY KEY, anime_id BIGINT, language_id BIGINT, title_type_id BIGINT, title TEXT);
INSERT INTO media_types (id, name) VALUES (1, 'poster'), (2, 'banner');`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-182 prerequisites: %v", err)
	}
}
