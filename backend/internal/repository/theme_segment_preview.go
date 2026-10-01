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
// manualPreviewAssetEligibilitySQL (Code-Review-Fix Phase 172): das manuelle Vorschaubild darf
// NUR verwendet werden, wenn es weiterhin oeffentlich/freigegeben ist (visibility=public,
// review_status=approved) UND -- falls es ueber "Aus Release-Bildern wählen" (rvm-Herkunft)
// uebernommen wurde -- die uebernommene release_version_media-Zeile nicht inzwischen (soft-)
// geloescht wurde. Ohne dieses Gate bliebe ein spaeter abgelehntes/intern gestelltes/entferntes
// Release-Bild weiterhin oeffentlich als Kara-Vorschaubild sichtbar -- die Rangfolge faellt in
// diesem Fall stattdessen auf automatisch > Ersatzbild zurueck (D-08/D-10). NUR fuer manuell
// gilt dieses Gate; automatische Vorschaubilder (vom Render-Worker/Upload-Pfad erzeugt, siehe
// registerSegmentAutoPreview) sind bei Erzeugung bereits public/approved und folgen keiner
// rvm-Herkunft.
const manualPreviewAssetEligibilitySQL = `
	ma.status = 'ready'
	AND v.name = 'public'
	AND rs.code = 'approved'
	AND (
		NOT EXISTS (SELECT 1 FROM release_version_media rvm_elig WHERE rvm_elig.media_asset_id = ma.id)
		OR EXISTS (SELECT 1 FROM release_version_media rvm_elig WHERE rvm_elig.media_asset_id = ma.id AND rvm_elig.deleted_at IS NULL)
	)
`

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
				JOIN visibilities v ON v.id = ma.visibility_id
				JOIN review_statuses rs ON rs.id = ma.review_status_id
				WHERE ma.id = $1 AND `+manualPreviewAssetEligibilitySQL+`
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
	return themeSegmentPreviewSchemaAvailableOnPool(ctx, r.db)
}

func (r *AdminContentRepository) hasColumn(ctx context.Context, tableName, columnName string) (bool, error) {
	return hasColumnOnPool(ctx, r.db, tableName, columnName)
}

// themeSegmentPreviewSchemaAvailableOnPool ist die *pgxpool.Pool-Variante von
// themeSegmentPreviewSchemaAvailable, damit auch ReleaseDetailPublicRepository
// (loadReleaseSegments, Plan 172-02) denselben Feature-Detection-Guard nutzen kann wie
// AdminContentRepository -- ohne diesen Guard wuerde jede Phase-117-Testfixture, die das
// Vorschaubild-Schema nicht modelliert (z.B. segment_origin_query_budget_test.go, Plan
// 156-09), mit "relation media_files does not exist" abbrechen, sobald loadReleaseSegments
// die Vorschaubild-Aufloesung aufruft.
func themeSegmentPreviewSchemaAvailableOnPool(ctx context.Context, db *pgxpool.Pool) (bool, error) {
	hasMediaFiles, err := hasTableOnPool(ctx, db, "media_files")
	if err != nil || !hasMediaFiles {
		return hasMediaFiles, err
	}
	return hasColumnOnPool(ctx, db, "media_assets", "status")
}

func hasTableOnPool(ctx context.Context, db *pgxpool.Pool, tableName string) (bool, error) {
	var exists bool
	if err := db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = $1
		)
	`, tableName).Scan(&exists); err != nil {
		return false, fmt.Errorf("detect table %s: %w", tableName, err)
	}
	return exists, nil
}

func hasColumnOnPool(ctx context.Context, db *pgxpool.Pool, tableName, columnName string) (bool, error) {
	var exists bool
	if err := db.QueryRow(ctx, `
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

