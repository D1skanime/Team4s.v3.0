package handlers

import (
	"context"
	"log"
	"net/http"
	"path"
	"sort"
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
		badRequest(c, "ungueltige anime id")
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
		badRequest(c, "ungueltige anime id")
		return
	}

	var req adminEpisodeImportPreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
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
	mediaCandidates, err := h.loadEpisodeImportMediaCandidates(c, jellyfinSeriesID, contextResult.FolderPath)
	if err != nil {
		log.Printf("episode import preview jellyfin failed anime_id=%d series_id=%q: %v", animeID, jellyfinSeriesID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{"message": "jellyfin episoden konnten nicht geladen werden"}})
		return
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
	c.JSON(http.StatusOK, gin.H{"data": preview})
}

func (h *AdminContentHandler) ApplyEpisodeImport(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungueltige anime id")
		return
	}
	if h.episodeImportRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "episode import repository ist nicht konfiguriert"}})
		return
	}

	var req adminEpisodeImportApplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}
	input, validationErr := validateEpisodeImportApplyRequest(animeID, req)
	if validationErr != nil {
		badRequest(c, validationErr.Error())
		return
	}

	result, err := h.episodeImportRepo.Apply(c.Request.Context(), input)
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(err.Error(), "confirmed or skipped") || strings.Contains(err.Error(), "bestaetigt") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *AdminContentHandler) loadEpisodeImportContext(c *gin.Context, animeID int64) (models.EpisodeImportContextResult, int, error) {
	source, err := h.repo.GetAnimeSyncSource(c.Request.Context(), animeID)
	if err != nil {
		if err == repository.ErrNotFound {
			return models.EpisodeImportContextResult{}, http.StatusNotFound, err
		}
		return models.EpisodeImportContextResult{}, http.StatusInternalServerError, err
	}
	aniSearchID := normalizeStringPtr(extractAniSearchSourceID(source.Source))
	folderPath := normalizeStringPtr(derefString(source.FolderName))
	jellyfinSeriesID := normalizeStringPtr(extractJellyfinSourceID(source.Source))
	if jellyfinSeriesID == nil {
		animeTitles := uniqueLookupTitles(source.Title, source.TitleDE, source.TitleEN)
		resolvedItem, resolveErr := h.resolveEpisodeImportSeriesByFolderPath(c.Request.Context(), animeTitles, folderPath)
		if resolveErr != nil {
			log.Printf("episode import context jellyfin path resolve failed anime_id=%d path=%q: %v", animeID, derefString(folderPath), resolveErr)
		} else if resolvedItem != nil {
			jellyfinSeriesID = normalizeStringPtr(resolvedItem.ID)
		}
	}
	return models.EpisodeImportContextResult{
		AnimeID:          source.ID,
		AnimeTitle:       source.Title,
		AniSearchID:      aniSearchID,
		JellyfinSeriesID: jellyfinSeriesID,
		FolderPath:       folderPath,
		Source:           source.Source,
	}, http.StatusOK, nil
}

func (h *AdminContentHandler) resolveEpisodeImportSeriesByFolderPath(
	ctx context.Context,
	animeTitles []string,
	folderPath *string,
) (*jellyfinSeriesItem, error) {
	normalizedFolderPath := normalizeJellyfinPath(folderPath)
	if normalizedFolderPath == "" {
		return nil, nil
	}

	lookupTerms := make([]string, 0, len(animeTitles)+1)
	lookupTerms = appendUniqueJellyfinLookupTerms(lookupTerms, animeTitles...)
	if titleSeed := buildJellyfinFolderNameTitleSeed(folderPath); titleSeed != nil {
		lookupTerms = appendUniqueJellyfinLookupTerms(lookupTerms, *titleSeed)
	}
	if len(lookupTerms) == 0 {
		return nil, nil
	}

	candidateByID := make(map[string]jellyfinSeriesItem, len(lookupTerms))
	for _, term := range lookupTerms {
		items, err := h.searchJellyfinSeries(ctx, term, 10)
		if err != nil {
			return nil, err
		}
		for _, item := range findJellyfinSeriesMatchesByPath(items, normalizedFolderPath) {
			candidateByID[strings.TrimSpace(item.ID)] = item
		}
	}

	if len(candidateByID) != 1 {
		return nil, nil
	}
	for _, item := range candidateByID {
		return &item, nil
	}
	return nil, nil
}

