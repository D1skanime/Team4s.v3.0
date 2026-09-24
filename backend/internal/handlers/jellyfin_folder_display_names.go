package handlers

import (
	"context"
	"log"
	"strings"

	"team4s.v3/backend/internal/models"
)

// hydrateJellyfinFolderDisplayNames best-effort populates FolderDisplayName/
// FolderPath on each folder option using one batched Jellyfin /Items call
// (via the existing getJellyfinSourceItems primitive, jellyfin_source_batch.go).
// It never errors and never blocks the caller: any Jellyfin failure (or a
// missing/unreachable Jellyfin config) simply leaves the folders unchanged
// (fail-open, GAP-01 T-QUICK260924-B7S-02). The common single-folder case
// (len(folders) <= 1) returns immediately with zero remote calls (D-14,
// T-QUICK260924-B7S-01).
func (h *AdminContentHandler) hydrateJellyfinFolderDisplayNames(ctx context.Context, folders []models.JellyfinFolderOption, knownMainFolderPath *string) []models.JellyfinFolderOption {
	if len(folders) <= 1 {
		return folders
	}

	if knownMainFolderPath != nil && strings.TrimSpace(*knownMainFolderPath) != "" {
		for i := range folders {
			if folders[i].IsMain {
				path := *knownMainFolderPath
				folders[i].FolderPath = &path
				break
			}
		}
	}

	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		return folders
	}

	ids := make([]string, 0, len(folders))
	for _, folder := range folders {
		ids = append(ids, folder.JellyfinItemID)
	}

	items, err := h.getJellyfinSourceItems(ctx, ids)
	if err != nil {
		log.Printf("episode import folder display name hydration failed: %v", err)
		return folders
	}

	for i := range folders {
		item, ok := items[folders[i].JellyfinItemID]
		if !ok {
			continue
		}
		name := strings.TrimSpace(item.Name)
		path := strings.TrimSpace(item.Path)
		if name != "" {
			displayName := name
			folders[i].FolderDisplayName = &displayName
		}
		switch {
		case path != "":
			folderPath := path
			folders[i].FolderPath = &folderPath
		case name != "":
			folderPath := name
			folders[i].FolderPath = &folderPath
		}
	}

	return folders
}
