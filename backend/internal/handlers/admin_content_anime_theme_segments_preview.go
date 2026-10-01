package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// Phase 172 (D-03/D-11): die manuellen Vorschaubild-Endpunkte fuer Kara-Segmente
// (Zuordnung eines ueber den globalen Uploader hochgeladenen Bildes, Kandidaten-Liste,
// Attach eines Release-Bildes, Reset auf Automatisch). Ausgelagert in eine eigene Datei, da
// admin_content_anime_theme_segments.go bereits bei 955 Zeilen liegt (450-Zeilen-Limit).
// Hochgeladen wird ausschliesslich ueber POST /admin/upload (asset_type=segment_preview).

// resolveSegmentPreviewContext buendelt die gemeinsamen Schritte aller Vorschaubild-Handler:
// Pfad-Parameter parsen, Segment laden, requireSegmentManage pruefen -- BEVOR irgendeine
// Mutation oder ein Lesezugriff stattfindet. Liefert ok=false, wenn die Response bereits
// geschrieben wurde (400/404/403/500).
func (h *AdminContentHandler) resolveSegmentPreviewContext(c *gin.Context) (animeID int64, segmentID int64, releaseVariantID int64, ok bool) {
	animeID, segmentID, parsedErr := parseSegmentPreviewPathParams(c)
	if parsedErr {
		return 0, 0, 0, false
	}

	releaseVariantID = parseReleaseVariantIDQuery(c)
	if releaseVariantID < 0 {
		badRequest(c, "ungültige release_variant_id")
		return 0, 0, 0, false
	}

	releaseVariantID, ok = h.authorizeSegmentPreview(c, animeID, segmentID, releaseVariantID)
	if !ok {
		return 0, 0, 0, false
	}
	return animeID, segmentID, releaseVariantID, true
}

// authorizeSegmentPreview laedt das Segment fuer den Berechtigungskontext und prueft
// requireSegmentManage. Geteilt von den Vorschaubild-Endpunkten und dem segment_preview-Zweig
// des globalen Uploaders (AuthorizeSegmentPreviewUpload).
func (h *AdminContentHandler) authorizeSegmentPreview(c *gin.Context, animeID, segmentID, releaseVariantID int64) (int64, bool) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment vorschaubild service nicht verfügbar"}})
		return 0, false
	}
	seg, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVariantID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return 0, false
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return 0, false
	}
	if releaseVariantID == 0 {
		releaseVariantID = segmentPlaybackVariantID(seg)
	}
	if !h.requireSegmentManage(c, releaseVariantID) {
		return 0, false
	}
	return releaseVariantID, true
}

// AuthorizeSegmentPreviewUpload ist der Rechte-Zweig des globalen Uploaders fuer
// asset_type=segment_preview (MediaUploadHandler.WithSegmentPreviewAuthorizer): wer das
// Segment bearbeiten darf, darf dafuer ein Vorschaubild hochladen.
func (h *AdminContentHandler) AuthorizeSegmentPreviewUpload(c *gin.Context, animeID, segmentID, releaseVariantID int64) (middleware.AuthIdentity, bool) {
	if _, ok := h.authorizeSegmentPreview(c, animeID, segmentID, releaseVariantID); !ok {
		return middleware.AuthIdentity{}, false
	}
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return middleware.AuthIdentity{}, false
	}
	return identity, true
}

// generatedAnimeImageStore legt serverseitig erzeugte Bilder ueber den globalen
// Anime-Upload-Pfad ab (MediaUploadHandler.StoreGeneratedAnimeImage).
type generatedAnimeImageStore interface {
	StoreGeneratedAnimeImage(ctx context.Context, sourcePath string, animeID int64, assetType string) (int64, error)
}

// WithGeneratedImageStore verdrahtet den globalen Ablagepfad fuer automatische Vorschaubilder.
func (h *AdminContentHandler) WithGeneratedImageStore(store generatedAnimeImageStore) *AdminContentHandler {
	h.generatedImageStore = store
	return h
}

// parseSegmentPreviewPathParams parst :id/:segmentId; schreibt bei Fehler bereits die
// 400-Response und meldet dies ueber den dritten Rueckgabewert.
func parseSegmentPreviewPathParams(c *gin.Context) (animeID int64, segmentID int64, failed bool) {
	var err error
	animeID, err = strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return 0, 0, true
	}
	segmentID, err = strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungültige segment id")
		return 0, 0, true
	}
	return animeID, segmentID, false
}

// cleanupOldPreviewAsset raeumt ein durch eine neue manuelle/automatische Wahl ersetztes altes
// Vorschaubild-Asset best-effort auf (Dateien, leerer Asset-Ordner, media_assets-Zeile). Die
// vorausgehende Mutation ist bereits erfolgreich -- Fehler werden NUR geloggt.
//
// Datenverlust-Schutz: ein per "Aus Release-Bildern wählen" uebernommenes altes Bild gehoert
// weiterhin zu release_version_media (oder einem anderen Segment). Vor jedem Aufraeumen wird
// daher IsMediaAssetExclusiveSegmentPreview gefragt.
func (h *AdminContentHandler) cleanupOldPreviewAsset(ctx context.Context, oldAssetID *int64, newAssetID int64, segmentID int64, logContext string) {
	if oldAssetID == nil || *oldAssetID == newAssetID || h.mediaRepo == nil || h.themeRepo == nil {
		return
	}
	exclusive, err := h.themeRepo.IsMediaAssetExclusiveSegmentPreview(ctx, *oldAssetID, segmentID)
	if err != nil {
		log.Printf("%s: exklusivitaetspruefung fuer altes asset fehlgeschlagen (old_asset_id=%d): %v", logContext, *oldAssetID, err)
		return
	}
	if !exclusive {
		log.Printf("%s: altes asset wird noch anderswo referenziert, kein aufraeumen (old_asset_id=%d)", logContext, *oldAssetID)
		return
	}
	paths, err := h.mediaRepo.ListMediaFilePaths(ctx, *oldAssetID)
	if err != nil {
		log.Printf("%s: alte dateipfade konnten nicht geladen werden (old_asset_id=%d): %v", logContext, *oldAssetID, err)
	}
	for _, p := range paths {
		if removeErr := removeFileQuietly(p); removeErr != nil {
			log.Printf("%s: alte datei konnte nicht entfernt werden (path=%s): %v", logContext, p, removeErr)
		}
		// Kanonisches Layout media/anime/<id>/segment_preview/<uuid>/: leeren Asset-Ordner mitnehmen.
		_ = os.Remove(filepath.Dir(p))
	}
	if deleteErr := h.mediaRepo.DeleteMediaAsset(ctx, *oldAssetID); deleteErr != nil {
		log.Printf("%s: altes media asset konnte nicht geloescht werden (old_asset_id=%d): %v", logContext, *oldAssetID, deleteErr)
	}
}

