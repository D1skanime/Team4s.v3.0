package handlers

import (
	"context"
	"log"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/services"
)

// registerSegmentAutoPreview legt ein eigenstaendiges media_assets-Bild-Asset fuer ein
// automatisch extrahiertes Segment-Vorschaubild an und setzt auto_preview_media_asset_id
// (Phase 172, D-04/D-05/D-06/D-08). Geteilter Helper fuer BEIDE Quellen: den Render-Worker-Hook
// (executeSegmentRender, nach erfolgreichem MarkThemeSegmentRenderCacheReady) UND den bestehenden
// Video-Upload-Pfad (UploadSegmentAsset, wenn SaveSegmentAsset einen Video-Preview-Frame erzeugt
// hat). Beruehrt preview_media_asset_id NIEMALS. Jeder Fehler wird ausschliesslich geloggt -- die
// Funktion liefert nichts zurueck, das den Aufrufer zum Fehlschlagen zwingen koennte (D-06); sie
// enthaelt bewusst keinen *gin.Context und leitet den Kontext nirgends von einem HTTP-Request ab,
// da sie aus dem Hintergrund-Worker-Pfad genauso aufgerufen wird wie aus einem HTTP-Handler.
func (h *AdminContentHandler) registerSegmentAutoPreview(ctx context.Context, segmentID int64, variant services.MediaVariantSaveResult) {
	if h.mediaRepo == nil || h.themeRepo == nil {
		log.Printf("segment auto-preview: media/theme repo nicht verfuegbar (segment_id=%d)", segmentID)
		return
	}

	publicVisibility := "public"
	approvedReview := "approved"
	asset, err := h.mediaRepo.CreateMediaAsset(ctx, models.MediaAssetCreateInput{
		Kind:             models.MediaKindImage,
		Filename:         variant.Filename,
		StoragePath:      variant.StoragePath,
		MimeType:         variant.MimeType,
		SizeBytes:        variant.SizeBytes,
		Width:            variant.Width,
		Height:           variant.Height,
		VisibilityCode:   &publicVisibility,
		ReviewStatusCode: &approvedReview,
	})
	if err != nil {
		log.Printf("segment auto-preview: media asset konnte nicht angelegt werden (segment_id=%d): %v", segmentID, err)
		return
	}

	if err := h.mediaRepo.InsertMediaFile(ctx, asset.ID, "original", variant.StoragePath, variant.SizeBytes); err != nil {
		log.Printf("segment auto-preview: media file konnte nicht registriert werden (segment_id=%d, asset_id=%d): %v", segmentID, asset.ID, err)
		_ = h.mediaRepo.DeleteMediaAsset(ctx, asset.ID)
		return
	}

	themeRepo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		log.Printf("segment auto-preview: theme repo implementiert segmentStreamThemeRepository nicht (segment_id=%d, type=%T)", segmentID, h.themeRepo)
		return
	}

	oldAssetID, err := themeRepo.SetThemeSegmentAutoPreview(ctx, segmentID, asset.ID)
	if err != nil {
		log.Printf("segment auto-preview: SetThemeSegmentAutoPreview fehlgeschlagen (segment_id=%d, asset_id=%d): %v", segmentID, asset.ID, err)
		return
	}

	// D-04/D-07: das vorherige automatische Asset (Datei + DB-Zeile) wird best-effort aufgeraeumt.
	// preview_media_asset_id (die manuelle Wahl, D-08) ist davon strukturell unberuehrt, weil
	// SetThemeSegmentAutoPreview ausschliesslich die auto_preview_media_asset_id-Spalte schreibt.
	if oldAssetID != nil && *oldAssetID != asset.ID {
		paths, pathsErr := h.mediaRepo.ListMediaFilePaths(ctx, *oldAssetID)
		if pathsErr != nil {
			log.Printf("segment auto-preview: alte Dateipfade konnten nicht geladen werden (segment_id=%d, old_asset_id=%d): %v", segmentID, *oldAssetID, pathsErr)
		}
		for _, p := range paths {
			if removeErr := removeFileQuietly(p); removeErr != nil {
				log.Printf("segment auto-preview: alte Datei konnte nicht entfernt werden (path=%s): %v", p, removeErr)
			}
		}
		if deleteErr := h.mediaRepo.DeleteMediaAsset(ctx, *oldAssetID); deleteErr != nil {
			log.Printf("segment auto-preview: altes media asset konnte nicht geloescht werden (segment_id=%d, old_asset_id=%d): %v", segmentID, *oldAssetID, deleteErr)
		}
	}
}
