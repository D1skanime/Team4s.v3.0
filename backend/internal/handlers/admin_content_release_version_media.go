package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "golang.org/x/image/webp"
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

type rvmImageMetadata struct {
	Width     int
	Height    int
	GIFFrames int
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

func inspectRVMImage(data []byte, mimeType string) (*rvmImageMetadata, error) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decode config: %w", err)
	}

	meta := &rvmImageMetadata{
		Width:     cfg.Width,
		Height:    cfg.Height,
		GIFFrames: 1,
	}
	if mimeType == "image/gif" {
		decoded, err := gif.DecodeAll(bytes.NewReader(data))
		if err != nil {
			return nil, fmt.Errorf("decode gif: %w", err)
		}
		meta.GIFFrames = len(decoded.Image)
	}

	return meta, nil
}

// generateRVMThumbnail creates a static JPEG thumbnail from image data.
// Animated GIFs keep their original animation in storage; the thumbnail uses frame 0.
func generateRVMThumbnail(data []byte, mimeType string) ([]byte, int, int, error) {
	var src image.Image

	if mimeType == "image/gif" {
		decoded, err := gif.DecodeAll(bytes.NewReader(data))
		if err != nil {
			return nil, 0, 0, fmt.Errorf("gif frame 0 laden: %w", err)
		}
		if len(decoded.Image) == 0 {
			return nil, 0, 0, fmt.Errorf("gif enthält keine frames")
		}
		src = decoded.Image[0]
	} else {
		decoded, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, 0, 0, fmt.Errorf("bild dekodieren: %w", err)
		}
		src = decoded
	}

	thumb := imaging.Resize(src, rvmThumbnailWidth, 0, imaging.Lanczos)
	buf := new(bytes.Buffer)
	if err := jpeg.Encode(buf, thumb, &jpeg.Options{Quality: 85}); err != nil {
		return nil, 0, 0, fmt.Errorf("thumbnail exportieren: %w", err)
	}

	bounds := thumb.Bounds()
	return buf.Bytes(), bounds.Dx(), bounds.Dy(), nil
}

func parseOptionalCaptionField(rawBody map[string]interface{}) (*string, bool, error) {
	v, ok := rawBody["caption"]
	if !ok {
		return nil, false, nil
	}
	if v == nil {
		return nil, true, nil
	}
	s, ok := v.(string)
	if !ok {
		return nil, false, fmt.Errorf("caption muss string oder null sein")
	}
	return &s, true, nil
}

