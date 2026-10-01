package handlers

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// Phase 172, Plan 172-05 (D-03/D-11): die vier manuellen Vorschaubild-Endpunkte fuer
// Kara-Segmente (Upload, Kandidaten-Liste, Attach eines Release-Bildes, Reset auf
// Automatisch). Ausgelagert in eine eigene Datei, da admin_content_anime_theme_segments.go
// bereits bei 955 Zeilen liegt (CLAUDE.md 450-Zeilen-Limit). Jeder Handler folgt exakt dem
// Parameter-Parse/Permission-Gate/Domain-Body/Response-Schema von
// UploadSegmentAsset/AttachSegmentLibraryAsset (siehe admin_content_anime_theme_segments.go).

// resolveSegmentPreviewContext buendelt die gemeinsamen Schritte 1-5 aller vier neuen
// Vorschaubild-Handler: Pfad-Parameter parsen, Segment fuer den Berechtigungskontext laden,
// requireSegmentManage pruefen -- BEVOR irgendeine Mutation oder ein Lesezugriff auf
// Vorschaubild-Daten stattfindet (Acceptance: "Ohne Segment-Recht -> 403" fuer alle vier
// Endpunkte). Liefert ok=false, wenn die Response bereits geschrieben wurde (400/404/403/500).
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

	seg, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVariantID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return 0, 0, 0, false
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return 0, 0, 0, false
	}
	if releaseVariantID == 0 {
		releaseVariantID = segmentPlaybackVariantID(seg)
	}
	if !h.requireSegmentManage(c, releaseVariantID) {
		return 0, 0, 0, false
	}

	return animeID, segmentID, releaseVariantID, true
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
// Vorschaubild-Asset best-effort auf (Datei(en) + media_assets-Zeile). Die vorausgehende
// Mutation ist zu diesem Zeitpunkt bereits erfolgreich -- jeder Fehler wird NUR geloggt, nie an
// den Aufrufer zurueckgegeben (gleiches Prinzip wie registerSegmentAutoPreview, D-06-analog).
//
// Datenverlust-Fix (Code-Review Phase 172): ein per "Aus Release-Bildern wählen" uebernommenes
// altes Bild gehoert ggf. noch zu release_version_media (oder einem anderen Segment) -- IMMER
// loeschen wuerde dessen Datei(en) entfernen und DeleteMediaAsset anschliessend an der RESTRICT-
// FK release_version_media_media_asset_id_fkey scheitern lassen, waehrend die Release-Zeile mit
// fehlender Datei zurueckbleibt. Vor jedem Aufraeumen wird daher IsMediaAssetExclusiveSegmentPreview
// gefragt, ob das alte Asset ausschliesslich als Segment-Vorschaubild existiert.
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
	}
	if deleteErr := h.mediaRepo.DeleteMediaAsset(ctx, *oldAssetID); deleteErr != nil {
		log.Printf("%s: altes media asset konnte nicht geloescht werden (old_asset_id=%d): %v", logContext, *oldAssetID, deleteErr)
	}
}

// UploadSegmentPreviewImage verarbeitet POST
// /api/v1/admin/anime/:id/segments/:segmentId/preview-image. Speichert ein hochgeladenes Bild
// als neues manuelles Vorschaubild des Segments (D-11 "Bild hochladen"). Wie bestehende
// Segment-Dateien ist das Ergebnis sofort oeffentlich/freigegeben, ohne Review (D-03).
func (h *AdminContentHandler) UploadSegmentPreviewImage(c *gin.Context) {
	if h.themeRepo == nil || h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment vorschaubild service nicht verfügbar"}})
		return
	}

	animeID, segmentID, releaseVariantID, ok := h.resolveSegmentPreviewContext(c)
	if !ok {
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		badRequest(c, "datei fehlt (field: file)")
		return
	}
	file, err := fileHeader.Open()
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei konnte nicht gelesen werden.")
		return
	}

	saveResult, err := h.mediaService.SaveUpload(models.MediaKindImage, fileHeader.Filename, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			badRequest(c, validationErr.Message)
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschaubild konnte nicht gespeichert werden.")
		return
	}

	// D-03: ein manuell hochgeladenes Vorschaubild ist ohne Review sofort oeffentlich, exakt wie
	// bestehende Segment-Dateien (UploadSegmentAsset, admin_content_anime_theme_segments.go).
	publicVisibility := "public"
	approvedReview := "approved"
	saveResult.CreateInput.VisibilityCode = &publicVisibility
	saveResult.CreateInput.ReviewStatusCode = &approvedReview

	asset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschaubild-Asset konnte nicht gespeichert werden.")
		return
	}
	if err := h.mediaRepo.InsertMediaFile(c.Request.Context(), asset.ID, "original", saveResult.CreateInput.StoragePath, saveResult.CreateInput.SizeBytes); err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschaubild-Datei konnte nicht registriert werden.")
		return
	}

	oldAssetID, err := h.themeRepo.SetThemeSegmentManualPreview(c.Request.Context(), segmentID, asset.ID)
	if err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschaubild konnte nicht als manuelle Wahl gesetzt werden.")
		return
	}
	h.cleanupOldPreviewAsset(c.Request.Context(), oldAssetID, asset.ID, segmentID, "segment preview upload")

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
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment vorschaubild service nicht verfügbar"}})
		return
	}

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
// zugewiesenes media_asset_id liefert IMMER 404 (Acceptance "Fremde -> 404/403").
func (h *AdminContentHandler) AttachSegmentPreviewImage(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment vorschaubild service nicht verfügbar"}})
		return
	}

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
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "segment vorschaubild service nicht verfügbar"}})
		return
	}

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
