package repository

// Phase 172, Plan 172-02 (D-01/D-09/D-10): beweist, dass loadReleaseSegments seit diesem
// Plan preview_url AUSSCHLIESSLICH ueber resolveThemeSegmentPreviewAsset aufloest (dieselbe
// Funktion wie der Admin-Lesepfad aus Plan 172-01), nicht mehr ueber die alte
// theme_segment_playback_sources-Join-Kette.
//
// TestLoadReleaseSegments_PreviewResolution deckt manuell/automatisch/Ersatzbild/kein-Bild
// ab UND prueft D-09 kreuzweise gegen GetAnimeSegmentByID (Admin-Einzelabruf) fuer dasselbe
// Segment.
//
// TestLoadReleaseSegments_SharedSegmentSameImageAcrossAssignments beweist D-01 mit dem
// konkreten, in CONTEXT.md genannten Fall: ein Segment, das DREI Release-Versionen
// zugewiesen ist, liefert bei drei separaten loadReleaseSegments-Aufrufen (je einer pro
// Release-Version) exakt dieselbe preview_url.
//
// Package repository (nicht repository_test), analog zu theme_segment_preview_test.go --
// Zugriff auf die unexportierte loadReleaseSegments-Methode und resolveThemeSegmentPreviewAsset.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestLoadReleaseSegments_PreviewResolution(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")
	adminRepo := NewAdminContentRepository(pool, "")

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

	const (
		animeID       = int64(100)
		episodeID     = int64(100)
		fansubGroupID = int64(100)
		fansubRelease = int64(100)
		themeTypeID   = int64(100)
		themeID       = int64(100)
	)

	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubRelease, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Moonlight')`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	// Vier separate Release-Versionen/Segmente, je eines pro Faelle 1-4, damit sich die
	// Faelle nicht gegenseitig durch gemeinsame Fallback-Release-Versionen beeinflussen.
	const (
		releaseVersionManual   = int64(101)
		releaseVersionAuto     = int64(102)
		releaseVersionFallback = int64(103)
		releaseVersionNone     = int64(104)

		segmentManual   = int64(101)
		segmentAuto     = int64(102)
		segmentFallback = int64(103)
		segmentNone     = int64(104)

		manualAssetID       = int64(2001)
		autoAssetID         = int64(2002)
		fallbackCandidateID = int64(2003)
	)

	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES
			($1, $5, 'v1'), ($2, $5, 'v1'), ($3, $5, 'v1'), ($4, $5, 'v1')
	`, releaseVersionManual, releaseVersionAuto, releaseVersionFallback, releaseVersionNone, fansubRelease)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $5), ($2, $5), ($3, $5), ($4, $5)
	`, releaseVersionManual, releaseVersionAuto, releaseVersionFallback, releaseVersionNone, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segments (id, theme_id, start_time, end_time) VALUES
			($1, $5, '00:01:00', '00:01:30'),
			($2, $5, '00:02:00', '00:02:30'),
			($3, $5, '00:03:00', '00:03:30'),
			($4, $5, '00:04:00', '00:04:30')
	`, segmentManual, segmentAuto, segmentFallback, segmentNone, themeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES
			($1, $5), ($2, $6), ($3, $7), ($4, $8)
	`, segmentManual, segmentAuto, segmentFallback, segmentNone,
		releaseVersionManual, releaseVersionAuto, releaseVersionFallback, releaseVersionNone)
	require.NoError(t, err)

	createReadyImageAsset(manualAssetID, "manual.jpg")
	createReadyImageAsset(autoAssetID, "auto.jpg")
	createReadyImageAsset(fallbackCandidateID, "fallback.jpg")

	_, err = pool.Exec(ctx, `UPDATE theme_segments SET preview_media_asset_id = $1 WHERE id = $2`, manualAssetID, segmentManual)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE theme_segments SET auto_preview_media_asset_id = $1 WHERE id = $2`, autoAssetID, segmentAuto)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_media (id, release_version_id, media_asset_id, is_preview_candidate, sort_order)
		VALUES (9101, $1, $2, TRUE, 0)
	`, releaseVersionFallback, fallbackCandidateID)
	require.NoError(t, err)

	t.Run("manuell gesetzt liefert manual.jpg", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionManual, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.NotNil(t, segments[0].PreviewURL)
		require.Contains(t, *segments[0].PreviewURL, "manual.jpg")
	})

	t.Run("automatisch gesetzt liefert auto.jpg", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionAuto, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.NotNil(t, segments[0].PreviewURL)
		require.Contains(t, *segments[0].PreviewURL, "auto.jpg")
	})

	t.Run("kein manuelles/automatisches Bild, aber Release-Version hat is_preview_candidate-Bild liefert fallback.jpg (D-10)", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionFallback, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.NotNil(t, segments[0].PreviewURL, "ein Ersatzbild der Release-Version existiert -- preview_url darf nicht nil sein (D-10)")
		require.Contains(t, *segments[0].PreviewURL, "fallback.jpg")
	})

	t.Run("gar kein Bild vorhanden liefert nil", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionNone, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.Nil(t, segments[0].PreviewURL)
	})

	t.Run("D-09 Cross-Check: identisch zu GetAnimeSegmentByID fuer dasselbe Segment", func(t *testing.T) {
		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionManual, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1)

		adminSeg, err := adminRepo.GetAnimeSegmentByID(ctx, animeID, segmentManual, releaseVersionManual)
		require.NoError(t, err)
		require.NotNil(t, adminSeg.PreviewURL, "Admin-Pfad muss fuer dasselbe Segment ebenfalls eine preview_url liefern")
		require.Equal(t, *adminSeg.PreviewURL, *segments[0].PreviewURL, "Public und Admin muessen fuer dasselbe Segment IDENTISCHE preview_url liefern (D-09)")
	})

	t.Run("alte theme_segment_playback_sources-Kette wird nicht mehr genutzt", func(t *testing.T) {
		// Legt eine theme_segment_playback_sources-Zeile mit einem DRITTEN, abweichenden
		// Bild an -- waere die alte Join-Kette noch aktiv, wuerde preview_url dieses Bild
		// statt manual.jpg liefern.
		_, err := pool.Exec(ctx, `
			INSERT INTO media_assets (id, file_path) VALUES (2099, 'stale-playback-source.jpg')
		`)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO theme_segment_playback_sources (theme_segment_id, release_version_id, source_kind, media_asset_id)
			VALUES ($1, $2, 'uploaded_asset', 2099)
		`, segmentManual, releaseVersionManual)
		require.NoError(t, err)

		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionManual, "v1", "1", nil)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.NotNil(t, segments[0].PreviewURL)
		require.Contains(t, *segments[0].PreviewURL, "manual.jpg", "preview_url muss weiterhin ueber theme_segments.preview_media_asset_id aufgeloest werden, nicht ueber die alte theme_segment_playback_sources-Kette")
	})
}

// TestLoadReleaseSegments_SharedSegmentSameImageAcrossAssignments beweist D-01 mit dem
// konkreten CONTEXT.md-Fall: ein Segment, das DREI Release-Versionen zugewiesen ist, liefert
// bei drei separaten loadReleaseSegments-Aufrufen exakt dieselbe preview_url, sobald
// preview_media_asset_id gesetzt ist ("einmal pro Segment, erscheint auf allen zugewiesenen
// Folgen").
func TestLoadReleaseSegments_SharedSegmentSameImageAcrossAssignments(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")

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
-- Code-Review-Fix (Phase 172): resolveThemeSegmentPreviewAssetsBatch's manuelles
-- Eligibility-Gate prueft IMMER, ob das manuelle Asset ueber eine (nicht geloeschte)
-- release_version_media-Zeile kommt -- diese Tabelle muss daher existieren, genau wie in der
-- Produktionsdatenbank, auch wenn dieser Test selbst keine rvm-Zeile fuer das manuelle Asset
-- anlegt.
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

	const (
		animeID        = int64(200)
		fansubGroupID  = int64(200)
		themeTypeID    = int64(200)
		themeID        = int64(200)
		sharedSegment  = int64(200)
		manualAssetID  = int64(3001)
		episodeOneID   = int64(201)
		episodeTwoID   = int64(202)
		episodeThreeID = int64(203)
		fansubReleaseA = int64(201)
		fansubReleaseB = int64(202)
		fansubReleaseC = int64(203)
		// CONTEXT.md benennt den Live-Fall "Segment 8 auf 27/28/29" -- dieser Test
		// reproduziert die STRUKTUR (ein Segment, drei Zuweisungen), nicht die konkreten
		// Live-IDs, in einem isolierten Testschema.
		releaseVersionA = int64(201)
		releaseVersionB = int64(202)
		releaseVersionC = int64(203)
	)

	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $4, 1, '1'), ($2, $4, 2, '2'), ($3, $4, 3, '3')
	`, episodeOneID, episodeTwoID, episodeThreeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $4), ($2, $5), ($3, $6)
	`, fansubReleaseA, fansubReleaseB, fansubReleaseC, episodeOneID, episodeTwoID, episodeThreeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $4, 'v1'), ($2, $5, 'v1'), ($3, $6, 'v1')
	`, releaseVersionA, releaseVersionB, releaseVersionC, fansubReleaseA, fansubReleaseB, fansubReleaseC)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $4), ($2, $4), ($3, $4)
	`, releaseVersionA, releaseVersionB, releaseVersionC, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Moonlight')`, themeID, animeID, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segments (id, theme_id, start_time, end_time) VALUES ($1, $2, '00:01:00', '00:01:30')
	`, sharedSegment, themeID)
	require.NoError(t, err)

	// Das geteilte Segment ist DREI Release-Versionen zugewiesen (CONTEXT.md "Test mit 3
	// Zuweisungen").
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
		VALUES ($1, $2), ($1, $3), ($1, $4)
	`, sharedSegment, releaseVersionA, releaseVersionB, releaseVersionC)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
		VALUES ($1, 'shared-manual.jpg', 'ready', $2, $3)
	`, manualAssetID, publicVisibilityID, approvedReviewStatusID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO media_files (id, media_id, variant, path, status) VALUES ($1, $2, 'original', 'shared-manual.jpg', 'ready')
	`, manualAssetID+100000, manualAssetID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE theme_segments SET preview_media_asset_id = $1 WHERE id = $2`, manualAssetID, sharedSegment)
	require.NoError(t, err)

	segmentsA, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionA, "v1", "1", nil)
	require.NoError(t, err)
	segmentsB, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionB, "v1", "2", nil)
	require.NoError(t, err)
	segmentsC, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, releaseVersionC, "v1", "3", nil)
	require.NoError(t, err)

	require.Len(t, segmentsA, 1)
	require.Len(t, segmentsB, 1)
	require.Len(t, segmentsC, 1)
	require.NotNil(t, segmentsA[0].PreviewURL)
	require.NotNil(t, segmentsB[0].PreviewURL)
	require.NotNil(t, segmentsC[0].PreviewURL)
	require.Equal(t, *segmentsA[0].PreviewURL, *segmentsB[0].PreviewURL, "dasselbe geteilte Segment muss auf JEDER zugewiesenen Folge dieselbe preview_url zeigen (D-01)")
	require.Equal(t, *segmentsB[0].PreviewURL, *segmentsC[0].PreviewURL, "dasselbe geteilte Segment muss auf JEDER zugewiesenen Folge dieselbe preview_url zeigen (D-01)")
	require.Contains(t, *segmentsA[0].PreviewURL, "shared-manual.jpg")
}
