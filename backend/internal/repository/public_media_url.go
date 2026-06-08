package repository

import (
	"path/filepath"
	"strings"
)

func publicMediaURLForPath(filePath string, mediaStorageDir string) *string {
	trimmed := strings.TrimSpace(filePath)
	if trimmed == "" {
		return nil
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return &trimmed
	}

	normalized := filepath.ToSlash(trimmed)
	storageRoot := filepath.ToSlash(strings.TrimSpace(mediaStorageDir))
	if storageRoot != "" {
		storageRoot = strings.TrimRight(storageRoot, "/")
		if strings.HasPrefix(normalized, storageRoot+"/") {
			normalized = strings.TrimPrefix(normalized, storageRoot+"/")
		}
	}

	switch {
	case strings.HasPrefix(normalized, "/app/media/"):
		normalized = strings.TrimPrefix(normalized, "/app/media/")
	case strings.HasPrefix(normalized, "app/media/"):
		normalized = strings.TrimPrefix(normalized, "app/media/")
	case strings.HasPrefix(normalized, "/media/"):
		normalized = strings.TrimPrefix(normalized, "/media/")
	case strings.HasPrefix(normalized, "media/"):
		normalized = strings.TrimPrefix(normalized, "media/")
	default:
		if index := strings.Index(normalized, "/media/"); index >= 0 {
			normalized = strings.TrimPrefix(normalized[index:], "/media/")
		}
	}

	url := "/media/" + strings.TrimLeft(normalized, "/")
	return &url
}
