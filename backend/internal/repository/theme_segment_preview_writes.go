package repository

// Phase 172, Plan 172-03 (D-08/D-11): die manuellen/automatischen Vorschaubild-Schreibpfade
// fuer Kara-Segmente -- Upload/Picker-Attach/Reset (adminThemeRepository) und der
// Render-Worker-Auto-Write (segmentStreamThemeRepository). Ausgelagert aus
// theme_segment_preview.go (das bereits die Rangfolge-Aufloesung D-08/D-09/D-10 trägt) in eine
// eigene Datei, damit theme_segment_preview.go nicht ueber das CLAUDE.md-450-Zeilen-Limit
// hinauswaechst -- eine reine Code-Organisations-Entscheidung, keine Verhaltensaenderung.

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// setThemeSegmentPreviewColumn liest den aktuellen Wert einer der beiden Phase-172-
// Vorschaubild-Spalten (preview_media_asset_id ODER auto_preview_media_asset_id) und setzt
// sie anschliessend auf newValue (nil fuer NULL) -- das gemeinsame Muster hinter
// SetThemeSegmentManualPreview/ResetThemeSegmentManualPreview/SetThemeSegmentAutoPreview
// (D-08: die jeweils ANDERE Spalte wird dabei NIE beruehrt). column stammt ausschliesslich
// von den drei hartcodierten Aufrufstellen unten, niemals von Nutzereingaben.
func setThemeSegmentPreviewColumn(ctx context.Context, db *pgxpool.Pool, segmentID int64, column string, newValue *int64) (*int64, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	var oldValue *int64
	selectSQL := fmt.Sprintf(`SELECT %s FROM theme_segments WHERE id = $1`, column)
	if err := db.QueryRow(ctx, selectSQL, segmentID).Scan(&oldValue); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read theme segment preview column %s segment=%d: %w", column, segmentID, err)
	}

	updateSQL := fmt.Sprintf(`UPDATE theme_segments SET %s = $1 WHERE id = $2`, column)
	tag, err := db.Exec(ctx, updateSQL, newValue, segmentID)
	if err != nil {
		return nil, fmt.Errorf("update theme segment preview column %s segment=%d: %w", column, segmentID, err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}

	return oldValue, nil
}

// SetThemeSegmentManualPreview setzt NUR preview_media_asset_id (manuelle Wahl, D-11
// Upload/Picker-Attach) und ruehrt auto_preview_media_asset_id NICHT an (D-08). Liefert den
// vorherigen manuellen Wert zurueck, damit der Aufrufer ein zuvor manuell gesetztes,
// jetzt ersetztes Asset aufraeumen kann.
func (r *AdminContentRepository) SetThemeSegmentManualPreview(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error) {
	if mediaAssetID <= 0 {
		return nil, ErrNotFound
	}
	v := mediaAssetID
	return setThemeSegmentPreviewColumn(ctx, r.db, segmentID, "preview_media_asset_id", &v)
}

// ResetThemeSegmentManualPreview setzt preview_media_asset_id auf NULL ("Automatisches Bild
// verwenden", D-11) und ruehrt auto_preview_media_asset_id NICHT an. Liefert den vorherigen
// manuellen Wert zurueck, damit der Aufrufer das zuvor manuell gewaehlte Asset aufraeumen kann.
func (r *AdminContentRepository) ResetThemeSegmentManualPreview(ctx context.Context, segmentID int64) (*int64, error) {
	return setThemeSegmentPreviewColumn(ctx, r.db, segmentID, "preview_media_asset_id", nil)
}

// SetThemeSegmentAutoPreview setzt NUR auto_preview_media_asset_id (Render-Worker/Upload-Pfad,
// D-04/D-05) und ruehrt preview_media_asset_id NICHT an -- ein neuer Render darf eine manuelle
// Wahl NIEMALS ueberschreiben (D-08). Liefert den vorherigen automatischen Wert zurueck, damit
// der Aufrufer das alte automatische Asset aufraeumen kann.
func (r *AdminContentRepository) SetThemeSegmentAutoPreview(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error) {
	if mediaAssetID <= 0 {
		return nil, ErrNotFound
	}
	v := mediaAssetID
	return setThemeSegmentPreviewColumn(ctx, r.db, segmentID, "auto_preview_media_asset_id", &v)
}

