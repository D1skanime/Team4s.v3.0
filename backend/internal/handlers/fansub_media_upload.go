package handlers

import (
	"errors"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// validVisibilityCodes enthält die erlaubten visibility_code-Werte (aus Migration 0037 visibilities-Tabelle).
var validVisibilityCodes = map[string]bool{
	"public":     true,
	"private":    true,
	"registered": true,
	"fansubber":  true,
	"staff":      true,
}

// validReviewStatusCodes enthält die erlaubten review_status_code-Werte (aus Migration 0097 review_statuses-Tabelle).
var validReviewStatusCodes = map[string]bool{
	"in_review": true,
	"approved":  true,
	"rejected":  true,
	"archived":  true,
	"removed":   true,
}

// UploadFansubMedia nimmt eine Mediendatei (Logo oder Banner) für eine Fansub-Gruppe entgegen und speichert sie.
func (h *FansubHandler) UploadFansubMedia(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}
	kind := models.MediaKind(strings.ToLower(strings.TrimSpace(c.PostForm("kind"))))
	action := permissions.ActionFansubGroupEdit
	if kind == models.MediaKindImage {
		action = permissions.ActionFansubGroupMediaUpload
	}
	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, action, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Fansub-Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.upload.denied", &fansubID, "fansub_group", &fansubID, action, result)
		writePermissionDenied(c, result)
		return
	}
	if h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media service nicht verfügbar"}})
		return
	}

	kind, err = parseMediaKind(c.PostForm("kind"))
	if err != nil {
		badRequest(c, "ungültiger media-kind")
		return
	}
	if kind == models.MediaKindImage {
		h.uploadFansubGroupMedia(c, identity, fansubID)
		return
	}

	// visibility_code und review_status_code aus FormData lesen (optionale Felder, Lock K)
	visibilityCode := strings.TrimSpace(c.PostForm("visibility_code"))
	reviewStatusCode := strings.TrimSpace(c.PostForm("review_status_code"))

	// Whitelist-Validierung (T-79-02-01)
	if visibilityCode != "" && !validVisibilityCodes[visibilityCode] {
		badRequest(c, "ungültiger visibility_code")
		return
	}
	if reviewStatusCode != "" && !validReviewStatusCodes[reviewStatusCode] {
		badRequest(c, "ungültiger review_status_code")
		return
	}

	// D-09 Branding-Default: Identitäts-/Branding-Slots sind sofort öffentlich/freigegeben
	if visibilityCode == "" {
		visibilityCode = "public"
	}
	if reviewStatusCode == "" {
		reviewStatusCode = "approved"
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		badRequest(c, "datei fehlt (field: file)")
		return
	}
	sourceFileHeader, sourceFileErr := c.FormFile("source_file")
	if sourceFileErr != nil && !errors.Is(sourceFileErr, http.ErrMissingFile) {
		badRequest(c, "source_file konnte nicht gelesen werden")
		return
	}

	data, ok := h.readFansubMediaUpload(c, identity.UserID, fansubID, kind, fileHeader)
	if !ok {
		return
	}
	var sourceData []byte
	if sourceFileHeader != nil {
		sourceData, ok = h.readFansubMediaUpload(c, identity.UserID, fansubID, kind, sourceFileHeader)
		if !ok {
			return
		}
	}

	asset, gifLargeHint, ok := h.storeFansubMediaUpload(c, identity.UserID, fansubID, kind, fileHeader.Filename, data, sourceFileHeader, sourceData, visibilityCode, reviewStatusCode)
	if !ok {
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"kind":              kind,
			"media":             asset,
			"gif_large_warning": gifLargeHint,
		},
	})
}

func (h *FansubHandler) storeFansubMediaUpload(
	c *gin.Context,
	userID int64,
	fansubID int64,
	kind models.MediaKind,
	filename string,
	data []byte,
	sourceFileHeader *multipart.FileHeader,
	sourceData []byte,
	visibilityCode string,
	reviewStatusCode string,
) (*models.MediaAsset, bool, bool) {
	saveResult, ok := h.saveFansubMediaUpload(c, userID, fansubID, kind, filename, data)
	if !ok {
		return nil, false, false
	}
	var sourceResult *services.MediaVariantSaveResult
	if sourceFileHeader != nil && len(sourceData) > 0 {
		var sourceOK bool
		sourceResult, sourceOK = h.saveFansubMediaSourceOriginal(c, userID, fansubID, kind, sourceFileHeader.Filename, sourceData)
		if !sourceOK {
			_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
			return nil, false, false
		}
	}

	// Visibility/ReviewStatus in CreateInput eintragen (Lock K, Sub-SELECT-Pfad)
	saveResult.CreateInput.VisibilityCode = &visibilityCode
	saveResult.CreateInput.ReviewStatusCode = &reviewStatusCode

	asset, ok := h.persistFansubMediaAsset(c, userID, fansubID, kind, saveResult, sourceResult)
	if !ok {
		if sourceResult != nil {
			_ = removeFileQuietly(sourceResult.StoragePath)
		}
		return nil, false, false
	}

	return asset, saveResult.GIFLargeHint, true
}

