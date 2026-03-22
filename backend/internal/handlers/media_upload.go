package handlers

import (
	"context"
	"fmt"
	"image"
	"image/color"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxImageSize      = 50 * 1024 * 1024  // 50 MB
	maxVideoSize      = 300 * 1024 * 1024 // 300 MB
	thumbWidth        = 300
	videoThumbWidth   = 480
	webpQuality       = 85
	videoThumbTimeSec = 5.0
)

var (
	allowedImageMimeTypes = map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}

	allowedVideoMimeTypes = map[string]bool{
		"video/mp4":  true,
		"video/webm": true,
	}

	allowedEntityTypes = map[string]bool{
		"anime":   true,
		"episode": true,
		"fansub":  true,
		"release": true,
		"user":    true,
		"member":  true,
	}

	allowedAssetTypes = map[string]bool{
		"poster":  true,
		"banner":  true,
		"logo":    true,
		"avatar":  true,
		"gallery": true,
		"karaoke": true,
	}
)

type MediaUploadHandler struct {
	repo            repository.MediaUploadRepoTx
	mediaStorageDir string
	mediaBaseURL    string
	ffmpegPath      string
}

func NewMediaUploadHandler(repo repository.MediaUploadRepoTx, storageDir, baseURL, ffmpegPath string) *MediaUploadHandler {
	return &MediaUploadHandler{
		repo:            repo,
		mediaStorageDir: storageDir,
		mediaBaseURL:    baseURL,
		ffmpegPath:      ffmpegPath,
	}
}

// Upload handles POST /api/admin/upload
func (h *MediaUploadHandler) Upload(c *gin.Context) {
	var req models.UploadRequest
	if err := c.ShouldBind(&req); err != nil {
		log.Printf("media_upload: bad request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltige anfrage"})
		return
	}

	// Validate entity_type and asset_type
	if !allowedEntityTypes[req.EntityType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltiger entity_type"})
		return
	}

	if !allowedAssetTypes[req.AssetType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltiger asset_type"})
		return
	}

	// Get file from form
	fileHeader, err := c.FormFile("file")
	if err != nil {
		log.Printf("media_upload: no file uploaded: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "keine datei hochgeladen"})
		return
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("media_upload: failed to open file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "datei konnte nicht geoeffnet werden"})
		return
	}
	defer file.Close()

	// Validate file
	mimeType, format, err := h.validateFile(file, fileHeader.Size)
	if err != nil {
		log.Printf("media_upload: validation failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Reset file pointer after validation
	file.Seek(0, 0)

	// Generate UUID
	mediaID := uuid.New().String()

	// Create storage directory with path traversal protection
	storagePath := filepath.Join(
		h.mediaStorageDir,
		req.EntityType,
		fmt.Sprintf("%d", req.EntityID),
		req.AssetType,
		mediaID,
	)

	// Clean path and verify it's within the base directory
	storagePath = filepath.Clean(storagePath)
	baseDir := filepath.Clean(h.mediaStorageDir)
	if !strings.HasPrefix(storagePath, baseDir) {
		log.Printf("media_upload: path traversal attempt detected: %s", storagePath)
		c.JSON(http.StatusBadRequest, gin.H{"error": "ungueltige pfadangabe"})
		return
	}

	if err := os.MkdirAll(storagePath, 0755); err != nil {
		log.Printf("media_upload: failed to create directory: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verzeichnis konnte nicht erstellt werden"})
		return
	}

	// Process file based on format
	var uploadResp *models.UploadResponse
	if format == "image" {
		uploadResp, err = h.processImage(c.Request.Context(), file, mimeType, mediaID, req, storagePath)
	} else if format == "video" {
		uploadResp, err = h.processVideo(c.Request.Context(), file, mimeType, mediaID, req, storagePath)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nicht unterstuetztes format"})
		return
	}

	if err != nil {
		log.Printf("media_upload: processing failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verarbeitung fehlgeschlagen"})
		return
	}

	c.JSON(http.StatusOK, uploadResp)
}

// validateFile validates file type and size using magic bytes
func (h *MediaUploadHandler) validateFile(file multipart.File, size int64) (string, string, error) {
	// Read first 512 bytes for MIME detection
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", "", fmt.Errorf("datei konnte nicht gelesen werden")
	}

	// Detect MIME type using magic bytes
	mime := mimetype.Detect(buffer[:n])
	mimeType := mime.String()

	// Check if it's an allowed image type
	if allowedImageMimeTypes[mimeType] {
		if size > maxImageSize {
			return "", "", fmt.Errorf("bild zu gross (max %d MB)", maxImageSize/(1024*1024))
		}
		return mimeType, "image", nil
	}

	// Check if it's an allowed video type
	if allowedVideoMimeTypes[mimeType] {
		if size > maxVideoSize {
			return "", "", fmt.Errorf("video zu gross (max %d MB)", maxVideoSize/(1024*1024))
		}
		return mimeType, "video", nil
	}

	return "", "", fmt.Errorf("ungueltiger dateityp: %s", mimeType)
}

