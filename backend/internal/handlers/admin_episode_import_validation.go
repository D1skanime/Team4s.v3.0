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
	for index, mapping := range input.Mappings {
		if len(mapping.FansubGroups) > 0 {
			validatedGroups, err := validateSelectedFansubGroups(mapping.FansubGroups)
			if err != nil {
				return models.EpisodeImportApplyInput{}, fmt.Errorf("mapping %d: %w", index, err)
			}
			input.Mappings[index].FansubGroups = validatedGroups
		}
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

func validateSelectedFansubGroups(groups []models.SelectedFansubGroupInput) ([]models.SelectedFansubGroupInput, error) {
	if len(groups) == 0 {
		return groups, nil
	}

	validated := make([]models.SelectedFansubGroupInput, 0, len(groups))
	for _, group := range groups {
		next := models.SelectedFansubGroupInput{}
		if group.ID != nil {
			if *group.ID <= 0 {
				return nil, fmt.Errorf("ungueltige fansub_groups id")
			}
			next.ID = group.ID
		}

		if name := normalizeNullableString(group.Name); name != nil {
			if len([]rune(*name)) > 255 {
				return nil, fmt.Errorf("fansub_groups name ist zu lang")
			}
			next.Name = name
		}
		if slug := normalizeNullableString(group.Slug); slug != nil {
			if len([]rune(*slug)) > 255 {
				return nil, fmt.Errorf("fansub_groups slug ist zu lang")
			}
			next.Slug = slug
		}
		if next.ID == nil && next.Name == nil {
			return nil, fmt.Errorf("fansub_groups erfordert id oder name")
		}
		validated = append(validated, next)
	}

	return validated, nil
}
