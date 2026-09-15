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
    episode_number TEXT,
    number_decimal DECIMAL(5,1),
    title TEXT
);
CREATE TABLE fansub_groups (
    id BIGINT PRIMARY KEY,
    name TEXT
);
CREATE TABLE fansub_releases (
    id BIGINT PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id),
    release_date TIMESTAMPTZ NULL
);
CREATE TABLE release_versions (
    id BIGINT PRIMARY KEY,
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id),
    version VARCHAR(20) NOT NULL DEFAULT 'v1',
    title TEXT,
    release_date TIMESTAMPTZ NULL
);
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (release_version_id, fansub_group_id)
);
CREATE TABLE release_variants (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    duration_seconds INT,
    resolution TEXT,
    video_quality TEXT,
    container TEXT,
    video_codec TEXT,
    audio_codec TEXT,
    subtitle_type TEXT
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
    jellyfin_item_id VARCHAR(255),
    audio_language_id BIGINT,
    subtitle_language_id BIGINT
);
CREATE TABLE languages (
    id BIGINT PRIMARY KEY,
    code TEXT,
    name TEXT
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
);
CREATE TABLE members (
    id BIGINT PRIMARY KEY,
    nickname TEXT,
    display_name TEXT,
    avatar_media_id BIGINT REFERENCES media_assets(id)
);
CREATE TABLE contributor_roles (
    id BIGINT PRIMARY KEY,
    name VARCHAR(80) NOT NULL
);
CREATE TABLE role_definitions (
    code TEXT PRIMARY KEY,
    label_de TEXT NOT NULL,
    contexts TEXT[] NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    color_key TEXT NOT NULL DEFAULT 'other'
);
CREATE TABLE release_version_notes (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT REFERENCES fansub_groups(id),
    member_id BIGINT NOT NULL REFERENCES members(id),
    role_id BIGINT REFERENCES contributor_roles(id),
    title TEXT,
    body_html TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    visibility VARCHAR(20) NOT NULL DEFAULT 'internal',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
-- Plan 156-16 (GAP-04/GAP-05): ensureThemeSegmentOriginTx now reaches
-- loadPublicEffectiveContributors from every write path that can change a segment's origin
-- (range sync, segment creation, release-version auto-assignment) -- not just the previously
-- opt-in SetThemeSegmentOrigin call. Every Phase-117 test that ends up with a non-NULL origin
-- therefore needs this shim, so it moved here instead of staying copy-pasted per test file
-- (theme_segment_origin_integration_test.go's original precedent). IF NOT EXISTS / ON CONFLICT
-- keep this safe to combine with a test file that still seeds its own (now redundant) copy --
-- those copies were converted to the same IF NOT EXISTS shape in this same plan.
CREATE TABLE IF NOT EXISTS visibilities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
INSERT INTO visibilities (name) VALUES ('public') ON CONFLICT (name) DO NOTHING;

ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'members_only';
ALTER TABLE members ADD COLUMN IF NOT EXISTS public_slug TEXT;

CREATE TABLE IF NOT EXISTS anime_contributions (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL,
    anime_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL REFERENCES members(id),
    release_version_id BIGINT NULL REFERENCES release_versions(id),
    is_public_on_anime_page BOOLEAN NOT NULL DEFAULT false,
    visibility_id BIGINT NULL REFERENCES visibilities(id)
);

CREATE TABLE IF NOT EXISTS anime_contribution_roles (
    id BIGSERIAL PRIMARY KEY,
    anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id) ON DELETE CASCADE,
    role_code TEXT NOT NULL
);

-- Plan 156-18 (GAP-07): ensureThemeSegmentOriginAndContributorsTx now reaches
-- ensureThemeSegmentContributorsPreselectedTx from every one of the FIVE former
-- ensureThemeSegmentOriginTx call sites -- every Phase-117 test exercising any of those call
-- sites needs this marker column, not just the four integration-test files this plan otherwise
-- touches. ADD COLUMN IF NOT EXISTS keeps this compatible once migration 0165 (created later in
-- this same plan) also runs against the same schema.
ALTER TABLE theme_segments ADD COLUMN IF NOT EXISTS contributors_initialized_at TIMESTAMPTZ NULL;`
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
		// 0161 (Phase 156, Workstream C): theme_segments.origin_release_version_id --
		// ohne diese Migration fehlt die Spalte, gegen die SetThemeSegmentOrigin und die
		// erweiterten ListAnimeSegments/GetAnimeSegmentByID-SELECTs in diesem Fixture testen.
		"0161_theme_segments_origin_release_version.up.sql",
		// 0162 (Phase 156, Plan 156-12/GAP-01): theme_segment_contributors -- ohne diese
		// Migration fehlt die Tabelle, gegen die SetThemeSegmentContributors/
		// ListThemeSegmentContributorCandidates/GetThemeSegmentContributorMemberIDs in
		// diesem isolierten Testschema schreiben und lesen.
		"0162_theme_segment_contributors.up.sql",
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
