package repository

// Plan 173-09 (REQ-173-22/REQ-173-23): proves that the anime detail cover/banner
// (GetByID -> getByIDV2), the resolved-assets cover/banner/logo (GetResolvedAssets, both the
// V1 legacy-column path and the V2 anime_media path), and the fansub project banner
// (listPublicFansubProjects) all prefer the 'display' media_files variant ahead of 'original'
// when a display row exists, under their existing field names -- with a safe fallback to
// 'original' when no display row exists yet (pre-173-01/02 backfill parity).
//
// Package repository (not repository_test), analog to theme_segment_preview_test.go --
// access to the unexported getByIDV2/listPublicFansubProjects call sites via their exported
// wrappers (GetByID) and the package-private listPublicFansubProjects helper.
//
// Skips cleanly when TEAM4S_PHASE106_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// createAnimeDetailV2Schema sets up the minimal anime/media schema needed to reach the
// schema.HasSlug=true (V2) branch of AnimeRepository.GetByID, mirroring
// anime_public_read_integration_test.go's table shapes.
func createAnimeDetailV2Schema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
	id BIGINT PRIMARY KEY, slug TEXT, title TEXT NOT NULL,
	anime_type_id BIGINT, content_type TEXT NOT NULL DEFAULT 'anime', status TEXT NOT NULL DEFAULT 'ongoing',
	year SMALLINT, max_episodes SMALLINT, description TEXT,
	cover_image TEXT, cover_resolved_url TEXT, banner_resolved_url TEXT, banner_asset_id BIGINT,
	source TEXT, folder_name TEXT, anisearch_id TEXT
);
CREATE TABLE anime_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE languages (id BIGINT PRIMARY KEY, code TEXT);
CREATE TABLE title_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE anime_titles (anime_id BIGINT, language_id BIGINT, title_type_id BIGINT, title TEXT);
CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_assets (id BIGINT PRIMARY KEY, media_type_id BIGINT, file_path TEXT);
CREATE TABLE media_files (id BIGINT PRIMARY KEY, media_id BIGINT, path TEXT, variant TEXT, status TEXT);
CREATE TABLE anime_media (anime_id BIGINT, media_id BIGINT, sort_order INT);
CREATE TABLE episodes (
	id BIGINT PRIMARY KEY, anime_id BIGINT, episode_number TEXT, title TEXT,
	status TEXT, view_count INT, download_count INT, stream_links TEXT[], filename TEXT
);
CREATE TABLE anime_source_links (anime_id BIGINT, source TEXT);
CREATE TABLE anime_genres (anime_id BIGINT, genre_id BIGINT);
CREATE TABLE genres (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE genre_names (id BIGINT PRIMARY KEY, genre_id BIGINT, language_id BIGINT, name TEXT);
CREATE TABLE anime_tags (anime_id BIGINT, tag_id BIGINT);
CREATE TABLE tags (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE tag_names (id BIGINT PRIMARY KEY, tag_id BIGINT, language_id BIGINT, name TEXT);
INSERT INTO media_types (id, name) VALUES (1, 'poster'), (2, 'banner');
`)
	require.NoError(t, err)
}

func TestGetByIDV2_PosterBannerPreferDisplayOverOriginal(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createAnimeDetailV2Schema(t, pool)
	repo := NewAnimeRepository(pool)
	ctx := context.Background()

	t.Run("poster und banner haben display UND original -- display gewinnt", func(t *testing.T) {
		const animeID int64 = 1
		const posterAssetID int64 = 101
		const bannerAssetID int64 = 102
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title) VALUES ($1, 'display-wins', 'Display Wins')`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO media_assets (id, media_type_id, file_path) VALUES ($1, 1, 'poster-legacy.jpg'), ($2, 2, 'banner-legacy.jpg')`, posterAssetID, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(1001, $1, 'poster-original.webp', 'original', 'ready'),
				(1002, $1, 'poster-display.webp', 'display', 'ready'),
				(1003, $2, 'banner-original.webp', 'original', 'ready'),
				(1004, $2, 'banner-display.webp', 'display', 'ready')
		`, posterAssetID, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0), ($1, $3, 0)`, animeID, posterAssetID, bannerAssetID)
		require.NoError(t, err)

		detail, err := repo.GetByID(ctx, animeID, false)
		require.NoError(t, err)
		require.NotNil(t, detail.CoverImage)
		require.Equal(t, "poster-display.webp", *detail.CoverImage, "cover_image muss display vor original bevorzugen")
		require.NotNil(t, detail.BannerURL)
		require.Equal(t, "banner-display.webp", *detail.BannerURL, "banner_url muss display vor original bevorzugen")
	})

	t.Run("poster und banner haben NUR original, kein display -- original wie bisher (Pre-Backfill)", func(t *testing.T) {
		const animeID int64 = 2
		const posterAssetID int64 = 201
		const bannerAssetID int64 = 202
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title) VALUES ($1, 'original-only', 'Original Only')`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO media_assets (id, media_type_id, file_path) VALUES ($1, 1, 'poster-legacy2.jpg'), ($2, 2, 'banner-legacy2.jpg')`, posterAssetID, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(2001, $1, 'poster-original-only.webp', 'original', 'ready'),
				(2002, $2, 'banner-original-only.webp', 'original', 'ready')
		`, posterAssetID, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0), ($1, $3, 0)`, animeID, posterAssetID, bannerAssetID)
		require.NoError(t, err)

		detail, err := repo.GetByID(ctx, animeID, false)
		require.NoError(t, err)
		require.NotNil(t, detail.CoverImage)
		// cover_image's poster LATERAL never consulted media_files at all before this plan (only
		// COALESCE(poster_display.path, ma.file_path)) -- the pre-existing 'original' media_files
		// row stays irrelevant, exactly as before. Pre-backfill parity means the bare
		// media_assets.file_path column, not a media_files row.
		require.Equal(t, "poster-legacy2.jpg", *detail.CoverImage, "ohne display-Zeile muss weiterhin auf ma.file_path zurueckfallen (unveraendertes Pre-173-09-Verhalten)")
		require.NotNil(t, detail.BannerURL)
		require.Equal(t, "banner-original-only.webp", *detail.BannerURL, "ohne display-Zeile muss banner_url weiterhin original resolved werden")
	})
}

// createAnimeAssetV1Schema sets up the legacy (pre-anime_media) cover/banner column schema so
// AnimeAssetRepository.hasV2AssetSchema returns false and GetResolvedAssets takes the V1 path.
func createAnimeAssetV1Schema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
	id BIGINT PRIMARY KEY,
	cover_asset_id BIGINT, cover_source TEXT, cover_resolved_url TEXT, cover_provider_key TEXT, cover_image TEXT,
	banner_asset_id BIGINT, banner_source TEXT, banner_resolved_url TEXT, banner_provider_key TEXT
);
CREATE TABLE media_files (id BIGINT PRIMARY KEY, media_id BIGINT, path TEXT, variant TEXT, status TEXT);
CREATE TABLE anime_background_assets (
	id BIGSERIAL PRIMARY KEY, anime_id BIGINT, media_asset_id BIGINT, source TEXT, resolved_url TEXT,
	provider_key TEXT, sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`)
	require.NoError(t, err)
}

