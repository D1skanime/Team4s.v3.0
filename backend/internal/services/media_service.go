package services

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/gabriel-vasile/mimetype"
)

type MediaSaveResult struct {
	CreateInput  models.MediaAssetCreateInput
	GIFLargeHint bool
}

type MediaValidationError struct {
	Message string
}

func (e *MediaValidationError) Error() string {
	return e.Message
}

type MediaService struct {
	storageDir    string
	publicBaseURL string
}

func NewMediaService(storageDir, publicBaseURL string) *MediaService {
	dir := strings.TrimSpace(storageDir)
	if dir == "" {
		dir = "./storage/media"
	}

	baseURL := strings.TrimRight(strings.TrimSpace(publicBaseURL), "/")
	if baseURL == "" {
		baseURL = "http://localhost:8092"
	}

	return &MediaService{
		storageDir:    dir,
		publicBaseURL: baseURL,
	}
}

func (s *MediaService) SaveUpload(kind models.MediaKind, originalName string, data []byte) (*MediaSaveResult, error) {
	if len(data) == 0 {
		return nil, &MediaValidationError{Message: "datei ist leer"}
	}

	maxSize := int64(2 * 1024 * 1024)
	if kind == models.MediaKindBanner {
		maxSize = 5 * 1024 * 1024
	}
	if int64(len(data)) > maxSize {
		if kind == models.MediaKindLogo {
			return nil, &MediaValidationError{Message: "logo ist zu gross (max 2MB)"}
		}
		return nil, &MediaValidationError{Message: "banner ist zu gross (max 5MB)"}
	}

	detectedMime := detectMimeType(data)
	if err := validateMimeForKind(kind, detectedMime); err != nil {
		return nil, err
	}

	width, height := decodeImageDimensions(data)
	ext := extensionFromMime(detectedMime)
	filename := buildFilename(kind, ext)
	absolutePath := filepath.Join(s.storageDir, filename)

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return nil, fmt.Errorf("create media directory: %w", err)
	}
	if err := os.WriteFile(absolutePath, data, fs.FileMode(0o644)); err != nil {
		return nil, fmt.Errorf("write media file: %w", err)
	}

	publicURL := fmt.Sprintf("%s/api/v1/media/files/%s", s.publicBaseURL, url.PathEscape(filename))

	result := &MediaSaveResult{
		CreateInput: models.MediaAssetCreateInput{
			Filename:    filename,
			StoragePath: absolutePath,
			PublicURL:   publicURL,
			MimeType:    detectedMime,
			SizeBytes:   int64(len(data)),
			Width:       width,
			Height:      height,
		},
	}
	if kind == models.MediaKindBanner && detectedMime == "image/gif" && len(data) > 4*1024*1024 {
		result.GIFLargeHint = true
	}

	_ = originalName
	return result, nil
}

func detectMimeType(data []byte) string {
	detected := mimetype.Detect(data).String()
	detected = strings.ToLower(strings.TrimSpace(detected))
	if detected == "" || detected == "application/octet-stream" {
		detected = strings.ToLower(strings.TrimSpace(http.DetectContentType(data)))
	}

	if strings.Contains(detected, "svg") {
		return "image/svg+xml"
	}
	if (strings.HasPrefix(detected, "text/") || strings.Contains(detected, "xml")) && bytes.Contains(bytes.ToLower(data), []byte("<svg")) {
		return "image/svg+xml"
	}

	switch detected {
	case "image/png":
		return "image/png"
	case "image/jpeg":
		return "image/jpeg"
	case "image/webp":
		return "image/webp"
	case "image/gif":
		return "image/gif"
	default:
		return detected
	}
}

func validateMimeForKind(kind models.MediaKind, mimeType string) error {
	allowedLogo := map[string]struct{}{
		"image/svg+xml": {},
		"image/png":     {},
		"image/jpeg":    {},
		"image/webp":    {},
	}
	allowedBanner := map[string]struct{}{
		"image/png":  {},
		"image/jpeg": {},
		"image/webp": {},
		"image/gif":  {},
	}

	if kind == models.MediaKindLogo {
		if _, ok := allowedLogo[mimeType]; !ok {
			return &MediaValidationError{Message: "ungueltiges dateiformat fuer logo (erlaubt: SVG, PNG, JPG, WEBP)"}
		}
		return nil
	}

	if kind == models.MediaKindBanner {
		if _, ok := allowedBanner[mimeType]; !ok {
			if mimeType == "image/svg+xml" {
				return &MediaValidationError{Message: "svg ist fuer banner nicht erlaubt"}
			}
			return &MediaValidationError{Message: "ungueltiges dateiformat fuer banner (erlaubt: PNG, JPG, WEBP, GIF)"}
		}
		return nil
	}

	return &MediaValidationError{Message: "ungueltiger media-typ"}
}

func decodeImageDimensions(data []byte) (*int, *int) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, nil
	}

	width := cfg.Width
	height := cfg.Height
	return &width, &height
}

func extensionFromMime(mimeType string) string {
	switch mimeType {
	case "image/svg+xml":
		return "svg"
	case "image/png":
		return "png"
	case "image/jpeg":
		return "jpg"
	case "image/webp":
		return "webp"
	case "image/gif":
		return "gif"
	default:
		return "bin"
	}
}

func buildFilename(kind models.MediaKind, extension string) string {
	var randomBytes [8]byte
	if _, err := rand.Read(randomBytes[:]); err != nil {
		now := time.Now().UnixNano()
		return fmt.Sprintf("%s_%d.%s", kind, now, extension)
	}

	return fmt.Sprintf("%s_%d_%s.%s", kind, time.Now().UnixMilli(), hex.EncodeToString(randomBytes[:]), extension)
}
