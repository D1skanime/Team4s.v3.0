package handlers

import (
	"team4s.v3/backend/internal/models"
)

// validateFansubGroupPatchRequest prüft und normalisiert die Felder eines Patch-Requests für eine Fansub-Gruppe.
// Gibt das bereinigte Input-Objekt und eine Fehlermeldung zurück; die Meldung ist leer bei Erfolg.
func validateFansubGroupPatchRequest(req models.FansubGroupPatchInput) (models.FansubGroupPatchInput, string) {
	if !hasAnyFansubGroupPatchField(req) {
		return models.FansubGroupPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Slug.Set {
		value := normalizeRequiredString(req.Slug.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.FansubGroupPatchInput{}, "ungueltiger slug parameter"
		}
		req.Slug.Value = value
	}
	if req.Name.Set {
		value := normalizeRequiredString(req.Name.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.FansubGroupPatchInput{}, "ungueltiger name parameter"
		}
		req.Name.Value = value
	}
	if req.Status.Set {
		value := normalizeRequiredString(req.Status.Value)
		if value == nil {
			return models.FansubGroupPatchInput{}, "ungueltiger status parameter"
		}
		if _, ok := allowedFansubStatuses[*value]; !ok {
			return models.FansubGroupPatchInput{}, "ungueltiger status parameter"
		}
		req.Status.Value = value
	}
	if req.GroupType.Set {
		value := normalizeRequiredString(req.GroupType.Value)
		if value == nil {
			return models.FansubGroupPatchInput{}, "ungueltiger group_type parameter"
		}

		parsedGroupType := models.FansubGroupType(*value)
		switch parsedGroupType {
		case models.FansubGroupTypeGroup, models.FansubGroupTypeCollaboration:
			normalizedGroupType := string(parsedGroupType)
			req.GroupType.Value = &normalizedGroupType
		default:
			return models.FansubGroupPatchInput{}, "ungueltiger group_type parameter"
		}
	}
	if req.LogoID.Set && req.LogoID.Value != nil && *req.LogoID.Value <= 0 {
		return models.FansubGroupPatchInput{}, "ungueltiger logo_id parameter"
	}
	if req.BannerID.Set && req.BannerID.Value != nil && *req.BannerID.Value <= 0 {
		return models.FansubGroupPatchInput{}, "ungueltiger banner_id parameter"
	}
	if req.FoundedYear.Set && req.FoundedYear.Value != nil && *req.FoundedYear.Value <= 0 {
		return models.FansubGroupPatchInput{}, "ungueltiger founded_year parameter"
	}
	if req.DissolvedYear.Set && req.DissolvedYear.Value != nil && *req.DissolvedYear.Value <= 0 {
		return models.FansubGroupPatchInput{}, "ungueltiger dissolved_year parameter"
	}
	if req.FoundedYear.Set && req.DissolvedYear.Set && req.FoundedYear.Value != nil && req.DissolvedYear.Value != nil {
		if *req.DissolvedYear.Value < *req.FoundedYear.Value {
			return models.FansubGroupPatchInput{}, "dissolved_year muss groesser oder gleich founded_year sein"
		}
	}

	if req.Description.Set {
		req.Description.Value = normalizeNullableString(req.Description.Value)
	}
	if req.History.Set {
		req.History.Value = normalizeNullableString(req.History.Value)
	}
	if req.LogoURL.Set {
		req.LogoURL.Value = normalizeNullableString(req.LogoURL.Value)
	}
	if req.BannerURL.Set {
		req.BannerURL.Value = normalizeNullableString(req.BannerURL.Value)
	}
	if req.WebsiteURL.Set {
		req.WebsiteURL.Value = normalizeNullableString(req.WebsiteURL.Value)
	}
	if req.DiscordURL.Set {
		req.DiscordURL.Value = normalizeNullableString(req.DiscordURL.Value)
	}
	if req.IrcURL.Set {
		req.IrcURL.Value = normalizeNullableString(req.IrcURL.Value)
	}
	if req.Country.Set {
		req.Country.Value = normalizeNullableString(req.Country.Value)
		if req.Country.Value != nil && len([]rune(*req.Country.Value)) > 80 {
			return models.FansubGroupPatchInput{}, "country ist zu lang"
		}
	}

	return req, ""
}

// hasAnyFansubGroupPatchField gibt true zurück, wenn mindestens ein Feld des Patch-Requests gesetzt ist.
func hasAnyFansubGroupPatchField(req models.FansubGroupPatchInput) bool {
	return req.Slug.Set ||
		req.Name.Set ||
		req.Description.Set ||
		req.History.Set ||
		req.LogoID.Set ||
		req.BannerID.Set ||
		req.LogoURL.Set ||
		req.BannerURL.Set ||
		req.FoundedYear.Set ||
		req.DissolvedYear.Set ||
		req.Status.Set ||
		req.GroupType.Set ||
		req.WebsiteURL.Set ||
		req.DiscordURL.Set ||
		req.IrcURL.Set ||
		req.Country.Set
}
