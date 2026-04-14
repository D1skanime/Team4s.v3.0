package handlers

import (
	"team4s.v3/backend/internal/models"
)

// validateFansubAliasCreateRequest prüft und normalisiert die Felder eines Erstellungs-Requests für einen Fansub-Alias.
// Gibt das bereinigte Input-Objekt und eine Fehlermeldung zurück; die Meldung ist leer bei Erfolg.
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
