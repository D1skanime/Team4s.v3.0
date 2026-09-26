package repository

// Tests fuer ReleaseDetailPublicRepository (AO4-02).
//
// Die aelteren Tests unten pruefen strukturelle Eigenschaften (Reihenfolge von
// Fehlerpruefungen, Anwesenheit von Feldern/SQL-Fragmenten) per Source-Assertion,
// bevor 164-08 dieser Datei echte, DB-ausgefuehrte Verhaltens-Tests hinzugefuegt hat
// (siehe TestLoadReleaseGroupsResolvesMediaAssetLogoURL/TestLoadReleaseHeaderTitle*
// unten, analog zum bereits bestehenden Praezedenzfall
// release_detail_public_repository_segment_credits_test.go, ebenfalls package
// repository, ebenfalls testsupport.OpenPhase117Postgres gegen unexportierte
// Methoden). Neue Faelle in dieser Datei MUESSEN echten Code ausfuehren
// (CLAUDE.md Teststil) statt eine weitere Source-Substring-Pruefung zu ergaenzen —
// die bestehenden vier Source-Assertion-Tests sind dokumentierte Altlast (siehe
// .planning/notes/2026-09-02-altlasten-cr01-wr02.md, WR-02) und bleiben unveraendert.

import (
	"context"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

func TestGetPublicReleaseDetail_NotFoundPathChecksErrNoRowsBeforeUse(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))

	required := []string{
		"func (r *releasedetailpublicrepository) loadreleaseheader(",
		"errors.is(err, pgx.errnorows)",
		"return nil, errnotfound",
		"join release_version_groups rvg on rvg.release_version_id = rv.id",
		"e.anime_id = $2",
		"rvg.fansub_group_id = $3",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected release detail header lookup to guard pgx.ErrNoRows before use and scope by anime+group, missing %q", fragment)
		}
	}

	// pgx.ErrNoRows muss VOR dem generischen err!=nil-Fall geprueft werden, sonst
	// wuerde der generische Fall zuerst greifen und nie ErrNotFound zurueckgeben.
	noRowsIdx := strings.Index(content, "errors.is(err, pgx.errnorows)")
	genericErrIdx := strings.Index(content, "if err != nil {\n\t\treturn nil, fmt.errorf(\"release detail: load header")
	if noRowsIdx == -1 || genericErrIdx == -1 || noRowsIdx > genericErrIdx {
		t.Fatalf("expected pgx.ErrNoRows check to precede the generic error branch in loadReleaseHeader")
	}
}

func TestGetPublicReleaseDetail_VisibilityGatesMatchAO4_02(t *testing.T) {
	helpersContent := strings.ToLower(
		readRepositorySource(t, "release_detail_public_repository_helpers.go") +
			readRepositorySource(t, "public_effective_contributors.go"),
	)

	imageGate := []string{
		"from release_version_media rvm",
		"v.name = 'public'",
		"rs.code = 'approved'",
		"ma.status = 'ready'",
		"rvm.deleted_at is null",
	}
	for _, fragment := range imageGate {
		if !strings.Contains(helpersContent, fragment) {
			t.Fatalf("expected image visibility gate to contain %q", fragment)
		}
	}

	noteGate := []string{
		"from release_version_notes rvn",
		"rvn.visibility = 'public'",
		"rvn.status = 'published'",
		"rvn.deleted_at is null",
	}
	for _, fragment := range noteGate {
		if !strings.Contains(helpersContent, fragment) {
			t.Fatalf("expected note visibility gate to contain %q", fragment)
		}
	}

	contributorGate := []string{
		"join anime_contributions ac",
		"ac.is_public_on_anime_page = true",
		"coalesce(v.name, 'public') = 'public'",
	}
	for _, fragment := range contributorGate {
		if !strings.Contains(helpersContent, fragment) {
			t.Fatalf("expected contributor visibility gate to contain %q", fragment)
		}
	}
}

func TestGetPublicReleaseDetail_ResponseFieldsPresent(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))

	required := []string{
		"images_count",
		"notes_count",
		"contributors_count",
		"release_date",
		"contributors",
		"images",
		"notes",
		"category",
		"episode_title",
		"subtitle_tracks",
		"preview_image",
		"image_category_totals",
		"segments",
		"previous",
		"next",
		"other_releases",
	}
	for _, fragment := range required {
		if !strings.Contains(content, fragment) {
			t.Fatalf("expected PublicReleaseDetail DTO to expose %q", fragment)
		}
	}
}

