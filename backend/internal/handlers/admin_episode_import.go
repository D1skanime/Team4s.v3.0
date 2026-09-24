package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"path"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/importutil"
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

func extractAniSearchIDFromSourceLinks(sourceLinks []string) string {
	for _, source := range sourceLinks {
		if anisearchID := extractAniSearchSourceID(&source); anisearchID != "" {
			return anisearchID
		}
	}
	return ""
}

func extractJellyfinSeriesIDFromSourceLinks(sourceLinks []string) string {
	for _, source := range sourceLinks {
		if jellyfinID := extractJellyfinSourceID(&source); jellyfinID != "" {
			return jellyfinID
		}
	}
	return ""
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
		for _, candidate := range expandJellyfinLookupTerms(value) {
			normalized := strings.ToLower(candidate)
			if _, ok := seen[normalized]; ok {
				continue
			}
			seen[normalized] = struct{}{}
			result = append(result, candidate)
		}
	}
	return result
}

func expandJellyfinLookupTerms(value string) []string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	candidates := []string{trimmed}
	tokens := strings.FieldsFunc(trimmed, func(r rune) bool {
		return !(r >= '0' && r <= '9' || r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z')
	})
	if len(tokens) > 1 {
		candidates = append(candidates, tokens[0])

		var compact strings.Builder
		for _, token := range tokens {
			compact.WriteString(token)
		}
		if compact.Len() > 0 {
			candidates = append(candidates, compact.String())
		}
	}

	result := make([]string, 0, len(candidates))
	seen := make(map[string]struct{}, len(candidates))
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		normalized := strings.ToLower(candidate)
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, candidate)
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
	seasonBaseOffsets := buildEpisodeImportSeasonBaseOffsets(mediaCandidates)

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
		targets := resolveEpisodeImportSuggestedTargets(media, seasonOffset, seasonBaseOffsets)
		row := models.EpisodeImportMappingRow{
			MediaItemID:   media.MediaItemID,
			MediaSourceID: media.MediaSourceID,
			FileName:      media.FileName,
			DisplayPath:   episodeImportDisplayPath(media.Path, media.FileName),
			Status:        models.EpisodeImportMappingStatusSkipped,
		}
		if fansubGroupName := strings.TrimSpace(importutil.DeriveFansubGroupName(media.FileName, media.Path)); fansubGroupName != "" {
			row.FansubGroupName = &fansubGroupName
		}
		if len(targets) > 0 {
			row.TargetEpisodeNumbers = targets
			row.SuggestedEpisodeNumbers = targets
			row.Status = models.EpisodeImportMappingStatusSuggested
			for _, target := range targets {
				mappedEpisodes[target] = struct{}{}
			}
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

func resolveEpisodeImportSuggestedTargets(
	media models.EpisodeImportMediaCandidate,
	seasonOffset int32,
	seasonBaseOffsets map[int32]int32,
) []int32 {
	episodeNumber := episodeImportEvidenceEpisodeNumber(media)
	if episodeNumber == nil || *episodeNumber <= 0 {
		return nil
	}

	targets := []int32{*episodeNumber}
	if rangeEnd := parseEpisodeImportFilenameRangeEnd(media.FileName); rangeEnd != nil && *rangeEnd > *episodeNumber {
		targets = make([]int32, 0, *rangeEnd-*episodeNumber+1)
		for current := *episodeNumber; current <= *rangeEnd; current++ {
			targets = append(targets, current)
		}
	}

	totalOffset := seasonOffset
	if seasonNumber := episodeImportEvidenceSeasonNumber(media); seasonNumber != nil {
		if seasonBaseOffset, ok := seasonBaseOffsets[*seasonNumber]; ok {
			totalOffset += seasonBaseOffset
		}
	}

	resolved := make([]int32, 0, len(targets))
	for _, target := range targets {
		resolvedTarget := target + totalOffset
		if resolvedTarget > 0 {
			resolved = append(resolved, resolvedTarget)
		}
	}
	return resolved
}

var episodeImportFilenameRangePattern = regexp.MustCompile(`(?i)e(\d{1,4})-(\d{1,4})`)
var episodeImportFilenameSeasonEpisodePattern = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])s(\d{1,3})e(\d{1,4})(?:[^0-9]|$)`)
var episodeImportFilenameEpisodePattern = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])e(\d{1,4})(?:[^0-9]|$)`)

func episodeImportEvidenceEpisodeNumber(media models.EpisodeImportMediaCandidate) *int32 {
	if media.JellyfinEpisodeNumber != nil && *media.JellyfinEpisodeNumber > 0 {
		return media.JellyfinEpisodeNumber
	}
	if _, episode := parseEpisodeImportFilenameSeasonEpisode(media.FileName); episode != nil {
		return episode
	}
	return parseEpisodeImportFilenameEpisode(media.FileName)
}

