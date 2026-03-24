package handlers

import (
	"context"
	"fmt"
	"image"
	"mime/multipart"
	"path/filepath"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
)

func (h *MediaUploadHandler) processImage(
	ctx context.Context,
	file multipart.File,
	mimeType string,
	mediaID string,
	req models.UploadRequest,
	storagePath string,
	actorUserID int64,
) (*models.UploadResponse, error) {
	img, format, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("bild konnte nicht dekodiert werden: %w", err)
	}

	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	originalPath := filepath.Join(storagePath, "original.jpg")
	originalRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "original.jpg")
	if format == "gif" && h.isAnimatedGIF(file) {
		originalPath = filepath.Join(storagePath, "original.gif")
		originalRelPath = h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "original.gif")
		file.Seek(0, 0)
		if err := h.saveFile(file, originalPath); err != nil {
			return nil, fmt.Errorf("original gif speichern: %w", err)
		}
	} else if err := imaging.Save(img, originalPath); err != nil {
		return nil, fmt.Errorf("original speichern: %w", err)
	}

	originalSize, _ := h.getFileSize(originalPath)
	files := []models.UploadFileInfo{{
		Variant: "original",
		Path:    originalRelPath,
		Width:   originalWidth,
		Height:  originalHeight,
	}}

	thumbPath := filepath.Join(storagePath, "thumb.jpg")
	thumbRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "thumb.jpg")
	thumb := imaging.Resize(img, thumbWidth, 0, imaging.Lanczos)
	if err := imaging.Save(thumb, thumbPath); err != nil {
		return nil, fmt.Errorf("thumbnail speichern: %w", err)
	}

	thumbBounds := thumb.Bounds()
	thumbSize, _ := h.getFileSize(thumbPath)
	files = append(files, models.UploadFileInfo{
		Variant: "thumb",
		Path:    thumbRelPath,
		Width:   thumbBounds.Dx(),
		Height:  thumbBounds.Dy(),
	})

	txErr := h.repo.WithTx(ctx, func(txRepo repository.MediaUploadRepo) error {
		asset := &models.UploadMediaAsset{
			ID:         mediaID,
			EntityType: req.EntityType,
			EntityID:   req.EntityID,
			AssetType:  req.AssetType,
			Format:     "image",
			MimeType:   mimeType,
			UploadedBy: &actorUserID,
			CreatedAt:  time.Now(),
		}
		if err := txRepo.CreateMediaAsset(ctx, asset); err != nil {
			return fmt.Errorf("datenbank: media asset: %w", err)
		}
		for _, fileInfo := range files {
			size := thumbSize
			if fileInfo.Variant == "original" {
				size = originalSize
			}
			if err := txRepo.CreateMediaFile(ctx, &models.UploadMediaFile{
				MediaID: mediaID,
				Variant: fileInfo.Variant,
				Path:    fileInfo.Path,
				Width:   fileInfo.Width,
				Height:  fileInfo.Height,
				Size:    size,
			}); err != nil {
				return fmt.Errorf("datenbank: media file: %w", err)
			}
		}
		if err := h.createJoinTableEntryWithRepo(ctx, txRepo, req.EntityType, req.EntityID, mediaID); err != nil {
			return fmt.Errorf("datenbank: join table: %w", err)
		}
		return nil
	})
	if txErr != nil {
		h.cleanupStoragePath(storagePath)
		return nil, txErr
	}

	return &models.UploadResponse{
		ID:     mediaID,
		Status: "completed",
		Files:  files,
		URL:    h.buildPublicURL(originalRelPath),
	}, nil
}

func (h *MediaUploadHandler) isAnimatedGIF(file multipart.File) bool {
	return true
}

func (h *MediaUploadHandler) saveAsWebP(img image.Image, path string) error {
	return imaging.Save(img, path)
}
