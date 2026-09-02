package handlers

// This file exists to keep the new file-replace HTTP endpoint out of the already-oversized
// admin_content_release_version_media.go (1148 lines), per CLAUDE.md's 450-line-per-file cap.
//
// ReplaceReleaseVersionMediaFile handles PUT .../media/:relationId/file (Zielbild 1,
// 144-CONTEXT.md): a single-file multipart request that replaces the file on an existing
// release_version_media relation and, in the same request, optionally applies
// category/caption/is_preview_candidate changes (Zielbild 2) — all in one atomic SubmitMedia
// call so the review-lifecycle revision only bumps once per request. Every guard/permission/
// lifecycle primitive is reused verbatim from UploadReleaseVersionMedia/processOneRVMFile
// (file intake) and PatchReleaseVersionMedia (permission gate + patch + SubmitMedia); the two
// 144-02 repository building blocks (ReplaceReleaseVersionMediaFile,
// EnqueueReleaseVersionMediaFileDeleteJob) are composed with SubmitMedia inside one tx.

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// parseRVMReplaceCaptionField mirrors parseOptionalCaptionField's present-or-absent contract
// for a multipart form field, which cannot express JSON's explicit null. An empty string is
// treated as "clear the caption" (Caption=nil, CaptionSet=true) — the closest multipart
// equivalent to a JSON null, since a plain HTML form has no other way to signal "clear".
func parseRVMReplaceCaptionField(c *gin.Context) (*string, bool) {
	raw, present := c.GetPostForm("caption")
	if !present {
		return nil, false
	}
	if raw == "" {
		return nil, true
	}
	value := raw
	return &value, true
}

