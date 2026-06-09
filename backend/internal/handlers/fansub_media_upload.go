package handlers

import (
	"errors"
	"log"
	"mime/multipart"
	"net/http"
	"strings"

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
	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Fansub-Media-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.upload.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupEdit, result)
		writePermissionDenied(c, result)
		return
	}
	if h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media service nicht verfügbar"}})
		return
	}

	kind, err := parseMediaKind(c.PostForm("kind"))
	if err != nil {
		badRequest(c, "ungültiger media-kind")
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
