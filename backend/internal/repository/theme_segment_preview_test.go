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

	"github.com/jackc/pgx/v5/pgxpool"
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
-- Code-Review-Fix (Phase 172): resolveThemeSegmentPreviewAsset's manuelles Eligibility-Gate
-- (manualPreviewAssetEligibilitySQL) prueft IMMER, ob das manuelle Asset ueber eine (nicht
-- geloeschte) release_version_media-Zeile kommt -- diese Tabelle muss daher existieren, genau
-- wie in der Produktionsdatenbank, auch wenn dieser Test selbst keine rvm-Zeile anlegt.
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

func TestAttachSegmentPreviewImageFromReleaseVersion_RejectsForeignAsset(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	f := setupPreviewWriteFixture(t, pool)

	// Das Bild gehoert zu foreignReleaseID -- einer Release-Version, der das Segment NICHT
	// zugewiesen ist (D-11 Acceptance: "Fremde -> 404/403").
	const foreignAssetID int64 = 5001
	createApprovedImageAssetForReleaseVersion(t, pool, foreignAssetID, "foreign.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.foreignReleaseID)

	repo := NewAdminContentRepository(pool)
	oldValue, err := repo.AttachSegmentPreviewImageFromReleaseVersion(ctx, f.themeSegmentID, foreignAssetID)
	require.ErrorIs(t, err, ErrNotFound, "ein Bild einer NICHT zugewiesenen Release-Version muss ErrNotFound liefern")
	require.Nil(t, oldValue)

	var manualAssetID *int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT preview_media_asset_id FROM theme_segments WHERE id = $1`, f.themeSegmentID).Scan(&manualAssetID))
	require.Nil(t, manualAssetID, "ein abgelehnter Versuch darf preview_media_asset_id NIE setzen")
}

func TestAttachSegmentPreviewImageFromReleaseVersion_RejectsUnapproved(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	f := setupPreviewWriteFixture(t, pool)

	// Das Bild gehoert zur ZUGEWIESENEN Release-Version, ist aber review_status='pending'
	// statt 'approved' -- muss trotz korrekter Zuweisung abgelehnt werden.
	const unapprovedAssetID int64 = 5002
	_, err := pool.Exec(ctx, `
		INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
		VALUES ($1, 'unapproved.jpg', 'ready', $2, $3)
	`, unapprovedAssetID, f.publicVisibilityID, f.pendingReviewStatusID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_media (id, release_version_id, media_asset_id, sort_order)
		VALUES ($1, $2, $3, 0)
	`, unapprovedAssetID+200000, f.assignedReleaseID, unapprovedAssetID)
	require.NoError(t, err)

	repo := NewAdminContentRepository(pool)
	oldValue, err := repo.AttachSegmentPreviewImageFromReleaseVersion(ctx, f.themeSegmentID, unapprovedAssetID)
	require.ErrorIs(t, err, ErrNotFound, "ein nicht freigegebenes Bild muss trotz korrekter Zuweisung ErrNotFound liefern")
	require.Nil(t, oldValue)
}

func TestSetThemeSegmentAutoPreview_NeverTouchesManualColumn(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	f := setupPreviewWriteFixture(t, pool)

	const manualAssetID int64 = 6001
	const autoAssetID int64 = 6002
	createApprovedImageAssetForReleaseVersion(t, pool, manualAssetID, "manual.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)
	createApprovedImageAssetForReleaseVersion(t, pool, autoAssetID, "auto.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)

	repo := NewAdminContentRepository(pool)
	_, err := repo.SetThemeSegmentManualPreview(ctx, f.themeSegmentID, manualAssetID)
	require.NoError(t, err)

	oldAutoValue, err := repo.SetThemeSegmentAutoPreview(ctx, f.themeSegmentID, autoAssetID)
	require.NoError(t, err)
	require.Nil(t, oldAutoValue, "vor dem ersten Render gibt es keinen vorherigen automatischen Wert")

	var manualAfter, autoAfter *int64
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT preview_media_asset_id, auto_preview_media_asset_id FROM theme_segments WHERE id = $1
	`, f.themeSegmentID).Scan(&manualAfter, &autoAfter))
	require.NotNil(t, manualAfter, "D-08: SetThemeSegmentAutoPreview darf die manuelle Wahl NIE loeschen")
	require.Equal(t, manualAssetID, *manualAfter, "D-08: die manuelle Spalte muss unveraendert bleiben")
	require.NotNil(t, autoAfter)
	require.Equal(t, autoAssetID, *autoAfter)
}

func TestResetThemeSegmentManualPreview_ReturnsOldValue(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	f := setupPreviewWriteFixture(t, pool)

	const manualAssetID int64 = 7001
	createApprovedImageAssetForReleaseVersion(t, pool, manualAssetID, "to-reset.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)

	repo := NewAdminContentRepository(pool)
	_, err := repo.SetThemeSegmentManualPreview(ctx, f.themeSegmentID, manualAssetID)
	require.NoError(t, err)

	oldValue, err := repo.ResetThemeSegmentManualPreview(ctx, f.themeSegmentID)
	require.NoError(t, err)
	require.NotNil(t, oldValue, "Reset muss den vorherigen manuellen Wert fuer Aufraeum-Entscheidungen des Aufrufers liefern")
	require.Equal(t, manualAssetID, *oldValue)

	var manualAfter *int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT preview_media_asset_id FROM theme_segments WHERE id = $1`, f.themeSegmentID).Scan(&manualAfter))
	require.Nil(t, manualAfter, "preview_media_asset_id muss nach Reset NULL sein")
}

