package handlers

import (
	"strings"

	"team4s.v3/backend/internal/models"
)

var allowedEpisodeStatuses = map[string]struct{}{
	"disabled": {},
	"private":  {},
	"public":   {},
}

func validateAdminEpisodeCreateRequest(req adminEpisodeCreateRequest) (models.AdminEpisodeCreateInput, string) {
	if req.AnimeID <= 0 {
		return models.AdminEpisodeCreateInput{}, "anime_id ist erforderlich"
	}

	episodeNumber := strings.TrimSpace(req.EpisodeNumber)
	if episodeNumber == "" {
		return models.AdminEpisodeCreateInput{}, "episode_number ist erforderlich"
	}
	if len([]rune(episodeNumber)) > 32 {
		return models.AdminEpisodeCreateInput{}, "episode_number ist zu lang"
	}

	status := strings.TrimSpace(req.Status)
	if _, ok := allowedEpisodeStatuses[status]; !ok {
		return models.AdminEpisodeCreateInput{}, "ungueltiger status parameter"
	}

	return models.AdminEpisodeCreateInput{
		AnimeID:       req.AnimeID,
		EpisodeNumber: episodeNumber,
		Title:         normalizeNullableString(req.Title),
		Status:        status,
		StreamLink:    normalizeNullableString(req.StreamLink),
	}, ""
}

func validateAdminEpisodePatchRequest(req models.AdminEpisodePatchInput) (models.AdminEpisodePatchInput, string) {
	if !req.EpisodeNumber.Set && !req.Title.Set && !req.Status.Set && !req.StreamLink.Set {
		return models.AdminEpisodePatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.EpisodeNumber.Set {
		episodeNumber := normalizeRequiredString(req.EpisodeNumber.Value)
		if episodeNumber == nil {
			return models.AdminEpisodePatchInput{}, "episode_number ist erforderlich"
		}
		if len([]rune(*episodeNumber)) > 32 {
			return models.AdminEpisodePatchInput{}, "episode_number ist zu lang"
		}
		req.EpisodeNumber.Value = episodeNumber
	}
	if req.Title.Set {
		req.Title.Value = normalizeNullableString(req.Title.Value)
	}
	if req.Status.Set {
		status := normalizeRequiredString(req.Status.Value)
		if status == nil {
			return models.AdminEpisodePatchInput{}, "ungueltiger status parameter"
		}
		if _, ok := allowedEpisodeStatuses[*status]; !ok {
			return models.AdminEpisodePatchInput{}, "ungueltiger status parameter"
		}
		req.Status.Value = status
	}
	if req.StreamLink.Set {
		req.StreamLink.Value = normalizeNullableString(req.StreamLink.Value)
	}

	return req, ""
}
