package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// resolveThemeSegmentPreviewAsset loest preview_url/preview_source eines Kara-Segments
// nach der Rangfolge manuell > automatisch > Ersatzbild auf (Phase 172, D-08/D-09/D-10).
// Dies ist die EINZIGE Stelle, die diese Rangfolge kennt -- Admin-Liste, Admin-Einzelabruf
// (dieser Plan) und der Public-Lesepfad (Plan 172-02) rufen ausschliesslich diese Funktion
// auf, damit kein zweiter, unabhaengig geschriebener SQL-Fragment-Zweig entstehen kann
// (RESEARCH.md Anti-Pattern: "Resolving preview_url in 3 different ad-hoc SQL queries").
//
// manualAssetID/autoAssetID sind theme_segments.preview_media_asset_id/
// auto_preview_media_asset_id. fallbackReleaseVersionID (<=0 bedeutet "kein Ersatzbild-
// Kontext bekannt") steuert, welche Release-Version fuer das Ersatzbild herangezogen wird,
// WENN weder manuell noch automatisch aufgeloest werden kann.
func resolveThemeSegmentPreviewAsset(
	ctx context.Context,
	db *pgxpool.Pool,
	manualAssetID *int64,
	autoAssetID *int64,
	fallbackReleaseVersionID int64,
) (previewPath *string, previewSource string, err error) {
	var manualPath, autoPath *string
	if err := db.QueryRow(ctx, `
		SELECT
			(
				SELECT COALESCE(mf.path, ma.file_path)
				FROM media_assets ma
				LEFT JOIN media_files mf ON mf.media_id = ma.id
					AND (mf.variant = 'original' OR mf.variant IS NULL)
					AND mf.status = 'ready'
				WHERE ma.id = $1 AND ma.status = 'ready'
				ORDER BY mf.id ASC
				LIMIT 1
			) AS manual_path,
			(
				SELECT COALESCE(mf.path, ma.file_path)
				FROM media_assets ma
				LEFT JOIN media_files mf ON mf.media_id = ma.id
					AND (mf.variant = 'original' OR mf.variant IS NULL)
					AND mf.status = 'ready'
				WHERE ma.id = $2 AND ma.status = 'ready'
				ORDER BY mf.id ASC
				LIMIT 1
			) AS auto_path
	`, manualAssetID, autoAssetID).Scan(&manualPath, &autoPath); err != nil {
		return nil, "", fmt.Errorf("resolve theme segment preview asset manual/auto: %w", err)
	}

	if manualPath != nil {
		return manualPath, "manual", nil
	}
	if autoPath != nil {
		return autoPath, "auto", nil
	}

	// Ersatzbild (D-10): Vorschaubild der Release-Version. Exakt die bestehende
	// is_preview_candidate-Korrelationsabfrage, kopiert von
	// group_repository_cursor.go:135-150 (canonical public/approved/ready-Gate).
	if fallbackReleaseVersionID <= 0 {
		return nil, "fallback", nil
	}

	var fallbackPath *string
	if err := db.QueryRow(ctx, `
		SELECT COALESCE(mf_thumb.path, mf_orig.path, ma.file_path)
		FROM release_version_media rvm_preview
		JOIN media_assets ma ON ma.id = rvm_preview.media_asset_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		JOIN visibilities v_preview ON v_preview.id = ma.visibility_id
		JOIN review_statuses rs_preview ON rs_preview.id = ma.review_status_id
		WHERE rvm_preview.release_version_id = $1
		  AND rvm_preview.deleted_at IS NULL
		  AND rvm_preview.is_preview_candidate = TRUE
		  AND ma.status = 'ready'
		  AND v_preview.name = 'public'
		  AND rs_preview.code = 'approved'
		ORDER BY rvm_preview.sort_order ASC, rvm_preview.id ASC
		LIMIT 1
	`, fallbackReleaseVersionID).Scan(&fallbackPath); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, "", fmt.Errorf("resolve theme segment preview asset fallback: %w", err)
	}

	return fallbackPath, "fallback", nil
}