// AttachSegmentPreviewImageFromReleaseVersion uebernimmt ein bereits oeffentliches,
// freigegebenes Bild einer Release-Version, der das Segment zugewiesen ist, als neues
// manuelles Vorschaubild ("Aus Release-Bildern wählen", D-11). Verifiziert serverseitig ueber
// ListThemeSegmentAssignments PLUS das canonical public/approved/ready-Gate (T-172-01) --
// ein media_asset_id ausserhalb dieser Menge liefert IMMER ErrNotFound, niemals ein
// vertrauensvolles Uebernehmen der Client-Eingabe (RESEARCH.md IDOR-Warnung).
func (r *AdminContentRepository) AttachSegmentPreviewImageFromReleaseVersion(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error) {
	if segmentID <= 0 || mediaAssetID <= 0 {
		return nil, ErrNotFound
	}

	assignedIDs, err := r.ListThemeSegmentAssignments(ctx, segmentID)
	if err != nil {
		return nil, err
	}
	if len(assignedIDs) == 0 {
		return nil, ErrNotFound
	}

	var allowed bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM release_version_media rvm
			JOIN media_assets ma ON ma.id = rvm.media_asset_id
			JOIN visibilities v ON v.id = ma.visibility_id
			JOIN review_statuses rs ON rs.id = ma.review_status_id
			WHERE rvm.media_asset_id = $1
			  AND rvm.release_version_id = ANY($2)
			  AND rvm.deleted_at IS NULL
			  AND ma.status = 'ready'
			  AND v.name = 'public'
			  AND rs.code = 'approved'
		)
	`, mediaAssetID, assignedIDs).Scan(&allowed); err != nil {
		return nil, fmt.Errorf("verify theme segment preview image ownership segment=%d asset=%d: %w", segmentID, mediaAssetID, err)
	}
	if !allowed {
		return nil, ErrNotFound
	}

	return r.SetThemeSegmentManualPreview(ctx, segmentID, mediaAssetID)
}

// IsMediaAssetExclusiveSegmentPreview prueft, BEVOR ein ersetztes altes Vorschaubild-Asset
// aufgeraeumt wird (Datei(en) + media_assets-Zeile, siehe cleanupOldPreviewAsset in
// admin_content_anime_theme_segments_preview.go), ob dieses Asset ausschliesslich als
// Segment-Vorschaubild existiert. Liefert false, wenn das Asset entweder (a) von
// release_version_media referenziert wird -- unabhaengig von deleted_at, denn die
// release_version_media_media_asset_id_fkey-Constraint ist RESTRICT und blockiert ein
// physisches Loeschen auch bei soft-deleted Zeilen -- oder (b) von einem ANDEREN Segment
// (!= excludeSegmentID) weiterhin als preview_media_asset_id/auto_preview_media_asset_id
// genutzt wird. Beides war vor diesem Fix nicht geprueft: ein per "Aus Release-Bildern
// wählen" uebernommenes fremdes Bild wurde beim naechsten Attach/Reset/Upload hart von der
// Platte geloescht, obwohl die Release-Version es noch referenzierte (Datenverlust-Bug,
// Code-Review Phase 172).
func (r *AdminContentRepository) IsMediaAssetExclusiveSegmentPreview(ctx context.Context, mediaAssetID int64, excludeSegmentID int64) (bool, error) {
	if mediaAssetID <= 0 {
		return false, nil
	}

	var referencedElsewhere bool
	if err := r.db.QueryRow(ctx, `
		SELECT
			EXISTS(SELECT 1 FROM release_version_media rvm WHERE rvm.media_asset_id = $1)
			OR EXISTS(
				SELECT 1 FROM theme_segments ts
				WHERE ts.id != $2
				  AND (ts.preview_media_asset_id = $1 OR ts.auto_preview_media_asset_id = $1)
			)
	`, mediaAssetID, excludeSegmentID).Scan(&referencedElsewhere); err != nil {
		return false, fmt.Errorf("check media asset exclusivity asset=%d exclude_segment=%d: %w", mediaAssetID, excludeSegmentID, err)
	}

	return !referencedElsewhere, nil
}

// ListSegmentPreviewImageCandidates liefert die waehlbaren Bilder fuer den "Aus
// Release-Bildern wählen"-Picker (D-11): alle oeffentlichen, freigegebenen Bilder der
// Release-Versionen, denen das Segment ueber ListThemeSegmentAssignments zugewiesen ist.
// Eine leere Zuweisungsliste liefert eine leere (NICHT nil, NICHT Fehler) Kandidatenliste.
func (r *AdminContentRepository) ListSegmentPreviewImageCandidates(ctx context.Context, segmentID int64, mediaStorageDir string) ([]models.AdminSegmentPreviewImageCandidate, error) {
	if segmentID <= 0 {
		return nil, ErrNotFound
	}

	assignedIDs, err := r.ListThemeSegmentAssignments(ctx, segmentID)
	if err != nil {
		return nil, err
	}

	candidates := []models.AdminSegmentPreviewImageCandidate{}
	if len(assignedIDs) == 0 {
		return candidates, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT ma.id, COALESCE(mf_thumb.path, mf_orig.path, ma.file_path), e.episode_number, rv.version
		FROM release_version_media rvm
		JOIN media_assets ma ON ma.id = rvm.media_asset_id
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = ma.id AND mf_thumb.variant = 'thumb' AND mf_thumb.status = 'ready'
		LEFT JOIN media_files mf_orig ON mf_orig.media_id = ma.id AND (mf_orig.variant = 'original' OR mf_orig.variant IS NULL) AND mf_orig.status = 'ready'
		WHERE rvm.release_version_id = ANY($1)
		  AND rvm.deleted_at IS NULL
		  AND ma.status = 'ready'
		  AND v.name = 'public'
		  AND rs.code = 'approved'
		ORDER BY e.episode_number, rvm.sort_order ASC, rvm.id ASC
	`, assignedIDs)
	if err != nil {
		return nil, fmt.Errorf("list theme segment preview image candidates segment=%d: %w", segmentID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			assetID       int64
			path          string
			episodeNumber string
			version       string
		)
		if err := rows.Scan(&assetID, &path, &episodeNumber, &version); err != nil {
			return nil, fmt.Errorf("scan theme segment preview image candidate segment=%d: %w", segmentID, err)
		}

		label := fmt.Sprintf("Folge %s", episodeNumber)
		if trimmedVersion := strings.TrimSpace(version); trimmedVersion != "" {
			label = fmt.Sprintf("Folge %s (%s)", episodeNumber, trimmedVersion)
		}

		thumbnailURL := ""
		if url := publicMediaURLForPath(path, mediaStorageDir); url != nil {
			thumbnailURL = *url
		}

		candidates = append(candidates, models.AdminSegmentPreviewImageCandidate{
			MediaAssetID:        assetID,
			ThumbnailURL:        thumbnailURL,
			ReleaseVersionLabel: label,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate theme segment preview image candidates segment=%d: %w", segmentID, err)
	}

	return candidates, nil
}