// UploadReleaseVersionMedia handles POST /api/v1/admin/release-versions/:versionId/media.
// Accepts multipart/form-data with: category (string), files[] (one or more files).
// Each file is processed independently - a failure on one file does not affect others.
// Response: {"results": [...]} with one entry per input file.
func (h *AdminContentHandler) UploadReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.upload.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMediaUpload, result)
		writePermissionDenied(c, result)
		return
	}

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
			"message":    "ungültige kategorie",
			"error_code": "INVALID_CATEGORY",
		}})
		return
	}

	files := form.File["files[]"]
	if len(files) == 0 {
		files = form.File["files"]
	}
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

	maxSortOrder, err := h.mediaRepo.GetMaxRVMSortOrder(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Sort-Order konnte nicht ermittelt werden.")
		return
	}

	uploadedByUserID := identity.UserID
	results := make([]rvmFileResult, 0, len(files))

	for i, fileHeader := range files {
		sortOrder := maxSortOrder + (i+1)*10
		result := h.processOneRVMFile(c, fileHeader, versionID, category, sortOrder, uploadedByUserID)
		results = append(results, result)
		if result.Status == "ready" && result.ReleaseVersionMediaID != nil {
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID:    &identity.AppUserID,
				ActorLegacyUserID: &identity.UserID,
				EventType:         "release_version_media.uploaded",
				TargetType:        "release_version_media",
				TargetID:          result.ReleaseVersionMediaID,
				Action:            string(permissions.ActionReleaseVersionMediaUpload),
				Outcome:           "allowed",
				Payload:           map[string]any{"version_id": versionID, "category": category, "client_file_name": result.ClientFileName},
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// processOneRVMFile handles one file from the multipart upload in isolation.
// All errors result in a failed result entry - no error is returned to the caller.
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
			ErrorCode: "STORAGE_FAILED", Message: "datei konnte nicht geöffnet werden"}
	}
	defer f.Close()

	data, err := io.ReadAll(io.LimitReader(f, int64(rvmMaxFileSizeBytes)+1))
	if err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "datei konnte nicht gelesen werden"}
	}
	if len(data) > rvmMaxFileSizeBytes {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "FILE_TOO_LARGE",
			Message:   fmt.Sprintf("datei zu gross: max %d MB", rvmMaxFileSizeBytes/1024/1024)}
	}

	detected := mimetype.Detect(data)
	mimeType := detected.String()
	if idx := strings.Index(mimeType, ";"); idx >= 0 {
		mimeType = strings.TrimSpace(mimeType[:idx])
	}

	if !rvmAllowedMIMETypes[mimeType] {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "INVALID_MIME_TYPE",
			Message:   fmt.Sprintf("nicht erlaubter dateityp: %s", mimeType)}
	}

	meta, err := inspectRVMImage(data, mimeType)
	if err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "IMAGE_DECODE_FAILED", Message: "bild konnte nicht dekodiert werden"}
	}
	if meta.Width > rvmMaxImageWidth || meta.Height > rvmMaxImageHeight {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "IMAGE_DIMENSIONS_TOO_LARGE",
			Message:   fmt.Sprintf("bild zu gross: max %dx%d px", rvmMaxImageWidth, rvmMaxImageHeight)}
	}
	// Dekompression-Bomb-Schutz: Pixelzahl-Limit 40 MP.
	// meta ist bereits bekannt (aus inspectRVMImage), kein zweites Decode noetig.
	if meta.Width*meta.Height > 40_000_000 {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "IMAGE_TOO_MANY_PIXELS",
			Message:   "bild enthält zu viele pixel (max 40 MP)"}
	}
	if mimeType == "image/gif" && meta.GIFFrames > rvmMaxGIFFrames {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "GIF_TOO_MANY_FRAMES",
			Message:   fmt.Sprintf("gif hat zu viele frames: %d (max %d)", meta.GIFFrames, rvmMaxGIFFrames)}
	}

	thumbData, thumbWidth, thumbHeight, err := generateRVMThumbnail(data, mimeType)
	if err != nil {
		log.Printf("rvm thumbnail error for %s: %v", clientName, err)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "THUMBNAIL_FAILED", Message: "thumbnail konnte nicht erzeugt werden"}
	}

	assetUUID := uuid.New().String()
	ext := imageExtFromMimeRVM(mimeType)
	versionIDStr := strconv.FormatInt(versionID, 10)
	assetDir := filepath.Join(h.mediaStorageDir, "release-version", versionIDStr, assetUUID)
	originalPath := filepath.Join(assetDir, "original."+ext)
	thumbPath := filepath.Join(assetDir, "thumb.jpg")

	if err := os.MkdirAll(assetDir, 0o755); err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "verzeichnis konnte nicht erstellt werden"}
	}

	// EXIF-Strip für JPEG, PNG und WebP: imaging.Save re-enkodiert das Bild
	// ohne Metadaten. GIF bleibt raw, weil imaging die Animation nicht erhalten kann.
	if mimeType == "image/gif" {
		if err := os.WriteFile(originalPath, data, 0o644); err != nil {
			_ = removeFileQuietly(originalPath)
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "STORAGE_FAILED", Message: "original (gif) konnte nicht gespeichert werden"}
		}
	} else {
		decoded, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			_ = removeFileQuietly(originalPath)
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "IMAGE_DECODE_FAILED", Message: "original dekodieren fehlgeschlagen"}
		}
		if err := imaging.Save(decoded, originalPath); err != nil {
			_ = removeFileQuietly(originalPath)
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "STORAGE_FAILED", Message: "original (exif-strip) konnte nicht gespeichert werden"}
		}
	}

	if err := os.WriteFile(thumbPath, thumbData, 0o644); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "thumbnail konnte nicht gespeichert werden"}
	}

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

	createInput := models.MediaAssetCreateInput{
		Kind:        models.MediaKindImage,
		MimeType:    mimeType,
		Filename:    "original." + ext,
		StoragePath: originalPath,
		SizeBytes:   int64(len(data)),
		Width:       &meta.Width,
		Height:      &meta.Height,
	}
	mediaAsset, err := h.mediaRepo.CreateMediaAssetWithStatusTx(ctx, tx, createInput, "processing")
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media asset konnte nicht erstellt werden"}
	}

	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "original", originalPath, meta.Width, meta.Height, int64(len(data)), "processing"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file (original) konnte nicht erstellt werden"}
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "thumb", thumbPath, thumbWidth, thumbHeight, int64(len(thumbData)), "processing"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file (thumb) konnte nicht erstellt werden"}
	}

	uploadedBy := uploadedByUserID
	relationID, err := h.mediaRepo.CreateReleaseVersionMediaAsset(ctx, tx, repository.ReleaseVersionMediaCreateInput{
		ReleaseVersionID:   versionID,
		MediaAssetID:       mediaAsset.ID,
		Category:           category,
		Caption:            nil,
		SortOrder:          sortOrder,
		IsPreviewCandidate: false,
		UploadedByUserID:   &uploadedBy,
	})
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "release version media konnte nicht erstellt werden"}
	}

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

