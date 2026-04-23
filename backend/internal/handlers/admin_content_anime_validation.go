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
	"web":     {},
}

// validateAdminAnimeCreateRequest prüft und normalisiert die Eingabe einer Anime-Erstellungsanfrage und gibt das bereinigte Eingabeobjekt oder eine Fehlermeldung zurück.
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
	bannerImage := normalizeNullableString(req.BannerImage)
	logoImage := normalizeNullableString(req.LogoImage)
	backgroundVideoURL := normalizeNullableString(req.BackgroundVideoURL)
	backgroundImageURLs := normalizeStringSlice(req.BackgroundImageURLs)

	source := normalizeNullableString(req.Source)
	sourceLinks, sourceLinksMessage := normalizeAdminAnimeSourceLinks(req.SourceLinks, source)
	if sourceLinksMessage != "" {
		return models.AdminAnimeCreateInput{}, sourceLinksMessage
	}
	folderName := normalizeNullableString(req.FolderName)
	if folderName != nil && source == nil {
		return models.AdminAnimeCreateInput{}, "folder_name erfordert source"
	}
	if source != nil {
		normalizedSource, ok := normalizeAdminAnimeSource(*source)
		if !ok {
			return models.AdminAnimeCreateInput{}, "ungueltiger source parameter"
		}
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
		Tags:        req.Tags,
		Description: normalizeNullableString(req.Description),
		CoverImage:          coverImage,
		BannerImage:         bannerImage,
		LogoImage:           logoImage,
		BackgroundVideoURL:  backgroundVideoURL,
		BackgroundImageURLs: backgroundImageURLs,
		Source:              source,
		SourceLinks:         sourceLinks,
		FolderName:  folderName,
	}, ""
}

// validateAdminAnimePatchRequest prüft und normalisiert die Eingabe einer partiellen Anime-Aktualisierungsanfrage und gibt das bereinigte Eingabeobjekt oder eine Fehlermeldung zurück.
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
	if req.Source.Set {
		if req.Source.Value != nil {
			normalizedSource, ok := normalizeAdminAnimeSource(*req.Source.Value)
			if !ok {
				return models.AdminAnimePatchInput{}, "ungueltiger source parameter"
			}
			req.Source.Value = &normalizedSource
		}
	}
	if req.FolderName.Set {
		req.FolderName.Value = normalizeNullableString(req.FolderName.Value)
	}

	return req, ""
}

// hasAnyAdminAnimePatchField prüft, ob mindestens ein Feld in einer Anime-Patch-Anfrage gesetzt ist.
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
		req.Tags.Set ||
		req.Description.Set ||
		req.CoverImage.Set ||
		req.Source.Set ||
		req.FolderName.Set
}

// normalizeAdminAnimeSource normalisiert und validiert einen Anime-Quellbezeichner im Format "jellyfin:<id>" oder "anisearch:<id>".
func normalizeAdminAnimeSource(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	switch {
	case strings.HasPrefix(trimmed, "jellyfin:"):
		seriesID := strings.TrimSpace(strings.TrimPrefix(trimmed, "jellyfin:"))
		if seriesID == "" {
			return "", false
		}
		return "jellyfin:" + seriesID, true
	case strings.HasPrefix(trimmed, "anisearch:"):
		aniSearchID := strings.TrimSpace(strings.TrimPrefix(trimmed, "anisearch:"))
		if aniSearchID == "" {
			return "", false
		}
		return "anisearch:" + aniSearchID, true
	default:
		return "", false
	}
}

func normalizeAdminAnimeSourceLinks(values []string, primary *string) ([]string, string) {
	seen := make(map[string]struct{}, len(values)+1)
	result := make([]string, 0, len(values)+1)

	appendValue := func(raw string) bool {
		if strings.TrimSpace(raw) == "" {
			return true
		}
		normalized, ok := normalizeAdminAnimeSource(raw)
		if !ok {
			return false
		}
		key := strings.ToLower(normalized)
		if _, exists := seen[key]; exists {
			return true
		}
		seen[key] = struct{}{}
		result = append(result, normalized)
		return true
	}

	if primary != nil && !appendValue(*primary) {
		return nil, "ungueltiger source parameter"
	}
	for _, value := range values {
		if !appendValue(value) {
			return nil, "ungueltiger source_links parameter"
		}
	}

	return result, ""
}
