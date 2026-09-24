package handlers

import (
	"context"
	"strings"

	"team4s.v3/backend/internal/models"
)

// jellyfinOwnedSource is one (seriesID, folderPath) pair an anime is allowed
// to accept a Jellyfin file's ownership from (GAP-11, 167-UAT.md). An anime
// can be connected to more than one Jellyfin folder (Phase 165 D-05/D-18) --
// resolveReviewedJellyfinSource now accepts a file if it matches ANY owned
// pair, not just the anime's single main folder. An empty SeriesID or
// FolderPath on a pair means "not checked on that dimension" (mirrors the
// pre-GAP-11 single-pair contract, where an empty seriesID/folder meant the
// caller had nothing to compare against).
type jellyfinOwnedSource struct {
	SeriesID   string
	FolderPath string
}

// matchOwnedJellyfinSource returns the first owned pair the given item
// satisfies. Fail-closed: an item whose SeriesID/Path doesn't satisfy ANY
// owned pair is rejected -- the IDOR protection from 165-04 is unchanged by
// this generalization, it just now checks against a SET of legitimate pairs
// instead of a single one.
func matchOwnedJellyfinSource(owned []jellyfinOwnedSource, seriesID, itemPath string) (jellyfinOwnedSource, bool) {
	for _, entry := range owned {
		if entry.SeriesID != "" && entry.SeriesID != seriesID {
			continue
		}
		if entry.FolderPath != "" && !jellyfinPathHasPrefix(itemPath, entry.FolderPath) {
			continue
		}
		return entry, true
	}
	return jellyfinOwnedSource{}, false
}

// ownedJellyfinSourcesFromFolders builds the owned-pair list for
// resolveReviewedJellyfinSource. The main (mainSeriesID, mainFolderPath) pair
// is ALWAYS included exactly as the caller already resolved it -- byte-
// identical to the pre-GAP-11 single-folder contract, including callers that
// resolve a main seriesID not literally derivable from source/source_links
// (e.g. resolveEpisodeImportSeriesByFolderPath's heuristic fallback, or a
// caller-supplied seriesID in a unit test). Every OTHER (non-main) folder in
// folders contributes an additional pair, using its own already-hydrated
// FolderPath (never re-derived from mainFolderPath).
func ownedJellyfinSourcesFromFolders(mainSeriesID string, mainFolderPath *string, folders []models.JellyfinFolderOption) []jellyfinOwnedSource {
	owned := []jellyfinOwnedSource{{SeriesID: strings.TrimSpace(mainSeriesID), FolderPath: normalizeJellyfinPath(mainFolderPath)}}
	for _, folder := range folders {
		if folder.IsMain {
			continue
		}
		owned = append(owned, jellyfinOwnedSource{SeriesID: strings.TrimSpace(folder.JellyfinItemID), FolderPath: normalizeJellyfinPath(folder.FolderPath)})
	}
	return owned
}

// hydrateFansubFolderPathsForRelink batched-populates FolderPath on every
// NON-main connected folder via one Jellyfin /Items call (never per-file --
// called once per relink/create request, regardless of how many folders are
// connected; zero calls when there is only one connected folder). Mirrors
// hydrateJellyfinFolderDisplayNames's fail-open, no-op-below-two-folders
// contract (jellyfin_folder_display_names.go), but as a free function so
// FansubHandler's resolveEpisodeVersionSource
// (episode_version_source_hydration.go) can reuse it too --
// hydrateJellyfinFolderDisplayNames itself stays bound to AdminContentHandler,
// unchanged.
func hydrateFansubFolderPathsForRelink(ctx context.Context, folders []models.JellyfinFolderOption, getItems func(context.Context, []string) (map[string]jellyfinEpisodeItem, error)) []models.JellyfinFolderOption {
	if len(folders) <= 1 || getItems == nil {
		return folders
	}
	ids := make([]string, 0, len(folders))
	for _, folder := range folders {
		if !folder.IsMain {
			ids = append(ids, folder.JellyfinItemID)
		}
	}
	if len(ids) == 0 {
		return folders
	}
	items, err := getItems(ctx, ids)
	if err != nil {
		return folders // fail-open: extra folders keep an empty FolderPath -> seriesID-only match in ownedJellyfinSourcesFromFolders
	}
	for i := range folders {
		if folders[i].IsMain {
			continue
		}
		item, ok := items[folders[i].JellyfinItemID]
		if !ok {
			continue
		}
		if path := strings.TrimSpace(item.Path); path != "" {
			folderPath := path
			folders[i].FolderPath = &folderPath
		}
	}
	return folders
}