// processImage handles image processing and storage
func (h *MediaUploadHandler) processImage(
	ctx context.Context,
	file multipart.File,
	mimeType string,
	mediaID string,
	req models.UploadRequest,
	storagePath string,
) (*models.UploadResponse, error) {
	// Decode image
	img, format, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("bild konnte nicht dekodiert werden: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	var files []models.UploadFileInfo

	// Process original
	originalPath := filepath.Join(storagePath, "original.webp")
	originalRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "original.webp")

	// For animated GIFs, keep original format
	if format == "gif" && h.isAnimatedGIF(file) {
		originalPath = filepath.Join(storagePath, "original.gif")
		originalRelPath = h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "original.gif")

		// Copy original GIF
		file.Seek(0, 0)
		if err := h.saveFile(file, originalPath); err != nil {
			return nil, fmt.Errorf("original gif speichern: %w", err)
		}
	} else {
		// Convert to WebP
		if err := h.saveAsWebP(img, originalPath); err != nil {
			return nil, fmt.Errorf("webp speichern: %w", err)
		}
	}

	originalSize, _ := h.getFileSize(originalPath)
	files = append(files, models.UploadFileInfo{
		Variant: "original",
		Path:    originalRelPath,
		Width:   originalWidth,
		Height:  originalHeight,
	})

	// Generate thumbnail
	thumbPath := filepath.Join(storagePath, "thumb.webp")
	thumbRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "thumb.webp")

	thumb := imaging.Resize(img, thumbWidth, 0, imaging.Lanczos)
	if err := h.saveAsWebP(thumb, thumbPath); err != nil {
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

	// Create database records within transaction
	asset := &models.UploadMediaAsset{
		ID:         mediaID,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		AssetType:  req.AssetType,
		Format:     "image",
		MimeType:   mimeType,
		CreatedAt:  time.Now(),
	}

	// Wrap all DB writes in a transaction
	txErr := h.repo.WithTx(ctx, func(txRepo repository.MediaUploadRepo) error {
		if err := txRepo.CreateMediaAsset(ctx, asset); err != nil {
			return fmt.Errorf("datenbank: media asset: %w", err)
		}

		// Create media file records
		for _, fileInfo := range files {
			var size int64
			if fileInfo.Variant == "original" {
				size = originalSize
			} else {
				size = thumbSize
			}

			mediaFile := &models.UploadMediaFile{
				MediaID: mediaID,
				Variant: fileInfo.Variant,
				Path:    fileInfo.Path,
				Width:   fileInfo.Width,
				Height:  fileInfo.Height,
				Size:    size,
			}

			if err := txRepo.CreateMediaFile(ctx, mediaFile); err != nil {
				return fmt.Errorf("datenbank: media file: %w", err)
			}
		}

		// Create join table entry
		if err := h.createJoinTableEntryWithRepo(ctx, txRepo, req.EntityType, req.EntityID, mediaID); err != nil {
			return fmt.Errorf("datenbank: join table: %w", err)
		}

		return nil
	})

	if txErr != nil {
		// Cleanup files on database error
		h.cleanupStoragePath(storagePath)
		return nil, txErr
	}

	// Build response
	response := &models.UploadResponse{
		ID:     mediaID,
		Status: "completed",
		Files:  files,
		URL:    h.buildPublicURL(originalRelPath),
	}

	return response, nil
}