// hydrateSegmentPreviewMetadata befuellt seg.PreviewURL/seg.PreviewSource ueber
// resolveThemeSegmentPreviewAsset (D-08/D-09/D-10). currentReleaseVersionID>0 waehlt die
// Fallback-Release-Version deterministisch (aktuell im Editor geoeffnete Version); <=0
// faellt auf die kleinste zugewiesene release_version_id des Segments zurueck -- dasselbe
// Fallback-Verhalten wie hydrateSegmentPlaybackMetadata.
func (r *AdminContentRepository) hydrateSegmentPreviewMetadata(ctx context.Context, seg *models.AdminThemeSegment, currentReleaseVersionID int64) error {
	if seg == nil || seg.ID <= 0 {
		return nil
	}

	// Feature-Detection analog zu segmentLibraryTablesAvailable/
	// segmentPlaybackSourcesTableAvailable: media_files/media_assets.status existieren in
	// der produktiven Datenbank bereits seit Migration 0024/0059, aber aeltere, isolierte
	// Phase-117-Testfixtures (vor Phase 172) modellieren diesen Teil des Schemas nicht --
	// ohne diesen Guard wuerden ListAnimeSegments/GetAnimeSegmentByID in JEDEM dieser
	// Bestandstests mit "relation media_files does not exist" abbrechen.
	ok, err := r.themeSegmentPreviewSchemaAvailable(ctx)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}

	var manualAssetID, autoAssetID *int64
	if err := r.db.QueryRow(ctx, `
		SELECT preview_media_asset_id, auto_preview_media_asset_id
		FROM theme_segments
		WHERE id = $1
	`, seg.ID).Scan(&manualAssetID, &autoAssetID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return fmt.Errorf("hydrate segment preview metadata segment=%d: %w", seg.ID, err)
	}

	fallbackReleaseVersionID := currentReleaseVersionID
	if fallbackReleaseVersionID <= 0 {
		var assignedReleaseVersionID int64
		if err := r.db.QueryRow(ctx, `
			SELECT release_version_id
			FROM theme_segment_assignments
			WHERE theme_segment_id = $1
			ORDER BY release_version_id ASC
			LIMIT 1
		`, seg.ID).Scan(&assignedReleaseVersionID); err != nil {
			if !errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("hydrate segment preview metadata fallback release version segment=%d: %w", seg.ID, err)
			}
			assignedReleaseVersionID = 0
		}
		fallbackReleaseVersionID = assignedReleaseVersionID
	}

	path, source, err := resolveThemeSegmentPreviewAsset(ctx, r.db, manualAssetID, autoAssetID, fallbackReleaseVersionID)
	if err != nil {
		return fmt.Errorf("hydrate segment preview metadata resolve segment=%d: %w", seg.ID, err)
	}

	if path != nil {
		seg.PreviewURL = publicMediaURLForPath(*path, r.mediaStorageDir)
	}
	seg.PreviewSource = &source

	return nil
}

// themeSegmentPreviewSchemaAvailable prueft, ob das fuer die Vorschaubild-Aufloesung
// benoetigte Schema (media_files-Tabelle + media_assets.status-Spalte) vorhanden ist.
func (r *AdminContentRepository) themeSegmentPreviewSchemaAvailable(ctx context.Context) (bool, error) {
	hasMediaFiles, err := r.hasTable(ctx, "media_files")
	if err != nil || !hasMediaFiles {
		return hasMediaFiles, err
	}
	return r.hasColumn(ctx, "media_assets", "status")
}

func (r *AdminContentRepository) hasColumn(ctx context.Context, tableName, columnName string) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = $1
			  AND column_name = $2
		)
	`, tableName, columnName).Scan(&exists); err != nil {
		return false, fmt.Errorf("detect column %s.%s: %w", tableName, columnName, err)
	}
	return exists, nil
}

// hydrateSegmentPreviewMetadataList wendet hydrateSegmentPreviewMetadata auf jedes
// Segment einer Liste an (gleiches Muster wie hydrateSegmentLibraryMetadataList/
// hydrateSegmentPlaybackMetadataList).
func (r *AdminContentRepository) hydrateSegmentPreviewMetadataList(ctx context.Context, segments []models.AdminThemeSegment, currentReleaseVersionID int64) error {
	for i := range segments {
		if err := r.hydrateSegmentPreviewMetadata(ctx, &segments[i], currentReleaseVersionID); err != nil {
			return err
		}
	}
	return nil
}