// ReplaceReleaseVersionMediaFile handles PUT /api/v1/admin/release-versions/:versionId/media/:relationId/file.
// Accepts multipart/form-data with: file (exactly one), and optional category/caption/
// is_preview_candidate/source_revision fields. Replaces the relation's file, applies any
// provided metadata changes, enqueues the old file for async cleanup, and bumps the review
// lifecycle back to pending — all inside one transaction, or none of it.
func (h *AdminContentHandler) ReplaceReleaseVersionMediaFile(c *gin.Context) {
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

	// Permission/ownership: identical gate to PatchReleaseVersionMedia. Wer darf ersetzen?
	// (144-CONTEXT.md) resolves to reusing ActionReleaseVersionMediaUpdate + ownership, not a
	// new permission action.
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

	canMutate, err := h.canMutateReleaseVersionMediaRelation(
		c, actor, relationID, relationMeta.UploadedByUserID, identity.UserID,
		permissions.ActionReleaseVersionMediaUpdate, result,
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Rechte konnten nicht geladen werden.")
		return
	}
	if !canMutate {
		ownerResult := releaseVersionMediaOwnerMismatchResult()
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_media.update.denied", nil, "release_version_media", &relationID, permissions.ActionReleaseVersionMediaUpdate, ownerResult)
		writePermissionDenied(c, ownerResult)
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "multipart form fehlt"}})
		return
	}
	fileHeaders := form.File["file"]
	if len(fileHeaders) != 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "genau eine datei erforderlich"}})
		return
	}
	fileHeader := fileHeaders[0]

	var categoryField *string
	if rawCategory, hasCategory := c.GetPostForm("category"); hasCategory {
		trimmed := strings.TrimSpace(rawCategory)
		if !rvmValidCategories[trimmed] {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
				"message":    "ungültige kategorie",
				"error_code": "INVALID_CATEGORY",
			}})
			return
		}
		categoryField = &trimmed
	}

	caption, captionSet := parseRVMReplaceCaptionField(c)

	var isPreviewCandidate *bool
	if rawPreview, hasPreview := c.GetPostForm("is_preview_candidate"); hasPreview {
		b := rawPreview == "true"
		isPreviewCandidate = &b
	}

	var expectedRevision *int64
	if rawRevision, hasRevision := c.GetPostForm("source_revision"); hasRevision {
		revision, parseErr := strconv.ParseInt(rawRevision, 10, 64)
		if parseErr != nil || revision <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{
				"message":    "Ungültige Source-Revision.",
				"error_code": "INVALID_SOURCE_REVISION",
			}})
			return
		}
		expectedRevision = &revision
	}

	// Preview-guard checked before any file I/O so a rejection never leaves orphaned files
	// on disk — same effective-category check PatchReleaseVersionMedia already uses.
	if isPreviewCandidate != nil && *isPreviewCandidate {
		if !rvmCategoryAllowsPreview(relationMeta.Category, categoryField) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
				"message":    "vorschaubild nicht erlaubt für diese kategorie",
				"error_code": "PREVIEW_NOT_ALLOWED_FOR_CATEGORY",
			}})
			return
		}
	}

	// Multipart file-intake guards — exact size/MIME/dimension/decompression-bomb sequence
	// processOneRVMFile already uses, reused verbatim (T-144-04-02).
	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "datei konnte nicht geöffnet werden", "error_code": "STORAGE_FAILED"}})
		return
	}
	defer f.Close()

	data, err := io.ReadAll(io.LimitReader(f, int64(rvmMaxFileSizeBytes)+1))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "datei konnte nicht gelesen werden", "error_code": "STORAGE_FAILED"}})
		return
	}
	if len(data) > rvmMaxFileSizeBytes {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    fmt.Sprintf("datei zu gross: max %d MB", rvmMaxFileSizeBytes/1024/1024),
			"error_code": "FILE_TOO_LARGE",
		}})
		return
	}

	detected := mimetype.Detect(data)
	mimeType := detected.String()
	if idx := strings.Index(mimeType, ";"); idx >= 0 {
		mimeType = strings.TrimSpace(mimeType[:idx])
	}
	if !rvmAllowedMIMETypes[mimeType] {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    fmt.Sprintf("nicht erlaubter dateityp: %s", mimeType),
			"error_code": "INVALID_MIME_TYPE",
		}})
		return
	}

	meta, err := inspectRVMImage(data, mimeType)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "bild konnte nicht dekodiert werden", "error_code": "IMAGE_DECODE_FAILED"}})
		return
	}
	if meta.Width > rvmMaxImageWidth || meta.Height > rvmMaxImageHeight {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    fmt.Sprintf("bild zu gross: max %dx%d px", rvmMaxImageWidth, rvmMaxImageHeight),
			"error_code": "IMAGE_DIMENSIONS_TOO_LARGE",
		}})
		return
	}
	// Dekompression-Bomb-Schutz: Pixelzahl-Limit 40 MP (identisch zu processOneRVMFile).
	if meta.Width*meta.Height > 40_000_000 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    "bild enthält zu viele pixel (max 40 MP)",
			"error_code": "IMAGE_TOO_MANY_PIXELS",
		}})
		return
	}
	if mimeType == "image/gif" && meta.GIFFrames > rvmMaxGIFFrames {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
			"message":    fmt.Sprintf("gif hat zu viele frames: %d (max %d)", meta.GIFFrames, rvmMaxGIFFrames),
			"error_code": "GIF_TOO_MANY_FRAMES",
		}})
		return
	}

	thumbData, thumbWidth, thumbHeight, err := generateRVMThumbnail(data, mimeType)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "thumbnail konnte nicht erzeugt werden", "error_code": "THUMBNAIL_FAILED"}})
		return
	}

	// Write to a NEW assetUUID directory — never the relation's existing asset directory — so
	// the old file can be enqueued for cleanup instead of overwritten in place (Zielbild 4).
	assetUUID := uuid.New().String()
	ext := imageExtFromMimeRVM(mimeType)
	versionIDStr := strconv.FormatInt(versionID, 10)
	assetDir := filepath.Join(h.mediaStorageDir, "release-version", versionIDStr, assetUUID)
	originalPath := filepath.Join(assetDir, "original."+ext)
	thumbPath := filepath.Join(assetDir, "thumb.jpg")

	if err := os.MkdirAll(assetDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "verzeichnis konnte nicht erstellt werden", "error_code": "STORAGE_FAILED"}})
		return
	}

	if mimeType == "image/gif" {
		if err := os.WriteFile(originalPath, data, 0o644); err != nil {
			_ = removeFileQuietly(originalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "original (gif) konnte nicht gespeichert werden", "error_code": "STORAGE_FAILED"}})
			return
		}
	} else {
		decoded, _, decodeErr := image.Decode(bytes.NewReader(data))
		if decodeErr != nil {
			_ = removeFileQuietly(originalPath)
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "original dekodieren fehlgeschlagen", "error_code": "IMAGE_DECODE_FAILED"}})
			return
		}
		if err := imaging.Save(decoded, originalPath); err != nil {
			_ = removeFileQuietly(originalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "original (exif-strip) konnte nicht gespeichert werden", "error_code": "STORAGE_FAILED"}})
			return
		}
	}

	if err := os.WriteFile(thumbPath, thumbData, 0o644); err != nil {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "thumbnail konnte nicht gespeichert werden", "error_code": "STORAGE_FAILED"}})
		return
	}

	cleanupNewFiles := func() {
		_ = removeFileQuietly(originalPath)
		_ = removeFileQuietly(thumbPath)
	}

	ctx := c.Request.Context()
	tx, err := h.mediaRepo.BeginTx(ctx)
	if err != nil {
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "Transaktion konnte nicht gestartet werden.")
		return
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if isPreviewCandidate != nil && *isPreviewCandidate {
		if err := h.mediaRepo.ClearPreviewCandidateForVersion(ctx, tx, versionID, relationID); err != nil {
			cleanupNewFiles()
			writeInternalErrorResponse(c, "interner serverfehler", err, "Preview-Flag konnte nicht zurückgesetzt werden.")
			return
		}
	}

	if categoryField != nil || captionSet || isPreviewCandidate != nil {
		patchInput := repository.ReleaseVersionMediaPatchInput{
			Caption:            caption,
			CaptionSet:         captionSet,
			IsPreviewCandidate: isPreviewCandidate,
			Category:           categoryField,
		}
		if err := h.mediaRepo.PatchReleaseVersionMedia(ctx, tx, relationID, patchInput); err != nil {
			cleanupNewFiles()
			if errors.Is(err, repository.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
				return
			}
			writeInternalErrorResponse(c, "interner serverfehler", err, "Patch fehlgeschlagen.")
			return
		}
	}

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
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "media asset konnte nicht erstellt werden.")
		return
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "original", originalPath, meta.Width, meta.Height, int64(len(data)), "processing"); err != nil {
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "media file (original) konnte nicht erstellt werden.")
		return
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "thumb", thumbPath, thumbWidth, thumbHeight, int64(len(thumbData)), "processing"); err != nil {
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "media file (thumb) konnte nicht erstellt werden.")
		return
	}

	previousMediaAssetID, err := h.mediaRepo.ReplaceReleaseVersionMediaFile(ctx, tx, relationID, mediaAsset.ID)
	if err != nil {
		cleanupNewFiles()
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "relation nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Datei-Ersetzung fehlgeschlagen.")
		return
	}

	if err := h.mediaRepo.EnqueueReleaseVersionMediaFileDeleteJob(ctx, tx, relationID, previousMediaAssetID, time.Now().UTC()); err != nil {
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "Alte Datei konnte nicht zur Bereinigung eingereiht werden.")
		return
	}

	if _, err := repository.NewReleaseReviewLifecycleRepository(tx).SubmitMedia(
		ctx,
		repository.ReleaseReviewSubmissionInput{
			SourceID:         relationID,
			ActorAppUserID:   identity.AppUserID,
			ExpectedRevision: expectedRevision,
			LastActivityAt:   time.Now().UTC(),
		},
	); err != nil {
		cleanupNewFiles()
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{
				"message":    "Das Medium wurde zwischenzeitlich geändert.",
				"error_code": "SOURCE_REVISION_CONFLICT",
			}})
			return
		}
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, repository.ErrValidation) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
				"message":    "Die Einreicher-Zuordnung ist nicht mehr eindeutig.",
				"error_code": "SOURCE_ATTRIBUTION_INVALID",
			}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Review-Lifecycle konnte nicht aktualisiert werden.")
		return
	}

	if err := h.mediaRepo.UpdateMediaAssetStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "media asset status konnte nicht auf ready gesetzt werden.")
		return
	}
	if err := h.mediaRepo.UpdateMediaFileStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "media file status konnte nicht auf ready gesetzt werden.")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		cleanupNewFiles()
		writeInternalErrorResponse(c, "interner serverfehler", err, "Commit fehlgeschlagen.")
		return
	}

	item, err := h.loadReleaseVersionMediaResponseItem(c, actor, identity.UserID, versionID, relationID)
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
		EventType:         "release_version_media.file_replaced",
		TargetType:        "release_version_media",
		TargetID:          &relationID,
		Action:            string(permissions.ActionReleaseVersionMediaUpdate),
		Outcome:           "allowed",
		Payload:           map[string]any{"version_id": versionID, "previous_media_asset_id": previousMediaAssetID},
	})

	c.JSON(http.StatusOK, item)
}