type adminSegmentPreviewImageAssignRequest struct {
	MediaID int64 `json:"media_id"`
}

// AssignSegmentPreviewImage verarbeitet PUT /api/v1/admin/anime/:id/segments/:segmentId/preview-image.
// Ordnet ein zuvor ueber den globalen Uploader (POST /admin/upload, asset_type=segment_preview)
// hochgeladenes Bild als manuelles Vorschaubild zu -- analog PUT /admin/anime/:id/assets/cover.
// Das Bild ist danach ohne Review sofort oeffentlich (D-03).
func (h *AdminContentHandler) AssignSegmentPreviewImage(c *gin.Context) {
	animeID, segmentID, releaseVariantID, ok := h.resolveSegmentPreviewContext(c)
	if !ok {
		return
	}

	var req adminSegmentPreviewImageAssignRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.MediaID <= 0 {
		badRequest(c, "ungültiger request body")
		return
	}

	oldAssetID, err := h.themeRepo.AssignUploadedSegmentPreviewImage(c.Request.Context(), animeID, segmentID, req.MediaID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "bild wurde nicht als vorschaubild für diesen anime hochgeladen"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschaubild konnte nicht zugeordnet werden.")
		return
	}
	h.cleanupOldPreviewAsset(c.Request.Context(), oldAssetID, req.MediaID, segmentID, "segment preview assign")

	updated, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVariantID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktualisiertes Segment konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// GetSegmentPreviewImageCandidates verarbeitet GET
// /api/v1/admin/anime/:id/segments/:segmentId/preview-image/candidates. Liefert die
// waehlbaren, bereits oeffentlichen Release-Bilder fuer den "Aus Release-Bildern
// wählen"-Picker (D-11).
func (h *AdminContentHandler) GetSegmentPreviewImageCandidates(c *gin.Context) {
	_, segmentID, _, ok := h.resolveSegmentPreviewContext(c)
	if !ok {
		return
	}

	candidates, err := h.themeRepo.ListSegmentPreviewImageCandidates(c.Request.Context(), segmentID, h.mediaStorageDir)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschaubild-Kandidaten konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": candidates})
}

type adminSegmentPreviewImageAttachRequest struct {
	MediaAssetID int64 `json:"media_asset_id"`
}

// AttachSegmentPreviewImage verarbeitet POST
// /api/v1/admin/anime/:id/segments/:segmentId/preview-image/attach. Uebernimmt ein bereits
// oeffentliches, freigegebenes Bild einer zugewiesenen Release-Version als neues manuelles
// Vorschaubild (D-11). Die Ownership wird serverseitig in
// AttachSegmentPreviewImageFromReleaseVersion erneut verifiziert -- ein fremdes/nicht
// zugewiesenes media_asset_id liefert IMMER 404.
func (h *AdminContentHandler) AttachSegmentPreviewImage(c *gin.Context) {
	animeID, segmentID, releaseVariantID, ok := h.resolveSegmentPreviewContext(c)
	if !ok {
		return
	}

	var req adminSegmentPreviewImageAttachRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.MediaAssetID <= 0 {
		badRequest(c, "ungültiger request body")
		return
	}

	oldAssetID, err := h.themeRepo.AttachSegmentPreviewImageFromReleaseVersion(c.Request.Context(), segmentID, req.MediaAssetID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "bild gehört zu keiner zugewiesenen, öffentlichen release-version"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschaubild konnte nicht übernommen werden.")
		return
	}
	h.cleanupOldPreviewAsset(c.Request.Context(), oldAssetID, req.MediaAssetID, segmentID, "segment preview attach")

	updated, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVariantID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktualisiertes Segment konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// ResetSegmentPreviewImage verarbeitet POST
// /api/v1/admin/anime/:id/segments/:segmentId/preview-image/reset. Entfernt die manuelle Wahl
// ("Automatisches Bild verwenden", D-11) -- das Segment faellt danach auf die bestehende
// Rangfolge automatisch > Ersatzbild zurueck (D-08), ohne dass ein neuer Render noetig ist.
func (h *AdminContentHandler) ResetSegmentPreviewImage(c *gin.Context) {
	animeID, segmentID, releaseVariantID, ok := h.resolveSegmentPreviewContext(c)
	if !ok {
		return
	}

	oldAssetID, err := h.themeRepo.ResetThemeSegmentManualPreview(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Manuelles Vorschaubild konnte nicht zurückgesetzt werden.")
		return
	}
	h.cleanupOldPreviewAsset(c.Request.Context(), oldAssetID, 0, segmentID, "segment preview reset")

	updated, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVariantID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktualisiertes Segment konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}
