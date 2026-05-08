package handlers

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	rvmMaxFileSizeBytes  = 15 * 1024 * 1024 // 15 MB
	rvmMaxFilesPerUpload = 20
	rvmMaxImageWidth     = 8000
	rvmMaxImageHeight    = 8000
	rvmMaxGIFFrames      = 300
	rvmThumbnailWidth    = 400
)

var rvmAllowedMIMETypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

var rvmValidCategories = map[string]bool{
	"screenshot":          true,
	"typesetting_karaoke": true,
	"fun_outtake":         true,
	"other":               true,
}

var rvmPreviewAllowedCategories = map[string]bool{
	"screenshot":          true,
	"typesetting_karaoke": true,
}

type rvmFileResult struct {
	ClientFileName        string `json:"client_file_name"`
	Status                string `json:"status"` // "ready" or "failed"
	MediaAssetID          *int64 `json:"media_asset_id,omitempty"`
	ReleaseVersionMediaID *int64 `json:"release_version_media_id,omitempty"`
	ThumbnailURL          string `json:"thumbnail_url,omitempty"`
	ErrorCode             string `json:"error_code,omitempty"`
	Message               string `json:"message,omitempty"`
}

// imageExtFromMimeRVM returns the file extension for a MIME type used in release-version media uploads.
func imageExtFromMimeRVM(mimeType string) string {
	switch mimeType {
	case "image/gif":
		return "gif"
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	default:
		return "jpg"
	}
}

// generateRVMThumbnail creates a static JPEG thumbnail from image data.
// For animated GIFs, only frame 0 is decoded (NumPages.Set(1) prevents loading all frames).
// Returns JPEG bytes. Caller must handle cleanup on error.
func generateRVMThumbnail(data []byte, mimeType string) ([]byte, error) {
	if mimeType == "image/gif" {
		params := vips.NewImportParams()
		params.NumPages.Set(1) // Load only frame 0 — avoids stacking all frames
		img, err := vips.LoadImageFromBuffer(data, params)
		if err != nil {
			return nil, fmt.Errorf("gif frame 0 laden: %w", err)
		}
		defer img.Close() // MUST Close() — govips wraps C memory, not managed by Go GC
		if err := img.Thumbnail(rvmThumbnailWidth, 0, vips.InterestingNone); err != nil {
			return nil, fmt.Errorf("gif thumbnail resize: %w", err)
		}
		out, _, err := img.ExportJpeg(&vips.JpegExportParams{Quality: 85, StripMetadata: true})
		if err != nil {
			return nil, fmt.Errorf("gif thumbnail export: %w", err)
		}
		return out, nil
	}
	// Non-GIF: use NewThumbnailFromBuffer (shrink-on-load, more efficient for large inputs)
	thumb, err := vips.NewThumbnailFromBuffer(data, rvmThumbnailWidth, 0, vips.InterestingNone)
	if err != nil {
		return nil, fmt.Errorf("thumbnail erzeugen: %w", err)
	}
	defer thumb.Close()
	out, _, err := thumb.ExportJpeg(&vips.JpegExportParams{Quality: 85, StripMetadata: true})
	if err != nil {
		return nil, fmt.Errorf("thumbnail exportieren: %w", err)
	}
	return out, nil
}