func TestGetPublicReleaseDetail_UsesSelectedPreviewAndEffectiveReleaseScope(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))
	helpers := strings.ToLower(
		readRepositorySource(t, "release_detail_public_repository_helpers.go") +
			readRepositorySource(t, "public_effective_contributors.go"),
	)
	for _, fragment := range []string{
		"if images[i].ispreviewcandidate",
		"rvm.is_preview_candidate",
		"coalesce(ac.release_version_id = rc.release_version_id, false) as is_override",
		"ac.release_version_id = rc.release_version_id",
		"ac.release_version_id is null",
		"rvg.release_version_id = rc.release_version_id",
	} {
		if !strings.Contains(content+helpers, fragment) {
			t.Fatalf("missing release projection guard %q", fragment)
		}
	}
}

func TestReleaseImageCategoriesAreIndependentAndValidated(t *testing.T) {
	content := strings.ToLower(readRepositorySource(t, "release_detail_public_repository.go"))
	helpers := strings.ToLower(readRepositorySource(t, "release_detail_public_repository_helpers.go"))
	for _, fragment := range []string{"ispublicreleaseimagecategory(category)", "rvm.category = $2", "count(*) filter(where rvm.category='screenshot')", "count(*) filter(where rvm.category='typesetting_karaoke')", "returnedcount"} {
		if !strings.Contains(content+helpers, fragment) {
			t.Fatalf("missing category cursor behavior %q", fragment)
		}
	}
}

func TestReleaseNavigationKeepsGroupAndPrefersVersion(t *testing.T) {
	helpers := strings.ToLower(readRepositorySource(t, "release_detail_public_repository_helpers.go"))
	for _, fragment := range []string{"rvg.fansub_group_id=$3", "case when rv.version=$4 then 0 else 1", "groupid"} {
		if !strings.Contains(helpers, fragment) {
			t.Fatalf("missing same-group navigation behavior %q", fragment)
		}
	}
}

// openReleaseDetailGroupsFixture is a minimal Phase-117 fixture for loadReleaseGroups:
// one release_version_id=900 carrying three groups -- a media-asset logo (server
// file_path, the GAP-01 bug shape), an already-correct stored logo_url, and no logo at
// all. Never touches team4s_v2; guarded, isolated schema per testsupport convention.
func openReleaseDetailGroupsFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	_, err := pool.Exec(context.Background(), `
ALTER TABLE fansub_groups ADD COLUMN slug TEXT NOT NULL DEFAULT '', ADD COLUMN logo_url TEXT,
    ADD COLUMN logo_id BIGINT REFERENCES media_assets(id);
INSERT INTO anime (id) VALUES (900);
INSERT INTO episodes (id,anime_id,episode_number,title) VALUES (900,900,'1','Fixture episode');
INSERT INTO fansub_releases (id,episode_id) VALUES (900,900);
INSERT INTO release_versions (id,release_id) VALUES (900,900);
INSERT INTO media_assets (id,file_path) VALUES (900,'/app/media/logo_fixture.png'), (904,'/app/media/logo with space #1.png');
INSERT INTO fansub_groups (id,slug,name) VALUES
 (901,'media-logo-group','A Media-Logo Group'),
 (902,'url-logo-group','B URL-Logo Group'),
 (903,'no-logo-group','C No-Logo Group'),
 (904,'special-char-logo-group','D Special-Char-Logo Group');
UPDATE fansub_groups SET logo_id=900 WHERE id=901;
UPDATE fansub_groups SET logo_url='/api/v1/media/files/existing-logo.png' WHERE id=902;
UPDATE fansub_groups SET logo_id=904 WHERE id=904;
INSERT INTO release_version_groups VALUES (900,901),(900,902),(900,903),(900,904);
`)
	require.NoError(t, err)
	return pool
}