// buildRVMPublicURL converts a storage path to a /media/... public URL.
// Storage path example: /app/media/release-version/3/uuid/original.png
// Public URL example:   /media/release-version/3/uuid/original.png
func (h *AdminContentHandler) buildRVMPublicURL(storagePath string) string {
	rel := strings.TrimPrefix(storagePath, h.mediaStorageDir)
	rel = strings.TrimPrefix(rel, "/")
	rel = strings.TrimPrefix(rel, "\\")
	rel = strings.ReplaceAll(rel, "\\", "/")
	return "/media/" + rel
}

// ListReleaseVersionMedia handles GET /api/v1/admin/release-versions/:versionId/media.
// Returns all non-deleted media for a release version with populated URLs.
func (h *AdminContentHandler) ListReleaseVersionMedia(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	items, err := h.mediaRepo.ListReleaseVersionMedia(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Liste konnte nicht geladen werden.")
		return
	}
	if items == nil {
		items = make([]repository.ReleaseVersionMediaItem, 0)
	}

	for i := range items {
		if items[i].OriginalFilePath != "" {
			items[i].OriginalURL = h.buildRVMPublicURL(items[i].OriginalFilePath)
		}
		if items[i].ThumbFilePath != "" {
			items[i].ThumbnailURL = h.buildRVMPublicURL(items[i].ThumbFilePath)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *AdminContentHandler) loadReleaseVersionMediaResponseItem(ctx *gin.Context, versionID, relationID int64) (repository.ReleaseVersionMediaItem, error) {
	items, err := h.mediaRepo.ListReleaseVersionMedia(ctx.Request.Context(), versionID)
	if err != nil {
		return repository.ReleaseVersionMediaItem{}, err
	}

	for i := range items {
		if items[i].OriginalFilePath != "" {
			items[i].OriginalURL = h.buildRVMPublicURL(items[i].OriginalFilePath)
		}
		if items[i].ThumbFilePath != "" {
			items[i].ThumbnailURL = h.buildRVMPublicURL(items[i].ThumbFilePath)
		}
		if items[i].ID == relationID {
			return items[i], nil
		}
	}

	return repository.ReleaseVersionMediaItem{}, repository.ErrNotFound
}

// PatchReleaseVersionMedia handles PATCH /api/v1/admin/release-versions/:versionId/media/:relationId.
func (h *AdminContentHandler) PatchReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}
	relationID, err := strconv.ParseInt(c.Param("relationId"), 10, 64)
	if err != nil || relationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige relation id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersionMedia(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, relationID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.update.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaUpdate, result)
		writePermissionDenied(c, result)
		return
	}

	relationMeta, err := h.mediaRepo.GetReleaseVersionMediaRelation(c.Request.Context(), relationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht geladen werden.")
		return
	}
	if relationMeta.ReleaseVersionID != versionID {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation gehoert nicht zu dieser release version"}})
		return
	}

	var rawBody map[string]interface{}
	if err := c.ShouldBindJSON(&rawBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige json body"}})
		return
	}
	if _, hasCategory := rawBody["category"]; hasCategory {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    "kategorie kann nicht geaendert werden",
			"error_code": "CATEGORY_CHANGE_NOT_ALLOWED",
		}})
		return
	}

	caption, captionSet, err := parseOptionalCaptionField(rawBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	var isPreviewCandidate *bool
	if v, ok := rawBody["is_preview_candidate"]; ok {
		if b, ok := v.(bool); ok {
			isPreviewCandidate = &b
		}
	}

	if isPreviewCandidate != nil && *isPreviewCandidate {
		if !rvmPreviewAllowedCategories[relationMeta.Category] {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
				"message":    "vorschaubild nicht erlaubt für diese kategorie",
				"error_code": "PREVIEW_NOT_ALLOWED_FOR_CATEGORY",
			}})
			return
		}
	}

	patchInput := repository.ReleaseVersionMediaPatchInput{
		Caption:            caption,
		CaptionSet:         captionSet,
		IsPreviewCandidate: isPreviewCandidate,
	}

	if isPreviewCandidate != nil && *isPreviewCandidate {
		tx, err := h.mediaRepo.BeginTx(c.Request.Context())
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
			return
		}
		defer tx.Rollback(c.Request.Context()) //nolint:errcheck

		if err := h.mediaRepo.ClearPreviewCandidateForVersion(c.Request.Context(), tx, versionID, relationID); err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Preview-Flag konnte nicht zurückgesetzt werden.")
			return
		}
		if err := h.mediaRepo.PatchReleaseVersionMedia(c.Request.Context(), tx, relationID, patchInput); err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
				return
			}
			writeInternalErrorResponse(c, "interner serverfehler", err, "Patch fehlgeschlagen.")
			return
		}
		if err := tx.Commit(c.Request.Context()); err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
			return
		}
	} else {
		tx, err := h.mediaRepo.BeginTx(c.Request.Context())
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
			return
		}
		defer tx.Rollback(c.Request.Context()) //nolint:errcheck
		if err := h.mediaRepo.PatchReleaseVersionMedia(c.Request.Context(), tx, relationID, patchInput); err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
				return
			}
			writeInternalErrorResponse(c, "interner serverfehler", err, "Patch fehlgeschlagen.")
			return
		}
		if err := tx.Commit(c.Request.Context()); err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
			return
		}
	}

	item, err := h.loadReleaseVersionMediaResponseItem(c, versionID, relationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktualisierte Relation konnte nicht geladen werden.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "release_version_media.updated",
		TargetType:        "release_version_media",
		TargetID:          &relationID,
		Action:            string(permissions.ActionReleaseVersionMediaUpdate),
		Outcome:           "allowed",
		Payload:           map[string]any{"version_id": versionID},
	})

	c.JSON(http.StatusOK, item)
}

