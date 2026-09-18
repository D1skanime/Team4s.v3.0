package repository_test

// episode_version_public_scale_fixture_test.go closes the Wave 0 gap identified in
// 164-VALIDATION.md: no anime in the live production database reaches the scale
// (24+ episodes-with-releases) or classification/extras variety this phase's
// Performance-Gates (D-46) and visual test matrix (D-48) need to exercise
// automatically. Naruto (anime_id=4, 220 episodes) only carries releases on
// episodes 1-5.
//
// This is a sibling fixture to openEpisodeVersionPublicFixture
// (episode_version_public_integration_test.go) and
// openEpisodeVersionPublicGroupFilterFixture (episode_version_public_group_filter_test.go):
// same package (repository_test), same testsupport.OpenPhase117Postgres isolated-schema
// convention (a dedicated, uniquely-scoped test-only database and schema per run,
// never the application's own runtime connection), same episodePublicTracer/
// episodePublicRequest/assertPublicBudget/assertPublicBudgetWithGroupFilter/episodeIDs
// helpers reused directly, no parallel budget-assertion logic.
//
// Fixture anime_id=9, 52 episodes (ids 901-952), each with exactly one
// fansub_release/release_version/release_variant row, all assigned to fansub_group
// 901 ("fixture-scale-one"). Classification/extras variety is layered on top of the
// generate_series bulk via targeted UPDATE/INSERT statements on the first five
// episodes, following openEpisodeVersionPublicGroupFilterFixture's own precedent of
// mixing bulk generate_series padding with a handful of explicit, individually
// assertable rows:
//
//   - Episode 901: canon/episode, has an approved public screenshot (has_images),
//     a populated release_date, and container/video_codec set on its variant.
//   - Episode 902: filler/special, has an approved public typesetting_karaoke media
//     row (has_karaoke).
//   - Episode 903: mixed/ova, has a published public note (has_notes).
//   - Episode 904: recap/movie, no extras (control row for classification-only cases).
//   - Episode 905: unknown/episode (default, NULL/NULL), Coop -- a second
//     release_version_groups row against fansub_group 902 ("fixture-scale-two"),
//     making its release visible under either group filter.
//   - Episodes 906-952: unknown/episode (default), single group, no extras, no
//     release_date, no container/video_codec -- the bulk of the fixture, and the
//     "without" half of every with/without boundary above.
//
// Together with the defaults, all 5 filler_type values (canon/filler/mixed/recap/
// unknown) and 4 episode_type values (episode/special/ova/movie) are present.

