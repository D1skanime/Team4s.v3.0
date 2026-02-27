package handlers

import (
	"team4s.v3/backend/internal/models"
)

// Request types for fansub operations.

type fansubGroupCreateRequest struct {
	Slug          string  `json:"slug"`
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	History       *string `json:"history"`
	LogoID        *int64  `json:"logo_id"`
	BannerID      *int64  `json:"banner_id"`
	LogoURL       *string `json:"logo_url"`
	BannerURL     *string `json:"banner_url"`
	FoundedYear   *int32  `json:"founded_year"`
	DissolvedYear *int32  `json:"dissolved_year"`
	Status        string  `json:"status"`
	GroupType     *string `json:"group_type"`
	WebsiteURL    *string `json:"website_url"`
	DiscordURL    *string `json:"discord_url"`
	IrcURL        *string `json:"irc_url"`
	Country       *string `json:"country"`
}

type fansubMemberCreateRequest struct {
	Handle    string  `json:"handle"`
	Role      string  `json:"role"`
	SinceYear *int32  `json:"since_year"`
	UntilYear *int32  `json:"until_year"`
	Notes     *string `json:"notes"`
}

type fansubAliasCreateRequest struct {
	Alias string `json:"alias"`
}

type animeFansubAttachRequest struct {
	IsPrimary *bool   `json:"is_primary"`
	Notes     *string `json:"notes"`
}

// Validation functions.

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

func validateFansubMemberCreateRequest(req fansubMemberCreateRequest) (models.FansubMemberCreateInput, string) {
	handle := normalizeRequiredString(&req.Handle)
	if handle == nil || len([]rune(*handle)) > 120 {
		return models.FansubMemberCreateInput{}, "ungueltiger handle parameter"
	}

	role := normalizeRequiredString(&req.Role)
	if role == nil || len([]rune(*role)) > 60 {
		return models.FansubMemberCreateInput{}, "ungueltiger role parameter"
	}

	if req.SinceYear != nil && *req.SinceYear <= 0 {
		return models.FansubMemberCreateInput{}, "ungueltiger since_year parameter"
	}
	if req.UntilYear != nil && *req.UntilYear <= 0 {
		return models.FansubMemberCreateInput{}, "ungueltiger until_year parameter"
	}
	if req.SinceYear != nil && req.UntilYear != nil && *req.UntilYear < *req.SinceYear {
		return models.FansubMemberCreateInput{}, "until_year muss groesser oder gleich since_year sein"
	}

	return models.FansubMemberCreateInput{
		Handle:    *handle,
		Role:      *role,
		SinceYear: req.SinceYear,
		UntilYear: req.UntilYear,
		Notes:     normalizeNullableString(req.Notes),
	}, ""
}

func validateFansubAliasCreateRequest(req fansubAliasCreateRequest) (models.FansubAliasCreateInput, string) {
	alias := normalizeRequiredString(&req.Alias)
	if alias == nil || len([]rune(*alias)) > 120 {
		return models.FansubAliasCreateInput{}, "ungueltiger alias parameter"
	}

	normalizedAlias := normalizeFansubAliasKey(*alias)
	if normalizedAlias == "" {
		return models.FansubAliasCreateInput{}, "ungueltiger alias parameter"
	}

	return models.FansubAliasCreateInput{
		Alias:           *alias,
		NormalizedAlias: normalizedAlias,
	}, ""
}

func validateFansubMemberPatchRequest(req models.FansubMemberPatchInput) (models.FansubMemberPatchInput, string) {
	if !req.Handle.Set && !req.Role.Set && !req.SinceYear.Set && !req.UntilYear.Set && !req.Notes.Set {
		return models.FansubMemberPatchInput{}, "mindestens ein feld ist erforderlich"
	}

	if req.Handle.Set {
		value := normalizeRequiredString(req.Handle.Value)
		if value == nil || len([]rune(*value)) > 120 {
			return models.FansubMemberPatchInput{}, "ungueltiger handle parameter"
		}
		req.Handle.Value = value
	}
	if req.Role.Set {
		value := normalizeRequiredString(req.Role.Value)
		if value == nil || len([]rune(*value)) > 60 {
			return models.FansubMemberPatchInput{}, "ungueltiger role parameter"
		}
		req.Role.Value = value
	}
	if req.SinceYear.Set && req.SinceYear.Value != nil && *req.SinceYear.Value <= 0 {
		return models.FansubMemberPatchInput{}, "ungueltiger since_year parameter"
	}
	if req.UntilYear.Set && req.UntilYear.Value != nil && *req.UntilYear.Value <= 0 {
		return models.FansubMemberPatchInput{}, "ungueltiger until_year parameter"
	}
	if req.SinceYear.Set && req.UntilYear.Set && req.SinceYear.Value != nil && req.UntilYear.Value != nil {
		if *req.UntilYear.Value < *req.SinceYear.Value {
			return models.FansubMemberPatchInput{}, "until_year muss groesser oder gleich since_year sein"
		}
	}
	if req.Notes.Set {
		req.Notes.Value = normalizeNullableString(req.Notes.Value)
	}

	return req, ""
}
