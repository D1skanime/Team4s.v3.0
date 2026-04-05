package handlers

import (
	"context"
	"errors"
	"fmt"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxImageSize      = 50 * 1024 * 1024  // 50 MB
	maxVideoSize      = 300 * 1024 * 1024 // 300 MB
	thumbWidth        = 300
	videoThumbWidth   = 480
	webpQuality       = 85
	videoThumbTimeSec = 5.0
)

var (
	allowedImageMimeTypes = map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}

	allowedVideoMimeTypes = map[string]bool{
		"video/mp4":  true,
		"video/webm": true,
	}

	uploadAssetTypeAliases = map[string]string{
		"poster":           "cover",
		"cover":            "cover",
		"banner":           "banner",
		"logo":             "logo",
		"gallery":          "background",
		"background":       "background",
		"video":            "background_video",
		"background_video": "background_video",
	}
)

type mediaUploadLifecycle interface {
	EnsureCanonicalLayout(ctx context.Context, actorUserID int64, entityType string, entityID int64, assetType string) (*models.ProvisioningResult, error)
}

type MediaUploadHandler struct {
	repo            repository.MediaUploadRepoTx
	lifecycle       mediaUploadLifecycle
	mediaStorageDir string
	mediaBaseURL    string
	ffmpegPath      string
}

func NewMediaUploadHandler(repo repository.MediaUploadRepoTx, storageDir, baseURL, ffmpegPath string) *MediaUploadHandler {
	return &MediaUploadHandler{
		repo:            repo,
		mediaStorageDir: storageDir,
		mediaBaseURL:    baseURL,
		ffmpegPath:      ffmpegPath,
	}
}

func (h *MediaUploadHandler) WithLifecycleService(lifecycle mediaUploadLifecycle) *MediaUploadHandler {
	h.lifecycle = lifecycle
	return h
}

// Upload handles POST /api/admin/upload
func (h *MediaUploadHandler) Upload(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		h.writeUploadError(c, http.StatusUnauthorized, "anmeldung erforderlich", "", "")
		return
	}

	var req models.UploadRequest
	if err := c.ShouldBind(&req); err != nil {
		log.Printf("media_upload: bad request: %v", err)
		h.writeUploadError(c, http.StatusBadRequest, "ungueltige anfrage", "media_upload.invalid_request", "")
		return
	}

	req.EntityType = normalizeUploadEntityType(req.EntityType)
	if req.EntityType != "anime" {
		h.writeUploadError(c, http.StatusBadRequest, "ungueltiger entity_type", services.AssetLifecycleCodeInvalidEntityType, "nur anime uploads sind hier erlaubt")
		return
	}

	normalizedAssetType, err := normalizeUploadAssetType(req.AssetType)
	if err != nil {
		h.writeUploadError(c, http.StatusBadRequest, err.Error(), services.AssetLifecycleCodeInvalidAssetType, "")
		return
	}
	req.AssetType = normalizedAssetType

	provisioning, err := h.ensureProvisioning(c.Request.Context(), identity.UserID, req)
	if err != nil {
		h.mapUploadError(c, err)
		return
	}

	// Get file from form
	fileHeader, err := c.FormFile("file")
	if err != nil {
		log.Printf("media_upload: no file uploaded: %v", err)
		h.writeUploadError(c, http.StatusBadRequest, "keine datei hochgeladen", "media_upload.missing_file", "")
		return
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("media_upload: failed to open file: %v", err)
		h.writeUploadError(c, http.StatusInternalServerError, "datei konnte nicht geoeffnet werden", "media_upload.open_failed", "")
		return
	}
	defer file.Close()

	// Validate file
	mimeType, format, err := h.validateFile(file, fileHeader.Size)
	if err != nil {
		log.Printf("media_upload: validation failed: %v", err)
		h.writeUploadError(c, http.StatusBadRequest, err.Error(), "media_upload.validation_failed", "")
		return
	}

	// Reset file pointer after validation
	file.Seek(0, 0)

	// Generate UUID
	mediaID := uuid.New().String()

	// Create storage directory with path traversal protection
	storagePath, err := h.resolveUploadStoragePath(provisioning.RootPath, req.AssetType, mediaID)
	if err != nil {
		log.Printf("media_upload: path resolution failed: %v", err)
		h.mapUploadError(c, err)
		return
	}

	if err := os.MkdirAll(storagePath, 0755); err != nil {
		log.Printf("media_upload: failed to create directory: %v", err)
		h.writeUploadError(c, http.StatusInternalServerError, fmt.Sprintf("upload-verzeichnis konnte nicht erstellt werden: %v", err), "media_upload.storage_prepare_failed", "")
		return
	}

	// Process file based on format
	var uploadResp *models.UploadResponse
	if format == "image" {
		uploadResp, err = h.processImage(c.Request.Context(), file, mimeType, mediaID, req, storagePath, identity.UserID, provisioning)
	} else if format == "video" {
		uploadResp, err = h.processVideo(c.Request.Context(), file, mimeType, mediaID, req, storagePath, identity.UserID, provisioning)
	} else {
		h.writeUploadError(c, http.StatusBadRequest, "nicht unterstuetztes format", "media_upload.invalid_format", "")
		return
	}

	if err != nil {
		log.Printf("media_upload: processing failed: %v", err)
		h.mapUploadError(c, err)
		return
	}

	c.JSON(http.StatusOK, uploadResp)
}