import (
	"context"
	"fmt"
	"net/url"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

func openEpisodeVersionPublicScaleFixture(t *testing.T) (*pgxpool.Pool, *episodePublicTracer) {
	t.Helper()
	fixture := testsupport.OpenPhase117Postgres(t)
	_, err := fixture.Exec(context.Background(), `
ALTER TABLE anime ADD COLUMN status TEXT NOT NULL DEFAULT 'done';
ALTER TABLE fansub_groups ADD COLUMN slug TEXT, ADD COLUMN logo_url TEXT, ADD COLUMN logo_id BIGINT REFERENCES media_assets(id);
-- 164-08 GAP-02: titleEnteredByGroupSQL's NOT EXISTS subquery reads release_variants.filename.
ALTER TABLE release_variants ADD COLUMN filename TEXT;
-- 164-01's new filler/episode-type JOINs and batched flags query need these tables,
-- same minimal shape as the sibling fixtures in this package.
ALTER TABLE episodes ADD COLUMN filler_type_id BIGINT, ADD COLUMN episode_type_id BIGINT;
-- 164-10 GAP-11: label column mirrors migration 0169's backfill (this fixture's own
-- tests do not assert label values, only that the query executes with the column present).
CREATE TABLE episode_filler_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL, label TEXT);
INSERT INTO episode_filler_types (id,name,label) VALUES
 (1,'unknown','Unbekannt'),(2,'canon','Haupthandlung'),(3,'filler','Zusatzfolge'),(4,'mixed','Teilweise Zusatzfolge'),(5,'recap','Rückblick');
CREATE TABLE episode_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL, label TEXT);
INSERT INTO episode_types (id,name,label) VALUES
 (1,'episode','Episode'),(2,'special','Special'),(3,'ova','OVA'),(4,'ona','ONA'),(5,'movie','Movie'),
 (6,'recap','Recap'),(7,'preview','Preview'),(8,'prologue','Prologue'),(9,'epilogue','Epilogue'),(10,'bonus','Bonus');
CREATE TABLE review_statuses (id BIGSERIAL PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE);
INSERT INTO review_statuses (code) VALUES ('approved');
ALTER TABLE media_assets ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ready',
 ADD COLUMN visibility_id BIGINT REFERENCES visibilities(id),
 ADD COLUMN review_status_id BIGINT REFERENCES review_statuses(id);
CREATE TABLE release_version_media (
 id BIGINT PRIMARY KEY,
 release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
 media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
 category VARCHAR(30) NOT NULL,
 deleted_at TIMESTAMPTZ
);
CREATE TABLE anime_fansub_groups (
 anime_id BIGINT NOT NULL REFERENCES anime(id),
 fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
 PRIMARY KEY (anime_id, fansub_group_id)
);

INSERT INTO anime (id,status) VALUES (9,'done');
INSERT INTO fansub_groups (id,slug,name) VALUES (901,'fixture-scale-one','Fixture Scale One'),(902,'fixture-scale-two','Fixture Scale Two');
INSERT INTO anime_fansub_groups (anime_id,fansub_group_id) VALUES (9,901),(9,902);

-- Bulk scale: 52 episodes, one release/version/variant each, all in group 901.
INSERT INTO episodes (id,anime_id,episode_number,title)
 SELECT 900+n, 9, n::text, 'Scale episode '||n FROM generate_series(1,52) n;
INSERT INTO fansub_releases (id,episode_id) SELECT 900+n, 900+n FROM generate_series(1,52) n;
INSERT INTO release_versions (id,release_id,version) SELECT 900+n, 900+n, 'v1' FROM generate_series(1,52) n;
INSERT INTO release_variants (id,release_version_id,video_quality,subtitle_type) SELECT 900+n, 900+n, '1080p', 'softsub' FROM generate_series(1,52) n;
INSERT INTO release_version_groups (release_version_id,fansub_group_id) SELECT 900+n, 901 FROM generate_series(1,52) n;

-- Classification variety (episodes 1-4 of 52): canon/filler/mixed/recap and
-- episode/special/ova/movie. Episodes 5+ stay NULL/NULL, covering the
-- COALESCE('unknown')/('episode') fallback across the bulk of the fixture.
UPDATE episodes SET filler_type_id=2, episode_type_id=1 WHERE id=901; -- canon / episode
UPDATE episodes SET filler_type_id=3, episode_type_id=2 WHERE id=902; -- filler / special
UPDATE episodes SET filler_type_id=4, episode_type_id=3 WHERE id=903; -- mixed / ova
UPDATE episodes SET filler_type_id=5, episode_type_id=5 WHERE id=904; -- recap / movie

-- Release-date and technical-metadata with/without boundary (D-14/omitempty):
-- episode 901 has both, the rest of the fixture (e.g. 910, used as the "without"
-- control row below) has neither.
UPDATE release_versions SET release_date='2024-01-01' WHERE id=901;
UPDATE release_variants SET container='mkv', video_codec='x264' WHERE id=901;

-- Coop release (episode 905): a second release_version_groups row makes this the
-- only episode visible under fixture-scale-two, and its fansub_groups array length 2.
INSERT INTO release_version_groups (release_version_id,fansub_group_id) VALUES (905,902);

-- Extras, each scoped to a distinct release_version_id so has_images/has_notes/
-- has_karaoke are provably independent, not one row accidentally satisfying all three.
INSERT INTO media_assets (id,file_path,status,visibility_id,review_status_id) VALUES
 (90001,'/media/fixture-scale-screenshot.png','ready',(SELECT id FROM visibilities WHERE name='public'),(SELECT id FROM review_statuses WHERE code='approved')),
 (90002,'/media/fixture-scale-karaoke.ass','ready',(SELECT id FROM visibilities WHERE name='public'),(SELECT id FROM review_statuses WHERE code='approved'));
INSERT INTO release_version_media (id,release_version_id,media_asset_id,category) VALUES
 (90001,901,90001,'screenshot'),
 (90002,902,90002,'typesetting_karaoke');
INSERT INTO members (id,nickname,display_name) VALUES (90010,'fixture-scale-member','Fixture Scale Member');
INSERT INTO release_version_notes (id,release_version_id,member_id,visibility,status) VALUES (90020,903,90010,'public','published');
`)
	require.NoError(t, err)
	tr := &episodePublicTracer{}
	cfg := fixture.Config()
	cfg.ConnConfig.Tracer = tr
	cfg.MaxConns = 1
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, pool.Ping(context.Background()))
	tr.reset()
	return pool, tr
}

