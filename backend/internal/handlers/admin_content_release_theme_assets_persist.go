package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// persistReleaseThemeAsset runs the shared persistence tail both theme-asset upload handlers
// (UploadReleaseThemeAsset and UploadReleaseThemeAssetForRelease) previously duplicated:
// CreateMediaAsset -> InsertMediaFile("original", ...) -> CreateReleaseThemeAsset, with the
// same cleanup-on-error chain at each step (D-06 extraction, mirroring
// FansubHandler.persistFansubMediaAsset's shape in fansub_media_upload.go).
//
// On success it returns (created, true) WITHOUT writing any response -- the caller writes the
// 201 success response itself. On any handled error the appropriate error response has
// already been written by this method, and it returns (nil, false). logContext must be a
// caller-pre-formatted, trusted string (built only from already-parsed int64 IDs) used as the
// log.Printf prefix on the internal-error branch, preserving each call site's own distinct log
// message.
func (h *AdminContentHandler) persistReleaseThemeAsset(
	c *gin.Context,
	releaseID int64,
	themeID int64,
	createInput models.MediaAssetCreateInput,
	dataSize int64,
	logContext string,
) (*models.AdminReleaseThemeAsset, bool) {
	mediaAsset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), createInput)
	if err != nil {
		_ = removeFileQuietly(createInput.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "media asset bereits vorhanden"}})
			return nil, false
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Asset konnte nicht gespeichert werden.")
		return nil, false
	}

	if err := h.mediaRepo.InsertMediaFile(
		c.Request.Context(),
		mediaAsset.ID,
		"original",
		mediaAsset.StoragePath,
		dataSize,
	); err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
		_ = removeFileQuietly(mediaAsset.StoragePath)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Dateigröße konnte nicht gespeichert werden.")
		return nil, false
	}

	created, err := h.themeRepo.CreateReleaseThemeAsset(c.Request.Context(), models.AdminReleaseThemeAssetCreateInput{
		ReleaseID: releaseID,
		ThemeID:   themeID,
		MediaID:   mediaAsset.ID,
	})
	if err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
		_ = removeFileQuietly(mediaAsset.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "theme bereits zugewiesen", "code": "already_assigned"}})
			return nil, false
		}
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release oder theme nicht gefunden"}})
			return nil, false
		}
		log.Printf("%s: %v", logContext, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video konnte nicht verknuepft werden.")
		return nil, false
	}

	return created, true
}