// DeleteReleaseVersionMedia handles DELETE /api/v1/admin/release-versions/:versionId/media/:relationId.
func (h *AdminContentHandler) DeleteReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}
	relationID, err := strconv.ParseInt(c.Param("relationId"), 10, 64)
	if err != nil || relationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige relation id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersionMediaDelete(c.Request.Context(), actor, relationID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.delete.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaDelete, result)
		writePermissionDenied(c, result)
		return
	}

	relationMeta, err := h.mediaRepo.GetReleaseVersionMediaRelation(c.Request.Context(), relationID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden oder bereits gelöscht"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relation konnte nicht geladen werden.")
		return
	}
	if relationMeta.ReleaseVersionID != versionID {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation gehoert nicht zu dieser release version"}})
		return
	}

	if err := h.mediaRepo.SoftDeleteReleaseVersionMedia(c.Request.Context(), relationID, identity.UserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden oder bereits gelöscht"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "löschen fehlgeschlagen.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "release_version_media.deleted",
		TargetType:        "release_version_media",
		TargetID:          &relationID,
		Action:            string(permissions.ActionReleaseVersionMediaDelete),
		Outcome:           "allowed",
		Payload:           map[string]any{"version_id": versionID},
	})

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

type rvmReorderItem struct {
	ID        int64 `json:"id"`
	SortOrder int   `json:"sort_order"`
}