func episodeImportEvidenceSeasonNumber(media models.EpisodeImportMediaCandidate) *int32 {
	if media.JellyfinSeasonNumber != nil && *media.JellyfinSeasonNumber > 0 {
		return media.JellyfinSeasonNumber
	}
	season, _ := parseEpisodeImportFilenameSeasonEpisode(media.FileName)
	return season
}

func parseEpisodeImportFilenameSeasonEpisode(fileName string) (*int32, *int32) {
	match := episodeImportFilenameSeasonEpisodePattern.FindStringSubmatch(strings.TrimSpace(fileName))
	if len(match) != 3 {
		return nil, nil
	}
	season, err := strconv.Atoi(match[1])
	if err != nil || season <= 0 {
		return nil, nil
	}
	episode, err := strconv.Atoi(match[2])
	if err != nil || episode <= 0 {
		return nil, nil
	}
	seasonValue := int32(season)
	episodeValue := int32(episode)
	return &seasonValue, &episodeValue
}

func parseEpisodeImportFilenameEpisode(fileName string) *int32 {
	match := episodeImportFilenameEpisodePattern.FindStringSubmatch(strings.TrimSpace(fileName))
	if len(match) != 2 {
		return nil
	}
	episode, err := strconv.Atoi(match[1])
	if err != nil || episode <= 0 {
		return nil
	}
	value := int32(episode)
	return &value
}

func parseEpisodeImportFilenameRangeEnd(fileName string) *int32 {
	match := episodeImportFilenameRangePattern.FindStringSubmatch(strings.TrimSpace(fileName))
	if len(match) != 3 {
		return nil
	}
	start, err := strconv.Atoi(match[1])
	if err != nil || start <= 0 {
		return nil
	}
	end, err := strconv.Atoi(match[2])
	if err != nil || end <= start {
		return nil
	}
	value := int32(end)
	return &value
}

func buildEpisodeImportSeasonBaseOffsets(
	mediaCandidates []models.EpisodeImportMediaCandidate,
) map[int32]int32 {
	maxBySeason := make(map[int32]int32)
	for _, media := range mediaCandidates {
		seasonNumber := episodeImportEvidenceSeasonNumber(media)
		episodeNumber := episodeImportEvidenceEpisodeNumber(media)
		if seasonNumber == nil || episodeNumber == nil {
			continue
		}
		if *seasonNumber <= 0 || *episodeNumber <= 0 {
			continue
		}
		if *episodeNumber > maxBySeason[*seasonNumber] {
			maxBySeason[*seasonNumber] = *episodeNumber
		}
	}

	seasons := make([]int32, 0, len(maxBySeason))
	for seasonNumber := range maxBySeason {
		seasons = append(seasons, seasonNumber)
	}
	sort.Slice(seasons, func(i, j int) bool {
		return seasons[i] < seasons[j]
	})

	baseBySeason := make(map[int32]int32, len(seasons))
	runningTotal := int32(0)
	for _, seasonNumber := range seasons {
		baseBySeason[seasonNumber] = runningTotal
		runningTotal += maxBySeason[seasonNumber]
	}
	return baseBySeason
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

// filterAlreadyMappedCandidates excludes physical sources, including validated
// owner aliases. Unresolved imports need unique filename evidence, not Item-wide hiding.
func filterAlreadyMappedCandidates(candidates []models.EpisodeImportMediaCandidate, existing models.EpisodeImportExistingCoverage) ([]models.EpisodeImportMediaCandidate, error) {
	mapped := map[string]bool{}
	for _, row := range existing.Mappings {
		if row.MediaSourceID != "" {
			mapped[row.MediaSourceID] = true
			continue
		}
		if row.MediaItemID == "" {
			continue
		}
		var matches []string
		ownerExists := false
		for _, candidate := range candidates {
			if candidate.MediaItemID != row.MediaItemID && !slices.Contains(candidate.JellyfinItemIDs, row.MediaItemID) {
				continue
			}
			ownerExists = true
			if row.FileName != "" && candidate.FileName == row.FileName {
				matches = append(matches, candidate.MediaSourceID)
			}
		}
		if ownerExists {
			if len(matches) != 1 {
				return nil, repository.ErrConflict
			}
			mapped[matches[0]] = true
		}
	}
	filtered := make([]models.EpisodeImportMediaCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if !mapped[candidate.MediaSourceID] {
			filtered = append(filtered, candidate)
		}
	}
	return filtered, nil
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
