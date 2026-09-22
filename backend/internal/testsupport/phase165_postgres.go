package testsupport

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

const phase165DSNEnv = "TEAM4S_PHASE165_TEST_DSN"

var (
	phase165DatabasePattern = regexp.MustCompile(`^team4s_phase165_test_[a-z0-9]+$`)
	phase165SchemaPattern   = regexp.MustCompile(`^phase165_[a-z0-9_]+$`)
)

// OpenPhase165Postgres opens the dedicated Phase-165 fixture and prepares the minimal stand-in
// `anime`/`anime_source_links` tables Plan 165-17's real-Postgres GAP-05/GAP-10 proofs (and 165-18's
// GAP-06 proof) need. Mirrors phase150_postgres.go's own precedent of minimal stand-in tables
// matching only the real columns the exercised SQL actually touches, rather than chaining the full
// production migration history purely to satisfy unrelated FK dependencies.
func OpenPhase165Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase165DSNEnv,
		phase165DatabasePattern,
		"phase165_",
		phase165SchemaPattern,
		createPhase165Prerequisites,
	)
}

func validatePhase165DatabaseName(name string) error {
	if !phase165DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase165DatabasePattern)
	}
	return nil
}

func validatePhase165SchemaName(name string) error {
	if !phase165SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase165SchemaPattern)
	}
	return nil
}

// createPhase165Prerequisites creates a minimal `anime` stand-in with EXACTLY the columns
// GetAnimeSyncSource's legacy-schema query selects
// (backend/internal/repository/admin_content_sync.go) -- deliberately WITHOUT a `slug` column, so
// loadAnimeV2SchemaInfo's schema.HasSlug check deterministically takes the simpler legacy code
// path, and an `anime_source_links` table matching the real migration
// (database/migrations/0047_add_anime_source_links.up.sql) exactly, including the global
// UNIQUE(source) constraint this whole gap-closure round is about.
func createPhase165Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE anime (
	id           BIGSERIAL PRIMARY KEY,
	title        TEXT NOT NULL DEFAULT '',
	title_de     TEXT,
	title_en     TEXT,
	source       TEXT,
	folder_name  TEXT,
	year         SMALLINT,
	max_episodes SMALLINT,
	description  TEXT,
	cover_image  TEXT
);
CREATE TABLE anime_source_links (
	anime_id   BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
	source     TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (anime_id, source),
	CONSTRAINT uq_anime_source_links_source UNIQUE (source)
);
CREATE INDEX idx_anime_source_links_anime_id ON anime_source_links (anime_id);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-165 prerequisites: %v", err)
	}
}
