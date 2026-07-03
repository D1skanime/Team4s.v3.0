package handlers

import (
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
)

var allowedSubtitleTypes = map[string]struct{}{
	"hardsub": {},
	"softsub": {},
}

type episodeVersionCreateRequest struct {
	Title         *string                           `json:"title"`
	FansubGroups  []models.SelectedFansubGroupInput `json:"fansub_groups"`
	FansubGroupID *int64                            `json:"fansub_group_id"`
	MediaProvider string                            `json:"media_provider"`
	MediaItemID   string                            `json:"media_item_id"`
	VideoQuality  *string                           `json:"video_quality"`
	SubtitleType  *string                           `json:"subtitle_type"`
	ReleaseDate   *time.Time                        `json:"release_date"`
	CRC32         *string                           `json:"crc32"`
	StreamURL     *string                           `json:"stream_url"`
}

func normalizeCRC32(value *string) (*string, string) {
	normalized := normalizeNullableString(value)
	if normalized == nil {
		return nil, ""
	}
	trimmed := strings.ToUpper(strings.TrimSpace(*normalized))
	trimmed = strings.TrimSpace(strings.TrimPrefix(trimmed, "CRC:"))
	trimmed = strings.TrimSpace(strings.TrimPrefix(trimmed, "CRC32:"))
	if len(trimmed) != 8 {
		return nil, "crc32 muss aus 8 Hex-Zeichen bestehen"
	}
	for _, char := range trimmed {
		if !((char >= '0' && char <= '9') || (char >= 'A' && char <= 'F')) {
			return nil, "crc32 muss aus 8 Hex-Zeichen bestehen"
		}
	}
	return &trimmed, ""
}

// validateEpisodeVersionCreateRequest prüft und normalisiert die Felder eines Erstellungs-Requests für eine Episodenversion.
// Gibt das bereinigte Input-Objekt und eine Fehlermeldung zurück; die Meldung ist leer bei Erfolg.
func validateEpisodeVersionCreateRequest(req episodeVersionCreateRequest) (models.EpisodeVersionCreateInput, string) {
	mediaProvider := normalizeRequiredString(&req.MediaProvider)
	if mediaProvider == nil || len([]rune(*mediaProvider)) > 30 {
		return models.EpisodeVersionCreateInput{}, "ungültiger media_provider parameter"
	}

	mediaItemID := normalizeRequiredString(&req.MediaItemID)
	if mediaItemID == nil || len([]rune(*mediaItemID)) > 120 {
		return models.EpisodeVersionCreateInput{}, "ungültiger media_item_id parameter"
	}

	if req.FansubGroupID != nil && *req.FansubGroupID <= 0 {
		return models.EpisodeVersionCreateInput{}, "ungültiger fansub_group_id parameter"
	}
	fansubGroups, err := validateSelectedFansubGroups(req.FansubGroups)
	if err != nil {
		return models.EpisodeVersionCreateInput{}, err.Error()
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
			return models.EpisodeVersionCreateInput{}, "ungültiger subtitle_type parameter"
		}
	}
	crc32, crcMessage := normalizeCRC32(req.CRC32)
	if crcMessage != "" {
		return models.EpisodeVersionCreateInput{}, crcMessage
	}

	return models.EpisodeVersionCreateInput{
		Title:         title,
		FansubGroups:  fansubGroups,
		FansubGroupID: req.FansubGroupID,
		MediaProvider: *mediaProvider,
		MediaItemID:   *mediaItemID,
		VideoQuality:  videoQuality,
		SubtitleType:  subtitleType,
		ReleaseDate:   req.ReleaseDate,
		CRC32:         crc32,
		StreamURL:     normalizeNullableString(req.StreamURL),
	}, ""
}

// validateEpisodeVersionPatchRequest prüft und normalisiert die Felder eines Patch-Requests für eine Episodenversion.
// Gibt das bereinigte Input-Objekt und eine Fehlermeldung zurück; die Meldung ist leer bei Erfolg.
func validateEpisodeVersionPatchRequest(req models.EpisodeVersionPatchInput) (models.EpisodeVersionPatchInput, string) {
	if !req.Title.Set &&
		!req.FansubGroups.Set &&
		!req.FansubGroupID.Set &&
		!req.MediaProvider.Set &&
		!req.MediaItemID.Set &&
		!req.VideoQuality.Set &&
		!req.SubtitleType.Set &&
		!req.ReleaseDate.Set &&
		!req.CRC32.Set &&
		!req.StreamURL.Set &&
		!req.DurationSeconds.Set {
		return models.EpisodeVersionPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Title.Set {
		req.Title.Value = normalizeNullableString(req.Title.Value)
		if req.Title.Value != nil && len([]rune(*req.Title.Value)) > 255 {
			return models.EpisodeVersionPatchInput{}, "title ist zu lang"
		}
	}
	if req.FansubGroups.Set {
		validatedGroups, err := validateSelectedFansubGroups(req.FansubGroups.Value)
		if err != nil {
			return models.EpisodeVersionPatchInput{}, err.Error()
		}
		req.FansubGroups.Value = validatedGroups
	}
	if req.FansubGroupID.Set && req.FansubGroupID.Value != nil && *req.FansubGroupID.Value <= 0 {
		return models.EpisodeVersionPatchInput{}, "ungültiger fansub_group_id parameter"
	}
	if req.MediaProvider.Set {
		value := normalizeRequiredString(req.MediaProvider.Value)
		if value == nil || len([]rune(*value)) > 30 {
			return models.EpisodeVersionPatchInput{}, "ungültiger media_provider parameter"
		}
		req.MediaProvider.Value = value
	}
	if req.MediaItemID.Set {
		value := normalizeRequiredString(req.MediaItemID.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.EpisodeVersionPatchInput{}, "ungültiger media_item_id parameter"
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
				return models.EpisodeVersionPatchInput{}, "ungültiger subtitle_type parameter"
			}
		}
	}
	if req.CRC32.Set {
		crc32, crcMessage := normalizeCRC32(req.CRC32.Value)
		if crcMessage != "" {
			return models.EpisodeVersionPatchInput{}, crcMessage
		}
		req.CRC32.Value = crc32
	}
	if req.StreamURL.Set {
		req.StreamURL.Value = normalizeNullableString(req.StreamURL.Value)
	}
	if req.DurationSeconds.Set && req.DurationSeconds.Value != nil && *req.DurationSeconds.Value <= 0 {
		return models.EpisodeVersionPatchInput{}, "duration_seconds muss groesser als 0 sein"
	}

	return req, ""
}
