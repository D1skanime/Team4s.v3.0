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

const phase117DSNEnv = "TEAM4S_PHASE117_TEST_DSN"

var (
	phase117DatabasePattern = regexp.MustCompile(`^team4s_phase117_test_[a-z0-9]+$`)
	phase117SchemaPattern   = regexp.MustCompile(`^phase117_[a-z0-9_]+$`)
)

// OpenPhase117Postgres opens the dedicated Phase-117 fixture and prepares the
// minimal stub parent tables plus the seven real migration files needed for
// the Kara-Segment-Zuweisung/Zeit-Override schema (Plan 117-01/117-02).
func OpenPhase117Postgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	return openPhasePostgres(
		t,
		phase117DSNEnv,
		phase117DatabasePattern,
		"phase117_",
		phase117SchemaPattern,
		createPhase117Prerequisites,
	)
}

func validatePhase117DatabaseName(name string) error {
	if !phase117DatabasePattern.MatchString(name) {
		return fmt.Errorf("database name %q must match %s", name, phase117DatabasePattern)
	}
	return nil
}

func validatePhase117SchemaName(name string) error {
	if !phase117SchemaPattern.MatchString(name) {
		return fmt.Errorf("schema name %q must match %s", name, phase117SchemaPattern)
	}
	return nil
}

func createPhase117Prerequisites(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	const sql = `
CREATE TABLE anime (
    id BIGINT PRIMARY KEY
);
CREATE TABLE episodes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    sort_index INT,
    episode_number TEXT
);
CREATE TABLE fansub_groups (
    id BIGINT PRIMARY KEY
);
CREATE TABLE fansub_releases (
    id BIGINT PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id)
);
CREATE TABLE release_versions (
    id BIGINT PRIMARY KEY,
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id),
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    title TEXT
);
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (release_version_id, fansub_group_id)
);
CREATE TABLE release_variants (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    duration_seconds INT
);
CREATE TABLE stream_sources (
    id BIGINT PRIMARY KEY,
    provider_type TEXT,
    external_id TEXT,
    url TEXT
);
CREATE TABLE release_streams (
    id BIGINT PRIMARY KEY,
    variant_id BIGINT REFERENCES release_variants(id),
    stream_source_id BIGINT REFERENCES stream_sources(id),
    jellyfin_item_id VARCHAR(255)
);
CREATE TABLE media_assets (
    id BIGINT PRIMARY KEY,
    file_path TEXT
);
CREATE TABLE theme_types (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE themes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    theme_type_id BIGINT NOT NULL REFERENCES theme_types(id),
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE theme_segments (
    id BIGSERIAL PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES themes(id),
    start_episode_id BIGINT,
    end_episode_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
	if err := validatePhase106SQL(sql); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(context.Background(), sql); err != nil {
		t.Fatalf("create Phase-117 prerequisites: %v", err)
	}
	for _, migration := range []string{
		"0049_extend_theme_segments.up.sql",
		"0051_extend_theme_segments_source.up.sql",
		"0054_theme_segment_playback_sources.up.sql",
		"0122_theme_segment_render_cache.up.sql",
		"0141_theme_segment_assignments.up.sql",
		"0142_theme_segment_episode_overrides.up.sql",
		"0143_theme_segment_render_cache_release_version.up.sql",
		// 0144 (Plan 117-03): entfernt den alten 1:1-Legacy-Index auf
		// theme_segment_playback_sources. Ohne diese Migration wuerde eine zweite
		// theme_segment_playback_sources-Zeile fuer dasselbe Segment (zweite
		// Release-Version-Zuweisung, D-03) am alten uq_theme_segment_playback_sources_segment
		// scheitern -- genau das Szenario, das Plan 117-03 Task 3 testet.
		"0144_drop_theme_segment_playback_sources_legacy_unique.up.sql",
	} {
		ApplySQLFile(t, pool, phase117MigrationPath(t, migration))
	}
}

func phase117MigrationPath(t testing.TB, name string) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve Phase-117 test-support path")
	}
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", name)
}
