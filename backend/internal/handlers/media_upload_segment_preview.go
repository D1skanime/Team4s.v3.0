package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Phase 172: Kara-Vorschaubilder laufen durch den globalen Anime-Upload
// (POST /admin/upload, asset_type=segment_preview). Es gibt keinen eigenen
// Upload-Endpunkt; diese Datei ergaenzt nur den Rechte-Zweig und den
// serverseitigen Ablagepfad fuer automatisch erzeugte Vorschaubilder.

// SegmentPreviewUploadAuthorizer prueft fuer asset_type=segment_preview statt des
// Plattform-Admin-Guards die Segment-Verwaltungsberechtigung. Bei Ablehnung schreibt
// der Authorizer die Response selbst.
type SegmentPreviewUploadAuthorizer func(c *gin.Context, animeID, segmentID, releaseVariantID int64) (middleware.AuthIdentity, bool)

// WithSegmentPreviewAuthorizer verdrahtet die Segment-Berechtigung fuer segment_preview-Uploads.
func (h *MediaUploadHandler) WithSegmentPreviewAuthorizer(authorizer SegmentPreviewUploadAuthorizer) *MediaUploadHandler {
	h.segmentPreviewAuthorizer = authorizer
	return h
}

// authorizeUpload nutzt fuer alle Asset-Typen den Plattform-Admin-Guard. Nur
// segment_preview darf jeder hochladen, der das angegebene Segment bearbeiten darf.
func (h *MediaUploadHandler) authorizeUpload(c *gin.Context) (middleware.AuthIdentity, bool) {
	assetType, err := normalizeUploadAssetType(c.PostForm("asset_type"))
	if err != nil || assetType != "segment_preview" {
		return h.requireAdmin(c)
	}
	if h.segmentPreviewAuthorizer == nil {
		h.writeUploadError(c, http.StatusInternalServerError, "segment-vorschaubild-upload ist nicht konfiguriert", "media_upload.not_configured", "")
		return middleware.AuthIdentity{}, false
	}

	animeID, animeErr := strconv.ParseInt(strings.TrimSpace(c.PostForm("entity_id")), 10, 64)
	segmentID, segmentErr := strconv.ParseInt(strings.TrimSpace(c.PostForm("segment_id")), 10, 64)
	if animeErr != nil || animeID <= 0 || segmentErr != nil || segmentID <= 0 {
		h.writeUploadError(c, http.StatusBadRequest, "entity_id und segment_id sind für segment_preview erforderlich", "media_upload.invalid_request", "")
		return middleware.AuthIdentity{}, false
	}

	var releaseVariantID int64
	if raw := strings.TrimSpace(c.PostForm("release_variant_id")); raw != "" {
		parsed, parseErr := strconv.ParseInt(raw, 10, 64)
		if parseErr != nil || parsed < 0 {
			h.writeUploadError(c, http.StatusBadRequest, "ungültige release_variant_id", "media_upload.invalid_request", "")
			return middleware.AuthIdentity{}, false
		}
		releaseVariantID = parsed
	}

	return h.segmentPreviewAuthorizer(c, animeID, segmentID, releaseVariantID)
}

// StoreGeneratedAnimeImage legt ein serverseitig erzeugtes Bild (automatisches
// Kara-Vorschaubild aus Render oder Video-Upload) ueber denselben kanonischen Pfad
// wie POST /admin/upload ab: media/anime/<id>/<asset_type>/<uuid>/original+thumb,
// media_assets, media_files und anime_media. Liefert die media_assets-ID.
func (h *MediaUploadHandler) StoreGeneratedAnimeImage(ctx context.Context, sourcePath string, animeID int64, assetType string) (int64, error) {
	normalized, err := normalizeUploadAssetType(assetType)
	if err != nil {
		return 0, err
	}

	file, err := os.Open(sourcePath)
	if err != nil {
		return 0, fmt.Errorf("erzeugtes bild öffnen: %w", err)
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return 0, fmt.Errorf("erzeugtes bild prüfen: %w", err)
	}
	mimeType, format, err := h.validateFile(file, info.Size(), normalized)
	if err != nil {
		return 0, err
	}
	if format != "image" {
		return 0, fmt.Errorf("erzeugte datei ist kein bild: %s", mimeType)
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return 0, fmt.Errorf("erzeugtes bild zurücksetzen: %w", err)
	}

	req := models.UploadRequest{EntityType: "anime", EntityID: animeID, AssetType: normalized}
	// Serverseitig erzeugte Bilder haben keinen Benutzer, der Lifecycle-Audit verlangt aber einen
	// Akteur. Daher ohne Provisionierungs-Audit direkt in das kanonische Anime-Verzeichnis --
	// identisch zum ensureProvisioning-Pfad ohne Lifecycle-Service.
	provisioning := &models.ProvisioningResult{
		EntityType:         req.EntityType,
		EntityID:           req.EntityID,
		RequestedAssetType: normalized,
		RootPath:           filepath.Join(h.mediaStorageDir, req.EntityType, strconv.FormatInt(animeID, 10)),
	}

	mediaID := uuid.New().String()
	storagePath, err := h.resolveUploadStoragePath(provisioning.RootPath, normalized, mediaID)
	if err != nil {
		return 0, err
	}
	if err := os.MkdirAll(storagePath, 0o755); err != nil {
		return 0, fmt.Errorf("upload-verzeichnis erstellen: %w", err)
	}

	resp, err := h.processImage(ctx, file, mimeType, mediaID, req, storagePath, 0, provisioning)
	if err != nil {
		h.cleanupStoragePath(storagePath)
		return 0, err
	}
	assetID, err := strconv.ParseInt(resp.ID, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("media asset id %q ungültig: %w", resp.ID, err)
	}
	return assetID, nil
}
