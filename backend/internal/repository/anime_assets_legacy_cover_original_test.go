package repository

// 173-05 Task 0 (Orchestrator-Regressionsfix): syncLegacyAnimeCoverImageV2 und
// removeAnimePosterAssetsV2 muessen die Legacy-Spalte anime.cover_image wieder mit dem
// ORIGINAL-Pfad befuellen, nicht mit dem display-Pfad -- resolveOrphanedLocalCoverImageV2
// (admin_content_anime_delete.go) vergleicht cover_image per exaktem String-Vergleich gegen
// media_assets.file_path, das IMMER den Original-Pfad speichert. Eine Display-Praeferenz hier
// haette cover_image staendig als "verwaist" fehlklassifiziert. Display-Praeferenz bleibt
// ausschliesslich in Public-Lesepfaden (siehe anime_display_variant_test.go) erhalten.
//
// Skips cleanly when TEAM4S_PHASE106_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

func createAnimeLegacyCoverV2Schema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
	id BIGINT PRIMARY KEY, slug TEXT, title TEXT NOT NULL,
	anime_type_id BIGINT, content_type TEXT NOT NULL DEFAULT 'anime', status TEXT NOT NULL DEFAULT 'ongoing',
	year SMALLINT, max_episodes SMALLINT, description TEXT,
	cover_image TEXT, cover_resolved_url TEXT, banner_resolved_url TEXT, banner_asset_id BIGINT,
	source TEXT, folder_name TEXT, anisearch_id TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_assets (id BIGINT PRIMARY KEY, media_type_id BIGINT, file_path TEXT);
CREATE TABLE media_files (id BIGINT PRIMARY KEY, media_id BIGINT, path TEXT, variant TEXT, status TEXT);
CREATE TABLE media_external (id BIGINT PRIMARY KEY, media_id BIGINT, provider TEXT, external_id TEXT);
CREATE TABLE anime_media (anime_id BIGINT, media_id BIGINT, sort_order INT, UNIQUE (anime_id, media_id));
CREATE TABLE episode_media (media_id BIGINT);
CREATE TABLE fansub_group_media (media_id BIGINT);
CREATE TABLE release_media (media_id BIGINT);
INSERT INTO media_types (id, name) VALUES (1, 'poster'), (2, 'banner');
`)
	require.NoError(t, err)
}

// TestAssignManualCoverV2_LegacyCoverImageStoresOriginalNotDisplay belegt: anime.cover_image
// wird mit dem ORIGINAL-Pfad (media_assets.file_path-kompatibel) befuellt, obwohl eine
// display-Zeile existiert -- NICHT mit dem display-Pfad.
func TestAssignManualCoverV2_LegacyCoverImageStoresOriginalNotDisplay(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createAnimeLegacyCoverV2Schema(t, pool)
	repo := NewAnimeAssetRepository(pool)
	ctx := context.Background()

	const animeID int64 = 1
	const posterAssetID int64 = 101
	_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title) VALUES ($1, 'legacy-cover', 'Legacy Cover')`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO media_assets (id, media_type_id, file_path) VALUES ($1, 1, 'poster-original.webp')`, posterAssetID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO media_files (id, media_id, path, variant, status) VALUES
			(1001, $1, 'poster-original.webp', 'original', 'ready'),
			(1002, $1, 'poster-display.webp', 'display', 'ready')
	`, posterAssetID)
	require.NoError(t, err)

	err = repo.AssignManualCover(ctx, animeID, "101")
	require.NoError(t, err)

	var coverImage string
	require.NoError(t, pool.QueryRow(ctx, `SELECT cover_image FROM anime WHERE id = $1`, animeID).Scan(&coverImage))
	require.Equal(t, "poster-original.webp", coverImage, "anime.cover_image muss den Original-Pfad speichern, nicht den display-Pfad (sonst klassifiziert resolveOrphanedLocalCoverImageV2 ihn faelschlich als verwaist)")

	// Die direkte Behauptung des Regressionsfixes: media_assets.file_path (woran
	// resolveOrphanedLocalCoverImageV2 misst) muss exakt mit cover_image uebereinstimmen.
	var referenceCount int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_assets WHERE file_path = $1`, coverImage).Scan(&referenceCount))
	require.Greater(t, referenceCount, int64(0), "cover_image muss ueber media_assets.file_path auffindbar bleiben, sonst faelschliche Verwaisungs-Erkennung")
}

// TestClearCoverV2_RemovedPathPrefersOriginalOverDisplay belegt dieselbe Original-zuerst-Regel
// fuer removeAnimePosterAssetsV2's RemovedPaths (die ueber die Legacy-cover_image-Spalte
// hinausgehende Pfad-Aufloesung fuer die physische Datei-Bereinigung).
func TestClearCoverV2_RemovedPathPrefersOriginalOverDisplay(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createAnimeLegacyCoverV2Schema(t, pool)
	repo := NewAnimeAssetRepository(pool)
	ctx := context.Background()

	const animeID int64 = 2
	const posterAssetID int64 = 201
	_, err := pool.Exec(ctx, `INSERT INTO anime (id, slug, title) VALUES ($1, 'legacy-clear', 'Legacy Clear')`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO media_assets (id, media_type_id, file_path) VALUES ($1, 1, 'poster-original2.webp')`, posterAssetID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO media_files (id, media_id, path, variant, status) VALUES
			(2001, $1, 'poster-original2.webp', 'original', 'ready'),
			(2002, $1, 'poster-display2.webp', 'display', 'ready')
	`, posterAssetID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO anime_media (anime_id, media_id, sort_order) VALUES ($1, $2, 0)`, animeID, posterAssetID)
	require.NoError(t, err)

	result, err := repo.ClearCoverWithResult(ctx, animeID)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Contains(t, result.RemovedPaths, "poster-original2.webp", "RemovedPaths muss den Original-Pfad enthalten, nicht den display-Pfad")
	require.NotContains(t, result.RemovedPaths, "poster-display2.webp")
}
