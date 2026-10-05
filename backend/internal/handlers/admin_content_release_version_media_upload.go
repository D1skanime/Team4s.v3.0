package handlers

import (
	"bytes"
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
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "golang.org/x/image/webp"
)

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
	SourceRevision        *int64 `json:"source_revision,omitempty"`
	ThumbnailURL          string `json:"thumbnail_url,omitempty"`
	DisplayURL            string `json:"display_url,omitempty"`
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
// Animated GIFs/WebP keep their original animation in storage; the thumbnail uses frame 0.
// vipsThumbnailPath is required for animated WebP (D-20/D-21): golang.org/x/image/webp cannot
// decode ANMF animation frames at all (unlike GIF, which the stdlib fully supports via
// gif.DecodeAll), so frame-0 extraction goes through vipsthumbnail instead.
func generateRVMThumbnail(data []byte, mimeType string, vipsThumbnailPath string) ([]byte, int, int, error) {
	if mimeType == "image/webp" && services.IsAnimatedWebPData(data) {
		jpegData, w, h, err := services.ExtractFirstFrameViaVips(vipsThumbnailPath, data, ".webp", rvmThumbnailWidth)
		if err != nil {
			return nil, 0, 0, fmt.Errorf("animiertes webp frame 0 laden: %w", err)
		}
		return jpegData, w, h, nil
	}

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
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version konnte nicht geprüft werden.")
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

	participatingGroups, err := h.mediaRepo.ListReleaseVersionGroupIDs(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Herkunftsgruppen konnten nicht geladen werden.")
		return
	}
	actorGroups, err := h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsForUser(c.Request.Context(), versionID, identity.UserID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Herkunftsgruppe konnte nicht geprüft werden.")
		return
	}
	allowedGroups := actorGroups
	if actor.IsPlatformAdmin {
		allowedGroups = participatingGroups
	}
	if len(allowedGroups) != 1 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    "Die Herkunftsgruppe konnte nicht eindeutig serverseitig bestimmt werden.",
			"error_code": "SOURCE_GROUP_UNRESOLVED",
		}})
		return
	}
	sourceGroupID := allowedGroups[0]
	if actor.IsPlatformAdmin {
		memberGroups, memberErr := h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsForUser(
			c.Request.Context(), versionID, identity.UserID,
		)
		if memberErr != nil {
			writeInternalErrorResponse(c, "interner serverfehler", memberErr, "Herkunftsgruppe konnte nicht geprüft werden.")
			return
		}
		if len(memberGroups) != 1 || memberGroups[0] != sourceGroupID {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
				"message":    "Für die Einreichung fehlt eine eindeutige reale Member-Zuordnung.",
				"error_code": "SOURCE_ATTRIBUTION_REQUIRED",
			}})
			return
		}
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
		result := h.processOneRVMFile(
			c, fileHeader, versionID, sourceGroupID, category, sortOrder,
			uploadedByUserID, identity.AppUserID,
		)
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
	sourceGroupID int64,
	category string,
	sortOrder int,
	uploadedByUserID int64,
	actorAppUserID int64,
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
			Message:   fmt.Sprintf("datei zu groß: max %d MB", rvmMaxFileSizeBytes/1024/1024)}
	}

	detected := mimetype.Detect(data)
	mimeType := detected.String()
	if idx := strings.Index(mimeType, ";"); idx >= 0 {
		mimeType = strings.TrimSpace(mimeType[:idx])
	}

	if message, code, rejected := rvmFileRejection(mimeType, data); rejected {
		return rvmFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: code, Message: message}
	}

	meta, err := inspectRVMImage(data, mimeType)
	if err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "IMAGE_DECODE_FAILED", Message: "bild konnte nicht dekodiert werden"}
	}
	if meta.Width > rvmMaxImageWidth || meta.Height > rvmMaxImageHeight {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "IMAGE_DIMENSIONS_TOO_LARGE",
			Message:   fmt.Sprintf("bild zu groß: max %dx%d px", rvmMaxImageWidth, rvmMaxImageHeight)}
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

	thumbData, thumbWidth, thumbHeight, err := generateRVMThumbnail(data, mimeType, h.rvmVipsThumbnailPath())
	if err != nil {
		log.Printf("rvm thumbnail error for %s: %v", clientName, err)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "THUMBNAIL_FAILED", Message: "thumbnail konnte nicht erzeugt werden"}
	}
	displayData, displayExt, _, displayWidth, displayHeight, err := generateRVMDisplay(data, mimeType, h.rvmFFmpegPath(), h.rvmVipsThumbnailPath())
	if err != nil {
		log.Printf("rvm display error for %s: %v", clientName, err)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DISPLAY_FAILED", Message: "display-variante konnte nicht erzeugt werden"}
	}

	assetUUID := uuid.New().String()
	ext := imageExtFromMimeRVM(mimeType)
	versionIDStr := strconv.FormatInt(versionID, 10)
	assetDir := filepath.Join(h.mediaStorageDir, "release-version", versionIDStr, assetUUID)
	originalPath := filepath.Join(assetDir, "original."+ext)
	thumbPath := filepath.Join(assetDir, "thumb.jpg")
	displayPath := filepath.Join(assetDir, "display."+displayExt)

	if err := os.MkdirAll(assetDir, 0o755); err != nil {
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "verzeichnis konnte nicht erstellt werden"}
	}

	// EXIF-Strip für JPEG und PNG: imaging.Save re-enkodiert das Bild ohne Metadaten.
	// GIF bleibt raw, weil imaging die Animation nicht erhalten kann. WebP bleibt ebenfalls
	// raw (imaging.Save kann WebP nicht enkodieren, nur dekodieren), aber EXIF/XMP-Chunks werden
	// verlustfrei aus dem RIFF-Container entfernt (D-06/D-15) statt die rohen Bytes 1:1 zu
	// behalten.
	if mimeType == "image/gif" {
		if err := os.WriteFile(originalPath, data, 0o644); err != nil {
			_ = removeFileQuietly(originalPath)
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "STORAGE_FAILED", Message: "original konnte nicht gespeichert werden"}
		}
	} else if mimeType == "image/webp" {
		stripped, stripErr := services.StripWebPMetadata(data)
		if stripErr != nil {
			_ = removeFileQuietly(originalPath)
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "STORAGE_FAILED", Message: "webp exif/xmp konnte nicht entfernt werden"}
		}
		if err := os.WriteFile(originalPath, stripped, 0o644); err != nil {
			_ = removeFileQuietly(originalPath)
			return rvmFileResult{ClientFileName: clientName, Status: "failed",
				ErrorCode: "STORAGE_FAILED", Message: "original konnte nicht gespeichert werden"}
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
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "thumbnail konnte nicht gespeichert werden"}
	}
	if err := os.WriteFile(displayPath, displayData, 0o644); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "STORAGE_FAILED", Message: "display-variante konnte nicht gespeichert werden"}
	}

	ctx := c.Request.Context()
	tx, err := h.mediaRepo.BeginTx(ctx)
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "transaktion konnte nicht gestartet werden"}
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	privateVisibility := "private"
	pendingReviewStatus := "in_review"
	createInput := models.MediaAssetCreateInput{
		Kind:             models.MediaKindImage,
		MimeType:         mimeType,
		Filename:         "original." + ext,
		StoragePath:      originalPath,
		SizeBytes:        int64(len(data)),
		Width:            &meta.Width,
		Height:           &meta.Height,
		VisibilityCode:   &privateVisibility,
		ReviewStatusCode: &pendingReviewStatus,
	}
	mediaAsset, err := h.mediaRepo.CreateMediaAssetWithStatusTx(ctx, tx, createInput, "processing")
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media asset konnte nicht erstellt werden"}
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "original", originalPath, meta.Width, meta.Height, int64(len(data)), "processing"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file (original) konnte nicht erstellt werden"}
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "thumb", thumbPath, thumbWidth, thumbHeight, int64(len(thumbData)), "processing"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file (thumb) konnte nicht erstellt werden"}
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "display", displayPath, displayWidth, displayHeight, int64(len(displayData)), "processing"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file (display) konnte nicht erstellt werden"}
	}

	uploadedBy := uploadedByUserID
	relationID, err := h.mediaRepo.CreateReleaseVersionMediaAsset(ctx, tx, repository.ReleaseVersionMediaCreateInput{
		ReleaseVersionID:   versionID,
		FansubGroupID:      &sourceGroupID,
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
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "release version media konnte nicht erstellt werden"}
	}
	lifecycle, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(
		ctx,
		repository.ReleaseReviewSubmissionInput{
			SourceID:       relationID,
			ActorAppUserID: actorAppUserID,
			LastActivityAt: time.Now().UTC(),
		},
	)
	if err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "Review-Lifecycle konnte nicht erstellt werden"}
	}

	if err := h.mediaRepo.UpdateMediaAssetStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media asset status konnte nicht auf ready gesetzt werden"}
	}
	if err := h.mediaRepo.UpdateMediaFileStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "media file status konnte nicht auf ready gesetzt werden"}
	}

	if err := tx.Commit(ctx); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		_ = removeFileQuietly(displayPath)
		return rvmFileResult{ClientFileName: clientName, Status: "failed",
			ErrorCode: "DB_FAILED", Message: "transaktion konnte nicht committed werden"}
	}

	thumbRelPath := strings.Join([]string{"release-version", versionIDStr, assetUUID, "thumb.jpg"}, "/")
	thumbURL := "/media/" + thumbRelPath
	displayRelPath := strings.Join([]string{"release-version", versionIDStr, assetUUID, "display." + displayExt}, "/")
	displayURL := "/media/" + displayRelPath

	return rvmFileResult{
		ClientFileName:        clientName,
		Status:                "ready",
		MediaAssetID:          &mediaAsset.ID,
		ReleaseVersionMediaID: &relationID,
		SourceRevision:        &lifecycle.SourceRevision,
		ThumbnailURL:          thumbURL,
		DisplayURL:            displayURL,
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
