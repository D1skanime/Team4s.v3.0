package handlers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"
)

// scanEpisodeVersionFolder durchsucht den zu einer Episodenversion gehörenden Jellyfin-Ordner und gibt die gefundenen Mediendateien zurück.
func (h *AdminContentHandler) scanEpisodeVersionFolder(
	ctx context.Context,
	versionID int64,
) (*models.EpisodeVersionFolderScanResult, int, error) {
	resolved, err := h.resolveEpisodeVersionEditor(ctx, versionID)
	if err != nil {
		return nil, 0, err
	}
	if resolved.jellyfinSeriesID == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("ordner-sync ist nur fuer jellyfin-gebundene anime verfuegbar")
	}
	if !h.ensureJellyfinConfiguredForEditor() {
		return nil, http.StatusServiceUnavailable, fmt.Errorf("jellyfin ist nicht konfiguriert")
	}

	items, err := h.listJellyfinEpisodes(ctx, resolved.jellyfinSeriesID)
	if err != nil {
		return nil, http.StatusBadGateway, fmt.Errorf("ordner konnte nicht synchronisiert werden")
	}

	files := buildEpisodeVersionMediaFiles(items, resolved.animeFolderPath, h.buildJellyfinEditorStreamURL)
	return &models.EpisodeVersionFolderScanResult{
		VersionID:       resolved.version.ID,
		AnimeID:         resolved.version.AnimeID,
		AnimeFolderPath: resolved.animeFolderPath,
		Files:           files,
	}, 0, nil
}

// buildEpisodeVersionMediaFiles erstellt aus einer Liste von Jellyfin-Episoden eine sortierte Liste von Mediendatei-Einträgen für den Editor.
func buildEpisodeVersionMediaFiles(
	items []jellyfinEpisodeItem,
	folderPath *string,
	streamURLBuilder func(string) *string,
) []models.EpisodeVersionMediaFile {
	normalizedFolderPath := normalizeJellyfinPath(folderPath)
	files := make([]models.EpisodeVersionMediaFile, 0, len(items))
	for _, item := range items {
		itemID := strings.TrimSpace(item.ID)
		itemPath := strings.TrimSpace(item.Path)
		if itemID == "" || itemPath == "" {
			continue
		}
		if normalizedFolderPath != "" && !jellyfinPathHasPrefix(itemPath, normalizedFolderPath) {
			continue
		}

		entry := models.EpisodeVersionMediaFile{
			FileName:     path.Base(strings.ReplaceAll(itemPath, "\\", "/")),
			Path:         itemPath,
			MediaItemID:  itemID,
			StreamURL:    streamURLBuilder(itemID),
			VideoQuality: jellyfinVideoQuality(item.MediaStreams),
		}
		if releaseName := normalizeNullableStringPtr(fileBaseWithoutExt(itemPath)); releaseName != nil {
			entry.ReleaseName = releaseName
		}
		if episodeNumber := jellyfinEpisodeNumber(item.IndexNumber); episodeNumber > 0 {
			entry.DetectedEpisodeNumber = &episodeNumber
		}
		if fileInfo, err := os.Stat(itemPath); err == nil && !fileInfo.IsDir() {
			size := fileInfo.Size()
			modifiedAt := fileInfo.ModTime().UTC()
			entry.FileSizeBytes = &size
			entry.LastModified = &modifiedAt
		}
		files = append(files, entry)
	}

	sort.Slice(files, func(i, j int) bool {
		leftEpisode := int32(1 << 30)
		rightEpisode := int32(1 << 30)
		if files[i].DetectedEpisodeNumber != nil {
			leftEpisode = *files[i].DetectedEpisodeNumber
		}
		if files[j].DetectedEpisodeNumber != nil {
			rightEpisode = *files[j].DetectedEpisodeNumber
		}
		if leftEpisode != rightEpisode {
			return leftEpisode < rightEpisode
		}
		return strings.ToLower(files[i].FileName) < strings.ToLower(files[j].FileName)
	})

	return files
}

// extractJellyfinSourceID extrahiert die Jellyfin-Serien-ID aus einem Anime-Quellbezeichner im Format "jellyfin:<id>".
func extractJellyfinSourceID(source *string) string {
	raw := strings.TrimSpace(derefString(source))
	if raw == "" {
		return ""
	}
	if !strings.HasPrefix(strings.ToLower(raw), "jellyfin:") {
		return ""
	}
	return strings.TrimSpace(raw[len("jellyfin:"):])
}

// derefString dereferenziert einen Zeichenkettenzeiger und gibt eine leere Zeichenkette zurück, wenn der Zeiger nil ist.
func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