func (h *MediaUploadHandler) ensureProvisioning(
	ctx context.Context,
	actorUserID int64,
	req models.UploadRequest,
) (*models.ProvisioningResult, error) {
	if h.lifecycle == nil {
		return &models.ProvisioningResult{
			EntityType:         req.EntityType,
			EntityID:           req.EntityID,
			RequestedAssetType: req.AssetType,
			RootPath:           filepath.Join(h.mediaStorageDir, req.EntityType, fmt.Sprintf("%d", req.EntityID)),
		}, nil
	}

	return h.lifecycle.EnsureCanonicalLayout(ctx, actorUserID, req.EntityType, req.EntityID, req.AssetType)
}

func (h *MediaUploadHandler) resolveUploadStoragePath(rootPath string, assetType string, mediaID string) (string, error) {
	target := filepath.Join(rootPath, assetType, mediaID)
	ok, err := isUploadPathWithinBase(rootPath, target)
	if err != nil {
		return "", &services.AssetLifecycleError{
			Code:    services.AssetLifecycleCodeUnsafePath,
			Message: "ungueltige pfadangabe",
			Err:     err,
		}
	}
	if !ok {
		return "", &services.AssetLifecycleError{
			Code:    services.AssetLifecycleCodeUnsafePath,
			Message: "ungueltige pfadangabe",
		}
	}
	return filepath.Clean(target), nil
}

func isUploadPathWithinBase(base string, target string) (bool, error) {
	rel, err := filepath.Rel(filepath.Clean(base), filepath.Clean(target))
	if err != nil {
		return false, err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return false, nil
	}
	return true, nil
}

func normalizeUploadEntityType(entityType string) string {
	return strings.TrimSpace(strings.ToLower(entityType))
}

func normalizeUploadAssetType(assetType string) (string, error) {
	normalized := strings.TrimSpace(strings.ToLower(assetType))
	mapped, ok := uploadAssetTypeAliases[normalized]
	if !ok {
		return "", fmt.Errorf("ungueltiger asset_type")
	}
	return mapped, nil
}

func mediaTypeForUploadAsset(assetType string) string {
	switch strings.TrimSpace(strings.ToLower(assetType)) {
	case "cover":
		return "poster"
	case "background_video":
		return "video"
	default:
		return strings.TrimSpace(strings.ToLower(assetType))
	}
}

func (h *MediaUploadHandler) mapUploadError(c *gin.Context, err error) {
	var lifecycleErr *services.AssetLifecycleError
	if errors.As(err, &lifecycleErr) {
		details := ""
		if folder, ok := lifecycleErr.Details["folder"].(string); ok && strings.TrimSpace(folder) != "" {
			details = folder
		}
		h.writeUploadError(c, http.StatusBadRequest, lifecycleErr.Message, lifecycleErr.Code, details)
		return
	}

	h.writeUploadError(c, http.StatusInternalServerError, err.Error(), "media_upload.processing_failed", "")
}

func (h *MediaUploadHandler) writeUploadError(c *gin.Context, status int, message, code, details string) {
	errorPayload := gin.H{
		"message": message,
	}
	if strings.TrimSpace(code) != "" {
		errorPayload["code"] = code
	}
	if strings.TrimSpace(details) != "" {
		errorPayload["details"] = details
	}
	c.JSON(status, gin.H{"error": errorPayload})
}

// validateFile validates file type and size using magic bytes
func (h *MediaUploadHandler) validateFile(file multipart.File, size int64) (string, string, error) {
	// Read first 512 bytes for MIME detection
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", "", fmt.Errorf("datei konnte nicht gelesen werden")
	}

	// Detect MIME type using magic bytes
	mime := mimetype.Detect(buffer[:n])
	mimeType := mime.String()

	// Check if it's an allowed image type
	if allowedImageMimeTypes[mimeType] {
		if size > maxImageSize {
			return "", "", fmt.Errorf("bild zu gross (max %d MB)", maxImageSize/(1024*1024))
		}
		return mimeType, "image", nil
	}

	// Check if it's an allowed video type
	if allowedVideoMimeTypes[mimeType] {
		if size > maxVideoSize {
			return "", "", fmt.Errorf("video zu gross (max %d MB)", maxVideoSize/(1024*1024))
		}
		return mimeType, "video", nil
	}

	return "", "", fmt.Errorf("ungueltiger dateityp: %s", mimeType)
}

// Delete handles DELETE /api/admin/media/{id}
func (h *MediaUploadHandler) Delete(c *gin.Context) {
	if _, ok := middleware.CommentAuthIdentityFromContext(c); !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}

	mediaID := c.Param("id")
	if mediaID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "media id fehlt"})
		return
	}

	// Get media asset to find storage path
	asset, err := h.repo.GetMediaAsset(c.Request.Context(), mediaID)
	if err != nil {
		log.Printf("media_upload: get asset failed: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "media nicht gefunden"})
		return
	}

	// Delete from database
	if err := h.repo.DeleteMediaAsset(c.Request.Context(), mediaID); err != nil {
		log.Printf("media_upload: delete from db failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "loeschen fehlgeschlagen"})
		return
	}

	// Delete storage directory with path traversal protection
	storagePath := filepath.Join(
		h.mediaStorageDir,
		asset.EntityType,
		fmt.Sprintf("%d", asset.EntityID),
		asset.AssetType,
		mediaID,
	)

	// Clean path and verify it's within the base directory
	storagePath = filepath.Clean(storagePath)
	baseDir := filepath.Clean(h.mediaStorageDir)
	if !strings.HasPrefix(storagePath, baseDir) {
		log.Printf("media_upload: path traversal attempt detected during delete: %s", storagePath)
		// Don't fail the request since DB deletion succeeded
	} else {
		if err := os.RemoveAll(storagePath); err != nil {
			log.Printf("media_upload: delete directory failed: %v", err)
			// Don't fail the request if directory deletion fails
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
