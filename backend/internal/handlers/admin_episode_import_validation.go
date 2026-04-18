package handlers

import (
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"
)

type adminEpisodeImportPreviewRequest struct {
	AniSearchID      string `json:"anisearch_id"`
	JellyfinSeriesID string `json:"jellyfin_series_id"`
	SeasonOffset     int32  `json:"season_offset"`
}

type adminEpisodeImportApplyRequest struct {
	CanonicalEpisodes []models.EpisodeImportCanonicalEpisode `json:"canonical_episodes"`
	MediaCandidates   []models.EpisodeImportMediaCandidate   `json:"media_candidates"`
	Mappings          []models.EpisodeImportMappingRow       `json:"mappings"`
}

func validateEpisodeImportPreviewRequest(req adminEpisodeImportPreviewRequest) adminEpisodeImportPreviewRequest {
	req.AniSearchID = strings.TrimSpace(req.AniSearchID)
	req.JellyfinSeriesID = strings.TrimSpace(req.JellyfinSeriesID)
	return req
}

func validateEpisodeImportApplyRequest(animeID int64, req adminEpisodeImportApplyRequest) (models.EpisodeImportApplyInput, error) {
	input := models.EpisodeImportApplyInput{
		AnimeID:           animeID,
		CanonicalEpisodes: req.CanonicalEpisodes,
		MediaCandidates:   req.MediaCandidates,
		Mappings:          req.Mappings,
	}
	for _, mapping := range input.Mappings {
		switch mapping.Status {
		case models.EpisodeImportMappingStatusConfirmed, models.EpisodeImportMappingStatusSkipped:
		case models.EpisodeImportMappingStatusSuggested, models.EpisodeImportMappingStatusConflict:
			return models.EpisodeImportApplyInput{}, fmt.Errorf("alle mappings muessen bestaetigt oder uebersprungen sein")
		default:
			return models.EpisodeImportApplyInput{}, fmt.Errorf("ungueltiger mapping status")
		}
	}
	return input, nil
}

func extractAniSearchSourceID(source *string) string {
	raw := strings.TrimSpace(derefString(source))
	if raw == "" || !strings.HasPrefix(strings.ToLower(raw), "anisearch:") {
		return ""
	}
	return strings.TrimSpace(raw[len("anisearch:"):])
}