// UploadReleaseVersionMedia handles POST /api/v1/admin/release-versions/:versionId/media.
// Accepts multipart/form-data with: category (string), files[] (one or more files).
// Each file is processed independently — a failure on one file does not affect others.
// Response: {"results": [...]} with one entry per input file.
func (h *AdminContentHandler) UploadReleaseVersionMedia(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfuegbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige version id"}})
		return
	}

	// Verify release_version exists using ReleaseVersionExistsForRVM (not adminContentRepo)
	exists, err := h.mediaRepo.ReleaseVersionExistsForRVM(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version konnte nicht geprueft werden.")
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{
			"message":    "release version nicht gefunden",
			"error_code": "RELEASE_VERSION_NOT_FOUND",
		}})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "multipart form fehlt"}})
		return
	}

	category := strings.TrimSpace(c.PostForm("category"))
	if !rvmValidCategories[category] {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    "ungueltige kategorie",
			"error_code": "INVALID_CATEGORY",
		}})
		return
	}

	files := form.File["files[]"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "keine dateien hochgeladen"}})
		return
	}
	if len(files) > rvmMaxFilesPerUpload {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    fmt.Sprintf("zu viele dateien: max %d", rvmMaxFilesPerUpload),
			"error_code": "TOO_MANY_FILES",
		}})
		return
	}

	// Read MAX sort_order once before the file loop (Pattern 10 from RESEARCH.md)
	maxSortOrder, err := h.mediaRepo.GetMaxRVMSortOrder(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Sort-Order konnte nicht ermittelt werden.")
		return
	}

	uploadedByUserID := identity.UserID
	results := make([]rvmFileResult, 0, len(files))

	for i, fileHeader := range files {
		sortOrder := maxSortOrder + (i+1)*10
		result := h.processOneRVMFile(
			c,
			fileHeader,
			versionID,
			category,
			sortOrder,
			uploadedByUserID,
		)
		results = append(results, result)
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// processOneRVMFile handles one file from the multipart upload in isolation.
// All errors result in a failed result entry — no error is returned to the caller.
// Transaction is started via h.mediaRepo.BeginTx (follows MediaUploadRepoTx pattern).
func (h *AdminContentHandler) processOneRVMFile(
	c *gin.Context,
	fileHeader *multipart.FileHeader,
	versionID int64,
	category string,
	sortOrder int,
	uploadedByUserID int64,
) rvmFileResult {
	clientName := fileHeader.Filename

	f, err := fileHeader.Open()
	if err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "datei konnte nicht geoeffnet werden"}
	}
	defer f.Close()

	// Read with size limit (LimitReader reads max+1 bytes so we can detect oversized files)
	data, err := io.ReadAll(io.LimitReader(f, int64(rvmMaxFileSizeBytes)+1))
	if err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "datei konnte nicht gelesen werden"}
	}
	if len(data) > rvmMaxFileSizeBytes {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "FILE_TOO_LARGE",
			Message: fmt.Sprintf("datei zu gross: max %d MB", rvmMaxFileSizeBytes/1024/1024)}
	}

	// MIME type detection from magic bytes (not file extension)
	detected := mimetype.Detect(data)
	mimeType := detected.String()
	// Strip parameters: "image/jpeg; charset=..." -> "image/jpeg"
	if idx := strings.Index(mimeType, ";"); idx >= 0 {
		mimeType = strings.TrimSpace(mimeType[:idx])
	}

	if !rvmAllowedMIMETypes[mimeType] {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "INVALID_MIME_TYPE",
			Message: fmt.Sprintf("nicht erlaubter dateityp: %s", mimeType)}
	}

	// Image validation (dimensions + GIF frame count)
	{
		img, err := vips.NewImageFromBuffer(data)
		if err != nil {
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "IMAGE_DECODE_FAILED", Message: "bild konnte nicht dekodiert werden"}
		}
		w, h2, pages := img.Width(), img.Height(), img.Pages()
		img.Close()
		if w > rvmMaxImageWidth || h2 > rvmMaxImageHeight {
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "IMAGE_DIMENSIONS_TOO_LARGE",
				Message: fmt.Sprintf("bild zu gross: max %dx%d px", rvmMaxImageWidth, rvmMaxImageHeight)}
		}
		if mimeType == "image/gif" && pages > rvmMaxGIFFrames {
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "GIF_TOO_MANY_FRAMES",
				Message: fmt.Sprintf("gif hat zu viele frames: %d (max %d)", pages, rvmMaxGIFFrames)}
		}
	}

	// Generate thumbnail via govips
	thumbData, err := generateRVMThumbnail(data, mimeType)
	if err != nil {
		log.Printf("rvm thumbnail error for %s: %v", clientName, err)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "THUMBNAIL_FAILED", Message: "thumbnail konnte nicht erzeugt werden"}
	}

	// Build file paths
	assetUUID := uuid.New().String()
	ext := imageExtFromMimeRVM(mimeType)
	versionIDStr := strconv.FormatInt(versionID, 10)
	assetDir := filepath.Join(h.mediaStorageDir, "release-version", versionIDStr, assetUUID)
	originalPath := filepath.Join(assetDir, "original."+ext)
	thumbPath := filepath.Join(assetDir, "thumb.jpg")

	if err := os.MkdirAll(assetDir, 0755); err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "verzeichnis konnte nicht erstellt werden"}
	}

	// Write original (byte-copy — GIF stays animated, no re-encode)
	if err := os.WriteFile(originalPath, data, 0644); err != nil {
		_ = removeFileQuietly(originalPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "original konnte nicht gespeichert werden"}
	}

	// Write thumbnail
	if err := os.WriteFile(thumbPath, thumbData, 0644); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "thumbnail konnte nicht gespeichert werden"}
	}

	// DB transaction per file (D-17: isolated processing).
	// BeginTx follows the MediaUploadRepoTx encapsulation pattern from media_upload.go.
	ctx := c.Request.Context()
	tx, err := h.mediaRepo.BeginTx(ctx)
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "transaktion konnte nicht gestartet werden"}
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Insert media_asset with status='processing' INSIDE the tx (D-05).
	// This is critical: if any later insert fails, tx.Rollback removes the asset row too,
	// so no orphaned media_assets row remains committed.
	createInput := models.MediaAssetCreateInput{
		Kind:        models.MediaKindImage,
		MimeType:    mimeType,
		Filename:    "original." + ext,
		StoragePath: originalPath,
		SizeBytes:   int64(len(data)),
	}
	mediaAsset, err := h.mediaRepo.CreateMediaAssetWithStatusTx(ctx, tx, createInput, "processing")
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media asset konnte nicht erstellt werden"}
	}

	// Insert media_files rows (original + thumb), both with status='processing'
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "original", originalPath, int64(len(data)), "processing"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file (original) konnte nicht erstellt werden"}
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "thumb", thumbPath, int64(len(thumbData)), "processing"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file (thumb) konnte nicht erstellt werden"}
	}

	// Insert release_version_media row
	uploadedBy := uploadedByUserID
	relationID, err := h.mediaRepo.CreateReleaseVersionMediaAsset(ctx, tx, repository.ReleaseVersionMediaCreateInput{
		ReleaseVersionID:   versionID,
		MediaAssetID:       mediaAsset.ID,
		Category:           category,
		Caption:            nil,
		SortOrder:          sortOrder,
		IsPreviewCandidate: false, // Upload never sets preview — use PATCH for that
		UploadedByUserID:   &uploadedBy,
	})
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "release version media konnte nicht erstellt werden"}
	}

	// Promote statuses to ready BEFORE commit so the API never reports "ready"
	// unless both status transitions commit in the same transaction.
	if err := h.mediaRepo.UpdateMediaAssetStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media asset status konnte nicht auf ready gesetzt werden"}
	}
	if err := h.mediaRepo.UpdateMediaFileStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file status konnte nicht auf ready gesetzt werden"}
	}

	if err := tx.Commit(ctx); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "transaktion konnte nicht committed werden"}
	}

	// Build thumbnail public URL
	thumbRelPath := strings.Join([]string{"release-version", versionIDStr, assetUUID, "thumb.jpg"}, "/")
	thumbURL := "/media/" + thumbRelPath

	return rvmFileResult{
		ClientFileName:        clientName,
		Status:                "ready",
		MediaAssetID:          &mediaAsset.ID,
		ReleaseVersionMediaID: &relationID,
		ThumbnailURL:          thumbURL,
	}
}