func TestGetResolvedAssetsV1_CoverBannerBackgroundPreferDisplayOverOriginal(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createAnimeAssetV1Schema(t, pool)
	repo := NewAnimeAssetRepository(pool)
	ctx := context.Background()

	t.Run("cover und banner haben display UND original -- display gewinnt", func(t *testing.T) {
		const animeID int64 = 1
		const coverAssetID int64 = 11
		const bannerAssetID int64 = 12
		_, err := pool.Exec(ctx, `
			INSERT INTO anime (id, cover_asset_id, cover_source, banner_asset_id, banner_source) VALUES ($1, $2, 'manual', $3, 'manual')
		`, animeID, coverAssetID, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(3001, $1, 'cover-original.webp', 'original', 'ready'),
				(3002, $1, 'cover-display.webp', 'display', 'ready'),
				(3003, $2, 'banner-original.webp', 'original', 'ready'),
				(3004, $2, 'banner-display.webp', 'display', 'ready')
		`, coverAssetID, bannerAssetID)
		require.NoError(t, err)

		assets, err := repo.GetResolvedAssets(ctx, animeID)
		require.NoError(t, err)
		require.NotNil(t, assets.Cover)
		require.Equal(t, "cover-display.webp", assets.Cover.URL, "V1 Cover muss display vor original bevorzugen")
		require.NotNil(t, assets.Banner)
		require.Equal(t, "banner-display.webp", assets.Banner.URL, "V1 Banner muss display vor original bevorzugen")
	})

	t.Run("cover und banner haben NUR original -- original wie bisher (Pre-Backfill)", func(t *testing.T) {
		const animeID int64 = 2
		const coverAssetID int64 = 21
		const bannerAssetID int64 = 22
		_, err := pool.Exec(ctx, `
			INSERT INTO anime (id, cover_asset_id, cover_source, banner_asset_id, banner_source) VALUES ($1, $2, 'manual', $3, 'manual')
		`, animeID, coverAssetID, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(4001, $1, 'cover-original-only.webp', 'original', 'ready'),
				(4002, $2, 'banner-original-only.webp', 'original', 'ready')
		`, coverAssetID, bannerAssetID)
		require.NoError(t, err)

		assets, err := repo.GetResolvedAssets(ctx, animeID)
		require.NoError(t, err)
		require.NotNil(t, assets.Cover)
		require.Equal(t, "cover-original-only.webp", assets.Cover.URL)
		require.NotNil(t, assets.Banner)
		require.Equal(t, "banner-original-only.webp", assets.Banner.URL)
	})

	t.Run("Hintergrundbild hat display UND original -- display gewinnt", func(t *testing.T) {
		const animeID int64 = 3
		const bgAssetID int64 = 31
		_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(5001, $1, 'bg-original.webp', 'original', 'ready'),
				(5002, $1, 'bg-display.webp', 'display', 'ready')
		`, bgAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO anime_background_assets (anime_id, media_asset_id, source, sort_order) VALUES ($1, $2, 'manual', 0)
		`, animeID, bgAssetID)
		require.NoError(t, err)

		assets, err := repo.GetResolvedAssets(ctx, animeID)
		require.NoError(t, err)
		require.Len(t, assets.Backgrounds, 1)
		require.Equal(t, "bg-display.webp", assets.Backgrounds[0].URL, "V1 Hintergrundbild muss display vor original bevorzugen")
	})
}

