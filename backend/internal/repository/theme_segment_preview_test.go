package repository

// Phase 172, Plan 172-01 (D-08/D-09/D-10): beweist die Rangfolge manuell > automatisch >
// Ersatzbild von resolveThemeSegmentPreviewAsset gegen eine echte, isolierte Postgres-
// Instanz (testsupport.OpenPhase117Postgres, niemals DATABASE_URL/team4s_v2) und beweist,
// dass ListAnimeSegments und GetAnimeSegmentByID fuer dasselbe Segment IDENTISCHE
// preview_url/preview_source liefern (dieselbe hydrateSegmentPreviewMetadata-Aufrufstelle).
//
// Package repository (nicht repository_test), analog zu
// theme_segment_assignments_integration_test.go -- Zugriff auf die unexportierte
// resolveThemeSegmentPreviewAsset-Funktion.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestResolveThemeSegmentPreviewAsset(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
CREATE TABLE review_statuses (id BIGSERIAL PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE);
INSERT INTO review_statuses (code) VALUES ('approved');
ALTER TABLE media_assets
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ready',
    ADD COLUMN visibility_id BIGINT REFERENCES visibilities(id),
    ADD COLUMN review_status_id BIGINT REFERENCES review_statuses(id);
CREATE TABLE media_files (
    id BIGINT PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id),
    variant VARCHAR(20),
    path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ready'
);
CREATE TABLE release_version_media (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
    deleted_at TIMESTAMPTZ,
    is_preview_candidate BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0
);
`)
	require.NoError(t, err)

	var publicVisibilityID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM visibilities WHERE name = 'public'`).Scan(&publicVisibilityID))
	var approvedReviewStatusID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM review_statuses WHERE code = 'approved'`).Scan(&approvedReviewStatusID))

	// Gemeinsame Release-Kette (Anime 1, Gruppe 1, eine Folge) fuer alle Fallback-Faelle.
	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES (1)`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES (1)`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES (1, 1, 1, '1')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES (1, 1)`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES
			(10, 1, 'v1'), -- hat ein is_preview_candidate-Bild (Fall 4)
			(20, 1, 'v1')  -- hat KEIN Bild (Fall 5)
	`)
	require.NoError(t, err)

	createReadyImageAsset := func(assetID int64, path string) {
		_, err := pool.Exec(ctx, `
			INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
			VALUES ($1, $2, 'ready', $3, $4)
		`, assetID, path, publicVisibilityID, approvedReviewStatusID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO media_files (id, media_id, variant, path, status) VALUES ($1, $2, 'original', $3, 'ready')
		`, assetID+100000, assetID, path)
		require.NoError(t, err)
	}

	t.Run("nur manuell gesetzt", func(t *testing.T) {
		const manualAssetID int64 = 1001
		createReadyImageAsset(manualAssetID, "manual-only.jpg")
		manual := manualAssetID
		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, &manual, nil, 0)
		require.NoError(t, err)
		require.Equal(t, "manual", source)
		require.NotNil(t, path)
		require.Equal(t, "manual-only.jpg", *path)
	})

	t.Run("nur automatisch gesetzt", func(t *testing.T) {
		const autoAssetID int64 = 1002
		createReadyImageAsset(autoAssetID, "auto-only.jpg")
		auto := autoAssetID
		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, nil, &auto, 0)
		require.NoError(t, err)
		require.Equal(t, "auto", source)
		require.NotNil(t, path)
		require.Equal(t, "auto-only.jpg", *path)
	})

	t.Run("beide gesetzt -- manuell gewinnt (D-08)", func(t *testing.T) {
		const manualAssetID int64 = 1003
		const autoAssetID int64 = 1004
		createReadyImageAsset(manualAssetID, "manual-wins.jpg")
		createReadyImageAsset(autoAssetID, "auto-loses.jpg")
		manual, auto := manualAssetID, autoAssetID
		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, &manual, &auto, 0)
		require.NoError(t, err)
		require.Equal(t, "manual", source)
		require.NotNil(t, path)
		require.Equal(t, "manual-wins.jpg", *path)
	})

	t.Run("keines gesetzt, Release-Version hat is_preview_candidate-Bild", func(t *testing.T) {
		const fallbackAssetID int64 = 1005
		createReadyImageAsset(fallbackAssetID, "release-fallback.jpg")
		_, err := pool.Exec(ctx, `
			INSERT INTO release_version_media (id, release_version_id, media_asset_id, is_preview_candidate, sort_order)
			VALUES (9001, 10, $1, TRUE, 0)
		`, fallbackAssetID)
		require.NoError(t, err)

		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, nil, nil, 10)
		require.NoError(t, err)
		require.Equal(t, "fallback", source)
		require.NotNil(t, path, "Release-Version 10 hat ein freigegebenes is_preview_candidate-Bild -- Ersatzbild muss aufgeloest werden")
		require.Equal(t, "release-fallback.jpg", *path)
	})

	t.Run("nichts vorhanden", func(t *testing.T) {
		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, nil, nil, 20)
		require.NoError(t, err)
		require.Equal(t, "fallback", source)
		require.Nil(t, path, "Release-Version 20 hat kein Bild -- die Funktion darf keinen Pfad erfinden")
	})
}