// TestLoadReleaseGroupsResolvesMediaAssetLogoURL is 164-08's GAP-01 behavior test for
// the release detail page's group/logo read (loadReleaseGroups), executed against a
// real, isolated Postgres fixture (not a source-string assertion, per CLAUDE.md
// Teststil): a media-asset logo must resolve to a web-safe /api/v1/media/files/<name>
// URL (never the raw server file_path), an already-correct stored logo_url must pass
// through verbatim, and a group with neither must yield a nil LogoURL.
func TestLoadReleaseGroupsResolvesMediaAssetLogoURL(t *testing.T) {
	pool := openReleaseDetailGroupsFixture(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")

	groups, err := repo.loadReleaseGroups(ctx, 900)
	require.NoError(t, err)
	require.Len(t, groups, 4)

	byID := make(map[int64]PublicReleaseGroup, len(groups))
	for _, g := range groups {
		byID[g.ID] = g
	}

	require.NotNil(t, byID[901].LogoURL)
	require.Equal(t, "/api/v1/media/files/logo_fixture.png", *byID[901].LogoURL, "media_assets.file_path must resolve to a web URL, not the raw server path")
	require.NotNil(t, byID[902].LogoURL)
	require.Equal(t, "/api/v1/media/files/existing-logo.png", *byID[902].LogoURL, "an already-correct stored logo_url must pass through verbatim")
	require.Nil(t, byID[903].LogoURL, "a group with neither logo_id nor logo_url must yield no logo URL at all")
	require.NotNil(t, byID[904].LogoURL)
	require.Equal(t, "/api/v1/media/files/logo%20with%20space%20%231.png", *byID[904].LogoURL,
		"a filename with a space and a special character (WR-03) must round-trip to a properly percent-escaped URL")
}

// openReleaseDetailHeaderFixture is a minimal Phase-117 fixture for loadReleaseHeader's
// GAP-02 title: one episode/fansub_release carrying three release_versions -- a
// filename-as-title (must resolve to the computed default), a genuinely group-entered
// title (must pass through verbatim), and a NULL title with two groups (coop default).
func openReleaseDetailHeaderFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	_, err := pool.Exec(context.Background(), `
ALTER TABLE fansub_groups ADD COLUMN slug TEXT NOT NULL DEFAULT '';
ALTER TABLE release_variants ADD COLUMN filename TEXT;
-- GAP-23 (165-UAT.md): publicReleaseNameSQL's filmEpisodeSQL now unconditionally
-- references anime.type and episodes.episode_type_id/episode_types -- this
-- pre-existing GAP-02 fixture stays series-only (no rows in episode_types
-- match, anime.type stays NULL), so behavior is unchanged.
ALTER TABLE anime ADD COLUMN type TEXT;
ALTER TABLE anime ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE episodes ADD COLUMN episode_type_id BIGINT;
CREATE TABLE episode_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO anime (id) VALUES (910);
INSERT INTO episodes (id,anime_id,episode_number,title) VALUES (910,910,'1','Header Episode');
INSERT INTO fansub_releases (id,episode_id) VALUES (910,910);
INSERT INTO release_versions (id,release_id,version,title) VALUES
 (9101,910,'v1','Naruto.S01E01-AnimeOwnage.avi'),
 (9102,910,'v1','Real Title'),
 (9103,910,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES
 (9101,9101,'Naruto.S01E01-AnimeOwnage.avi'),
 (9102,9102,'not-matching.mkv'),
 (9103,9103,'coop-file.mkv');
INSERT INTO fansub_groups (id,slug,name) VALUES
 (9101,'header-solo','Solo Header Gruppe'),
 (9102,'header-coop-a','Header Coop A'),
 (9103,'header-coop-b','Header Coop B');
INSERT INTO release_version_groups VALUES (9101,9101),(9102,9101),(9103,9102),(9103,9103);
`)
	require.NoError(t, err)
	return pool
}

