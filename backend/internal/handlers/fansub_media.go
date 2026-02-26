package handlers

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

const (
	logoUploadReadLimitBytes   = int64(3 * 1024 * 1024)
	bannerUploadReadLimitBytes = int64(6 * 1024 * 1024)
)

func (h *FansubHandler) UploadFansubMedia(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil || h.mediaService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "media service nicht verfuegbar",
			},
		})
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

	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("fansub media upload: open file failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "datei konnte nicht gelesen werden",
			},
		})
		return
	}
	defer file.Close()

	readLimit := bannerUploadReadLimitBytes
	if kind == models.MediaKindLogo {
		readLimit = logoUploadReadLimitBytes
	}

	data, err := io.ReadAll(io.LimitReader(file, readLimit+1))
	if err != nil {
		log.Printf("fansub media upload: read file failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "datei konnte nicht gelesen werden",
			},
		})
		return
	}
	if int64(len(data)) > readLimit {
		if kind == models.MediaKindLogo {
			badRequest(c, "logo ist zu gross (max 2MB)")
		} else {
			badRequest(c, "banner ist zu gross (max 5MB)")
		}
		return
	}

	saveResult, err := h.mediaService.SaveUpload(kind, fileHeader.Filename, data)
	if err != nil {
		var validationErr *services.MediaValidationError
		if errors.As(err, &validationErr) {
			badRequest(c, validationErr.Message)
			return
		}
		log.Printf("fansub media upload: save upload failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "upload fehlgeschlagen",
			},
		})
		return
	}

	asset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
	if err != nil {
		_ = removeFileQuietly(saveResult.CreateInput.StoragePath)
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error": gin.H{
					"message": "media asset bereits vorhanden",
				},
			})
			return
		}
		log.Printf("fansub media upload: create asset failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "upload fehlgeschlagen",
			},
		})
		return
	}

	previousMediaID, err := h.mediaRepo.AssignFansubMedia(c.Request.Context(), fansubID, kind, asset.ID, asset.PublicURL)
	if err != nil {
		_ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
		_ = removeFileQuietly(asset.StoragePath)
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"message": "fansubgruppe nicht gefunden",
				},
			})
			return
		}
		log.Printf("fansub media upload: assign failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "upload fehlgeschlagen",
			},
		})
		return
	}

	if previousMediaID != nil && *previousMediaID != asset.ID {
		h.tryCleanupUnusedMedia(c.Request.Context(), *previousMediaID)
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"kind":              kind,
			"media":             asset,
			"gif_large_warning": saveResult.GIFLargeHint,
		},
	})
}

func (h *FansubHandler) DeleteFansubMedia(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "media service nicht verfuegbar",
			},
		})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige fansub id")
		return
	}
	kind, err := parseMediaKind(c.Param("kind"))
	if err != nil {
		badRequest(c, "ungueltiger media-kind")
		return
	}

	previousMediaID, err := h.mediaRepo.ClearFansubMedia(c.Request.Context(), fansubID, kind)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("fansub media delete: clear failed (user_id=%d, fansub_id=%d): %v", identity.UserID, fansubID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "loeschen fehlgeschlagen",
			},
		})
		return
	}

	if previousMediaID != nil {
		h.tryCleanupUnusedMedia(c.Request.Context(), *previousMediaID)
	}

	c.Status(http.StatusNoContent)
}

func (h *FansubHandler) ServeMediaFile(c *gin.Context) {
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "media service nicht verfuegbar",
			},
		})
		return
	}

	filename := strings.TrimSpace(c.Param("filename"))
	if filename == "" || filename != filepath.Base(filename) || strings.Contains(filename, "..") {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "datei nicht gefunden",
			},
		})
		return
	}

	asset, err := h.mediaRepo.GetMediaAssetByFilename(c.Request.Context(), filename)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "datei nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("media serve: query failed (filename=%q): %v", filename, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	if _, err := os.Stat(asset.StoragePath); err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"message": "datei nicht gefunden",
				},
			})
			return
		}
		log.Printf("media serve: stat failed (filename=%q): %v", filename, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.Header("Content-Type", asset.MimeType)
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.File(asset.StoragePath)
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