// resolveThemeSegmentPreviewAssetsBatch ist die Mehrfach-Segment-Variante von
// resolveThemeSegmentPreviewAsset, fuer EINEN gemeinsamen fallbackReleaseVersionID
// (loadReleaseSegments ruft sie immer fuer genau EINE betrachtete Release-Version auf --
// alle Segmente dieses Aufrufs teilen sich dieselbe Folge, also auch denselben
// Ersatzbild-Kontext). Behavioral identisch zu N Einzelaufrufen von
// resolveThemeSegmentPreviewAsset (dieselben SQL-Praedikate: ma.status='ready',
// media_files.variant='original'/NULL fuer manuell/automatisch, die exakte
// is_preview_candidate-Korrelationsabfrage fuer das Ersatzbild) -- aber in konstant
// <=2 zusaetzlichen Queries statt N, um den von Plan 156-09 (segment_origin_query_budget_
// test.go, P156-16/P156-17/T-156-17) erzwungenen konstanten Query-Budget nicht zu
// verletzen. manualAssetIDs/autoAssetIDs muessen gleich lang sein (ein Paar pro Segment,
// in derselben Reihenfolge); das Ergebnis hat dieselbe Laenge.
func resolveThemeSegmentPreviewAssetsBatch(
	ctx context.Context,
	db *pgxpool.Pool,
	manualAssetIDs []*int64,
	autoAssetIDs []*int64,
	fallbackReleaseVersionID int64,
) ([]*string, error) {
	if len(manualAssetIDs) != len(autoAssetIDs) {
		return nil, fmt.Errorf("resolve theme segment preview assets batch: manual/auto length mismatch (%d vs %d)", len(manualAssetIDs), len(autoAssetIDs))
	}
	result := make([]*string, len(manualAssetIDs))

	manualIDSet := make(map[int64]struct{})
	for _, id := range manualAssetIDs {
		if id != nil {
			manualIDSet[*id] = struct{}{}
		}
	}
	autoIDSet := make(map[int64]struct{})
	for _, id := range autoAssetIDs {
		if id != nil {
			autoIDSet[*id] = struct{}{}
		}
	}

	manualPathByAssetID := make(map[int64]string, len(manualIDSet))
	autoPathByAssetID := make(map[int64]string, len(autoIDSet))
	if len(manualIDSet) > 0 || len(autoIDSet) > 0 {
		manualIDs := make([]int64, 0, len(manualIDSet))
		for id := range manualIDSet {
			manualIDs = append(manualIDs, id)
		}
		autoIDs := make([]int64, 0, len(autoIDSet))
		for id := range autoIDSet {
			autoIDs = append(autoIDs, id)
		}

		// Code-Review-Fix (Phase 172): manuell und automatisch werden getrennt aufgeloest (zwei
		// UNION-ALL-Zweige IN EINEM Query-Aufruf, um das pinned Query-Budget von
		// segment_origin_query_budget_test.go nicht zu verletzen), weil NUR die manuelle Rolle
		// das public/approved/nicht-rvm-geloescht-Gate (manualPreviewAssetEligibilitySQL) tragen
		// darf -- ein Asset, das fuer EIN Segment manuell (und damit gate-pflichtig) und fuer ein
		// ANDERES Segment automatisch (gate-frei) referenziert wird, muss in beiden Rollen korrekt
		// behandelt werden.
		rows, err := db.Query(ctx, `
			SELECT ma.id, COALESCE(mf.path, ma.file_path), TRUE AS is_manual
			FROM media_assets ma
			LEFT JOIN media_files mf ON mf.media_id = ma.id
				AND (mf.variant = 'original' OR mf.variant IS NULL)
				AND mf.status = 'ready'
			JOIN visibilities v ON v.id = ma.visibility_id
			JOIN review_statuses rs ON rs.id = ma.review_status_id
			WHERE ma.id = ANY($1) AND `+manualPreviewAssetEligibilitySQL+`
			UNION ALL
			SELECT ma.id, COALESCE(mf.path, ma.file_path), FALSE AS is_manual
			FROM media_assets ma
			LEFT JOIN media_files mf ON mf.media_id = ma.id
				AND (mf.variant = 'original' OR mf.variant IS NULL)
				AND mf.status = 'ready'
			WHERE ma.id = ANY($2) AND ma.status = 'ready'
			ORDER BY id ASC
		`, manualIDs, autoIDs)
		if err != nil {
			return nil, fmt.Errorf("resolve theme segment preview assets batch manual/auto: %w", err)
		}
		for rows.Next() {
			var assetID int64
			var path string
			var isManual bool
			if scanErr := rows.Scan(&assetID, &path, &isManual); scanErr != nil {
				rows.Close()
				return nil, fmt.Errorf("resolve theme segment preview assets batch manual/auto scan: %w", scanErr)
			}
			// Erste Zeile pro (Asset, Rolle) gewinnt -- analog zu resolveThemeSegmentPreviewAsset's
			// LIMIT 1.
			if isManual {
				if _, exists := manualPathByAssetID[assetID]; !exists {
					manualPathByAssetID[assetID] = path
				}
			} else {
				if _, exists := autoPathByAssetID[assetID]; !exists {
					autoPathByAssetID[assetID] = path
				}
			}
		}
		rowsErr := rows.Err()
		rows.Close()
		if rowsErr != nil {
			return nil, fmt.Errorf("resolve theme segment preview assets batch manual/auto iterate: %w", rowsErr)
		}
	}

	needsFallback := false
	for i := range result {
		if id := manualAssetIDs[i]; id != nil {
			if path, ok := manualPathByAssetID[*id]; ok {
				p := path
				result[i] = &p
				continue
			}
		}
		if id := autoAssetIDs[i]; id != nil {
			if path, ok := autoPathByAssetID[*id]; ok {
				p := path
				result[i] = &p
				continue
			}
		}
		needsFallback = true
	}

	if !needsFallback || fallbackReleaseVersionID <= 0 {
		return result, nil
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
		return nil, fmt.Errorf("resolve theme segment preview assets batch fallback: %w", err)
	}

	if fallbackPath == nil {
		return result, nil
	}
	for i := range result {
		if result[i] == nil {
			p := *fallbackPath
			result[i] = &p
		}
	}
	return result, nil
}