func appendUniqueJellyfinLookupTerms(existing []string, values ...string) []string {
	seen := make(map[string]struct{}, len(existing)+len(values))
	for _, value := range existing {
		normalized := strings.ToLower(strings.TrimSpace(value))
		if normalized == "" {
			continue
		}
		seen[normalized] = struct{}{}
	}

	result := existing
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		normalized := strings.ToLower(trimmed)
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func findJellyfinSeriesMatchesByPath(items []jellyfinSeriesItem, normalizedFolderPath string) []jellyfinSeriesItem {
	if normalizedFolderPath == "" {
		return []jellyfinSeriesItem{}
	}

	matches := make([]jellyfinSeriesItem, 0, len(items))
	for _, item := range items {
		itemPath := normalizeJellyfinPath(normalizeNullableStringPtr(item.Path))
		if itemPath == "" || itemPath != normalizedFolderPath {
			continue
		}
		matches = append(matches, item)
	}
	return matches
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
			EpisodeNumber: episode.EpisodeNumber,
			Title:         episode.Title,
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

	normalizedFolderPath := normalizeJellyfinPath(folderPath)
	candidates := make([]models.EpisodeImportMediaCandidate, 0, len(items))
	for _, item := range items {
		itemID := strings.TrimSpace(item.ID)
		itemPath := strings.TrimSpace(item.Path)
		if itemID == "" {
			continue
		}
		if normalizedFolderPath != "" && itemPath != "" && !jellyfinPathHasPrefix(itemPath, normalizedFolderPath) {
			continue
		}
		seasonNumber := jellyfinSeasonNumber(item.ParentIndexNumber)
		episodeNumber := jellyfinEpisodeNumber(item.IndexNumber)
		candidate := models.EpisodeImportMediaCandidate{
			MediaItemID:           itemID,
			FileName:              episodeImportFileName(item),
			Path:                  itemPath,
			JellyfinSeasonNumber:  &seasonNumber,
			JellyfinEpisodeNumber: &episodeNumber,
			StreamURL:             h.buildJellyfinEditorStreamURL(itemID),
			VideoQuality:          jellyfinVideoQuality(item.MediaStreams),
		}
		candidates = append(candidates, candidate)
	}
	sort.Slice(candidates, func(i, j int) bool {
		left := int32(1 << 30)
		right := int32(1 << 30)
		if candidates[i].JellyfinEpisodeNumber != nil && *candidates[i].JellyfinEpisodeNumber > 0 {
			left = *candidates[i].JellyfinEpisodeNumber
		}
		if candidates[j].JellyfinEpisodeNumber != nil && *candidates[j].JellyfinEpisodeNumber > 0 {
			right = *candidates[j].JellyfinEpisodeNumber
		}
		if left != right {
			return left < right
		}
		return strings.ToLower(candidates[i].FileName) < strings.ToLower(candidates[j].FileName)
	})
	return candidates, nil
}

func buildEpisodeImportPreview(
	animeID int64,
	animeTitle string,
	aniSearchID *string,
	jellyfinSeriesID *string,
	folderPath *string,
	canonicalEpisodes []models.EpisodeImportCanonicalEpisode,
	mediaCandidates []models.EpisodeImportMediaCandidate,
	seasonOffset int32,
) models.EpisodeImportPreviewResult {
	if canonicalEpisodes == nil {
		canonicalEpisodes = []models.EpisodeImportCanonicalEpisode{}
	}
	if mediaCandidates == nil {
		mediaCandidates = []models.EpisodeImportMediaCandidate{}
	}

	canonicalSet := make(map[int32]struct{}, len(canonicalEpisodes))
	for _, episode := range canonicalEpisodes {
		if episode.EpisodeNumber > 0 {
			canonicalSet[episode.EpisodeNumber] = struct{}{}
		}
	}

	mappedEpisodes := make(map[int32]struct{}, len(mediaCandidates))
	mappings := make([]models.EpisodeImportMappingRow, 0, len(mediaCandidates))
	unmappedMedia := make([]string, 0)
	for _, media := range mediaCandidates {
		target := int32(0)
		if media.JellyfinEpisodeNumber != nil {
			target = *media.JellyfinEpisodeNumber + seasonOffset
		}
		row := models.EpisodeImportMappingRow{
			MediaItemID: media.MediaItemID,
			FileName:    media.FileName,
			DisplayPath: episodeImportDisplayPath(media.Path, media.FileName),
			Status:      models.EpisodeImportMappingStatusSkipped,
		}
		if target > 0 {
			row.TargetEpisodeNumbers = []int32{target}
			row.SuggestedEpisodeNumbers = []int32{target}
			row.Status = models.EpisodeImportMappingStatusSuggested
			mappedEpisodes[target] = struct{}{}
		} else {
			unmappedMedia = append(unmappedMedia, media.MediaItemID)
		}
		mappings = append(mappings, row)
	}

	unmappedEpisodes := make([]int32, 0)
	for episodeNumber := range canonicalSet {
		if _, ok := mappedEpisodes[episodeNumber]; !ok {
			unmappedEpisodes = append(unmappedEpisodes, episodeNumber)
		}
	}
	sort.Slice(unmappedEpisodes, func(i, j int) bool {
		return unmappedEpisodes[i] < unmappedEpisodes[j]
	})

	return models.EpisodeImportPreviewResult{
		AnimeID:              animeID,
		AnimeTitle:           animeTitle,
		AniSearchID:          aniSearchID,
		JellyfinSeriesID:     jellyfinSeriesID,
		FolderPath:           folderPath,
		CanonicalEpisodes:    canonicalEpisodes,
		MediaCandidates:      mediaCandidates,
		Mappings:             mappings,
		UnmappedEpisodes:     unmappedEpisodes,
		UnmappedMediaItemIDs: unmappedMedia,
	}
}

func episodeImportFileName(item jellyfinEpisodeItem) string {
	itemPath := strings.TrimSpace(item.Path)
	if itemPath != "" {
		return path.Base(strings.ReplaceAll(itemPath, "\\", "/"))
	}
	return strings.TrimSpace(item.Name)
}

// episodeImportDisplayPath returns a short, operator-readable path label for a
// media candidate. If the full path ends with the file name the parent directory
// name is used as a release-group hint (e.g. "[SubGroup]"), otherwise the last
// two path segments are returned to give enough folder context.
func episodeImportDisplayPath(fullPath, fileName string) string {
	normalizedPath := strings.ReplaceAll(strings.TrimSpace(fullPath), "\\", "/")
	normalizedName := strings.TrimSpace(fileName)
	if normalizedPath == "" || normalizedPath == normalizedName {
		return normalizedName
	}
	dir := path.Dir(normalizedPath)
	parent := path.Base(dir)
	grandparent := path.Base(path.Dir(dir))
	if grandparent != "" && grandparent != "." && grandparent != "/" {
		return grandparent + "/" + parent
	}
	if parent != "" && parent != "." && parent != "/" {
		return parent
	}
	return normalizedName
}

func normalizeStringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

var _ adminAniSearchEpisodeFetcher = (*services.AniSearchClient)(nil)
