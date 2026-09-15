package handlers

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
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
		return nil, http.StatusBadRequest, fmt.Errorf("ordner-sync ist nur für jellyfin-gebundene anime verfügbar")
	}
	if !h.ensureJellyfinConfiguredForEditor() {
		return nil, http.StatusServiceUnavailable, fmt.Errorf("jellyfin ist nicht konfiguriert")
	}

	items, err := h.listJellyfinEpisodes(ctx, resolved.jellyfinSeriesID)
	if err != nil {
		return nil, http.StatusBadGateway, fmt.Errorf("ordner konnte nicht synchronisiert werden")
	}

	itemIDs := make([]string, 0, len(items))
	for _, item := range items {
		itemIDs = append(itemIDs, item.ID)
	}
	// One existing batch reader, regardless of the number of nested sources.
	bindings, err := h.episodeVersionRepo.GetJellyfinSourceBindings(ctx, itemIDs)
	if err != nil {
		return nil, sourceHydrationRepositoryStatus(err), fmt.Errorf("Die gespeicherten Jellyfin-Quellen konnten nicht geladen werden.")
	}
	files, err := buildEpisodeVersionMediaFiles(items, resolved.jellyfinSeriesID, resolved.animeFolderPath, bindings, h.buildJellyfinEditorStreamURL)
	if err != nil {
		return nil, http.StatusConflict, err
	}
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
	seriesID string,
	folderPath *string,
	bindings map[string]models.JellyfinSourceSnapshot,
	streamURLBuilder func(string) *string,
) ([]models.EpisodeVersionMediaFile, error) {
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

		var stored *models.JellyfinSourceSnapshot
		if binding, ok := bindings[itemID]; ok {
			stored = &binding
		}
		source, err := resolveReviewedJellyfinSource(item, itemID, "", seriesID, normalizedFolderPath, stored)
		if err != nil {
			return nil, err
		}
		entry := buildEpisodeVersionMediaFile(item, source, streamURLBuilder)

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

	return files, nil
}

// Shared admin projection for already-resolved source metadata; scans omit chapter hints.
func buildEpisodeVersionMediaFile(item jellyfinEpisodeItem, source resolvedJellyfinMediaSource, streamURLBuilder func(string) *string) models.EpisodeVersionMediaFile {
	entry := models.EpisodeVersionMediaFile{
		FileName:      source.FileName,
		Path:          source.Snapshot.SourcePath,
		MediaItemID:   source.JellyfinItemID,
		MediaSourceID: &source.Snapshot.MediaSourceID,
		StreamURL:     streamURLBuilder(source.JellyfinItemID),
		VideoQuality:  source.VideoQuality,
		FileSizeBytes: source.FileSizeBytes,
	}
	if releaseName := normalizeNullableStringPtr(fileBaseWithoutExt(source.FileName)); releaseName != nil {
		entry.ReleaseName = releaseName
	}
	if episodeNumber := jellyfinEpisodeNumber(item.IndexNumber); episodeNumber > 0 {
		entry.DetectedEpisodeNumber = &episodeNumber
	}
	return entry
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

// resolveControlledFilePath loest einen relativen oder absoluten Pfad kontrolliert unterhalb von root auf.
// Pfade, die ausserhalb von root liegen wuerden (z.B. per "../"), werden abgelehnt.
func resolveControlledFilePath(root string, rawPath string) (string, bool) {
	trimmedRoot := strings.TrimSpace(root)
	trimmedPath := strings.TrimSpace(rawPath)
	if trimmedRoot == "" || trimmedPath == "" {
		return "", false
	}
	rootAbs, err := filepath.Abs(trimmedRoot)
	if err != nil {
		return "", false
	}
	candidate := trimmedPath
	if !filepath.IsAbs(candidate) {
		candidate = filepath.Join(rootAbs, filepath.FromSlash(candidate))
	}
	candidateAbs, err := filepath.Abs(candidate)
	if err != nil {
		return "", false
	}
	rel, err := filepath.Rel(rootAbs, candidateAbs)
	if err != nil || rel == "." || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
		return "", false
	}
	return candidateAbs, true
}