func TestListSegmentPreviewImageCandidates_EmptyForUnassignedSegment(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	setupPreviewSchema(t, pool)

	// Ein Segment OHNE jede theme_segment_assignments-Zeile.
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES (1)`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES (1, 'OP1')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES (1, 1, 1)`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_segments (id, theme_id) VALUES (1, 1)`)
	require.NoError(t, err)

	repo := NewAdminContentRepository(pool)
	candidates, err := repo.ListSegmentPreviewImageCandidates(ctx, 1, "")
	require.NoError(t, err)
	require.NotNil(t, candidates, "leere Zuweisungsliste muss eine leere, NICHT nil, Kandidatenliste liefern")
	require.Empty(t, candidates)
}

// setupPreviewSchema legt die fuer alle Plan-172-03-Schreibpfad-Tests gemeinsame
// Schema-Erweiterung an (review_statuses inkl. 'approved' UND 'pending', media_files,
// release_version_media) -- gleiches Muster wie TestResolveThemeSegmentPreviewAsset oben.
func setupPreviewSchema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
CREATE TABLE review_statuses (id BIGSERIAL PRIMARY KEY, code VARCHAR(40) NOT NULL UNIQUE);
INSERT INTO review_statuses (code) VALUES ('approved'), ('pending');
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
}

// setupPreviewWriteFixture baut auf setupPreviewSchema auf und legt eine gemeinsame
// Anime/Gruppe/Folge/Release-Kette mit ZWEI Release-Versionen an: assignedReleaseID ist dem
// Segment ueber theme_segment_assignments zugewiesen, foreignReleaseID NICHT -- genau das
// Minimum, um D-11s Ownership-Gate zu beweisen.
func setupPreviewWriteFixture(t *testing.T, pool *pgxpool.Pool) previewWriteFixtureIDs {
	t.Helper()
	ctx := context.Background()
	setupPreviewSchema(t, pool)

	var publicVisibilityID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM visibilities WHERE name = 'public'`).Scan(&publicVisibilityID))
	var approvedReviewStatusID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM review_statuses WHERE code = 'approved'`).Scan(&approvedReviewStatusID))
	var pendingReviewStatusID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM review_statuses WHERE code = 'pending'`).Scan(&pendingReviewStatusID))

	const (
		animeID          = int64(1)
		fansubGroupID    = int64(1)
		themeTypeID      = int64(1)
		themeID          = int64(1)
		themeSegmentID   = int64(1)
		episodeID        = int64(1)
		fansubReleaseID  = int64(1)
		assignedReleaseID = int64(10)
		foreignReleaseID  = int64(20)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubReleaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $3, 'v1'), ($2, $3, 'v1')
	`, assignedReleaseID, foreignReleaseID, fansubReleaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_segments (id, theme_id) VALUES ($1, $2)`, themeSegmentID, themeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1, $2)
	`, themeSegmentID, assignedReleaseID)
	require.NoError(t, err)

	return previewWriteFixtureIDs{
		publicVisibilityID:     publicVisibilityID,
		approvedReviewStatusID: approvedReviewStatusID,
		pendingReviewStatusID:  pendingReviewStatusID,
		themeSegmentID:         themeSegmentID,
		assignedReleaseID:      assignedReleaseID,
		foreignReleaseID:       foreignReleaseID,
	}
}

// previewWriteFixtureIDs haelt die von setupPreviewWriteFixture angelegten IDs fuer den
// Zugriff der Test-Funktionen (schlankere Alternative zu previewWriteFixture oben, die ein
// generisches Pool-Interface vermeidet).
type previewWriteFixtureIDs struct {
	publicVisibilityID     int64
	approvedReviewStatusID int64
	pendingReviewStatusID  int64
	themeSegmentID         int64
	assignedReleaseID      int64
	foreignReleaseID       int64
}

// createApprovedImageAssetForReleaseVersion legt ein oeffentliches, freigegebenes Bild an und
// haengt es per release_version_media an releaseVersionID -- das Muster, das jeder
// D-11-Ownership-Test braucht, um ein "echtes" (zugewiesenes ODER fremdes) Kandidatenbild zu
// erzeugen.
func createApprovedImageAssetForReleaseVersion(t *testing.T, pool *pgxpool.Pool, assetID int64, path string, visibilityID int64, reviewStatusID int64, releaseVersionID int64) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
		VALUES ($1, $2, 'ready', $3, $4)
	`, assetID, path, visibilityID, reviewStatusID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_media (id, release_version_id, media_asset_id, sort_order)
		VALUES ($1, $2, $3, 0)
	`, assetID+300000, releaseVersionID, assetID)
	require.NoError(t, err)
}

// --- Code-Review-Fix (Phase 172): IsMediaAssetExclusiveSegmentPreview + manuelles
// Eligibility-Gate in resolveThemeSegmentPreviewAsset. ---

// TestIsMediaAssetExclusiveSegmentPreview beweist den D-11-Datenverlust-Fix: cleanupOldPreviewAsset
// darf ein ersetztes altes Asset NUR aufraeumen, wenn es weder von release_version_media noch von
// einem ANDEREN Segment (preview_media_asset_id/auto_preview_media_asset_id) weiterhin referenziert
// wird.
func TestIsMediaAssetExclusiveSegmentPreview(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	f := setupPreviewWriteFixture(t, pool)
	repo := NewAdminContentRepository(pool)

	t.Run("ohne jede Referenz ist das Asset exklusiv", func(t *testing.T) {
		const assetID int64 = 8001
		_, err := pool.Exec(ctx, `
			INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
			VALUES ($1, 'orphan.jpg', 'ready', $2, $3)
		`, assetID, f.publicVisibilityID, f.approvedReviewStatusID)
		require.NoError(t, err)

		exclusive, err := repo.IsMediaAssetExclusiveSegmentPreview(ctx, assetID, f.themeSegmentID)
		require.NoError(t, err)
		require.True(t, exclusive)
	})

	t.Run("von release_version_media referenziert ist NICHT exklusiv, auch wenn deleted_at gesetzt ist", func(t *testing.T) {
		const assetID int64 = 8002
		createApprovedImageAssetForReleaseVersion(t, pool, assetID, "rvm-owned.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)

		exclusive, err := repo.IsMediaAssetExclusiveSegmentPreview(ctx, assetID, f.themeSegmentID)
		require.NoError(t, err)
		require.False(t, exclusive, "die RESTRICT-FK auf release_version_media wuerde DeleteMediaAsset ohnehin scheitern lassen -- NIE loeschen")

		_, err = pool.Exec(ctx, `UPDATE release_version_media SET deleted_at = NOW() WHERE media_asset_id = $1`, assetID)
		require.NoError(t, err)
		exclusive, err = repo.IsMediaAssetExclusiveSegmentPreview(ctx, assetID, f.themeSegmentID)
		require.NoError(t, err)
		require.False(t, exclusive, "soft-deleted rvm-Zeilen bleiben als FK-Referenz bestehen -- die physische Zeile existiert noch")
	})

	t.Run("von einem ANDEREN Segment als Preview genutzt ist NICHT exklusiv", func(t *testing.T) {
		const assetID int64 = 8003
		const otherSegmentID int64 = 8103
		_, err := pool.Exec(ctx, `
			INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
			VALUES ($1, 'shared-auto.jpg', 'ready', $2, $3)
		`, assetID, f.publicVisibilityID, f.approvedReviewStatusID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO theme_segments (id, theme_id, auto_preview_media_asset_id) VALUES ($1, (SELECT theme_id FROM theme_segments WHERE id = $2), $3)`, otherSegmentID, f.themeSegmentID, assetID)
		require.NoError(t, err)

		exclusive, err := repo.IsMediaAssetExclusiveSegmentPreview(ctx, assetID, f.themeSegmentID)
		require.NoError(t, err)
		require.False(t, exclusive, "ein anderes Segment nutzt dieses Asset weiterhin als auto_preview_media_asset_id")

		// Das AUSSCHLIESSENDE Segment selbst darf nicht mitzaehlen.
		exclusiveForOtherSegment, err := repo.IsMediaAssetExclusiveSegmentPreview(ctx, assetID, otherSegmentID)
		require.NoError(t, err)
		require.True(t, exclusiveForOtherSegment, "excludeSegmentID darf nicht als fremde Referenz gegen sich selbst zaehlen")
	})
}

