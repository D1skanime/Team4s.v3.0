package handlers

import (
	"team4s.v3/backend/internal/models"
)

// validateFansubGroupCreateRequest prüft und normalisiert die Felder eines Erstellungs-Requests für eine Fansub-Gruppe.
// Gibt das bereinigte Input-Objekt und eine Fehlermeldung zurück; die Meldung ist leer bei Erfolg.
func validateFansubGroupCreateRequest(req fansubGroupCreateRequest) (models.FansubGroupCreateInput, string) {
	slug := normalizeRequiredString(&req.Slug)
	if slug == nil || len([]rune(*slug)) > 120 {
		return models.FansubGroupCreateInput{}, "ungueltiger slug parameter"
	}

	name := normalizeRequiredString(&req.Name)
	if name == nil || len([]rune(*name)) > 120 {
		return models.FansubGroupCreateInput{}, "ungueltiger name parameter"
	}

	status := normalizeRequiredString(&req.Status)
	if status == nil {
		return models.FansubGroupCreateInput{}, "status ist erforderlich"
	}
	if _, ok := allowedFansubStatuses[*status]; !ok {
		return models.FansubGroupCreateInput{}, "ungueltiger status parameter"
	}

	groupType := models.FansubGroupTypeGroup
	if req.GroupType != nil {
		value := normalizeRequiredString(req.GroupType)
		if value == nil {
			return models.FansubGroupCreateInput{}, "ungueltiger group_type parameter"
		}

		parsedGroupType := models.FansubGroupType(*value)
		switch parsedGroupType {
		case models.FansubGroupTypeGroup, models.FansubGroupTypeCollaboration:
			groupType = parsedGroupType
		default:
			return models.FansubGroupCreateInput{}, "ungueltiger group_type parameter"
		}
	}

	if req.FoundedYear != nil && *req.FoundedYear <= 0 {
		return models.FansubGroupCreateInput{}, "ungueltiger founded_year parameter"
	}
	if req.LogoID != nil && *req.LogoID <= 0 {
		return models.FansubGroupCreateInput{}, "ungueltiger logo_id parameter"
	}
	if req.BannerID != nil && *req.BannerID <= 0 {
		return models.FansubGroupCreateInput{}, "ungueltiger banner_id parameter"
	}
	if req.DissolvedYear != nil && *req.DissolvedYear <= 0 {
		return models.FansubGroupCreateInput{}, "ungueltiger dissolved_year parameter"
	}
	if req.FoundedYear != nil && req.DissolvedYear != nil && *req.DissolvedYear < *req.FoundedYear {
		return models.FansubGroupCreateInput{}, "dissolved_year muss groesser oder gleich founded_year sein"
	}

	country := normalizeNullableString(req.Country)
	if country != nil && len([]rune(*country)) > 80 {
		return models.FansubGroupCreateInput{}, "country ist zu lang"
	}

	return models.FansubGroupCreateInput{
		Slug:          *slug,
		Name:          *name,
		Description:   normalizeNullableString(req.Description),
		History:       normalizeNullableString(req.History),
		LogoID:        req.LogoID,
		BannerID:      req.BannerID,
		LogoURL:       normalizeNullableString(req.LogoURL),
		BannerURL:     normalizeNullableString(req.BannerURL),
		FoundedYear:   req.FoundedYear,
		DissolvedYear: req.DissolvedYear,
		Status:        *status,
		GroupType:     groupType,
		WebsiteURL:    normalizeNullableString(req.WebsiteURL),
		DiscordURL:    normalizeNullableString(req.DiscordURL),
		IrcURL:        normalizeNullableString(req.IrcURL),
		Country:       country,
	}, ""
}