// createAnimeAssetV2Schema sets up the anime_media-backed schema so
// AnimeAssetRepository.hasV2AssetSchema returns true and GetResolvedAssets takes the V2 path.
func createAnimeAssetV2Schema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (id BIGINT PRIMARY KEY);
CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_assets (id BIGINT PRIMARY KEY, media_type_id BIGINT, file_path TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), modified_at TIMESTAMPTZ);
CREATE TABLE media_files (id BIGINT PRIMARY KEY, media_id BIGINT, path TEXT, variant TEXT, status TEXT);
CREATE TABLE media_external (id BIGINT PRIMARY KEY, media_id BIGINT, provider TEXT, external_id TEXT);
CREATE TABLE anime_media (anime_id BIGINT, media_id BIGINT, sort_order INT);
INSERT INTO media_types (id, name) VALUES (1, 'poster'), (2, 'banner'), (3, 'logo');
`)
	require.NoError(t, err)
}

func TestGetResolvedAssetsV2_CoverBannerLogoPreferDisplayOverOriginal(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createAnimeAssetV2Schema(t, pool)
	repo := NewAnimeAssetRepository(pool)
	ctx := context.Background()

	t.Run("poster/banner/logo haben display UND original -- display gewinnt", func(t *testing.T) {
		const animeID int64 = 1
		const posterID int64 = 11
		const bannerID int64 = 12
		const logoID int64 = 13
		_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_assets (id, media_type_id, file_path) VALUES
				($1, 1, 'poster-legacy.jpg'), ($2, 2, 'banner-legacy.jpg'), ($3, 3, 'logo-legacy.jpg')
		`, posterID, bannerID, logoID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(6001, $1, 'poster-original.webp', 'original', 'ready'),
				(6002, $1, 'poster-display.webp', 'display', 'ready'),
				(6003, $2, 'banner-original.webp', 'original', 'ready'),
				(6004, $2, 'banner-display.webp', 'display', 'ready'),
				(6005, $3, 'logo-original.webp', 'original', 'ready'),
				(6006, $3, 'logo-display.webp', 'display', 'ready')
		`, posterID, bannerID, logoID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0), ($1, $3, 0), ($1, $4, 0)
		`, animeID, posterID, bannerID, logoID)
		require.NoError(t, err)

		assets, err := repo.GetResolvedAssets(ctx, animeID)
		require.NoError(t, err)
		require.NotNil(t, assets.Cover)
		require.Equal(t, "poster-display.webp", assets.Cover.URL, "V2 Cover muss display vor original bevorzugen")
		require.NotNil(t, assets.Banner)
		require.Equal(t, "banner-display.webp", assets.Banner.URL, "V2 Banner muss display vor original bevorzugen")
		require.NotNil(t, assets.Logo)
		require.Equal(t, "logo-display.webp", assets.Logo.URL, "V2 Logo muss display vor original bevorzugen")
	})

	t.Run("poster/banner/logo haben NUR original -- original wie bisher (Pre-Backfill)", func(t *testing.T) {
		const animeID int64 = 2
		const posterID int64 = 21
		const bannerID int64 = 22
		const logoID int64 = 23
		_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_assets (id, media_type_id, file_path) VALUES
				($1, 1, 'poster-legacy2.jpg'), ($2, 2, 'banner-legacy2.jpg'), ($3, 3, 'logo-legacy2.jpg')
		`, posterID, bannerID, logoID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(7001, $1, 'poster-original-only.webp', 'original', 'ready'),
				(7002, $2, 'banner-original-only.webp', 'original', 'ready'),
				(7003, $3, 'logo-original-only.webp', 'original', 'ready')
		`, posterID, bannerID, logoID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0), ($1, $3, 0), ($1, $4, 0)
		`, animeID, posterID, bannerID, logoID)
		require.NoError(t, err)

		assets, err := repo.GetResolvedAssets(ctx, animeID)
		require.NoError(t, err)
		require.NotNil(t, assets.Cover)
		require.Equal(t, "poster-original-only.webp", assets.Cover.URL)
		require.NotNil(t, assets.Banner)
		require.Equal(t, "banner-original-only.webp", assets.Banner.URL)
		require.NotNil(t, assets.Logo)
		require.Equal(t, "logo-original-only.webp", assets.Logo.URL)
	})
}

// createFansubProjectBannerSchema sets up the anime/anime_fansub_groups/anime_media schema
// needed by listPublicFansubProjects.
func createFansubProjectBannerSchema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
	id BIGINT PRIMARY KEY, slug TEXT, title TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'tv',
	status TEXT NOT NULL DEFAULT 'ongoing', year SMALLINT, cover_image TEXT, max_episodes SMALLINT,
	banner_resolved_url TEXT, banner_asset_id BIGINT
);
CREATE TABLE anime_fansub_groups (fansub_group_id BIGINT, anime_id BIGINT);
CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_assets (id BIGINT PRIMARY KEY, media_type_id BIGINT, file_path TEXT);
CREATE TABLE media_files (id BIGINT PRIMARY KEY, media_id BIGINT, path TEXT, variant TEXT, status TEXT);
CREATE TABLE anime_media (anime_id BIGINT, media_id BIGINT, sort_order INT);
INSERT INTO media_types (id, name) VALUES (1, 'banner');
`)
	require.NoError(t, err)
}