// TestResolveThemeSegmentPreviewAsset_ManualGateRequiresPublicApprovedAndNotDeletedRvm beweist
// den zweiten D-11-Fix: ein manuelles Vorschaubild, das (a) nicht mehr public/approved ist ODER
// (b) ueber eine inzwischen (soft-)geloeschte release_version_media-Zeile kam, darf NICHT mehr
// aufgeloest werden -- die Rangfolge faellt stattdessen auf automatisch/Ersatzbild zurueck
// (D-08/D-10), statt ein abgelehntes/internes/entferntes Release-Bild weiterhin oeffentlich als
// Kara-Vorschau zu zeigen.
func TestResolveThemeSegmentPreviewAsset_ManualGateRequiresPublicApprovedAndNotDeletedRvm(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	f := setupPreviewWriteFixture(t, pool)

	t.Run("review_status wechselt von approved auf pending -> faellt auf auto zurueck", func(t *testing.T) {
		const manualAssetID int64 = 9001
		const autoAssetID int64 = 9002
		createApprovedImageAssetForReleaseVersion(t, pool, manualAssetID, "was-approved.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)
		createApprovedImageAssetForReleaseVersion(t, pool, autoAssetID, "fallback-auto.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)

		manual, auto := manualAssetID, autoAssetID
		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, &manual, &auto, 0)
		require.NoError(t, err)
		require.Equal(t, "manual", source)
		require.Equal(t, "was-approved.jpg", *path)

		_, err = pool.Exec(ctx, `UPDATE media_assets SET review_status_id = $1 WHERE id = $2`, f.pendingReviewStatusID, manualAssetID)
		require.NoError(t, err)

		path, source, err = resolveThemeSegmentPreviewAsset(ctx, pool, &manual, &auto, 0)
		require.NoError(t, err)
		require.Equal(t, "auto", source, "ein nicht mehr freigegebenes manuelles Bild darf nicht mehr aufgeloest werden")
		require.Equal(t, "fallback-auto.jpg", *path)
	})

	t.Run("rvm-Zeile wird soft-deleted -> faellt auf auto zurueck", func(t *testing.T) {
		const manualAssetID int64 = 9003
		const autoAssetID int64 = 9004
		createApprovedImageAssetForReleaseVersion(t, pool, manualAssetID, "attached-release-image.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)
		createApprovedImageAssetForReleaseVersion(t, pool, autoAssetID, "fallback-auto-2.jpg", f.publicVisibilityID, f.approvedReviewStatusID, f.assignedReleaseID)

		manual, auto := manualAssetID, autoAssetID
		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, &manual, &auto, 0)
		require.NoError(t, err)
		require.Equal(t, "manual", source)
		require.Equal(t, "attached-release-image.jpg", *path)

		_, err = pool.Exec(ctx, `UPDATE release_version_media SET deleted_at = NOW() WHERE media_asset_id = $1`, manualAssetID)
		require.NoError(t, err)

		path, source, err = resolveThemeSegmentPreviewAsset(ctx, pool, &manual, &auto, 0)
		require.NoError(t, err)
		require.Equal(t, "auto", source, "ein aus einer entfernten Release-Version uebernommenes Bild darf nicht mehr aufgeloest werden")
		require.Equal(t, "fallback-auto-2.jpg", *path)
	})

	t.Run("direkt hochgeladenes manuelles Bild ohne rvm-Zeile bleibt unberuehrt", func(t *testing.T) {
		const manualAssetID int64 = 9005
		_, err := pool.Exec(ctx, `
			INSERT INTO media_assets (id, file_path, status, visibility_id, review_status_id)
			VALUES ($1, 'direct-upload.jpg', 'ready', $2, $3)
		`, manualAssetID, f.publicVisibilityID, f.approvedReviewStatusID)
		require.NoError(t, err)

		manual := manualAssetID
		path, source, err := resolveThemeSegmentPreviewAsset(ctx, pool, &manual, nil, 0)
		require.NoError(t, err)
		require.Equal(t, "manual", source, "ein direkt hochgeladenes Bild hat keine rvm-Zeile und darf vom NOT EXISTS-Zweig weiterhin zugelassen werden")
		require.Equal(t, "direct-upload.jpg", *path)
	})
}

// TestAssignUploadedSegmentPreviewImage beweist die Zuordnung eines ueber den globalen Uploader
// (asset_type=segment_preview -> media_type 'preview') hochgeladenen Bildes: nur Vorschaubild-
// Assets DIESES Anime werden akzeptiert, danach sind sie oeffentlich/freigegeben (D-03) und als
// manuelle Wahl gesetzt. Fremde Anime, andere Medientypen und automatische Vorschaubilder -> ErrNotFound.
func TestAssignUploadedSegmentPreviewImage(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	f := setupPreviewWriteFixture(t, pool)
	repo := NewAdminContentRepository(pool)

	_, err := pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS media_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO media_types (id, name) VALUES (101, 'preview'), (102, 'image') ON CONFLICT DO NOTHING;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS media_type_id BIGINT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS anime_media (anime_id BIGINT NOT NULL, media_id BIGINT NOT NULL, sort_order INT DEFAULT 0);
`)
	require.NoError(t, err)

	insertAsset := func(assetID, mediaTypeID, animeID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO media_assets (id, file_path, status, media_type_id) VALUES ($1, 'upload.jpg', 'ready', $2)`, assetID, mediaTypeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_media (anime_id, media_id) VALUES ($1, $2)`, animeID, assetID)
		require.NoError(t, err)
	}

	t.Run("hochgeladenes Vorschaubild dieses Anime wird zugeordnet und freigegeben", func(t *testing.T) {
		insertAsset(9001, 101, 1)

		oldValue, err := repo.AssignUploadedSegmentPreviewImage(ctx, 1, f.themeSegmentID, 9001)
		require.NoError(t, err)
		require.Nil(t, oldValue)

		var manualID *int64
		require.NoError(t, pool.QueryRow(ctx, `SELECT preview_media_asset_id FROM theme_segments WHERE id = $1`, f.themeSegmentID).Scan(&manualID))
		require.NotNil(t, manualID)
		require.Equal(t, int64(9001), *manualID)

		var visibilityID, reviewStatusID int64
		require.NoError(t, pool.QueryRow(ctx, `SELECT visibility_id, review_status_id FROM media_assets WHERE id = 9001`).Scan(&visibilityID, &reviewStatusID))
		require.Equal(t, f.publicVisibilityID, visibilityID)
		require.Equal(t, f.approvedReviewStatusID, reviewStatusID)
	})

	t.Run("Vorschaubild eines anderen Anime wird abgelehnt", func(t *testing.T) {
		insertAsset(9002, 101, 2)
		_, err := repo.AssignUploadedSegmentPreviewImage(ctx, 1, f.themeSegmentID, 9002)
		require.ErrorIs(t, err, ErrNotFound)
	})

	t.Run("anderer Medientyp wird abgelehnt", func(t *testing.T) {
		insertAsset(9003, 102, 1)
		_, err := repo.AssignUploadedSegmentPreviewImage(ctx, 1, f.themeSegmentID, 9003)
		require.ErrorIs(t, err, ErrNotFound)
	})

	t.Run("automatisches Vorschaubild eines Segments wird abgelehnt", func(t *testing.T) {
		insertAsset(9004, 101, 1)
		_, err := pool.Exec(ctx, `UPDATE theme_segments SET auto_preview_media_asset_id = 9004 WHERE id = $1`, f.themeSegmentID)
		require.NoError(t, err)
		_, err = repo.AssignUploadedSegmentPreviewImage(ctx, 1, f.themeSegmentID, 9004)
		require.ErrorIs(t, err, ErrNotFound)
	})
}
