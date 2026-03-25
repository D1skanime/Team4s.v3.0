package handlers

import (
	"strings"

	"team4s.v3/backend/internal/models"
)

var allowedAnimeTypes = map[string]struct{}{
	"tv":      {},
	"film":    {},
	"ova":     {},
	"ona":     {},
	"special": {},
	"bonus":   {},
}

func validateAdminAnimeCreateRequest(req adminAnimeCreateRequest) (models.AdminAnimeCreateInput, string) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return models.AdminAnimeCreateInput{}, "title ist erforderlich"
	}
	if len([]rune(title)) > 255 {
		return models.AdminAnimeCreateInput{}, "title ist zu lang"
	}

	animeType := strings.TrimSpace(req.Type)
	if _, ok := allowedAnimeTypes[animeType]; !ok {
		return models.AdminAnimeCreateInput{}, "ungueltiger type parameter"
	}

	contentType := strings.TrimSpace(req.ContentType)
	if _, ok := allowedContentTypes[contentType]; !ok {
		return models.AdminAnimeCreateInput{}, "ungueltiger content_type parameter"
	}

	status := strings.TrimSpace(req.Status)
	if _, ok := allowedAnimeStatuses[status]; !ok {
		return models.AdminAnimeCreateInput{}, "ungueltiger status parameter"
	}

	coverImage := normalizeNullableString(req.CoverImage)
	if coverImage == nil {
		return models.AdminAnimeCreateInput{}, "cover_image ist erforderlich"
	}

	source := normalizeNullableString(req.Source)
	folderName := normalizeNullableString(req.FolderName)
	if folderName != nil && source == nil {
		return models.AdminAnimeCreateInput{}, "folder_name erfordert source"
	}
	if source != nil {
		if !strings.HasPrefix(*source, "jellyfin:") {
			return models.AdminAnimeCreateInput{}, "ungueltiger source parameter"
		}
		seriesID := strings.TrimSpace(strings.TrimPrefix(*source, "jellyfin:"))
		if seriesID == "" {
			return models.AdminAnimeCreateInput{}, "ungueltiger source parameter"
		}
		normalizedSource := "jellyfin:" + seriesID
		source = &normalizedSource
	}

	if req.Year != nil && *req.Year <= 0 {
		return models.AdminAnimeCreateInput{}, "ungueltiger year parameter"
	}
	if req.MaxEpisodes != nil && *req.MaxEpisodes <= 0 {
		return models.AdminAnimeCreateInput{}, "ungueltiger max_episodes parameter"
	}

	return models.AdminAnimeCreateInput{
		Title:       title,
		TitleDE:     normalizeNullableString(req.TitleDE),
		TitleEN:     normalizeNullableString(req.TitleEN),
		Type:        animeType,
		ContentType: contentType,
		Status:      status,
		Year:        req.Year,
		MaxEpisodes: req.MaxEpisodes,
		Genre:       normalizeNullableString(req.Genre),
		Description: normalizeNullableString(req.Description),
		CoverImage:  coverImage,
		Source:      source,
		FolderName:  folderName,
	}, ""
}

func validateAdminAnimePatchRequest(req models.AdminAnimePatchInput) (models.AdminAnimePatchInput, string) {
	if !hasAnyAdminAnimePatchField(req) {
		return models.AdminAnimePatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Title.Set {
		title := normalizeRequiredString(req.Title.Value)
		if title == nil {
			return models.AdminAnimePatchInput{}, "title ist erforderlich"
		}
		if len([]rune(*title)) > 255 {
			return models.AdminAnimePatchInput{}, "title ist zu lang"
		}
		req.Title.Value = title
	}
	if req.Type.Set {
		value := normalizeRequiredString(req.Type.Value)
		if value == nil {
			return models.AdminAnimePatchInput{}, "ungueltiger type parameter"
		}
		if _, ok := allowedAnimeTypes[*value]; !ok {
			return models.AdminAnimePatchInput{}, "ungueltiger type parameter"
		}
		req.Type.Value = value
	}
	if req.ContentType.Set {
		value := normalizeRequiredString(req.ContentType.Value)
		if value == nil {
			return models.AdminAnimePatchInput{}, "ungueltiger content_type parameter"
		}
		if _, ok := allowedContentTypes[*value]; !ok {
			return models.AdminAnimePatchInput{}, "ungueltiger content_type parameter"
		}
		req.ContentType.Value = value
	}
	if req.Status.Set {
		value := normalizeRequiredString(req.Status.Value)
		if value == nil {
			return models.AdminAnimePatchInput{}, "ungueltiger status parameter"
		}
		if _, ok := allowedAnimeStatuses[*value]; !ok {
			return models.AdminAnimePatchInput{}, "ungueltiger status parameter"
		}
		req.Status.Value = value
	}
	if req.Year.Set && req.Year.Value != nil && *req.Year.Value <= 0 {
		return models.AdminAnimePatchInput{}, "ungueltiger year parameter"
	}
	if req.MaxEpisodes.Set && req.MaxEpisodes.Value != nil && *req.MaxEpisodes.Value <= 0 {
		return models.AdminAnimePatchInput{}, "ungueltiger max_episodes parameter"
	}

	if req.TitleDE.Set {
		req.TitleDE.Value = normalizeNullableString(req.TitleDE.Value)
	}
	if req.TitleEN.Set {
		req.TitleEN.Value = normalizeNullableString(req.TitleEN.Value)
	}
	if req.Genre.Set {
		req.Genre.Value = normalizeNullableString(req.Genre.Value)
	}
	if req.Description.Set {
		req.Description.Value = normalizeNullableString(req.Description.Value)
	}
	if req.CoverImage.Set {
		req.CoverImage.Value = normalizeNullableString(req.CoverImage.Value)
	}

	return req, ""
}

func hasAnyAdminAnimePatchField(req models.AdminAnimePatchInput) bool {
	return req.Title.Set ||
		req.TitleDE.Set ||
		req.TitleEN.Set ||
		req.Type.Set ||
		req.ContentType.Set ||
		req.Status.Set ||
		req.Year.Set ||
		req.MaxEpisodes.Set ||
		req.Genre.Set ||
		req.Description.Set ||
		req.CoverImage.Set
}
