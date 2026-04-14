package handlers

import (
	"time"

	"team4s.v3/backend/internal/models"
)

var allowedSubtitleTypes = map[string]struct{}{
	"hardsub": {},
	"softsub": {},
}

type episodeVersionCreateRequest struct {
	Title         *string    `json:"title"`
	FansubGroupID *int64     `json:"fansub_group_id"`
	MediaProvider string     `json:"media_provider"`
	MediaItemID   string     `json:"media_item_id"`
	VideoQuality  *string    `json:"video_quality"`
	SubtitleType  *string    `json:"subtitle_type"`
	ReleaseDate   *time.Time `json:"release_date"`
	StreamURL     *string    `json:"stream_url"`
}

// validateEpisodeVersionCreateRequest prüft und normalisiert die Felder eines Erstellungs-Requests für eine Episodenversion.
// Gibt das bereinigte Input-Objekt und eine Fehlermeldung zurück; die Meldung ist leer bei Erfolg.
func validateEpisodeVersionCreateRequest(req episodeVersionCreateRequest) (models.EpisodeVersionCreateInput, string) {
	mediaProvider := normalizeRequiredString(&req.MediaProvider)
	if mediaProvider == nil || len([]rune(*mediaProvider)) > 30 {
		return models.EpisodeVersionCreateInput{}, "ungueltiger media_provider parameter"
	}

	mediaItemID := normalizeRequiredString(&req.MediaItemID)
	if mediaItemID == nil || len([]rune(*mediaItemID)) > 120 {
		return models.EpisodeVersionCreateInput{}, "ungueltiger media_item_id parameter"
	}

	if req.FansubGroupID != nil && *req.FansubGroupID <= 0 {
		return models.EpisodeVersionCreateInput{}, "ungueltiger fansub_group_id parameter"
	}

	title := normalizeNullableString(req.Title)
	if title != nil && len([]rune(*title)) > 255 {
		return models.EpisodeVersionCreateInput{}, "title ist zu lang"
	}

	videoQuality := normalizeNullableString(req.VideoQuality)
	if videoQuality != nil && len([]rune(*videoQuality)) > 20 {
		return models.EpisodeVersionCreateInput{}, "video_quality ist zu lang"
	}

	subtitleType := normalizeNullableString(req.SubtitleType)
	if subtitleType != nil {
		if _, ok := allowedSubtitleTypes[*subtitleType]; !ok {
			return models.EpisodeVersionCreateInput{}, "ungueltiger subtitle_type parameter"
		}
	}

	return models.EpisodeVersionCreateInput{
		Title:         title,
		FansubGroupID: req.FansubGroupID,
		MediaProvider: *mediaProvider,
		MediaItemID:   *mediaItemID,
		VideoQuality:  videoQuality,
		SubtitleType:  subtitleType,
		ReleaseDate:   req.ReleaseDate,
		StreamURL:     normalizeNullableString(req.StreamURL),
	}, ""
}

// validateEpisodeVersionPatchRequest prüft und normalisiert die Felder eines Patch-Requests für eine Episodenversion.
// Gibt das bereinigte Input-Objekt und eine Fehlermeldung zurück; die Meldung ist leer bei Erfolg.
func validateEpisodeVersionPatchRequest(req models.EpisodeVersionPatchInput) (models.EpisodeVersionPatchInput, string) {
	if !req.Title.Set &&
		!req.FansubGroupID.Set &&
		!req.MediaProvider.Set &&
		!req.MediaItemID.Set &&
		!req.VideoQuality.Set &&
		!req.SubtitleType.Set &&
		!req.ReleaseDate.Set &&
		!req.StreamURL.Set {
		return models.EpisodeVersionPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Title.Set {
		req.Title.Value = normalizeNullableString(req.Title.Value)
		if req.Title.Value != nil && len([]rune(*req.Title.Value)) > 255 {
			return models.EpisodeVersionPatchInput{}, "title ist zu lang"
		}
	}
	if req.FansubGroupID.Set && req.FansubGroupID.Value != nil && *req.FansubGroupID.Value <= 0 {
		return models.EpisodeVersionPatchInput{}, "ungueltiger fansub_group_id parameter"
	}
	if req.MediaProvider.Set {
		value := normalizeRequiredString(req.MediaProvider.Value)
		if value == nil || len([]rune(*value)) > 30 {
			return models.EpisodeVersionPatchInput{}, "ungueltiger media_provider parameter"
		}
		req.MediaProvider.Value = value
	}
	if req.MediaItemID.Set {
		value := normalizeRequiredString(req.MediaItemID.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.EpisodeVersionPatchInput{}, "ungueltiger media_item_id parameter"
		}
		req.MediaItemID.Value = value
	}
	if req.VideoQuality.Set {
		req.VideoQuality.Value = normalizeNullableString(req.VideoQuality.Value)
		if req.VideoQuality.Value != nil && len([]rune(*req.VideoQuality.Value)) > 20 {
			return models.EpisodeVersionPatchInput{}, "video_quality ist zu lang"
		}
	}
	if req.SubtitleType.Set {
		req.SubtitleType.Value = normalizeNullableString(req.SubtitleType.Value)
		if req.SubtitleType.Value != nil {
			if _, ok := allowedSubtitleTypes[*req.SubtitleType.Value]; !ok {
				return models.EpisodeVersionPatchInput{}, "ungueltiger subtitle_type parameter"
			}
		}
	}
	if req.StreamURL.Set {
		req.StreamURL.Value = normalizeNullableString(req.StreamURL.Value)
	}

	return req, ""
}
