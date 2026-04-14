package handlers

import (
	"context"
	"errors"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

const (
	logoUploadReadLimitBytes   = int64(3 * 1024 * 1024)
	bannerUploadReadLimitBytes = int64(6 * 1024 * 1024)
)

func (h *FansubHandler) readFansubMediaUpload(
	c *gin.Context,
	userID int64,
	fansubID int64,
	kind models.MediaKind,
	fileHeader *multipart.FileHeader,
) ([]byte, bool) {
	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("fansub media upload: open file failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "datei konnte nicht gelesen werden"}})
		return nil, false
	}
	defer file.Close()

	readLimit := bannerUploadReadLimitBytes
	if kind == models.MediaKindLogo {
		readLimit = logoUploadReadLimitBytes
	}

	data, err := io.ReadAll(io.LimitReader(file, readLimit+1))
	if err != nil {
		log.Printf("fansub media upload: read file failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "datei konnte nicht gelesen werden"}})
		return nil, false
	}
	if int64(len(data)) > readLimit {
		if kind == models.MediaKindLogo {
			badRequest(c, "logo ist zu gross (max 2MB)")
		} else {
			badRequest(c, "banner ist zu gross (max 5MB)")
		}
		return nil, false
	}

	return data, true
}

func (h *FansubHandler) tryCleanupUnusedMedia(ctx context.Context, mediaID int64) {
	if h.mediaRepo == nil || mediaID <= 0 {
		return
	}

	referenced, err := h.mediaRepo.IsMediaAssetReferenced(ctx, mediaID)
	if err != nil {
		log.Printf("fansub media cleanup: reference check failed (media_id=%d): %v", mediaID, err)
		return
	}
	if referenced {
		return
	}

	asset, err := h.mediaRepo.GetMediaAssetByID(ctx, mediaID)
	if errors.Is(err, repository.ErrNotFound) {
		return
	}
	if err != nil {
		log.Printf("fansub media cleanup: load asset failed (media_id=%d): %v", mediaID, err)
		return
	}

	if err := h.mediaRepo.DeleteMediaAsset(ctx, mediaID); err != nil {
		if !errors.Is(err, repository.ErrNotFound) {
			log.Printf("fansub media cleanup: delete asset failed (media_id=%d): %v", mediaID, err)
		}
		return
	}

	if err := removeFileQuietly(asset.StoragePath); err != nil {
		log.Printf("fansub media cleanup: delete file failed (media_id=%d, path=%q): %v", mediaID, asset.StoragePath, err)
	}
}

// parseMediaKind wandelt einen rohen String in einen validen MediaKind-Wert um.
func parseMediaKind(raw string) (models.MediaKind, error) {
	switch models.MediaKind(strings.ToLower(strings.TrimSpace(raw))) {
	case models.MediaKindLogo:
		return models.MediaKindLogo, nil
	case models.MediaKindBanner:
		return models.MediaKindBanner, nil
	default:
		return "", errors.New("invalid media kind")
	}
}

// removeFileQuietly löscht eine Datei ohne Fehler zurückzugeben, wenn die Datei nicht existiert.
func removeFileQuietly(path string) error {
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		return nil
	}
	if err := os.Remove(trimmedPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
