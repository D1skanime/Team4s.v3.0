package handlers

import (
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// einteilerSuggestionReason is the exact German reason text shown next to a
// GAP-03 Einteiler suggestion (167-UAT.md).
const einteilerSuggestionReason = "Einziger Kandidat für die einzige Episode"

// applyEinteilerSuggestion proposes the single canonical episode of a
// single-episode Einteiler anime (film always; ova/ona/special/bonus only
// with exactly one canonical episode, IsEinteilerAnimeType) as the target
// for exactly one number-less "skipped" mapping row (GAP-03, 167-UAT.md).
// Strictly suggesting, never auto-confirming: the row's Status becomes
// "suggested", requiring the same explicit admin confirmation as every
// other suggested row before Apply persists anything (T-QUICK260924-B7S-03).
// Leaves preview unchanged whenever the gating conditions below are not met.
func applyEinteilerSuggestion(preview models.EpisodeImportPreviewResult, animeType string) models.EpisodeImportPreviewResult {
	if len(preview.CanonicalEpisodes) != 1 {
		return preview
	}
	if !repository.IsEinteilerAnimeType(animeType, 1) {
		return preview
	}

	skippedIndices := make([]int, 0, 1)
	for i := range preview.Mappings {
		if preview.Mappings[i].Status == models.EpisodeImportMappingStatusSkipped {
			skippedIndices = append(skippedIndices, i)
		}
	}
	if len(skippedIndices) != 1 {
		return preview
	}

	rowIndex := skippedIndices[0]
	episodeNumber := preview.CanonicalEpisodes[0].EpisodeNumber
	reason := einteilerSuggestionReason

	preview.Mappings[rowIndex].Status = models.EpisodeImportMappingStatusSuggested
	preview.Mappings[rowIndex].TargetEpisodeNumbers = []int32{episodeNumber}
	preview.Mappings[rowIndex].SuggestedEpisodeNumbers = []int32{episodeNumber}
	preview.Mappings[rowIndex].SuggestionReason = &reason

	mediaItemID := preview.Mappings[rowIndex].MediaItemID
	if len(preview.UnmappedMediaItemIDs) > 0 {
		filtered := make([]string, 0, len(preview.UnmappedMediaItemIDs))
		for _, id := range preview.UnmappedMediaItemIDs {
			if id != mediaItemID {
				filtered = append(filtered, id)
			}
		}
		preview.UnmappedMediaItemIDs = filtered
	}
	if len(preview.UnmappedEpisodes) > 0 {
		filtered := make([]int32, 0, len(preview.UnmappedEpisodes))
		for _, number := range preview.UnmappedEpisodes {
			if number != episodeNumber {
				filtered = append(filtered, number)
			}
		}
		preview.UnmappedEpisodes = filtered
	}

	return preview
}
