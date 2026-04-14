package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// UploadFansubMedia nimmt eine Mediendatei (Logo oder Banner) für eine Fansub-Gruppe entgegen und speichert sie.
func (h *FansubHandler) UploadFansubMedia(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media service nicht verfuegbar"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}

	kind, err := parseMediaKind(c.PostForm("kind"))
	if err != nil {
		badRequest(c, "ungueltiger media-kind")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		badRequest(c, "datei fehlt (field: file)")
		return
	}

	data, ok := h.readFansubMediaUpload(c, identity.UserID, fansubID, kind, fileHeader)
	if !ok {
		return
	}

	asset, gifLargeHint, ok := h.storeFansubMediaUpload(c, identity.UserID, fansubID, kind, fileHeader.Filename, data)
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
) (*models.MediaAsset, bool, bool) {
	saveResult, ok := h.saveFansubMediaUpload(c, userID, fansubID, kind, filename, data)
	if !ok {
		return nil, false, false
	}

	asset, ok := h.persistFansubMediaAsset(c, userID, fansubID, kind, saveResult)
	if !ok {
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

func (h *FansubHandler) persistFansubMediaAsset(
	c *gin.Context,
	userID int64,
	fansubID int64,
	kind models.MediaKind,
	saveResult *services.MediaSaveResult,
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

	previousMediaID, err := h.mediaRepo.AssignFansubMedia(c.Request.Context(), fansubID, kind, asset.ID, asset.PublicURL)
	if err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
		_ = removeFileQuietly(asset.StoragePath)
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