// processVideo handles video processing and storage
func (h *MediaUploadHandler) processVideo(
	ctx context.Context,
	file multipart.File,
	mimeType string,
	mediaID string,
	req models.UploadRequest,
	storagePath string,
) (*models.UploadResponse, error) {
	// Check if FFmpeg is available
	if h.ffmpegPath == "" {
		return nil, fmt.Errorf("ffmpeg nicht konfiguriert")
	}

	// Determine file extension based on MIME type
	var ext string
	switch mimeType {
	case "video/mp4":
		ext = ".mp4"
	case "video/webm":
		ext = ".webm"
	default:
		return nil, fmt.Errorf("nicht unterstuetzter video-typ: %s", mimeType)
	}

	// Save original video (1:1 copy, no re-encoding)
	originalFilename := "original" + ext
	originalPath := filepath.Join(storagePath, originalFilename)
	originalRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, originalFilename)

	if err := h.saveFile(file, originalPath); err != nil {
		return nil, fmt.Errorf("video speichern: %w", err)
	}

	originalSize, _ := h.getFileSize(originalPath)

	// Get video dimensions
	width, height, duration, err := h.getVideoMetadata(originalPath)
	if err != nil {
		log.Printf("warning: failed to get video metadata: %v", err)
		width, height = 0, 0
		duration = 0
	}

	var files []models.UploadFileInfo
	files = append(files, models.UploadFileInfo{
		Variant: "original",
		Path:    originalRelPath,
		Width:   width,
		Height:  height,
	})

	// Extract thumbnail from video
	thumbPath := filepath.Join(storagePath, "thumb.webp")
	thumbRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "thumb.webp")

	// Determine which frame to extract (5 seconds or start if video is shorter)
	extractTime := videoThumbTimeSec
	if duration > 0 && duration < videoThumbTimeSec {
		extractTime = 0
	}

	if err := h.extractVideoThumbnail(originalPath, thumbPath, extractTime); err != nil {
		log.Printf("warning: thumbnail extraction failed: %v", err)
		// Create a black placeholder thumbnail instead of failing
		if err := h.createBlackThumbnail(thumbPath); err != nil {
			return nil, fmt.Errorf("thumbnail erstellen: %w", err)
		}
	}

	// Get thumbnail dimensions
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

	// Create database records within transaction
	asset := &models.UploadMediaAsset{
		ID:         mediaID,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		AssetType:  req.AssetType,
		Format:     "video",
		MimeType:   mimeType,
		CreatedAt:  time.Now(),
	}

	// Wrap all DB writes in a transaction
	txErr := h.repo.WithTx(ctx, func(txRepo repository.MediaUploadRepo) error {
		if err := txRepo.CreateMediaAsset(ctx, asset); err != nil {
			return fmt.Errorf("datenbank: media asset: %w", err)
		}

		// Create media file records
		for _, fileInfo := range files {
			var size int64
			if fileInfo.Variant == "original" {
				size = originalSize
			} else {
				size = thumbSize
			}

			mediaFile := &models.UploadMediaFile{
				MediaID: mediaID,
				Variant: fileInfo.Variant,
				Path:    fileInfo.Path,
				Width:   fileInfo.Width,
				Height:  fileInfo.Height,
				Size:    size,
			}

			if err := txRepo.CreateMediaFile(ctx, mediaFile); err != nil {
				return fmt.Errorf("datenbank: media file: %w", err)
			}
		}

		// Create join table entry
		if err := h.createJoinTableEntryWithRepo(ctx, txRepo, req.EntityType, req.EntityID, mediaID); err != nil {
			return fmt.Errorf("datenbank: join table: %w", err)
		}

		return nil
	})

	if txErr != nil {
		// Cleanup files on database error
		h.cleanupStoragePath(storagePath)
		return nil, txErr
	}

	// Build response
	response := &models.UploadResponse{
		ID:     mediaID,
		Status: "completed",
		Files:  files,
		URL:    h.buildPublicURL(originalRelPath),
	}

	return response, nil
}

// isAnimatedGIF checks if a GIF is animated (simplified check)
func (h *MediaUploadHandler) isAnimatedGIF(file multipart.File) bool {
	// For now, assume GIFs might be animated
	// A full implementation would parse GIF structure
	return true
}

// saveAsWebP saves an image as WebP format using imaging library
func (h *MediaUploadHandler) saveAsWebP(img image.Image, path string) error {
	// Use imaging library to save as WebP
	// Quality is set globally by imaging library
	return imaging.Save(img, path)
}

// saveFile saves a file from reader to path
func (h *MediaUploadHandler) saveFile(reader io.Reader, path string) error {
	out, err := os.Create(path)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, reader)
	return err
}

// getFileSize returns file size in bytes
func (h *MediaUploadHandler) getFileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

// buildRelativePath builds the relative path for a media file
func (h *MediaUploadHandler) buildRelativePath(entityType string, entityID int64, assetType, mediaID, filename string) string {
	return fmt.Sprintf("/media/%s/%d/%s/%s/%s", entityType, entityID, assetType, mediaID, filename)
}

// buildPublicURL builds the public URL for a media file
func (h *MediaUploadHandler) buildPublicURL(relativePath string) string {
	return strings.TrimRight(h.mediaBaseURL, "/") + relativePath
}

