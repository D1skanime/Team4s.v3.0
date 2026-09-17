package repository_test

import (
	"context"
	"encoding/json"
	"net/url"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

// openEpisodeVersionPublicGroupFilterFixture is a sibling fixture to
// openEpisodeVersionPublicFixture (episode_version_public_integration_test.go),
// reusing the same guarded, isolated-schema Postgres fixture convention
// (testsupport.OpenPhase117Postgres, never DATABASE_URL/team4s_v2). It is kept in
// its own file per CLAUDE.md's 450-line cap and covers Pflichtfälle B, C, D, E, F,
// I plus the updated J query-budget assertion (163-RESEARCH.md).
//
// Anime 7 mirrors the real Naruto shape (163-CONTEXT.md D-18): AnimeOwnage-fixture
// (group 3) on episodes 1/2, Project-Messiah-fixture (group 4) on episodes 3/4, coop
// on episode 5, and a group-less (non-public, Pflichtfall I) version on episode 6.
// Anime 8 is a dedicated pagination-scope fixture (Pflichtfall F): 29 episodes match
// only group 3, and the sole group-4 match is the 30th episode -- proving the group
// filter runs inside SQL before LIMIT, not as a client-side post-limit filter.
func openEpisodeVersionPublicGroupFilterFixture(t *testing.T) (*pgxpool.Pool, *episodePublicTracer) {
	t.Helper()
	fixture := testsupport.OpenPhase117Postgres(t)
	_, err := fixture.Exec(context.Background(), `
ALTER TABLE anime ADD COLUMN status TEXT NOT NULL DEFAULT 'done';
ALTER TABLE fansub_groups ADD COLUMN slug TEXT, ADD COLUMN logo_url TEXT;
INSERT INTO anime (id,status) VALUES (7,'done'),(8,'done');
INSERT INTO fansub_groups (id,slug,name) VALUES
 (3,'animeownage-fixture','AnimeOwnage Fixture'),(4,'project-messiah-fixture','Project Messiah Fixture');
INSERT INTO episodes (id,anime_id,episode_number,title) VALUES
 (701,7,'1','AO-fixture only 1'),(702,7,'2','AO-fixture only 2'),
 (703,7,'3','PM-fixture only 1'),(704,7,'4','PM-fixture only 2'),
 (705,7,'5','Coop episode'),(706,7,'6','Version without any group');
INSERT INTO fansub_releases (id,episode_id) VALUES
 (7701,701),(7702,702),(7703,703),(7704,704),(7705,705),(7706,706);
INSERT INTO release_versions (id,release_id,version) VALUES
 (77001,7701,'v1'),(77002,7702,'v1'),(77003,7703,'v1'),(77004,7704,'v1'),(77005,7705,'v1'),(77006,7706,'v1');
INSERT INTO release_variants (id,release_version_id,video_quality,subtitle_type) VALUES
 (777001,77001,'1080p','softsub'),(777002,77002,'1080p','softsub'),(777003,77003,'1080p','softsub'),
 (777004,77004,'1080p','softsub'),(777005,77005,'1080p','softsub'),(777006,77006,'1080p','softsub');
INSERT INTO release_version_groups VALUES (77001,3),(77002,3),(77003,4),(77004,4),(77005,3),(77005,4);
-- release_versions.id=77006 (episode 706) deliberately keeps zero release_version_groups
-- rows: a variant exists, but no group row -- Pflichtfall I / D-02 fail-closed case.
INSERT INTO episodes (id,anime_id,episode_number,title)
 SELECT 8000+n,8,n::text,'AO-fixture padding '||n FROM generate_series(1,29) n;
INSERT INTO episodes (id,anime_id,episode_number,title) VALUES (8030,8,'30','Only PM-fixture match');
INSERT INTO fansub_releases (id,episode_id) SELECT 88000+n,8000+n FROM generate_series(1,29) n;
INSERT INTO fansub_releases (id,episode_id) VALUES (88030,8030);
INSERT INTO release_versions (id,release_id,version) SELECT 880000+n,88000+n,'v1' FROM generate_series(1,29) n;
INSERT INTO release_versions (id,release_id,version) VALUES (880030,88030,'v1');
INSERT INTO release_variants (id,release_version_id,video_quality,subtitle_type)
 SELECT 8800000+n,880000+n,'1080p','softsub' FROM generate_series(1,29) n;
INSERT INTO release_variants (id,release_version_id,video_quality,subtitle_type) VALUES (8800030,880030,'1080p','softsub');
INSERT INTO release_version_groups SELECT 880000+n,3 FROM generate_series(1,29) n;
INSERT INTO release_version_groups VALUES (880030,4);
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

// assertPublicBudgetWithGroupFilter extends assertPublicBudget (episode_version_public_integration_test.go)
// for the fansub-parameterized case: existence check (1) + optional anime-scoped slug
// resolution (0 or 1) + one bounded main statement (1). assertPublicBudget's own hardcoded
// length-2 assertion stays correct for requests WITHOUT fansub and is intentionally left
// untouched (Pflichtfall J).
func assertPublicBudgetWithGroupFilter(t *testing.T, tr *episodePublicTracer, limit int, groupFilterPresent bool) {
	t.Helper()
	expected := 2
	if groupFilterPresent {
		expected = 3
	}
	require.Len(t, tr.queries, expected, "existence plus optional slug resolution plus one bounded query")
	require.EqualValues(t, 1, tr.queries[0].Rows)
	last := tr.queries[len(tr.queries)-1]
	require.LessOrEqual(t, last.Rows, int64(limit+1))
	require.NotContains(t, last.SQL, "theme_segment")
	require.NotContains(t, last.SQL, "release_streams")
}

func episodeIDs(page publicEpisodeEnvelope) []int64 {
	ids := make([]int64, len(page.Data.Episodes))
	for i, ep := range page.Data.Episodes {
		ids[i] = ep.EpisodeID
	}
	return ids
}

type publicErrorEnvelope struct {
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

// TestEpisodeVersionPublicGroupFilterBasics covers Pflichtfälle B, C, D: a single
// exclusive group, two separate exclusive groups, and a coop version that must expose
// both groups regardless of which single-group filter is currently active.
func TestEpisodeVersionPublicGroupFilterBasics(t *testing.T) {
	pool, tr := openEpisodeVersionPublicGroupFilterFixture(t)

	tr.reset()
	_, all := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&limit=5", 200)
	require.Equal(t, []int64{701, 702, 703, 704, 705}, episodeIDs(all), "Alle must return every episode with at least one public release")
	assertPublicBudgetWithGroupFilter(t, tr, 5, false)

	tr.reset()
	_, ao := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=animeownage-fixture&limit=5", 200)
	require.Equal(t, []int64{701, 702, 705}, episodeIDs(ao), "AO-fixture filter must include the coop episode and exclude PM-only episodes")
	for _, ep := range ao.Data.Episodes {
		if ep.EpisodeID == 705 {
			require.Len(t, ep.Versions[0]["fansub_groups"], 2, "coop version must expose both groups regardless of the active filter")
		}
	}
	assertPublicBudgetWithGroupFilter(t, tr, 5, true)

	tr.reset()
	_, pm := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=project-messiah-fixture&limit=5", 200)
	require.Equal(t, []int64{703, 704, 705}, episodeIDs(pm), "PM-fixture filter must include the coop episode and exclude AO-only episodes")
	assertPublicBudgetWithGroupFilter(t, tr, 5, true)
}

// TestEpisodeVersionPublicGroupFilterNarutoRegression is Pflichtfall E: an explicit,
// named regression check mirroring D-18's real Naruto shape (AO on 1/2, PM on 3/4,
// coop on 5) even though the fixture uses the synthetic anime id 7, not the live
// anime_id=4.
func TestEpisodeVersionPublicGroupFilterNarutoRegression(t *testing.T) {
	pool, tr := openEpisodeVersionPublicGroupFilterFixture(t)

	tr.reset()
	_, ao := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=animeownage-fixture&limit=5", 200)
	require.NotContains(t, episodeIDs(ao), int64(703), "AO-fixture filter must exclude the PM-only episode (Naruto ep. 3 analog)")
	require.NotContains(t, episodeIDs(ao), int64(704), "AO-fixture filter must exclude the PM-only episode (Naruto ep. 4 analog)")

	tr.reset()
	_, pm := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=project-messiah-fixture&limit=5", 200)
	require.NotContains(t, episodeIDs(pm), int64(701), "PM-fixture filter must exclude the AO-only episode (Naruto ep. 1 analog)")
	require.NotContains(t, episodeIDs(pm), int64(702), "PM-fixture filter must exclude the AO-only episode (Naruto ep. 2 analog)")
}

// TestEpisodeVersionPublicGroupFilterPaginationScope is Pflichtfall F: the filtered
// group's only matching episode must still be found even though 29 non-matching
// episodes precede it, proving the filter runs inside the SQL statement before LIMIT
// rather than as a client-side filter over an already-limited page.
func TestEpisodeVersionPublicGroupFilterPaginationScope(t *testing.T) {
	pool, tr := openEpisodeVersionPublicGroupFilterFixture(t)

	tr.reset()
	_, page := episodePublicRequest(t, pool, "/anime/8/episodes?projection=public&fansub=project-messiah-fixture&limit=1", 200)
	require.Len(t, page.Data.Episodes, 1, "a client-side/post-LIMIT filter would have returned zero rows on this first page")
	require.EqualValues(t, 8030, page.Data.Episodes[0].EpisodeID)
	require.False(t, page.Data.Pagination.HasMore)
	assertPublicBudgetWithGroupFilter(t, tr, 1, true)
}

// TestEpisodeVersionPublicGroupFilterNonPublicVersion is Pflichtfall I / D-02's
// fail-closed rule: a release_versions row with a variant but zero
// release_version_groups rows must never make its episode visible, in "Alle" or any
// group filter.
func TestEpisodeVersionPublicGroupFilterNonPublicVersion(t *testing.T) {
	pool, tr := openEpisodeVersionPublicGroupFilterFixture(t)

	tr.reset()
	_, all := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&limit=24", 200)
	require.NotContains(t, episodeIDs(all), int64(706), "a variant without any release_version_groups row must never be publicly visible, even under Alle")

	tr.reset()
	_, ao := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=animeownage-fixture&limit=24", 200)
	require.NotContains(t, episodeIDs(ao), int64(706))
}

// TestEpisodeVersionPublicGroupFilterCursorScope is Pflichtfall G (backend half) /
// D-06: a cursor obtained under one group filter must be rejected before any SQL runs
// once the filter changes, mirroring the existing foreign-anime-cursor pattern.
func TestEpisodeVersionPublicGroupFilterCursorScope(t *testing.T) {
	pool, tr := openEpisodeVersionPublicGroupFilterFixture(t)

	tr.reset()
	_, first := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=animeownage-fixture&limit=1", 200)
	require.NotNil(t, first.Data.Pagination.NextCursor)
	cursor := *first.Data.Pagination.NextCursor

	tr.reset()
	episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=project-messiah-fixture&cursor="+url.QueryEscape(cursor), 400)
	require.Empty(t, tr.queries, "a cursor scoped to one group filter must fail before SQL once the filter changes")
}

// TestEpisodeVersionPublicGroupFilterUnknownSlug is Pflichtfall H (backend
// defense-in-depth half) / D-05: an anime-foreign or unknown slug must fail closed
// with a generic message that does not distinguish a typo from a cross-anime slug.
func TestEpisodeVersionPublicGroupFilterUnknownSlug(t *testing.T) {
	pool, tr := openEpisodeVersionPublicGroupFilterFixture(t)

	tr.reset()
	raw, _ := episodePublicRequest(t, pool, "/anime/7/episodes?projection=public&fansub=does-not-exist-for-this-anime&limit=5", 400)
	var body publicErrorEnvelope
	require.NoError(t, json.Unmarshal(raw, &body))
	require.Equal(t, "unbekannte Fansub-Gruppe für diesen Anime", body.Error.Message,
		"fail-closed message must not disclose whether the slug is a typo or belongs to another anime (D-05)")
}
