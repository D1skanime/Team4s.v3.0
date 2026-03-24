package handlers

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"team4s.v3/backend/internal/repository"
)

func (h *MediaUploadHandler) saveFile(reader io.Reader, path string) error {
	out, err := os.Create(path)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, reader)
	return err
}

func (h *MediaUploadHandler) getFileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

func (h *MediaUploadHandler) buildRelativePath(entityType string, entityID int64, assetType, mediaID, filename string) string {
	return fmt.Sprintf("/media/%s/%d/%s/%s/%s", entityType, entityID, assetType, mediaID, filename)
}

func (h *MediaUploadHandler) buildPublicURL(relativePath string) string {
	return strings.TrimRight(h.mediaBaseURL, "/") + relativePath
}

func (h *MediaUploadHandler) createJoinTableEntry(ctx context.Context, entityType string, entityID int64, mediaID string) error {
	return h.createJoinTableEntryWithRepo(ctx, h.repo, entityType, entityID, mediaID)
}

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
		return nil
	}
}

func (h *MediaUploadHandler) cleanupStoragePath(storagePath string) {
	if err := os.RemoveAll(storagePath); err != nil {
		log.Printf("media_upload: failed to cleanup storage path %s: %v", storagePath, err)
	}
}
