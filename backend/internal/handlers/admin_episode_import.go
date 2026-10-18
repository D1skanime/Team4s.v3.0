package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) GetEpisodeImportContext(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	contextResult, statusCode, err := h.loadEpisodeImportContext(c, animeID)
	if err != nil {
		c.JSON(statusCode, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": contextResult})
}

func (h *AdminContentHandler) PreviewEpisodeImport(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	var req adminEpisodeImportPreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}
	req = validateEpisodeImportPreviewRequest(req)

	contextResult, statusCode, err := h.loadEpisodeImportContext(c, animeID)
	if err != nil {
		c.JSON(statusCode, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	aniSearchID := firstNonEmptyString(req.AniSearchID, derefString(contextResult.AniSearchID))
	canonicalEpisodes, err := h.loadEpisodeImportCanonicalEpisodes(c, aniSearchID)
	if err != nil {
		log.Printf("episode import preview anisearch failed anime_id=%d anisearch_id=%q: %v", animeID, aniSearchID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "anisearch episoden konnten nicht geladen werden"}})
		return
	}

	jellyfinSeriesID := firstNonEmptyString(req.JellyfinSeriesID, derefString(contextResult.JellyfinSeriesID))
	if h.rejectUnownedJellyfinSeriesID(c, req.JellyfinSeriesID, contextResult.JellyfinFoldersForOwnershipCheck) {
		return
	}
	folderFilterPath, ok := h.resolveEpisodeImportFolderFilterPath(c, animeID, jellyfinSeriesID, contextResult)
	if !ok {
		return
	}
	mediaCandidates, err := h.loadEpisodeImportMediaCandidates(c, jellyfinSeriesID, folderFilterPath)
	if err != nil {
		log.Printf("episode import preview jellyfin failed anime_id=%d series_id=%q: %v", animeID, jellyfinSeriesID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "jellyfin episoden konnten nicht geladen werden"}})
		return
	}

	if h.episodeImportRepo != nil {
		existing, coverageErr := h.episodeImportRepo.PreviewExistingCoverage(c.Request.Context(), animeID)
		if coverageErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "Bestehende Jellyfin-Zuordnungen konnten nicht geladen werden."}})
			return
		}
		mediaCandidates, coverageErr = filterAlreadyMappedCandidates(mediaCandidates, existing)
		if coverageErr != nil {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "Eine bestehende Jellyfin-Quelle ist nicht eindeutig zugeordnet. Bitte die Dateizuordnung prüfen."}})
			return
		}
	}

	preview := buildEpisodeImportPreview(
		animeID,
		contextResult.AnimeTitle,
		normalizeStringPtr(aniSearchID),
		normalizeStringPtr(jellyfinSeriesID),
		contextResult.FolderPath,
		canonicalEpisodes,
		mediaCandidates,
		req.SeasonOffset,
	)
	preview.Mappings = enrichEpisodeImportPreviewFansubData(c.Request.Context(), h.episodeImportRepo, preview.Mappings)
	if h.episodeImportRepo != nil {
		if animeType, typeErr := h.episodeImportRepo.GetAnimeType(c.Request.Context(), animeID); typeErr == nil {
			preview = applyEinteilerSuggestion(preview, animeType)
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": preview})
}

func (h *AdminContentHandler) ApplyEpisodeImport(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}
	if h.episodeImportRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "episode import repository ist nicht konfiguriert"}})
		return
	}

	var req adminEpisodeImportApplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}
	input, validationErr := validateEpisodeImportApplyRequest(animeID, req)
	if validationErr != nil {
		badRequest(c, validationErr.Error())
		return
	}

	importContext, status, err := h.loadEpisodeImportContext(c, animeID, false)
	if err != nil {
		c.JSON(status, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	input, status, err = h.rehydrateEpisodeImportSources(c.Request.Context(), input, importContext)
	if err != nil {
		c.JSON(status, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}

	result, err := h.episodeImportRepo.Apply(c.Request.Context(), input)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "Die Jellyfin-Zuordnung hat sich geändert. Bitte Vorschau neu laden."}})
			return
		}
		if strings.Contains(err.Error(), "confirmed or skipped") || strings.Contains(err.Error(), "bestaetigt") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	writeLearnedFansubAliasAudit(c, h.auditLogRepo, result.LearnedFansubAliases)
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *AdminContentHandler) loadEpisodeImportContext(c *gin.Context, animeID int64, resolveSeries ...bool) (models.EpisodeImportContextResult, int, error) {
	source, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if err != nil {
		if err == repository.ErrNotFound {
			return models.EpisodeImportContextResult{}, http.StatusNotFound, err
		}
		return models.EpisodeImportContextResult{}, http.StatusInternalServerError, err
	}
	aniSearchID := normalizeStringPtr(firstNonEmptyString(
		extractAniSearchSourceID(source.Source),
		extractAniSearchIDFromSourceLinks(source.SourceLinks),
	))
	folderPath := normalizeStringPtr(derefString(source.FolderName))
	jellyfinSeriesID := normalizeStringPtr(firstNonEmptyString(
		extractJellyfinSourceID(source.Source),
		extractJellyfinSeriesIDFromSourceLinks(source.SourceLinks),
	))
	if jellyfinSeriesID == nil && (len(resolveSeries) == 0 || resolveSeries[0]) {
		animeTitles := uniqueLookupTitles(source.Title, source.TitleDE, source.TitleEN)
		resolvedItem, resolveErr := h.resolveEpisodeImportSeriesByFolderPath(c.Request.Context(), animeTitles, folderPath)
		if resolveErr != nil {
			log.Printf("episode import context jellyfin path resolve failed anime_id=%d path=%q: %v", animeID, derefString(folderPath), resolveErr)
		} else if resolvedItem != nil {
			jellyfinSeriesID = normalizeStringPtr(resolvedItem.ID)
		}
	}
	allFolders := collectJellyfinFolderOptions(source.Source, source.SourceLinks, source.Source)
	allFolders = h.hydrateJellyfinFolderDisplayNames(c.Request.Context(), allFolders, folderPath)
	displayFolders := allFolders
	if len(displayFolders) <= 1 {
		// D-14: keine sichtbares neues Feld im Regelfall -- the single-folder
		// case (today's default) stays byte-identical to pre-plan responses.
		// This ONLY affects the display field below -- the ownership-guard
		// field always keeps the real, un-nil'd list (see
		// JellyfinFoldersForOwnershipCheck doc comment).
		displayFolders = nil
	}
	return models.EpisodeImportContextResult{
		AnimeID:                          source.ID,
		AnimeTitle:                       source.Title,
		AniSearchID:                      aniSearchID,
		JellyfinSeriesID:                 jellyfinSeriesID,
		FolderPath:                       folderPath,
		Source:                           source.Source,
		JellyfinFolders:                  displayFolders,
		JellyfinFoldersForOwnershipCheck: allFolders,
	}, http.StatusOK, nil
}