func (h *FansubHandler) saveFansubMediaUpload(
	c *gin.Context,
	userID int64,
	fansubID int64,
	kind models.MediaKind,
	filename string,
	data []byte,
) (*services.MediaSaveResult, bool) {
	saveResult, err := h.mediaService.SaveUpload(kind, filename, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			badRequest(c, validationErr.Message)
			return nil, false
		}
		log.Printf("fansub media upload: save upload failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
		return nil, false
	}

	return saveResult, true
}

func (h *FansubHandler) saveFansubMediaSourceOriginal(
	c *gin.Context,
	userID int64,
	fansubID int64,
	kind models.MediaKind,
	filename string,
	data []byte,
) (*services.MediaVariantSaveResult, bool) {
	saveResult, err := h.mediaService.SaveUploadSourceOriginal(kind, filename, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			badRequest(c, validationErr.Message)
			return nil, false
		}
		log.Printf("fansub media upload: save source original failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
		return nil, false
	}

	return saveResult, true
}

func (h *FansubHandler) persistFansubMediaAsset(
	c *gin.Context,
	userID int64,
	fansubID int64,
	kind models.MediaKind,
	saveResult *services.MediaSaveResult,
	sourceResult *services.MediaVariantSaveResult,
) (*models.MediaAsset, bool) {
	asset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "media asset bereits vorhanden"}})
			return nil, false
		}
		log.Printf("fansub media upload: create asset failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
		return nil, false
	}
	if err := h.mediaRepo.InsertMediaFile(c.Request.Context(), asset.ID, "original", asset.StoragePath, asset.SizeBytes); err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
		_ = removeFileQuietly(asset.StoragePath)
		log.Printf("fansub media upload: insert original media file failed (user_id=%d, fansub_id=%d, media_id=%d): %v", userID, fansubID, asset.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
		return nil, false
	}
	if sourceResult != nil && strings.TrimSpace(sourceResult.StoragePath) != "" && sourceResult.StoragePath != asset.StoragePath {
		if err := h.mediaRepo.InsertMediaFile(c.Request.Context(), asset.ID, "source_original", sourceResult.StoragePath, sourceResult.SizeBytes); err != nil {
			_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
			_ = removeFileQuietly(asset.StoragePath)
			_ = removeFileQuietly(sourceResult.StoragePath)
			log.Printf("fansub media upload: insert source media file failed (user_id=%d, fansub_id=%d, media_id=%d): %v", userID, fansubID, asset.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
			return nil, false
		}
		asset.SourceOriginalURL = sourceResult.PublicURL
	}

	previousMediaID, err := h.mediaRepo.AssignFansubMedia(c.Request.Context(), fansubID, kind, asset.ID, asset.PublicURL)
	if err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
		_ = removeFileQuietly(asset.StoragePath)
		if sourceResult != nil {
			_ = removeFileQuietly(sourceResult.StoragePath)
		}
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
			return nil, false
		}
		log.Printf("fansub media upload: assign failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
		return nil, false
	}

	if previousMediaID != nil && *previousMediaID != asset.ID {
		h.tryCleanupUnusedMedia(c.Request.Context(), *previousMediaID)
	}

	return asset, true
}

type fansubGroupMediaFileResult struct {
	ClientFileName string `json:"client_file_name"`
	Status         string `json:"status"`
	MediaAssetID   *int64 `json:"media_asset_id,omitempty"`
	PreviewURL     string `json:"preview_url,omitempty"`
	ErrorCode      string `json:"error_code,omitempty"`
	Message        string `json:"message,omitempty"`
}