// TestListAnimeSegments_PreviewHydration beweist D-09: ListAnimeSegments und
// GetAnimeSegmentByID liefern fuer dasselbe Segment denselben preview_url/preview_source,
// weil beide dieselbe hydrateSegmentPreviewMetadata-Aufrufstelle nutzen.
func TestListAnimeSegments_PreviewHydration(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
CREATE TABLE review_statuses (id BIGSERIAL PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE);
INSERT INTO review_statuses (code) VALUES ('approved');
ALTER TABLE media_assets
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ready',
    ADD COLUMN visibility_id BIGINT REFERENCES visibilities(id),
    ADD COLUMN review_status_id BIGINT REFERENCES review_statuses(id);
CREATE TABLE media_files (
    id BIGINT PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id),
    variant VARCHAR(20),
    path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ready'
);
`)
	require.NoError(t, err)

	var publicVisibilityID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM visibilities WHERE name = 'public'`).Scan(&publicVisibilityID))
	var approvedReviewStatusID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM review_statuses WHERE code = 'approved'`).Scan(&approvedReviewStatusID))

	const (
		animeID         = int64(1)
		fansubGroupID   = int64(1)
		themeTypeID     = int64(1)
		themeID         = int64(1)
		themeSegmentID  = int64(1)
		episodeID       = int64(1)
		fansubReleaseID = int64(1)
		releaseVersionA = int64(10)
		releaseVersionB = int64(20)
		releaseVersionC = int64(30)
		manualAssetID   = int64(2001)
	)

	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubReleaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $4, 'v1'), ($2, $4, 'v1'), ($3, $4, 'v1')
	`, releaseVersionA, releaseVersionB, releaseVersionC, fansubReleaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_segments (id, theme_id) VALUES ($1, $2)`, themeSegmentID, themeID)
	require.NoError(t, err)
	// D-01: ein geteiltes Segment -- drei Zuweisungen, dasselbe manuelle Bild muss ueberall gelten.
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
		VALUES ($1, $2), ($1, $3), ($1, $4)
	`, themeSegmentID, releaseVersionA, releaseVersionB, releaseVersionC)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
		VALUES ($1, 'manual-segment-preview.jpg', 'ready', $2, $3)
	`, manualAssetID, publicVisibilityID, approvedReviewStatusID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO media_files (id, media_id, variant, path, status) VALUES ($1, $2, 'original', 'manual-segment-preview.jpg', 'ready')
	`, manualAssetID+100000, manualAssetID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE theme_segments SET preview_media_asset_id = $1 WHERE id = $2`, manualAssetID, themeSegmentID)
	require.NoError(t, err)

	repo := NewAdminContentRepository(pool)

	list, err := repo.ListAnimeSegments(ctx, animeID, 0, "", 0)
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.NotNil(t, list[0].PreviewURL, "manuell gesetztes Vorschaubild muss in ListAnimeSegments aufgeloest werden")
	require.NotNil(t, list[0].PreviewSource)
	require.Equal(t, "manual", *list[0].PreviewSource)

	single, err := repo.GetAnimeSegmentByID(ctx, animeID, themeSegmentID, 0)
	require.NoError(t, err)
	require.NotNil(t, single.PreviewURL)
	require.NotNil(t, single.PreviewSource)
	require.Equal(t, "manual", *single.PreviewSource)

	require.Equal(t, *list[0].PreviewURL, *single.PreviewURL,
		"D-09: Admin-Liste und Admin-Einzelabruf muessen fuer dasselbe Segment dieselbe preview_url liefern")
}
