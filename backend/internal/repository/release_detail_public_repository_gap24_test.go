package repository

// GAP-24 (165-UAT.md, Auftraggeber-Entscheidung 2026-09-23): own test file for
// loadReleaseHeader's einteiler-placeholder title rule -- kept separate from
// release_detail_public_repository_test.go (already 371 lines, 450-line
// ceiling) rather than extending it.

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// openReleaseDetailEinteilerPlaceholderFixture is a minimal Phase-117 fixture
// for loadReleaseHeader's GAP-24 einteiler-placeholder title default,
// following the same shape as openReleaseDetailFilmHeaderFixture (GAP-23):
// - anime 930 (film): stored placeholder episode title "Episode 1" (legacy
//   data shape, no migration) -> the anime title must win.
// - anime 931 (film): stored GENUINE episode title "Parody Mode" -> must be
//   kept, not replaced by the anime title (GAP-24's refinement of GAP-23).
// - anime 932 (ova, single canonical episode, episode_type_id deliberately
//   NOT 'movie'): stored placeholder title "Folge 1" -> proves the COUNT(*)
//   branch works independently of the episode_type signal.
// - anime 933 (ova, TWO canonical episodes): stored placeholder title
//   "Episode 1" on episode 1 -> no longer an einteiler, series behavior
//   (placeholder title kept verbatim, same as any series episode title).
// - anime 934 (film): stored placeholder title "Episode 1" AND a genuine
//   group-entered title on a second release version -> the group title keeps
//   unconditional priority.
func openReleaseDetailEinteilerPlaceholderFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	_, err := pool.Exec(context.Background(), `
ALTER TABLE fansub_groups ADD COLUMN slug TEXT NOT NULL DEFAULT '';
ALTER TABLE release_variants ADD COLUMN filename TEXT;
ALTER TABLE anime ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE anime ADD COLUMN type TEXT;
ALTER TABLE episodes ADD COLUMN episode_type_id BIGINT;
CREATE TABLE episode_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO episode_types (id, name) VALUES (1,'episode'),(2,'movie');

-- Fall 1: Film mit gespeichertem Platzhalter-Episodentitel (Bestandsdaten).
INSERT INTO anime (id,title,type) VALUES (930,'.hack//G.U. Trilogy','film');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (930,930,'1','Episode 1',2);
INSERT INTO fansub_releases (id,episode_id) VALUES (930,930);
INSERT INTO release_versions (id,release_id,version,title) VALUES (9301,930,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES (9301,9301,'film-placeholder-9301.mkv');

-- Fall 2: Film mit ECHTEM Episodentitel -- muss erhalten bleiben.
INSERT INTO anime (id,title,type) VALUES (931,'Vipers Creed','film');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (931,931,'1','Parody Mode',2);
INSERT INTO fansub_releases (id,episode_id) VALUES (931,931);
INSERT INTO release_versions (id,release_id,version,title) VALUES (9311,931,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES (9311,9311,'film-real-9311.mkv');

-- Fall 3: OVA mit genau einer kanonischen Episode, episode_type_id bewusst
-- NICHT 'movie' -- beweist den COUNT(*)-Zweig unabhaengig vom episode_type.
INSERT INTO anime (id,title,type) VALUES (932,'OVA Special Trip','ova');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (932,932,'1','Folge 1',1);
INSERT INTO fansub_releases (id,episode_id) VALUES (932,932);
INSERT INTO release_versions (id,release_id,version,title) VALUES (9321,932,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES (9321,9321,'ova-placeholder-9321.mkv');

-- Fall 4: OVA mit ZWEI kanonischen Episoden -- kein Einteiler mehr.
INSERT INTO anime (id,title,type) VALUES (933,'Multi OVA','ova');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (933,933,'1','Episode 1',1);
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (9330,933,'2','Finale',1);
INSERT INTO fansub_releases (id,episode_id) VALUES (933,933);
INSERT INTO release_versions (id,release_id,version,title) VALUES (9331,933,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES (9331,9331,'ova-multi-9331.mkv');

-- Fall 5: Film mit Platzhalter-Episodentitel UND echtem Gruppentitel --
-- Gruppentitel hat weiterhin unbedingten Vorrang.
INSERT INTO anime (id,title,type) VALUES (934,'Solo With Group','film');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (934,934,'1','Episode 1',2);
INSERT INTO fansub_releases (id,episode_id) VALUES (934,934);
INSERT INTO release_versions (id,release_id,version,title) VALUES
 (9341,934,'v1',NULL),
 (9342,934,'v1','Group Entered Title');
INSERT INTO release_variants (id,release_version_id,filename) VALUES
 (9341,9341,'film-group-a-9341.mkv'),
 (9342,9342,'film-group-b-9342.mkv');

INSERT INTO fansub_groups (id,slug,name) VALUES (9301,'gap24-group','AnimeOwnage');
INSERT INTO release_version_groups VALUES
 (9301,9301),(9311,9301),(9321,9301),(9331,9301),(9341,9301),(9342,9301);
`)
	require.NoError(t, err)
	return pool
}

// TestLoadReleaseHeaderTitleUsesGap24EinteilerPlaceholderFormat is Quick-Task
// 260923-ed4's GAP-24 behavior test for the release detail page's title
// (loadReleaseHeader): an einteiler (film always; ova/ona/special/bonus with
// exactly one canonical episode) with a stored AniSearch placeholder episode
// title reads as the anime title, a GENUINE episode title is kept, a
// multi-episode ova is unaffected (series behavior), and a group-entered
// title keeps unconditional priority even over the placeholder rule.
func TestLoadReleaseHeaderTitleUsesGap24EinteilerPlaceholderFormat(t *testing.T) {
	pool := openReleaseDetailEinteilerPlaceholderFixture(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")

	header, err := repo.loadReleaseHeader(ctx, 930, 9301, 9301)
	require.NoError(t, err)
	require.Equal(t, ".hack//G.U. Trilogy · (AnimeOwnage) · v1", header.Title, "a film's stored placeholder episode title 'Episode 1' must be ignored, even for legacy data without migration")

	header, err = repo.loadReleaseHeader(ctx, 931, 9301, 9311)
	require.NoError(t, err)
	require.Equal(t, "Parody Mode · (AnimeOwnage) · v1", header.Title, "a film's GENUINE episode title must never be replaced by the anime title")

	header, err = repo.loadReleaseHeader(ctx, 932, 9301, 9321)
	require.NoError(t, err)
	require.Equal(t, "OVA Special Trip · (AnimeOwnage) · v1", header.Title, "an OVA with exactly one canonical episode and a placeholder title must resolve to the anime title, independent of episode_type_id")

	header, err = repo.loadReleaseHeader(ctx, 933, 9301, 9331)
	require.NoError(t, err)
	require.Equal(t, "Episode 1 · (AnimeOwnage) · v1", header.Title, "an OVA with two canonical episodes is no longer an einteiler -- the placeholder title on episode 1 wins like any series episode title")

	header, err = repo.loadReleaseHeader(ctx, 934, 9301, 9342)
	require.NoError(t, err)
	require.Equal(t, "Group Entered Title", header.Title, "a genuinely group-entered title keeps unconditional priority, even when the episode title is a placeholder")
}