func (h *AdminContentHandler) loadEpisodeImportCanonicalEpisodes(c *gin.Context, aniSearchID string) ([]models.EpisodeImportCanonicalEpisode, error) {
	if strings.TrimSpace(aniSearchID) == "" || h.aniSearchEpisodes == nil {
		return nil, nil
	}
	episodes, err := h.aniSearchEpisodes.FetchAnimeEpisodes(c.Request.Context(), aniSearchID)
	if err != nil {
		return nil, err
	}
	result := make([]models.EpisodeImportCanonicalEpisode, 0, len(episodes))
	for _, episode := range episodes {
		if episode.EpisodeNumber <= 0 {
			continue
		}
		result = append(result, models.EpisodeImportCanonicalEpisode{
			EpisodeNumber:    episode.EpisodeNumber,
			Title:            episode.Title,
			TitlesByLanguage: episode.TitlesByLanguage,
			FillerType:       episode.FillerType,
			FillerSource:     episode.FillerSource,
			FillerNote:       episode.FillerNote,
		})
	}
	return result, nil
}

func (h *AdminContentHandler) loadEpisodeImportMediaCandidates(
	c *gin.Context,
	jellyfinSeriesID string,
	folderPath *string,
) ([]models.EpisodeImportMediaCandidate, error) {
	if strings.TrimSpace(jellyfinSeriesID) == "" {
		return nil, nil
	}
	items, err := h.listJellyfinEpisodes(c.Request.Context(), jellyfinSeriesID)
	if err != nil {
		return nil, err
	}

	sources, err := enumerateJellyfinMediaSources(items, normalizeJellyfinPath(folderPath), nil)
	if err != nil {
		return nil, err
	}
	candidates := make([]models.EpisodeImportMediaCandidate, 0, len(sources))
	for _, source := range sources {
		candidate := h.episodeImportSourceCandidate(source.Item, source.Source)
		candidate.JellyfinItemIDs = source.ItemIDs
		candidates = append(candidates, candidate)
	}
	return candidates, nil
}

func normalizeStringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

var _ adminAniSearchEpisodeFetcher = (*services.AniSearchClient)(nil)