func TestListPublicFansubProjects_BannerPrefersDisplayOverOriginal(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createFansubProjectBannerSchema(t, pool)
	repo := NewFansubRepository(pool)
	ctx := context.Background()

	t.Run("Banner (ueber anime_media) hat display UND original -- display gewinnt", func(t *testing.T) {
		const groupID int64 = 1
		const animeID int64 = 1
		const bannerAssetID int64 = 11
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title) VALUES ($1, 'proj-display', 'Proj Display')`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_fansub_groups (fansub_group_id, anime_id) VALUES ($1, $2)`, groupID, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO media_assets (id, media_type_id, file_path) VALUES ($1, 1, 'banner-legacy.jpg')`, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(8001, $1, 'proj-banner-original.webp', 'original', 'ready'),
				(8002, $1, 'proj-banner-display.webp', 'display', 'ready')
		`, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0)`, animeID, bannerAssetID)
		require.NoError(t, err)

		projects, err := repo.listPublicFansubProjects(ctx, groupID)
		require.NoError(t, err)
		require.Len(t, projects, 1)
		require.NotNil(t, projects[0].BannerURL)
		require.Contains(t, *projects[0].BannerURL, "proj-banner-display.webp", "Fansub-Projekt-Banner muss display vor original bevorzugen")
	})

	t.Run("Banner (ueber anime_media) hat NUR original -- original wie bisher (Pre-Backfill)", func(t *testing.T) {
		const groupID int64 = 2
		const animeID int64 = 2
		const bannerAssetID int64 = 21
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title) VALUES ($1, 'proj-original', 'Proj Original')`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_fansub_groups (fansub_group_id, anime_id) VALUES ($1, $2)`, groupID, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO media_assets (id, media_type_id, file_path) VALUES ($1, 1, 'banner-legacy2.jpg')`, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(9001, $1, 'proj-banner-original-only.webp', 'original', 'ready')
		`, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0)`, animeID, bannerAssetID)
		require.NoError(t, err)

		projects, err := repo.listPublicFansubProjects(ctx, groupID)
		require.NoError(t, err)
		require.Len(t, projects, 1)
		require.NotNil(t, projects[0].BannerURL)
		require.Contains(t, *projects[0].BannerURL, "proj-banner-original-only.webp")
	})

	t.Run("Banner ueber legacy banner_asset_id-Spalte (kein anime_media-Link) hat display UND original -- display gewinnt", func(t *testing.T) {
		const groupID int64 = 3
		const animeID int64 = 3
		const bannerAssetID int64 = 31
		_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title, banner_asset_id) VALUES ($1, 'proj-legacy', 'Proj Legacy', $2)`, animeID, bannerAssetID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_fansub_groups (fansub_group_id, anime_id) VALUES ($1, $2)`, groupID, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, path, variant, status) VALUES
				(9101, $1, 'proj-legacy-banner-original.webp', 'original', 'ready'),
				(9102, $1, 'proj-legacy-banner-display.webp', 'display', 'ready')
		`, bannerAssetID)
		require.NoError(t, err)

		projects, err := repo.listPublicFansubProjects(ctx, groupID)
		require.NoError(t, err)
		require.Len(t, projects, 1)
		require.NotNil(t, projects[0].BannerURL, "legacy banner_asset_id-Direktpfad muss weiterhin ein Banner liefern")
		require.Contains(t, *projects[0].BannerURL, "proj-legacy-banner-display.webp", "legacy banner_asset_id-Direktpfad muss display vor original bevorzugen")
	})
}
