package handlers

import (
	"team4s.v3/backend/internal/models"
)

// validateFansubMemberCreateRequest prüft die Pflichtfelder eines Anlege-Requests für Fansub-Mitglieder.
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

// validateFansubMemberPatchRequest prüft die Felder eines Patch-Requests für Fansub-Mitglieder.
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
