package handlers

import (
	"context"
	"errors"
	"log"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// episodeVersionEditorResolved fasst alle aufgelösten Abhängigkeiten zusammen, die für den Episodenversionsedit-Kontext benötigt werden.
type episodeVersionEditorResolved struct {
	version                    *models.EpisodeVersion
	animeSource                *models.AdminAnimeSyncSource
	animeFolderPath            *string
	jellyfinSeriesID           string
	jellyfinEnrichmentDegraded bool
	selectedGroups             []models.FansubGroupSummary
}

// loadEpisodeVersionEditorContext löst alle für den Editor benötigten Daten auf und gibt den zusammengestellten Bearbeitungskontext zurück.
func (h *AdminContentHandler) loadEpisodeVersionEditorContext(
	ctx context.Context,
	versionID int64,
) (*models.EpisodeVersionEditorContext, error) {
	resolved, err := h.resolveEpisodeVersionEditor(ctx, versionID)
	if err != nil {
		return nil, err
	}

	version := *resolved.version
	selectedFile, fileDegraded := h.enrichEpisodeVersionSelectedFile(ctx, &version, resolved.animeSource, resolved.animeFolderPath, resolved.jellyfinSeriesID)

	dateNeighbors, err := h.episodeVersionRepo.ListDateNeighbors(ctx, version.ReleaseVersionID)
	if err != nil {
		return nil, err
	}

	episode, err := h.repo.GetEpisodeClassificationByReleaseVersion(ctx, version.ReleaseVersionID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	return &models.EpisodeVersionEditorContext{
		Episode:                    episode,
		SelectedFile:               selectedFile,
		Version:                    version,
		AnimeTitle:                 resolved.animeSource.Title,
		AnimeFolderPath:            resolved.animeFolderPath,
		SelectedGroups:             resolved.selectedGroups,
		DateNeighbors:              dateNeighbors,
		JellyfinEnrichmentDegraded: resolved.jellyfinEnrichmentDegraded || fileDegraded,
	}, nil
}

// loadEpisodeVersionContributorContext liefert nur den Kontext, den Media- und
// Notiz-Contributors für die schmale Arbeitsfläche benötigen. Admin-Felder wie
// Ordnerpfad, Provider-IDs und Stream-URLs bleiben bewusst leer.
func (h *AdminContentHandler) loadEpisodeVersionContributorContext(
	ctx context.Context,
	versionID int64,
) (*models.EpisodeVersionEditorContext, error) {
	version, err := h.episodeVersionRepo.GetByID(ctx, versionID)
	if err != nil {
		return nil, err
	}

	animeSource, err := h.repo.GetAnimeSyncSource(ctx, version.AnimeID)
	if err != nil {
		return nil, err
	}

	// Reuse loaded ownership metadata; contributors do not need the admin folder lookup.
	selectedFile, fileDegraded := h.enrichEpisodeVersionSelectedFile(ctx, version, animeSource, animeSource.FolderName,
		jellyfinSeriesIDFromAnimeSource(animeSource.Source, animeSource.SourceLinks))
	if selectedFile != nil {
		selectedFile = &models.EpisodeVersionMediaFile{
			FileName:      selectedFile.FileName,
			FileSizeBytes: selectedFile.FileSizeBytes,
			ChapterHints:  selectedFile.ChapterHints,
		}
	}

	safeVersion := models.EpisodeVersion{
		ID:                  version.ID,
		VariantID:           version.VariantID,
		ReleaseVersionID:    version.ReleaseVersionID,
		AnimeID:             version.AnimeID,
		EpisodeNumber:       version.EpisodeNumber,
		Title:               version.Title,
		ReleaseVersion:      version.ReleaseVersion,
		FansubGroups:        version.FansubGroups,
		ProductionStartedOn: version.ProductionStartedOn,
		ReleaseDate:         version.ReleaseDate,
		VideoQuality:        version.VideoQuality,
		SubtitleType:        version.SubtitleType,
		CRC32:               version.CRC32,
		DurationSeconds:     version.DurationSeconds,
		CreatedAt:           version.CreatedAt,
		UpdatedAt:           version.UpdatedAt,
	}

	selectedGroups, err := h.resolveEpisodeVersionSelectedGroups(ctx, version)
	if err != nil {
		return nil, err
	}

	dateNeighbors, err := h.episodeVersionRepo.ListDateNeighbors(ctx, version.ReleaseVersionID)
	if err != nil {
		return nil, err
	}

	return &models.EpisodeVersionEditorContext{
		SelectedFile:               selectedFile,
		JellyfinEnrichmentDegraded: fileDegraded,
		Version:                    safeVersion,
		AnimeTitle:                 animeSource.Title,
		SelectedGroups:             selectedGroups,
		DateNeighbors:              dateNeighbors,
	}, nil
}

// enrichEpisodeVersionSelectedFile uses only already-loaded rows and one exact-item
// request shared by duration, bytes and chapters. No repository or filesystem access.
func (h *AdminContentHandler) enrichEpisodeVersionSelectedFile(
	ctx context.Context, version *models.EpisodeVersion, anime *models.AdminAnimeSyncSource, folder *string, seriesID string,
) (*models.EpisodeVersionMediaFile, bool) {
	if version == nil || anime == nil || !strings.EqualFold(strings.TrimSpace(version.MediaProvider), "jellyfin") || !h.ensureJellyfinConfiguredForEditor() {
		return nil, false
	}
	itemID := strings.TrimSpace(version.MediaItemID)
	normalizedFolder := normalizeJellyfinPath(folder)
	if itemID == "" || (seriesID == "" && normalizedFolder == "") {
		return nil, false
	}
	items, err := fetchJellyfinSourceBatch(ctx, h.httpClient, h.jellyfinBaseURL, h.jellyfinAPIKey, []string{itemID}, true)
	if err != nil {
		return nil, true
	}
	binding := version.JellyfinSource
	if binding == nil && version.MediaSourceID != nil {
		binding = &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: *version.MediaSourceID}
	}
	source, err := resolveReviewedJellyfinSource(items[itemID], itemID, strings.TrimSpace(derefString(version.MediaSourceID)), seriesID, normalizedFolder, binding)
	if err != nil {
		return nil, true
	}
	if version.DurationSeconds == nil {
		version.DurationSeconds = source.DurationSeconds
	}
	file := buildEpisodeVersionMediaFile(items[itemID], source, h.buildJellyfinEditorStreamURL)
	file.ChapterHints = &source.ChapterHints
	return &file, false
}

// resolveEpisodeVersionEditor lädt die Episodenversion sowie alle abhängigen Daten wie Anime-Quelle, Ordnerpfad und Fansub-Gruppen.
func (h *AdminContentHandler) resolveEpisodeVersionEditor(
	ctx context.Context,
	versionID int64,
) (*episodeVersionEditorResolved, error) {
	version, err := h.episodeVersionRepo.GetByID(ctx, versionID)
	if err != nil {
		return nil, err
	}

	animeSource, err := h.repo.GetAnimeSyncSource(ctx, version.AnimeID)
	if err != nil {
		return nil, err
	}

	folderPath, seriesID, degraded, err := h.resolveEpisodeVersionFolderPath(ctx, animeSource)
	if err != nil {
		return nil, err
	}

	selectedGroups, err := h.resolveEpisodeVersionSelectedGroups(ctx, version)
	if err != nil {
		return nil, err
	}

	return &episodeVersionEditorResolved{
		version:                    version,
		animeSource:                animeSource,
		animeFolderPath:            folderPath,
		jellyfinSeriesID:           seriesID,
		jellyfinEnrichmentDegraded: degraded,
		selectedGroups:             selectedGroups,
	}, nil
}

// resolveEpisodeVersionFolderPath ermittelt den Dateisystempfad zum Anime-Ordner anhand der Anime-Quelle, bevorzugt Jellyfin-Daten.
// Der Ordnerpfad ist reine Anreicherung, kein Pflichtdatum: Jede Art von Jellyfin-Fehler
// (401/403/5xx/Timeout/Netzwerkfehler) wird toleriert und fällt auf folder_name zurück,
// analog zu resolveEpisodeVersionDuration's bestehendem Toleranzmuster. Der dritte Rückgabewert
// signalisiert dem Aufrufer, ob genau dieser Toleranzfall eingetreten ist.
func (h *AdminContentHandler) resolveEpisodeVersionFolderPath(
	ctx context.Context,
	animeSource *models.AdminAnimeSyncSource,
) (*string, string, bool, error) {
	if animeSource == nil {
		return nil, "", false, nil
	}

	if seriesID := jellyfinSeriesIDFromAnimeSource(animeSource.Source, animeSource.SourceLinks); seriesID != "" {
		if h.ensureJellyfinConfiguredForEditor() {
			series, err := h.getJellyfinSeriesByID(ctx, seriesID)
			if err != nil {
				log.Printf("admin_content episode_version_editor_context: jellyfin folder path lookup degraded seriesID=%s err=%v", seriesID, err)
				return normalizeNullableStringPtr(derefString(animeSource.FolderName)), seriesID, true, nil
			}
			if series != nil {
				return normalizeNullableStringPtr(series.Path), seriesID, false, nil
			}
		}
		return normalizeNullableStringPtr(derefString(animeSource.FolderName)), seriesID, false, nil
	}

	if rawSource := strings.TrimSpace(derefString(animeSource.Source)); rawSource != "" {
		return normalizeNullableStringPtr(rawSource), "", false, nil
	}

	return normalizeNullableStringPtr(derefString(animeSource.FolderName)), "", false, nil
}

// resolveEpisodeVersionDuration ergaenzt eine fehlende Laufzeit aus der aktuell verknuepften Provider-Datei.
func (h *AdminContentHandler) resolveEpisodeVersionDuration(
	ctx context.Context,
	version *models.EpisodeVersion,
) (*int32, error) {
	if version == nil {
		return nil, nil
	}
	if version.DurationSeconds != nil {
		return version.DurationSeconds, nil
	}
	if !strings.EqualFold(strings.TrimSpace(version.MediaProvider), "jellyfin") {
		return nil, nil
	}
	mediaItemID := strings.TrimSpace(version.MediaItemID)
	if mediaItemID == "" || !h.ensureJellyfinConfiguredForEditor() {
		return nil, nil
	}
	binding := version.JellyfinSource
	if binding == nil && version.MediaSourceID != nil {
		binding = &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: *version.MediaSourceID}
	}
	return h.getJellyfinSourceDurationSeconds(ctx, mediaItemID, binding)
}