func (h *FansubHandler) uploadFansubGroupMedia(c *gin.Context, identity middleware.AuthIdentity, fansubID int64) {
	exists, err := h.mediaRepo.FansubGroupExistsForMedia(c.Request.Context(), fansubID)
	if err != nil {
		log.Printf("fansub group media upload: group exists check failed (fansub_id=%d): %v", fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		badRequest(c, "multipart form fehlt")
		return
	}
	files := form.File["files[]"]
	if len(files) == 0 {
		files = form.File["files"]
	}
	if len(files) == 0 {
		if fileHeader, err := c.FormFile("file"); err == nil {
			files = []*multipart.FileHeader{fileHeader}
		}
	}
	if len(files) == 0 {
		badRequest(c, "keine dateien hochgeladen")
		return
	}
	if len(files) > rvmMaxFilesPerUpload {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "zu viele dateien", "error_code": "TOO_MANY_FILES"}})
		return
	}

	category := strings.TrimSpace(c.PostForm("category"))
	if category == "" {
		category = "other"
	}
	if _, valid := validFansubGroupMediaCategories[category]; !valid {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "ungültige Medienkategorie", "error_code": "INVALID_CATEGORY"}})
		return
	}

	visibilityCode := strings.TrimSpace(c.PostForm("visibility_code"))
	reviewStatusCode := strings.TrimSpace(c.PostForm("review_status_code"))
	if visibilityCode != "" && !validVisibilityCodes[visibilityCode] {
		badRequest(c, "ungültiger visibility_code")
		return
	}
	if reviewStatusCode != "" && !validReviewStatusCodes[reviewStatusCode] {
		badRequest(c, "ungültiger review_status_code")
		return
	}
	if visibilityCode == "" {
		visibilityCode = "private"
	}
	if reviewStatusCode == "" {
		reviewStatusCode = "in_review"
	}

	maxSortOrder, err := h.mediaRepo.GetMaxFansubGroupMediaSortOrder(c.Request.Context(), fansubID)
	if err != nil {
		log.Printf("fansub group media upload: sort order failed (fansub_id=%d): %v", fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
		return
	}

	results := make([]fansubGroupMediaFileResult, 0, len(files))
	for i, fileHeader := range files {
		sortOrder := maxSortOrder + (i+1)*10
		result := h.processOneFansubGroupMediaFile(c, fileHeader, fansubID, category, sortOrder, identity.UserID, visibilityCode, reviewStatusCode)
		results = append(results, result)
		if result.Status == "ready" && result.MediaAssetID != nil {
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID:    &identity.AppUserID,
				ActorLegacyUserID: &identity.UserID,
				EventType:         "fansub_group_media.uploaded",
				ScopeType:         permissions.ScopeTypeGroup,
				ScopeID:           &fansubID,
				TargetType:        "fansub_group_media",
				TargetID:          result.MediaAssetID,
				Action:            string(permissions.ActionFansubGroupMediaUpload),
				Outcome:           "allowed",
				Payload:           map[string]any{"category": category, "client_file_name": result.ClientFileName},
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

func (h *FansubHandler) processOneFansubGroupMediaFile(
	c *gin.Context,
	fileHeader *multipart.FileHeader,
	fansubID int64,
	category string,
	sortOrder int,
	uploadedByUserID int64,
	visibilityCode string,
	reviewStatusCode string,
) fansubGroupMediaFileResult {
	clientName := fileHeader.Filename
	file, err := fileHeader.Open()
	if err != nil {
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "STORAGE_FAILED", Message: "datei konnte nicht geöffnet werden"}
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, int64(rvmMaxFileSizeBytes)+1))
	if err != nil {
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "STORAGE_FAILED", Message: "datei konnte nicht gelesen werden"}
	}
	if len(data) > rvmMaxFileSizeBytes {
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "FILE_TOO_LARGE", Message: "bild ist zu groß (max 15MB)"}
	}
	saveResult, err := h.mediaService.SaveUpload(models.MediaKindImage, clientName, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "INVALID_FILE", Message: validationErr.Message}
		}
		log.Printf("fansub group media upload: save failed (fansub_id=%d): %v", fansubID, err)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "STORAGE_FAILED", Message: "datei konnte nicht gespeichert werden"}
	}
	saveResult.CreateInput.VisibilityCode = &visibilityCode
	saveResult.CreateInput.ReviewStatusCode = &reviewStatusCode

	ctx := c.Request.Context()
	tx, err := h.mediaRepo.BeginTx(ctx)
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "transaktion konnte nicht gestartet werden"}
	}
	defer tx.Rollback(ctx)

	mediaAsset, err := h.mediaRepo.CreateMediaAssetWithStatusTx(ctx, tx, saveResult.CreateInput, "processing")
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "media asset konnte nicht erstellt werden"}
	}
	width, height := 0, 0
	if saveResult.CreateInput.Width != nil {
		width = *saveResult.CreateInput.Width
	}
	if saveResult.CreateInput.Height != nil {
		height = *saveResult.CreateInput.Height
	}
	if err := h.mediaRepo.InsertMediaFileWithStatus(ctx, tx, mediaAsset.ID, "original", saveResult.CreateInput.StoragePath, width, height, int64(len(data)), "processing"); err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "media file konnte nicht erstellt werden"}
	}
	uploadedBy := uploadedByUserID
	if err := h.mediaRepo.CreateFansubGroupMediaAsset(ctx, tx, repository.FansubGroupMediaCreateInput{
		FansubGroupID:    fansubID,
		MediaAssetID:     mediaAsset.ID,
		Category:         category,
		SortOrder:        sortOrder,
		UploadedByUserID: &uploadedBy,
	}); err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "gruppenmedium konnte nicht erstellt werden"}
	}
	if err := h.mediaRepo.UpdateMediaAssetStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "media asset status konnte nicht gesetzt werden"}
	}
	if err := h.mediaRepo.UpdateMediaFileStatusRVMTx(ctx, tx, mediaAsset.ID, "ready"); err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "media file status konnte nicht gesetzt werden"}
	}
	if err := tx.Commit(ctx); err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		return fansubGroupMediaFileResult{ClientFileName: clientName, Status: "failed", ErrorCode: "DB_FAILED", Message: "transaktion konnte nicht committed werden"}
	}

	return fansubGroupMediaFileResult{
		ClientFileName: clientName,
		Status:         "ready",
		MediaAssetID:   &mediaAsset.ID,
		PreviewURL:     saveResult.CreateInput.PublicURL,
	}
}