// rehydrateEpisodeImportSources accepts only reviewed item/source identities.
// Technical fields, paths and URLs posted by the browser are replaced wholesale.
func (h *AdminContentHandler) rehydrateEpisodeImportSources(ctx context.Context, input models.EpisodeImportApplyInput, importContext models.EpisodeImportContextResult) (models.EpisodeImportApplyInput, int, error) {
	ids := make([]string, 0, len(input.Mappings))
	seenItems := make(map[string]bool, len(input.Mappings))
	for _, mapping := range input.Mappings {
		if mapping.Status == models.EpisodeImportMappingStatusConfirmed {
			if !seenItems[mapping.MediaItemID] {
				ids = append(ids, mapping.MediaItemID)
				seenItems[mapping.MediaItemID] = true
			}
		}
	}
	input.MediaCandidates = []models.EpisodeImportMediaCandidate{}
	if len(ids) == 0 {
		return input, http.StatusOK, nil
	}
	fail := func(status int, message string) (models.EpisodeImportApplyInput, int, error) {
		return models.EpisodeImportApplyInput{}, status, fmt.Errorf("%s", message)
	}
	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		return fail(http.StatusServiceUnavailable, "Jellyfin ist nicht konfiguriert.")
	}
	seriesID := strings.TrimSpace(derefString(importContext.JellyfinSeriesID))
	owned := ownedJellyfinSourcesFromFolders(seriesID, importContext.FolderPath, importContext.JellyfinFoldersForOwnershipCheck)
	if seriesID == "" && normalizeJellyfinPath(importContext.FolderPath) == "" {
		return fail(http.StatusConflict, "Der Anime hat keine überprüfbare Jellyfin-Zuordnung.")
	}
	bindings, err := h.episodeImportRepo.GetJellyfinSourceBindings(ctx, ids)
	if err != nil {
		if errors.Is(err, repository.ErrConflict) {
			return fail(http.StatusConflict, "Die gespeicherte Jellyfin-Quelle ist ungültig. Bitte Vorschau neu laden.")
		}
		return fail(http.StatusInternalServerError, "Jellyfin-Zuordnungen konnten nicht geladen werden.")
	}
	items, err := h.getJellyfinSourceItems(ctx, ids)
	if err != nil {
		var batchErr *jellyfinSourceBatchError
		if errors.As(err, &batchErr) {
			return fail(http.StatusConflict, "Jellyfin-Dateien haben sich geändert. Bitte Vorschau neu laden.")
		}
		return fail(http.StatusBadGateway, "Jellyfin-Dateien konnten nicht geladen werden.")
	}
	seenSources := map[string]bool{}
	for _, mapping := range input.Mappings {
		if mapping.Status != models.EpisodeImportMappingStatusConfirmed {
			continue
		}
		item := items[mapping.MediaItemID]
		var stored *models.JellyfinSourceSnapshot
		if binding, ok := bindings[models.JellyfinSourceKey{ItemID: mapping.MediaItemID, SourceID: mapping.MediaSourceID}]; ok {
			stored = &binding
		}
		resolved, err := resolveReviewedJellyfinSource(item, mapping.MediaItemID, mapping.MediaSourceID, owned, stored)
		if err != nil {
			return fail(http.StatusConflict, err.Error())
		}
		if seenSources[resolved.Snapshot.MediaSourceID] {
			return fail(http.StatusConflict, "Dieselbe physische Jellyfin-Quelle wurde mehrfach ausgewählt.")
		}
		seenSources[resolved.Snapshot.MediaSourceID] = true
		input.MediaCandidates = append(input.MediaCandidates, h.episodeImportSourceCandidate(item, resolved))
	}
	return input, http.StatusOK, nil
}

func (h *AdminContentHandler) episodeImportSourceCandidate(item jellyfinEpisodeItem, resolved resolvedJellyfinMediaSource) models.EpisodeImportMediaCandidate {
	season, episode := jellyfinSeasonNumber(item.ParentIndexNumber), jellyfinEpisodeNumber(item.IndexNumber)
	return models.EpisodeImportMediaCandidate{
		MediaItemID: item.ID, MediaSourceID: resolved.Snapshot.MediaSourceID,
		SourceFileNameUnique: resolved.Snapshot.SourceFileNameUnique,
		FileName:             resolved.FileName, Path: resolved.Snapshot.SourcePath, Container: resolved.Container,
		StreamsComplete: resolved.Snapshot.StreamsComplete, SelectedAudioIndex: resolved.Snapshot.SelectedAudioIndex,
		AudioTracks: resolved.Snapshot.AudioTracks, SubtitleTracks: resolved.Snapshot.SubtitleTracks,
		JellyfinSeasonNumber: &season, JellyfinEpisodeNumber: &episode,
		StreamURL: h.buildJellyfinEditorStreamURL(item.ID), VideoQuality: resolved.VideoQuality,
		VideoCodec: resolved.VideoCodec, AudioCodec: resolved.AudioCodec, DurationSeconds: resolved.DurationSeconds,
	}
}