// resolveEpisodeVersionSelectedGroups gibt die FansubGroups der Episodenversion zurück.
// Nach Phase 81 enthält version.FansubGroups bereits alle beteiligten echten Gruppen —
// keine Kollaborations-Auflösung mehr nötig (D-02, D-08).
func (h *AdminContentHandler) resolveEpisodeVersionSelectedGroups(
	ctx context.Context,
	version *models.EpisodeVersion,
) ([]models.FansubGroupSummary, error) {
	if version == nil {
		return []models.FansubGroupSummary{}, nil
	}
	if len(version.FansubGroups) > 0 {
		return version.FansubGroups, nil
	}
	return []models.FansubGroupSummary{}, nil
}

// ensureJellyfinConfiguredForEditor prüft, ob Jellyfin-Basis-URL und API-Schlüssel für den Editor konfiguriert sind.
func (h *AdminContentHandler) ensureJellyfinConfiguredForEditor() bool {
	return strings.TrimSpace(h.jellyfinBaseURL) != "" && strings.TrimSpace(h.jellyfinAPIKey) != ""
}

// buildJellyfinEditorStreamURL erstellt die Stream-URL für ein Jellyfin-Medienelement anhand seiner ID.
func (h *AdminContentHandler) buildJellyfinEditorStreamURL(itemID string) *string {
	streamURL, err := buildJellyfinStreamURL(
		h.jellyfinBaseURL,
		normalizeStreamPathTemplate(h.jellyfinStreamPath),
		h.jellyfinAPIKey,
		itemID,
	)
	if err != nil {
		return nil
	}
	return &streamURL
}
