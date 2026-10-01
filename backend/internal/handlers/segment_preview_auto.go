package handlers

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

// segmentPreviewFramePath liefert einen temporaeren Zielpfad fuer einen extrahierten
// Vorschaubild-Frame. Der Frame wird danach ueber den globalen Anime-Upload-Pfad abgelegt
// (StoreGeneratedAnimeImage) und die temporaere Datei wieder entfernt.
func segmentPreviewFramePath(segmentID int64) string {
	return filepath.Join(os.TempDir(), fmt.Sprintf("team4s-segment-preview-%d-%s.jpg", segmentID, uuid.New().String()))
}

// registerSegmentAutoPreview legt einen automatisch extrahierten Frame als Vorschaubild des
// Segments ab und setzt auto_preview_media_asset_id (Phase 172, D-04/D-05/D-06/D-08).
// Gespeichert wird ueber denselben kanonischen Pfad wie jeder Anime-Upload
// (media/anime/<animeID>/segment_preview/<uuid>/original+thumb, media_assets, media_files,
// anime_media). Beruehrt preview_media_asset_id NIEMALS. Jeder Fehler wird ausschliesslich
// geloggt (D-06); aufgerufen aus Render-Worker und Video-Upload-Pfad.
func (h *AdminContentHandler) registerSegmentAutoPreview(ctx context.Context, segmentID int64, animeID int64, framePath string) {
	defer func() { _ = os.Remove(framePath) }()

	if h.generatedImageStore == nil || h.themeRepo == nil {
		log.Printf("segment auto-preview: bildablage/theme repo nicht verfuegbar (segment_id=%d)", segmentID)
		return
	}
	themeRepo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		log.Printf("segment auto-preview: theme repo implementiert segmentStreamThemeRepository nicht (segment_id=%d, type=%T)", segmentID, h.themeRepo)
		return
	}

	assetID, err := h.generatedImageStore.StoreGeneratedAnimeImage(ctx, framePath, animeID, "segment_preview")
	if err != nil {
		log.Printf("segment auto-preview: bild konnte nicht abgelegt werden (segment_id=%d, anime_id=%d): %v", segmentID, animeID, err)
		return
	}

	oldAssetID, err := themeRepo.SetThemeSegmentAutoPreview(ctx, segmentID, assetID)
	if err != nil {
		log.Printf("segment auto-preview: SetThemeSegmentAutoPreview fehlgeschlagen (segment_id=%d, asset_id=%d): %v", segmentID, assetID, err)
		h.cleanupOldPreviewAsset(ctx, &assetID, 0, segmentID, "segment auto-preview rollback")
		return
	}

	// D-04/D-07: das vorherige automatische Asset wird best-effort aufgeraeumt. Die manuelle
	// Wahl (D-08) ist strukturell unberuehrt, weil nur auto_preview_media_asset_id geschrieben wird.
	h.cleanupOldPreviewAsset(ctx, oldAssetID, assetID, segmentID, "segment auto-preview")
}