// createJoinTableEntry creates the appropriate join table entry based on entity type
func (h *MediaUploadHandler) createJoinTableEntry(ctx context.Context, entityType string, entityID int64, mediaID string) error {
	return h.createJoinTableEntryWithRepo(ctx, h.repo, entityType, entityID, mediaID)
}

// createJoinTableEntryWithRepo creates the appropriate join table entry with a specific repo instance
func (h *MediaUploadHandler) createJoinTableEntryWithRepo(ctx context.Context, repo repository.MediaUploadRepo, entityType string, entityID int64, mediaID string) error {
	switch entityType {
	case "anime":
		return repo.CreateAnimeMedia(ctx, entityID, mediaID, 0)
	case "episode":
		return repo.CreateEpisodeMedia(ctx, entityID, mediaID, 0)
	case "fansub":
		return repo.CreateFansubGroupMedia(ctx, entityID, mediaID)
	case "release":
		return repo.CreateReleaseMedia(ctx, entityID, mediaID, 0)
	default:
		// For user and member, we don't have join tables yet
		return nil
	}
}

// Delete handles DELETE /api/admin/media/{id}
func (h *MediaUploadHandler) Delete(c *gin.Context) {
	mediaID := c.Param("id")
	if mediaID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "media id fehlt"})
		return
	}

	// Get media asset to find storage path
	asset, err := h.repo.GetMediaAsset(c.Request.Context(), mediaID)
	if err != nil {
		log.Printf("media_upload: get asset failed: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "media nicht gefunden"})
		return
	}

	// Delete from database
	if err := h.repo.DeleteMediaAsset(c.Request.Context(), mediaID); err != nil {
		log.Printf("media_upload: delete from db failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "loeschen fehlgeschlagen"})
		return
	}

	// Delete storage directory with path traversal protection
	storagePath := filepath.Join(
		h.mediaStorageDir,
		asset.EntityType,
		fmt.Sprintf("%d", asset.EntityID),
		asset.AssetType,
		mediaID,
	)

	// Clean path and verify it's within the base directory
	storagePath = filepath.Clean(storagePath)
	baseDir := filepath.Clean(h.mediaStorageDir)
	if !strings.HasPrefix(storagePath, baseDir) {
		log.Printf("media_upload: path traversal attempt detected during delete: %s", storagePath)
		// Don't fail the request since DB deletion succeeded
	} else {
		if err := os.RemoveAll(storagePath); err != nil {
			log.Printf("media_upload: delete directory failed: %v", err)
			// Don't fail the request if directory deletion fails
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// extractVideoThumbnail extracts a thumbnail from a video at the specified time
func (h *MediaUploadHandler) extractVideoThumbnail(videoPath, outputPath string, timeSeconds float64) error {
	// ffmpeg -i input.mp4 -ss 00:00:05 -frames:v 1 -f image2 temp.png
	tempPNG := outputPath + ".tmp.png"
	defer os.Remove(tempPNG)

	timeStr := fmt.Sprintf("%.2f", timeSeconds)
	cmd := exec.Command(
		h.ffmpegPath,
		"-i", videoPath,
		"-ss", timeStr,
		"-frames:v", "1",
		"-f", "image2",
		"-y", // overwrite output
		tempPNG,
	)

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg frame extraction failed: %w", err)
	}

	// Load PNG and convert to WebP with resizing
	img, err := imaging.Open(tempPNG)
	if err != nil {
		return fmt.Errorf("open extracted frame: %w", err)
	}

	// Resize to videoThumbWidth (480px) maintaining aspect ratio
	resized := imaging.Resize(img, videoThumbWidth, 0, imaging.Lanczos)

	// Save as WebP
	if err := imaging.Save(resized, outputPath); err != nil {
		return fmt.Errorf("save thumbnail as webp: %w", err)
	}

	return nil
}

// getVideoMetadata retrieves video width, height, and duration using ffprobe
func (h *MediaUploadHandler) getVideoMetadata(videoPath string) (width, height int, duration float64, err error) {
	// Use ffprobe to get video metadata
	// ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=noprint_wrappers=1 input.mp4
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

// createBlackThumbnail creates a black placeholder thumbnail
func (h *MediaUploadHandler) createBlackThumbnail(outputPath string) error {
	// Create a black 480x270 image (16:9 aspect ratio)
	img := imaging.New(480, 270, color.Black)
	return imaging.Save(img, outputPath)
}

// cleanupStoragePath removes a storage directory and logs errors
func (h *MediaUploadHandler) cleanupStoragePath(storagePath string) {
	if err := os.RemoveAll(storagePath); err != nil {
		log.Printf("media_upload: failed to cleanup storage path %s: %v", storagePath, err)
	}
}