// TestEpisodeVersionPublicScaleBudgetAndPagination proves, at 52-episode scale, the
// exact 3/4-statement query budget plan 164-01 established (D-46 gate 4), atomic
// non-overlapping cursor pagination (unfiltered and group-filtered), classification/
// flag/Coop correctness across the full D-48 variety matrix, and a live-measured
// full-page response byte size under a concrete bound (replacing 164-RESEARCH.md's
// ≈15.9KB extrapolation, closing 164-USER-REQUEST.md §52 item 4).
func TestEpisodeVersionPublicScaleBudgetAndPagination(t *testing.T) {
	pool, tr := openEpisodeVersionPublicScaleFixture(t)
	const totalFixtureEpisodes = 52

	// --- Unfiltered walk ---
	seen := map[int64]bool{}
	byID := map[int64]publicEpisodeFixture{}
	fillerTypesSeen := map[string]bool{}
	episodeTypesSeen := map[string]bool{}
	cursor := ""
	pages := 0
	measuredFirstPage := false
	for {
		tr.reset()
		raw, page := episodePublicRequest(t, pool, fmt.Sprintf("/anime/9/episodes?projection=public&limit=24&cursor=%s", url.QueryEscape(cursor)), 200)
		if !measuredFirstPage {
			require.Less(t, len(raw), 25*1024, "full 24-episode page response must stay under 25KB, measured against the 52-episode fixture (replaces 164-RESEARCH.md's ≈15.9KB extrapolation)")
			measuredFirstPage = true
		}
		for _, ep := range page.Data.Episodes {
			require.False(t, seen[ep.EpisodeID], "episode %d must not repeat across pages", ep.EpisodeID)
			seen[ep.EpisodeID] = true
			fillerTypesSeen[ep.FillerType] = true
			episodeTypesSeen[ep.EpisodeType] = true
			byID[ep.EpisodeID] = ep
		}
		assertPublicBudget(t, tr, 24)
		pages++
		if !page.Data.Pagination.HasMore {
			require.Nil(t, page.Data.Pagination.NextCursor)
			break
		}
		require.NotNil(t, page.Data.Pagination.NextCursor)
		require.NotEmpty(t, *page.Data.Pagination.NextCursor)
		cursor = *page.Data.Pagination.NextCursor
		require.LessOrEqual(t, pages, 10, "52 episodes at limit=24 must not take more than 3 pages")
	}
	require.GreaterOrEqual(t, len(seen), totalFixtureEpisodes)
	require.GreaterOrEqual(t, pages, 3, "52 episodes at limit=24 must span at least 3 pages, proving the budget stays constant across multiple pages, not just on page 1")

	for _, ft := range []string{"unknown", "canon", "filler", "mixed", "recap"} {
		require.True(t, fillerTypesSeen[ft], "fixture must contain at least one episode with filler_type=%s", ft)
	}
	for _, et := range []string{"episode", "special", "ova", "movie"} {
		require.True(t, episodeTypesSeen[et], "fixture must contain at least one episode with episode_type=%s", et)
	}

	// --- Flag/Coop/technical-boundary correctness on the known fixture rows ---
	ep901, ep902, ep903, ep905, ep910 := byID[901], byID[902], byID[903], byID[905], byID[910]
	require.Len(t, ep901.Versions, 1)
	require.Equal(t, true, ep901.Versions[0]["has_images"], "episode 901's release has an approved public screenshot")
	require.Equal(t, false, ep901.Versions[0]["has_notes"])
	require.Equal(t, false, ep901.Versions[0]["has_karaoke"])
	require.Len(t, ep901.Versions[0]["fansub_groups"], 1)
	require.Equal(t, "mkv", ep901.Versions[0]["container"])
	require.Equal(t, "x264", ep901.Versions[0]["video_codec"])
	require.Contains(t, ep901.Versions[0], "release_date")

	require.Equal(t, false, ep902.Versions[0]["has_images"])
	require.Equal(t, false, ep902.Versions[0]["has_notes"])
	require.Equal(t, true, ep902.Versions[0]["has_karaoke"], "episode 902's release has an approved public typesetting_karaoke asset")

	require.Equal(t, false, ep903.Versions[0]["has_images"])
	require.Equal(t, true, ep903.Versions[0]["has_notes"], "episode 903's release has a published public note")
	require.Equal(t, false, ep903.Versions[0]["has_karaoke"])

	require.Len(t, ep905.Versions[0]["fansub_groups"], 2, "episode 905's release is a Coop between fixture-scale-one and fixture-scale-two")

	require.Equal(t, false, ep910.Versions[0]["has_images"], "episode 910 is a plain default-fixture control row")
	require.Equal(t, false, ep910.Versions[0]["has_notes"])
	require.Equal(t, false, ep910.Versions[0]["has_karaoke"])
	require.Len(t, ep910.Versions[0]["fansub_groups"], 1)
	require.NotContains(t, ep910.Versions[0], "container", "episode 910's variant has no container set (omitempty boundary)")
	require.NotContains(t, ep910.Versions[0], "video_codec")
	require.NotContains(t, ep910.Versions[0], "release_date")

	// --- Group-filtered walk: fixture-scale-one covers every fixture episode ---
	seenFiltered := map[int64]bool{}
	cursor = ""
	pages = 0
	for {
		tr.reset()
		_, page := episodePublicRequest(t, pool, fmt.Sprintf("/anime/9/episodes?projection=public&fansub=fixture-scale-one&limit=24&cursor=%s", url.QueryEscape(cursor)), 200)
		for _, ep := range page.Data.Episodes {
			require.False(t, seenFiltered[ep.EpisodeID], "episode %d must not repeat across group-filtered pages", ep.EpisodeID)
			seenFiltered[ep.EpisodeID] = true
		}
		assertPublicBudgetWithGroupFilter(t, tr, 24, true)
		pages++
		if !page.Data.Pagination.HasMore {
			break
		}
		cursor = *page.Data.Pagination.NextCursor
		require.LessOrEqual(t, pages, 10)
	}
	require.Len(t, seenFiltered, totalFixtureEpisodes, "fixture-scale-one is assigned to every fixture episode")

	// The second Coop group must scope the result set to exactly the one Coop episode.
	tr.reset()
	_, coopOnly := episodePublicRequest(t, pool, "/anime/9/episodes?projection=public&fansub=fixture-scale-two&limit=24", 200)
	require.Equal(t, []int64{905}, episodeIDs(coopOnly), "fixture-scale-two only appears on the Coop episode")
	require.False(t, coopOnly.Data.Pagination.HasMore)
	assertPublicBudgetWithGroupFilter(t, tr, 24, true)
}
