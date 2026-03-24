package handlers

import (
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

	allowedEntityTypes = map[string]bool{
		"anime":   true,
		"episode": true,
		"fansub":  true,
		"release": true,
		"user":    true,
		"member":  true,
	}

	allowedAssetTypes = map[string]bool{
		"poster":  true,
		"banner":  true,
		"logo":    true,
		"avatar":  true,
		"gallery": true,
		"karaoke": true,
	}
)

type MediaUploadHandler struct {
	repo            repository.MediaUploadRepoTx
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

// Upload handles POST /api/admin/upload
func (h *MediaUploadHandler) Upload(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}

	var req models.UploadRequest
	if err := c.ShouldBind(&req); err != nil {
		log.Printf("media_upload: bad request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltige anfrage"})
		return
	}

	// Validate entity_type and asset_type
	if !allowedEntityTypes[req.EntityType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltiger entity_type"})
		return
	}

	if !allowedAssetTypes[req.AssetType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltiger asset_type"})
		return
	}

	// Get file from form
	fileHeader, err := c.FormFile("file")
	if err != nil {
		log.Printf("media_upload: no file uploaded: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "keine datei hochgeladen"})
		return
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("media_upload: failed to open file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "datei konnte nicht geoeffnet werden"})
		return
	}
	defer file.Close()

	// Validate file
	mimeType, format, err := h.validateFile(file, fileHeader.Size)
	if err != nil {
		log.Printf("media_upload: validation failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Reset file pointer after validation
	file.Seek(0, 0)

	// Generate UUID
	mediaID := uuid.New().String()

	// Create storage directory with path traversal protection
	storagePath := filepath.Join(
		h.mediaStorageDir,
		req.EntityType,
		fmt.Sprintf("%d", req.EntityID),
		req.AssetType,
		mediaID,
	)

	// Clean path and verify it's within the base directory
	storagePath = filepath.Clean(storagePath)
	baseDir := filepath.Clean(h.mediaStorageDir)
	if !strings.HasPrefix(storagePath, baseDir) {
		log.Printf("media_upload: path traversal attempt detected: %s", storagePath)
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltige pfadangabe"})
		return
	}

	if err := os.MkdirAll(storagePath, 0755); err != nil {
		log.Printf("media_upload: failed to create directory: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verzeichnis konnte nicht erstellt werden"})
		return
	}

	// Process file based on format
	var uploadResp *models.UploadResponse
	if format == "image" {
		uploadResp, err = h.processImage(c.Request.Context(), file, mimeType, mediaID, req, storagePath, identity.UserID)
	} else if format == "video" {
		uploadResp, err = h.processVideo(c.Request.Context(), file, mimeType, mediaID, req, storagePath, identity.UserID)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nicht unterstuetztes format"})
		return
	}

	if err != nil {
		log.Printf("media_upload: processing failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verarbeitung fehlgeschlagen"})
		return
	}

	c.JSON(http.StatusOK, uploadResp)
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