// applyThemeSegmentPreviewURLs setzt item.PreviewURL fuer jedes Element von items (Plan
// 172-02, D-09/loadReleaseSegments) ueber resolveThemeSegmentPreviewAssetsBatch --
// ausgelagert aus release_detail_public_repository_helpers.go, damit die Public-Release-
// Detailseite denselben Feature-Detection-Guard (themeSegmentPreviewSchemaAvailableOnPool)
// und dieselbe Batch-Aufloesung nutzt wie der Rest dieser Datei, ohne
// release_detail_public_repository_helpers.go weiter ueber das CLAUDE.md-450-Zeilen-Limit
// hinauswachsen zu lassen. items, manualAssetIDs und autoAssetIDs muessen gleich lang sein
// (ein Tripel pro Segment, in derselben Reihenfolge); mutiert items in-place.
func applyThemeSegmentPreviewURLs(
	ctx context.Context,
	db *pgxpool.Pool,
	items []PublicReleaseSegment,
	manualAssetIDs []*int64,
	autoAssetIDs []*int64,
	fallbackReleaseVersionID int64,
	mediaStorageDir string,
) error {
	available, err := themeSegmentPreviewSchemaAvailableOnPool(ctx, db)
	if err != nil {
		return fmt.Errorf("detect preview schema: %w", err)
	}
	if !available {
		return nil
	}

	previewPaths, err := resolveThemeSegmentPreviewAssetsBatch(ctx, db, manualAssetIDs, autoAssetIDs, fallbackReleaseVersionID)
	if err != nil {
		return fmt.Errorf("resolve segment previews: %w", err)
	}
	for i, previewPath := range previewPaths {
		if previewPath != nil {
			items[i].PreviewURL = publicMediaURLForPath(*previewPath, mediaStorageDir)
		}
	}
	return nil
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
