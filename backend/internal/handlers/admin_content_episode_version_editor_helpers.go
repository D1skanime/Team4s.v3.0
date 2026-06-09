package handlers

import (
	"context"
	"strings"

	"team4s.v3/backend/internal/models"
)

// episodeVersionEditorResolved fasst alle aufgelösten Abhängigkeiten zusammen, die für den Episodenversionsedit-Kontext benötigt werden.
type episodeVersionEditorResolved struct {
	version          *models.EpisodeVersion
	animeSource      *models.AdminAnimeSyncSource
	animeFolderPath  *string
	jellyfinSeriesID string
	selectedGroups   []models.FansubGroupSummary
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
	if version.DurationSeconds == nil {
		if durationSeconds, err := h.resolveEpisodeVersionDuration(ctx, &version); err == nil && durationSeconds != nil {
			version.DurationSeconds = durationSeconds
		}
	}

	return &models.EpisodeVersionEditorContext{
		Version:         version,
		AnimeTitle:      resolved.animeSource.Title,
		AnimeFolderPath: resolved.animeFolderPath,
		SelectedGroups:  resolved.selectedGroups,
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

	safeVersion := models.EpisodeVersion{
		ID:              version.ID,
		AnimeID:         version.AnimeID,
		EpisodeNumber:   version.EpisodeNumber,
		Title:           version.Title,
		ReleaseVersion:  version.ReleaseVersion,
		FansubGroups:    version.FansubGroups,
		DurationSeconds: version.DurationSeconds,
		CreatedAt:       version.CreatedAt,
		UpdatedAt:       version.UpdatedAt,
	}

	selectedGroups, err := h.resolveEpisodeVersionSelectedGroups(ctx, version)
	if err != nil {
		return nil, err
	}

	return &models.EpisodeVersionEditorContext{
		Version:        safeVersion,
		AnimeTitle:     animeSource.Title,
		SelectedGroups: selectedGroups,
	}, nil
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

	folderPath, seriesID, err := h.resolveEpisodeVersionFolderPath(ctx, animeSource)
	if err != nil {
		return nil, err
	}

	selectedGroups, err := h.resolveEpisodeVersionSelectedGroups(ctx, version)
	if err != nil {
		return nil, err
	}

	return &episodeVersionEditorResolved{
		version:          version,
		animeSource:      animeSource,
		animeFolderPath:  folderPath,
		jellyfinSeriesID: seriesID,
		selectedGroups:   selectedGroups,
	}, nil
}

// resolveEpisodeVersionFolderPath ermittelt den Dateisystempfad zum Anime-Ordner anhand der Anime-Quelle, bevorzugt Jellyfin-Daten.
func (h *AdminContentHandler) resolveEpisodeVersionFolderPath(
	ctx context.Context,
	animeSource *models.AdminAnimeSyncSource,
) (*string, string, error) {
	if animeSource == nil {
		return nil, "", nil
	}

	if seriesID := extractJellyfinSourceID(animeSource.Source); seriesID != "" {
		if h.ensureJellyfinConfiguredForEditor() {
			series, err := h.getJellyfinSeriesByID(ctx, seriesID)
			if err != nil {
				return nil, "", err
			}
			if series != nil {
				return normalizeNullableStringPtr(series.Path), seriesID, nil
			}
		}
		return normalizeNullableStringPtr(derefString(animeSource.FolderName)), seriesID, nil
	}

	if rawSource := strings.TrimSpace(derefString(animeSource.Source)); rawSource != "" {
		return normalizeNullableStringPtr(rawSource), "", nil
	}

	return normalizeNullableStringPtr(derefString(animeSource.FolderName)), "", nil
}

// resolveEpisodeVersionDuration ergaenzt eine fehlende Laufzeit aus der aktuell verknuepften Provider-Datei.
func (h *AdminContentHandler) resolveEpisodeVersionDuration(
	ctx context.Context,
	version *models.EpisodeVersion,
) (*int32, error) {
	if version == nil {
		return nil, nil
	}
	if !strings.EqualFold(strings.TrimSpace(version.MediaProvider), "jellyfin") {
		return nil, nil
	}
	mediaItemID := strings.TrimSpace(version.MediaItemID)
	if mediaItemID == "" || !h.ensureJellyfinConfiguredForEditor() {
		return nil, nil
	}
	return h.getJellyfinEpisodeDurationSeconds(ctx, mediaItemID)
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
	streamURL, err := buildProviderStreamURL(
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
