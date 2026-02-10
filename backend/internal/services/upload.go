package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var (
	ErrFileTooLarge      = errors.New("file size exceeds maximum allowed")
	ErrInvalidFileType   = errors.New("invalid file type")
	ErrUploadFailed      = errors.New("failed to save uploaded file")
	ErrInvalidUploadType = errors.New("invalid upload type")
)

// AllowedImageTypes defines permitted MIME types for images
var AllowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// UploadConfig holds configuration for the upload service
type UploadConfig struct {
	BaseDir     string // Base directory for uploads (e.g., "./uploads")
	MaxFileSize int64  // Maximum file size in bytes (e.g., 5MB = 5*1024*1024)
	BaseURL     string // Base URL for serving files (e.g., "/uploads")
}

// DefaultUploadConfig returns default upload configuration
func DefaultUploadConfig() UploadConfig {
	return UploadConfig{
		BaseDir:     "./uploads",
		MaxFileSize: 5 * 1024 * 1024, // 5MB
		BaseURL:     "/uploads",
	}
}

// UploadService handles file uploads
type UploadService struct {
	config UploadConfig
}

// NewUploadService creates a new upload service
func NewUploadService(config UploadConfig) *UploadService {
	return &UploadService{config: config}
}

// UploadResult contains the result of a file upload
type UploadResult struct {
	Filename string `json:"filename"` // Stored filename
	URL      string `json:"url"`      // Full URL to access the file
	Size     int64  `json:"size"`     // File size in bytes
}

// UploadCover handles cover image upload
func (s *UploadService) UploadCover(file *multipart.FileHeader) (*UploadResult, error) {
	return s.uploadFile(file, "covers")
}

// uploadFile handles generic file upload to a subdirectory
func (s *UploadService) uploadFile(file *multipart.FileHeader, subdir string) (*UploadResult, error) {
	// Check file size
	if file.Size > s.config.MaxFileSize {
		return nil, ErrFileTooLarge
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Read first 512 bytes to detect content type
	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read file header: %w", err)
	}

	// Detect content type
	contentType := http.DetectContentType(buffer[:n])

	// Validate file type
	ext, ok := AllowedImageTypes[contentType]
	if !ok {
		return nil, ErrInvalidFileType
	}

	// Reset file reader to beginning
	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return nil, fmt.Errorf("failed to reset file reader: %w", err)
	}

	// Generate unique filename
	uniqueID, err := generateUniqueID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate unique ID: %w", err)
	}

	// Sanitize original filename for use as prefix
	originalName := sanitizeFilename(file.Filename)
	baseName := strings.TrimSuffix(originalName, filepath.Ext(originalName))
	if len(baseName) > 50 {
		baseName = baseName[:50]
	}

	// Create new filename: originalname_uniqueid.ext
	newFilename := fmt.Sprintf("%s_%s%s", baseName, uniqueID, ext)

	// Create target directory if it doesn't exist
	targetDir := filepath.Join(s.config.BaseDir, subdir)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create target file
	targetPath := filepath.Join(targetDir, newFilename)
	dst, err := os.Create(targetPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create target file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	written, err := io.Copy(dst, src)
	if err != nil {
		// Clean up on error
		os.Remove(targetPath)
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Build URL
	url := fmt.Sprintf("%s/%s/%s", s.config.BaseURL, subdir, newFilename)

	return &UploadResult{
		Filename: newFilename,
		URL:      url,
		Size:     written,
	}, nil
}

// DeleteCover deletes a cover image
func (s *UploadService) DeleteCover(filename string) error {
	return s.deleteFile(filename, "covers")
}

// deleteFile removes a file from a subdirectory
func (s *UploadService) deleteFile(filename, subdir string) error {
	// Sanitize filename to prevent path traversal
	filename = filepath.Base(filename)
	if filename == "." || filename == ".." {
		return errors.New("invalid filename")
	}

	targetPath := filepath.Join(s.config.BaseDir, subdir, filename)

	// Check if file exists
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		return nil // File doesn't exist, nothing to delete
	}

	return os.Remove(targetPath)
}

// GetUploadDir returns the base upload directory
func (s *UploadService) GetUploadDir() string {
	return s.config.BaseDir
}

// generateUniqueID creates a random hex string for unique filenames
func generateUniqueID() (string, error) {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// sanitizeFilename removes potentially dangerous characters from filename
func sanitizeFilename(filename string) string {
	// Get just the filename without path
	filename = filepath.Base(filename)

	// Replace spaces with underscores
	filename = strings.ReplaceAll(filename, " ", "_")

	// Remove any characters that aren't alphanumeric, underscore, hyphen, or dot
	var result strings.Builder
	for _, r := range filename {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') || r == '_' || r == '-' || r == '.' {
			result.WriteRune(r)
		}
	}

	return result.String()
}