// TestLoadReleaseHeaderTitleUsesGapTwoDefaultFormat is 164-08's GAP-02 behavior test
// for the release detail page's title (loadReleaseHeader), proving format parity with
// the public anime page (164-08 Task 2): a filename-as-title resolves to the computed
// default, a genuine title passes through verbatim, and a NULL title with two groups
// resolves to the coop default -- all via the same publicReleaseNameSQL function.
func TestLoadReleaseHeaderTitleUsesGapTwoDefaultFormat(t *testing.T) {
	pool := openReleaseDetailHeaderFixture(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")

	header, err := repo.loadReleaseHeader(ctx, 910, 9101, 9101)
	require.NoError(t, err)
	require.Equal(t, "Header Episode · (Solo Header Gruppe) · v1", header.Title, "a filename-as-title must resolve to the computed default, never the filename")

	header, err = repo.loadReleaseHeader(ctx, 910, 9101, 9102)
	require.NoError(t, err)
	require.Equal(t, "Real Title", header.Title, "a genuinely group-entered title must pass through verbatim")

	header, err = repo.loadReleaseHeader(ctx, 910, 9102, 9103)
	require.NoError(t, err)
	require.Equal(t, "Header Episode · (Header Coop A × Header Coop B) · v1", header.Title, "a NULL title with two groups must resolve to the coop default, both groups regardless of which one's URL is being viewed")
}

// openReleaseDetailFilmHeaderFixture is a minimal Phase-117 fixture for
// loadReleaseHeader's GAP-23 film-title default (165-UAT.md): a film anime whose
// canonical episode still carries the misleading legacy "Episode 1" title (must be
// ignored for films), a film release with a genuine group-entered title (must still
// win), a series with an episode title (regression guard), a series without an
// episode title using the GAP-02 "Folge N" fallback (regression guard), and a
// coop-form film release (two groups).
func openReleaseDetailFilmHeaderFixture(t *testing.T) *pgxpool.Pool {
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

INSERT INTO anime (id,title,type) VALUES (920,'.hack//G.U. Trilogy','film');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (920,920,'1','Episode 1',2);
INSERT INTO fansub_releases (id,episode_id) VALUES (920,920);
INSERT INTO release_versions (id,release_id,version,title) VALUES
 (9201,920,'v1',NULL),
 (9202,920,'v1','Special Group Title');
INSERT INTO release_variants (id,release_version_id,filename) VALUES
 (9201,9201,'film-variant-9201.mkv'),
 (9202,9202,'film-variant-9202.mkv');

INSERT INTO anime (id,title,type) VALUES (921,'Naruto','tv');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (921,921,'1','Der Test-Titel',1);
INSERT INTO fansub_releases (id,episode_id) VALUES (921,921);
INSERT INTO release_versions (id,release_id,version,title) VALUES (9211,921,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES (9211,9211,'series-variant-9211.mkv');

INSERT INTO anime (id,title,type) VALUES (922,'No Title Series','tv');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (922,922,'7',NULL,1);
INSERT INTO fansub_releases (id,episode_id) VALUES (922,922);
INSERT INTO release_versions (id,release_id,version,title) VALUES (9221,922,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES (9221,9221,'series-variant-9221.mkv');

INSERT INTO anime (id,title,type) VALUES (923,'Trilogy Coop Film','film');
INSERT INTO episodes (id,anime_id,episode_number,title,episode_type_id) VALUES (923,923,'1',NULL,2);
INSERT INTO fansub_releases (id,episode_id) VALUES (923,923);
INSERT INTO release_versions (id,release_id,version,title) VALUES (9231,923,'v1',NULL);
INSERT INTO release_variants (id,release_version_id,filename) VALUES (9231,9231,'coop-variant-9231.mkv');

INSERT INTO fansub_groups (id,slug,name) VALUES
 (9201,'film-header-solo','AnimeOwnage'),
 (9202,'film-header-coop-a','Coop Group A'),
 (9203,'film-header-coop-b','Coop Group B');
INSERT INTO release_version_groups VALUES (9201,9201),(9202,9201),(9211,9201),(9221,9201),(9231,9202),(9231,9203);
`)
	require.NoError(t, err)
	return pool
}

// TestLoadReleaseHeaderTitleUsesGap23FilmDefaultFormat is Quick-Task 260923-amz's
// GAP-23 behavior test for the release detail page's title (loadReleaseHeader):
// for films the first name component is always the anime/film title, never the
// (possibly misleading) episode title or the "Folge N" fallback; a genuine
// group-entered title keeps unconditional priority; series stay unaffected,
// including the coop ' × ' form.
func TestLoadReleaseHeaderTitleUsesGap23FilmDefaultFormat(t *testing.T) {
	pool := openReleaseDetailFilmHeaderFixture(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")

	header, err := repo.loadReleaseHeader(ctx, 920, 9201, 9201)
	require.NoError(t, err)
	require.Equal(t, ".hack//G.U. Trilogy · (AnimeOwnage) · v1", header.Title, "a film must always use the anime/film title as the first component, even though episode.title is the misleading legacy 'Episode 1'")

	header, err = repo.loadReleaseHeader(ctx, 920, 9201, 9202)
	require.NoError(t, err)
	require.Equal(t, "Special Group Title", header.Title, "a genuinely group-entered title keeps unconditional priority, even for films")

	header, err = repo.loadReleaseHeader(ctx, 921, 9201, 9211)
	require.NoError(t, err)
	require.Equal(t, "Der Test-Titel · (AnimeOwnage) · v1", header.Title, "a series with an episode title must be unaffected by the film rule")

	header, err = repo.loadReleaseHeader(ctx, 922, 9201, 9221)
	require.NoError(t, err)
	require.Equal(t, "Folge 7 · (AnimeOwnage) · v1", header.Title, "a series without an episode title must keep the existing GAP-02 'Folge N' fallback")

	header, err = repo.loadReleaseHeader(ctx, 923, 9202, 9231)
	require.NoError(t, err)
	require.Equal(t, "Trilogy Coop Film · (Coop Group A × Coop Group B) · v1", header.Title, "the film title stays coop-capable, same ' × ' sort convention as series")
}
