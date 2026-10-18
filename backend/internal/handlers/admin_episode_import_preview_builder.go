package handlers

// This file holds the preview-assembly concern for the episode import
// pipeline: turning raw Jellyfin media candidates and canonical AniSearch
// episode data into the EpisodeImportPreviewResult the frontend mapper
// consumes, including season-offset resolution, display-path derivation, and
// filtering out media already mapped by a prior import. Deliberately kept out
// of admin_episode_import.go to stay under the project's 450-line file ceiling
// (CLAUDE.md D-04).

import (
	"path"
	"slices"
	"sort"
	"strings"

	"team4s.v3/backend/internal/importutil"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
)

// buildEpisodeImportPreview nimmt den ReleaseFilenameParser als letztes,
// variadisches Argument entgegen (mirror des bestehenden
// `resolveSeries ...bool`-Musters in loadEpisodeImportContext). Dadurch
// bleiben alle bestehenden Testaufrufstellen ohne Parser-Argument
// unverändert kompilierbar (186-02, D-03).
func buildEpisodeImportPreview(
	animeID int64,
	animeTitle string,
	aniSearchID *string,
	jellyfinSeriesID *string,
	folderPath *string,
	canonicalEpisodes []models.EpisodeImportCanonicalEpisode,
	mediaCandidates []models.EpisodeImportMediaCandidate,
	seasonOffset int32,
	parser ...services.ReleaseFilenameParser,
) models.EpisodeImportPreviewResult {
	if canonicalEpisodes == nil {
		canonicalEpisodes = []models.EpisodeImportCanonicalEpisode{}
	}
	if mediaCandidates == nil {
		mediaCandidates = []models.EpisodeImportMediaCandidate{}
	}
	var activeParser services.ReleaseFilenameParser
	if len(parser) > 0 {
		activeParser = parser[0]
	}
	seasonBaseOffsets := buildEpisodeImportSeasonBaseOffsets(mediaCandidates, activeParser)

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
		targets := resolveEpisodeImportSuggestedTargets(media, seasonOffset, seasonBaseOffsets, activeParser)
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
	parser services.ReleaseFilenameParser,
) []int32 {
	episodeNumber := episodeImportEvidenceEpisodeNumber(media, parser)
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

func buildEpisodeImportSeasonBaseOffsets(
	mediaCandidates []models.EpisodeImportMediaCandidate,
	parser services.ReleaseFilenameParser,
) map[int32]int32 {
	maxBySeason := make(map[int32]int32)
	for _, media := range mediaCandidates {
		seasonNumber := episodeImportEvidenceSeasonNumber(media)
		episodeNumber := episodeImportEvidenceEpisodeNumber(media, parser)
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
