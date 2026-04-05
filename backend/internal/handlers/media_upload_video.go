package handlers

import (
	"context"
	"fmt"
	"image/color"
	"log"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
)

func (h *MediaUploadHandler) processVideo(
	ctx context.Context,
	file multipart.File,
	mimeType string,
	mediaID string,
	req models.UploadRequest,
	storagePath string,
	actorUserID int64,
	provisioning *models.ProvisioningResult,
) (*models.UploadResponse, error) {
	if h.ffmpegPath == "" {
		return nil, fmt.Errorf("ffmpeg nicht konfiguriert")
	}

	ext, err := videoExtensionForMime(mimeType)
	if err != nil {
		return nil, err
	}

	originalFilename := "original" + ext
	originalPath := filepath.Join(storagePath, originalFilename)
	originalRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, originalFilename)
	if err := h.saveFile(file, originalPath); err != nil {
		return nil, fmt.Errorf("video speichern: %w", err)
	}

	originalSize, _ := h.getFileSize(originalPath)
	width, height, duration, err := h.getVideoMetadata(originalPath)
	if err != nil {
		log.Printf("warning: failed to get video metadata: %v", err)
		width, height, duration = 0, 0, 0
	}

	files := []models.UploadFileInfo{{
		Variant: "original",
		Path:    originalRelPath,
		Width:   width,
		Height:  height,
	}}

	thumbPath := filepath.Join(storagePath, "thumb.jpg")
	thumbRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "thumb.jpg")
	extractTime := videoThumbTimeSec
	if duration > 0 && duration < videoThumbTimeSec {
		extractTime = 0
	}
	if err := h.extractVideoThumbnail(originalPath, thumbPath, extractTime); err != nil {
		log.Printf("warning: thumbnail extraction failed: %v", err)
		if err := h.createBlackThumbnail(thumbPath); err != nil {
			return nil, fmt.Errorf("thumbnail erstellen: %w", err)
		}
	}

	thumbWidth, thumbHeight := 0, 0
	if thumbImg, err := imaging.Open(thumbPath); err == nil {
		thumbBounds := thumbImg.Bounds()
		thumbWidth = thumbBounds.Dx()
		thumbHeight = thumbBounds.Dy()
	}

	thumbSize, _ := h.getFileSize(thumbPath)
	files = append(files, models.UploadFileInfo{
		Variant: "thumb",
		Path:    thumbRelPath,
		Width:   thumbWidth,
		Height:  thumbHeight,
	})

	txErr := h.repo.WithTx(ctx, func(txRepo repository.MediaUploadRepo) error {
		asset := &models.UploadMediaAsset{
			ID:         mediaID,
			EntityType: req.EntityType,
			EntityID:   req.EntityID,
			AssetType:  req.AssetType,
			Format:     "video",
			MimeType:   mimeType,
			UploadedBy: &actorUserID,
			CreatedAt:  time.Now(),
			FilePath:   originalRelPath,
			MediaType:  mediaTypeForUploadAsset(req.AssetType),
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
				MediaID: asset.ID,
				Variant: fileInfo.Variant,
				Path:    fileInfo.Path,
				Width:   fileInfo.Width,
				Height:  fileInfo.Height,
				Size:    size,
			}); err != nil {
				return fmt.Errorf("datenbank: media file: %w", err)
			}
		}
		if err := h.createJoinTableEntryWithRepo(ctx, txRepo, req.EntityType, req.EntityID, asset.ID); err != nil {
			return fmt.Errorf("datenbank: join table: %w", err)
		}
		mediaID = asset.ID
		return nil
	})
	if txErr != nil {
		h.cleanupStoragePath(storagePath)
		return nil, txErr
	}

	return &models.UploadResponse{
		ID:           mediaID,
		Status:       "completed",
		Files:        files,
		URL:          h.buildPublicURL(originalRelPath),
		Provisioning: provisioning,
	}, nil
}

func videoExtensionForMime(mimeType string) (string, error) {
	switch mimeType {
	case "video/mp4":
		return ".mp4", nil
	case "video/webm":
		return ".webm", nil
	default:
		return "", fmt.Errorf("nicht unterstuetzter video-typ: %s", mimeType)
	}
}

func (h *MediaUploadHandler) extractVideoThumbnail(videoPath, outputPath string, timeSeconds float64) error {
	tempPNG := outputPath + ".tmp.png"
	defer os.Remove(tempPNG)

	cmd := exec.Command(
		h.ffmpegPath,
		"-i", videoPath,
		"-ss", fmt.Sprintf("%.2f", timeSeconds),
		"-frames:v", "1",
		"-f", "image2",
		"-y",
		tempPNG,
	)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg frame extraction failed: %w", err)
	}

	img, err := imaging.Open(tempPNG)
	if err != nil {
		return fmt.Errorf("open extracted frame: %w", err)
	}
	resized := imaging.Resize(img, videoThumbWidth, 0, imaging.Lanczos)
	if err := imaging.Save(resized, outputPath); err != nil {
		return fmt.Errorf("save thumbnail as webp: %w", err)
	}
	return nil
}

func (h *MediaUploadHandler) getVideoMetadata(videoPath string) (width, height int, duration float64, err error) {
	ffprobePath := strings.Replace(h.ffmpegPath, "ffmpeg", "ffprobe", 1)
	cmd := exec.Command(
		ffprobePath,
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height,duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)
	output, err := cmd.Output()
	if err != nil {
		return 0, 0, 0, err
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) >= 2 {
		width, _ = strconv.Atoi(strings.TrimSpace(lines[0]))
		height, _ = strconv.Atoi(strings.TrimSpace(lines[1]))
		if len(lines) >= 3 {
			duration, _ = strconv.ParseFloat(strings.TrimSpace(lines[2]), 64)
		}
	}
	return width, height, duration, nil
}

func (h *MediaUploadHandler) createBlackThumbnail(outputPath string) error {
	return imaging.Save(imaging.New(480, 270, color.Black), outputPath)
}
