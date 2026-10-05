package handlers

import (
	"bytes"
	"fmt"
	"image"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

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