type rvmReorderBody struct {
	Items []rvmReorderItem `json:"items"`
}

type releaseVersionCapabilitiesResponse struct {
	CanViewMedia   bool `json:"can_view_media"`
	CanUploadMedia bool `json:"can_upload_media"`
	CanUpdateMedia bool `json:"can_update_media"`
	CanDeleteMedia bool `json:"can_delete_media"`
	CanEditNotes   bool `json:"can_edit_notes"`
}

// ReorderReleaseVersionMedia handles POST /api/v1/admin/release-versions/:versionId/media/reorder.
func (h *AdminContentHandler) ReorderReleaseVersionMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.reorder.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionMediaUpdate, result)
		writePermissionDenied(c, result)
		return
	}

	var body rvmReorderBody
	if err := c.ShouldBindJSON(&body); err != nil || len(body.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "items array fehlt oder leer"}})
		return
	}

	reorderItems := make([]repository.ReleaseVersionMediaReorderItem, len(body.Items))
	relationIDs := make([]int64, len(body.Items))
	for i, item := range body.Items {
		reorderItems[i] = repository.ReleaseVersionMediaReorderItem{
			RelationID: item.ID,
			SortOrder:  item.SortOrder,
		}
		relationIDs[i] = item.ID
	}

	if err := h.mediaRepo.ValidateReleaseVersionMediaOwnership(c.Request.Context(), versionID, relationIDs); err != nil {
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrOwnershipMismatch) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "eine oder mehrere relationen gehoeren nicht zu dieser release version"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Relationen konnten nicht validiert werden.")
		return
	}

	tx, err := h.mediaRepo.BeginTx(c.Request.Context())
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer tx.Rollback(c.Request.Context()) //nolint:errcheck

	if err := h.mediaRepo.ReorderReleaseVersionMedia(c.Request.Context(), tx, reorderItems); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Reorder fehlgeschlagen.")
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    &identity.AppUserID,
		ActorLegacyUserID: &identity.UserID,
		EventType:         "release_version_media.reordered",
		TargetType:        "release_version",
		TargetID:          &versionID,
		Action:            string(permissions.ActionReleaseVersionMediaUpdate),
		Outcome:           "allowed",
		Payload:           map[string]any{"items": len(body.Items)},
	})

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *AdminContentHandler) GetReleaseVersionCapabilities(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	canViewVersion, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUploadMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUpdateMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canDeleteMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaDelete, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditNotes, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}

	if !canViewVersion.Allowed && !canViewMedia.Allowed && !canUploadMedia.Allowed && !canUpdateMedia.Allowed && !canDeleteMedia.Allowed && !canEditNotes.Allowed {
		writePermissionDenied(c, canViewVersion)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": releaseVersionCapabilitiesResponse{
		CanViewMedia:   canViewMedia.Allowed,
		CanUploadMedia: canUploadMedia.Allowed,
		CanUpdateMedia: canUpdateMedia.Allowed,
		CanDeleteMedia: canDeleteMedia.Allowed,
		CanEditNotes:   canEditNotes.Allowed,
	}})
}
