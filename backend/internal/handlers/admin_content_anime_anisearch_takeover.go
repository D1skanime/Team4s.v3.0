package handlers

// quick-261018-l5r Task 2: server-side, transactional field takeover that rides along with the
// additive "Verknüpfen"-Endpunkt (admin_content_anime_anisearch_link.go). This file owns the
// orchestration: fetching the inputs (current DB snapshot, the anime's existing Jellyfin
// comparison values if any, the fresh AniSearch record) and turning them into per-field
// fill/replace/keep decisions via the pure services.ResolveFieldTakeover rule. The actual
// transactional write happens in repository.LinkAniSearchSource -- this file only BUILDS the
// models.AdminAnimePatchInput it is handed.

import (
	"context"
	"log"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/services"
)

// aniSearchTakeoverFieldNames sind die exakt 8 Felder aus <takeover_field_list> -- title,
// content_type und status sind bewusst NICHT enthalten.
const (
	aniSearchTakeoverFieldTitleDE     = "title_de"
	aniSearchTakeoverFieldTitleEN     = "title_en"
	aniSearchTakeoverFieldYear        = "year"
	aniSearchTakeoverFieldMaxEpisodes = "max_episodes"
	aniSearchTakeoverFieldGenre       = "genre"
	aniSearchTakeoverFieldTags        = "tags"
	aniSearchTakeoverFieldDescription = "description"
	aniSearchTakeoverFieldType        = "type"
)

// aniSearchJellyfinComparison trägt die Jellyfin-Vergleichswerte für die 4 Felder, die laut
// <takeover_field_list> ein echtes Jellyfin-Äquivalent haben (year, description, genre, tags).
// Available=false bedeutet: kein Jellyfin-Link am Anime, Jellyfin ist nicht konfiguriert, oder der
// Live-Lookup ist fehlgeschlagen -- in jedem dieser Fälle fällt JEDES Feld auf
// fill-wenn-leer/keep-sonst zurück (<the_rule>, letzter Punkt).
type aniSearchJellyfinComparison struct {
	Available   bool
	Year        *int16
	Description *string
	Genre       []string
	Tags        []string
}

// buildAniSearchFieldTakeover orchestriert die vollständige Übernahme-Entscheidung für einen
// additiven AniSearch-Link. Gibt (nil, nil) zurück, wenn die Übernahme gar nicht erst versucht
// werden konnte (fehlende Abhängigkeiten oder ein fehlgeschlagener AniSearch-Fetch) -- der
// aufrufende Handler muss den Link-Schreibvorgang in diesem Fall trotzdem fortsetzen, nur ohne
// Patch.
func (h *AdminContentHandler) buildAniSearchFieldTakeover(
	ctx context.Context,
	animeID int64,
	aniSearchID string,
) (*models.AdminAnimePatchInput, *models.AdminAnimeAniSearchTakeoverResult) {
	if h.aniSearchTakeoverSnapshotRepo == nil || h.aniSearchFetcher == nil {
		return nil, nil
	}

	snapshot, err := h.aniSearchTakeoverSnapshotRepo.GetAnimeAniSearchTakeoverSnapshot(ctx, animeID)
	if err != nil {
		log.Printf("admin_content anisearch_takeover: snapshot load failed (anime_id=%d): %v", animeID, err)
		return nil, nil
	}

	aniSearchAnime, err := h.aniSearchFetcher.FetchAnime(ctx, aniSearchID)
	if err != nil {
		log.Printf("admin_content anisearch_takeover: anisearch fetch failed (anime_id=%d, anisearch_id=%s): %v", animeID, aniSearchID, err)
		return nil, nil
	}

	comparison := h.resolveAniSearchJellyfinComparison(ctx, animeID)

	patch, result := buildAniSearchFieldTakeoverPlan(snapshot, comparison, aniSearchAnime)
	return &patch, &result
}

// resolveAniSearchJellyfinComparison versucht, die aktuellen Jellyfin-Vergleichswerte für den
// EXISTIERENDEN Jellyfin-Link des Anime zu laden -- degradiert bei JEDEM Fehlschlag (kein Link,
// Jellyfin nicht konfiguriert, Upstream-Fehler) auf Available=false, NIEMALS auf einen Fehler, der
// den Link+Übernahme-Ablauf blockiert.
func (h *AdminContentHandler) resolveAniSearchJellyfinComparison(ctx context.Context, animeID int64) aniSearchJellyfinComparison {
	if h.aniSearchTakeoverSyncSourceRepo == nil {
		return aniSearchJellyfinComparison{}
	}
	if strings.TrimSpace(h.jellyfinBaseURL) == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		return aniSearchJellyfinComparison{}
	}

	animeSource, err := h.aniSearchTakeoverSyncSourceRepo.GetAnimeSyncSource(ctx, animeID)
	if err != nil || animeSource == nil {
		return aniSearchJellyfinComparison{}
	}

	seriesID := jellyfinSeriesIDFromAnimeSource(animeSource.Source, animeSource.SourceLinks)
	if seriesID == "" {
		return aniSearchJellyfinComparison{}
	}

	series, _, err := h.resolveJellyfinSeries(ctx, nil, seriesID)
	if err != nil || series == nil {
		return aniSearchJellyfinComparison{}
	}

	detail, err := h.getJellyfinSeriesIntakeDetail(ctx, strings.TrimSpace(series.ID))
	if err != nil || detail == nil {
		return aniSearchJellyfinComparison{}
	}

	intakePreview := buildAdminJellyfinIntakePreviewResult(*detail, nil)
	return aniSearchJellyfinComparison{
		Available:   true,
		Year:        intakePreview.Year,
		Description: intakePreview.Description,
		Genre:       splitAniSearchTakeoverCommaList(intakePreview.Genre),
		Tags:        append([]string(nil), intakePreview.Tags...),
	}
}

// buildAniSearchFieldTakeoverPlan wendet services.ResolveFieldTakeover auf jedes der 8 Felder an
// und sammelt sowohl den zu schreibenden Patch als auch die für die API-Antwort/Audit-Log
// benötigte Zusammenfassung.
func buildAniSearchFieldTakeoverPlan(
	current *models.AdminAnimeAniSearchTakeoverSnapshot,
	jellyfin aniSearchJellyfinComparison,
	aniSearchAnime services.AniSearchAnime,
) (models.AdminAnimePatchInput, models.AdminAnimeAniSearchTakeoverResult) {
	var patch models.AdminAnimePatchInput
	result := models.AdminAnimeAniSearchTakeoverResult{
		Filled:              make([]string, 0, 8),
		Replaced:            make([]string, 0, 8),
		Kept:                make([]models.AdminAnimeAniSearchFieldOutcome, 0, 8),
		JellyfinUnreachable: !jellyfin.Available,
	}

	record := func(field string, decision services.FieldTakeoverResult) {
		switch decision.Action {
		case services.FieldTakeoverFill:
			result.Filled = append(result.Filled, field)
		case services.FieldTakeoverReplace:
			result.Replaced = append(result.Replaced, field)
		default:
			result.Kept = append(result.Kept, models.AdminAnimeAniSearchFieldOutcome{
				Field:  field,
				Action: string(decision.Action),
				Reason: decision.Reason,
			})
		}
	}

	takesOver := func(decision services.FieldTakeoverResult) bool {
		return decision.Action == services.FieldTakeoverFill || decision.Action == services.FieldTakeoverReplace
	}

	// title_de / title_en: NIE ein Jellyfin-Vergleich (kein Äquivalent, <takeover_field_list>).
	titleDEDecision, titleDEValue := resolveAniSearchScalarTakeover(current.TitleDE, nil, aniSearchAnime.GermanTitle)
	record(aniSearchTakeoverFieldTitleDE, titleDEDecision)
	if takesOver(titleDEDecision) {
		patch.TitleDE = models.OptionalString{Set: true, Value: stringPtrFromValue(derefString(titleDEValue))}
	}

	titleENDecision, titleENValue := resolveAniSearchScalarTakeover(current.TitleEN, nil, aniSearchAnime.EnglishTitle)
	record(aniSearchTakeoverFieldTitleEN, titleENDecision)
	if takesOver(titleENDecision) {
		patch.TitleEN = models.OptionalString{Set: true, Value: stringPtrFromValue(derefString(titleENValue))}
	}

	// year: echter Jellyfin-Vergleichswert, nur wenn der Lookup verfügbar war.
	var yearJellyfin *int16
	if jellyfin.Available {
		yearJellyfin = jellyfin.Year
	}
	yearDecision, yearValue := resolveAniSearchInt16Takeover(current.Year, yearJellyfin, aniSearchAnime.Year)
	record(aniSearchTakeoverFieldYear, yearDecision)
	if takesOver(yearDecision) {
		patch.Year = models.OptionalInt16{Set: true, Value: yearValue}
	}

	// max_episodes: NIE ein Jellyfin-Vergleich.
	maxEpisodesDecision, maxEpisodesValue := resolveAniSearchInt16Takeover(current.MaxEpisodes, nil, aniSearchAnime.EpisodeCount)
	record(aniSearchTakeoverFieldMaxEpisodes, maxEpisodesDecision)
	if takesOver(maxEpisodesDecision) {
		patch.MaxEpisodes = models.OptionalInt16{Set: true, Value: maxEpisodesValue}
	}

	// genre: echter Jellyfin-Vergleichswert (intakePreview.Genre, Komma-String -> Liste gesplittet).
	var genreJellyfin []string
	if jellyfin.Available {
		genreJellyfin = jellyfin.Genre
	}
	genreDecision, genreValue := resolveAniSearchListTakeover(current.Genres, genreJellyfin, aniSearchAnime.Genres)
	record(aniSearchTakeoverFieldGenre, genreDecision)
	if takesOver(genreDecision) {
		patch.Genre = models.OptionalString{Set: true, Value: joinAniSearchTakeoverGenreList(genreValue)}
	}

	// tags: echter Jellyfin-Vergleichswert (intakePreview.Tags, bereits eine Liste).
	var tagsJellyfin []string
	if jellyfin.Available {
		tagsJellyfin = jellyfin.Tags
	}
	tagsDecision, tagsValue := resolveAniSearchListTakeover(current.Tags, tagsJellyfin, aniSearchAnime.Tags)
	record(aniSearchTakeoverFieldTags, tagsDecision)
	if takesOver(tagsDecision) {
		patch.Tags = models.OptionalStringSlice{Set: true, Value: append([]string(nil), tagsValue...)}
	}

	// description: echter Jellyfin-Vergleichswert.
	var descriptionJellyfin *string
	if jellyfin.Available {
		descriptionJellyfin = jellyfin.Description
	}
	descriptionDecision, descriptionValue := resolveAniSearchScalarTakeover(current.Description, descriptionJellyfin, aniSearchAnime.Description)
	record(aniSearchTakeoverFieldDescription, descriptionDecision)
	if takesOver(descriptionDecision) {
		patch.Description = models.OptionalString{Set: true, Value: stringPtrFromValue(derefString(descriptionValue))}
	}

	// type: NIE ein Jellyfin-Vergleich (TypeHint ist nur eine Heuristik, siehe <takeover_field_list>).
	typeValue, hasTypeValue := services.ResolveAniSearchTypeTakeoverValue(aniSearchAnime.Format)
	typeDecision := services.ResolveFieldTakeover(services.NormalizeScalarForComparison(current.Type), nil, hasTypeValue)
	record(aniSearchTakeoverFieldType, typeDecision)
	if takesOver(typeDecision) && hasTypeValue {
		patch.Type = models.OptionalString{Set: true, Value: &typeValue}
	}

	return patch, result
}

// resolveAniSearchScalarTakeover normalisiert current/jellyfin über
// services.NormalizeScalarForComparison und ruft services.ResolveFieldTakeover auf. jellyfin==nil
// bedeutet "kein Vergleich möglich" (nicht "Jellyfin-Wert ist leer"). Gibt zusätzlich den
// ROHEN (nicht normalisierten) AniSearch-Wert zurück, damit der Aufrufer ihn bei fill/replace
// unverändert in den Patch schreiben kann.
func resolveAniSearchScalarTakeover(current *string, jellyfin *string, aniSearch *string) (services.FieldTakeoverResult, *string) {
	currentNormalized := services.NormalizeScalarForComparison(derefString(current))

	var jellyfinNormalized *string
	if jellyfin != nil {
		normalized := services.NormalizeScalarForComparison(*jellyfin)
		jellyfinNormalized = &normalized
	}

	hasAniSearchValue := aniSearch != nil && strings.TrimSpace(*aniSearch) != ""
	decision := services.ResolveFieldTakeover(currentNormalized, jellyfinNormalized, hasAniSearchValue)
	return decision, aniSearch
}

// resolveAniSearchInt16Takeover ist resolveAniSearchScalarTakeover für *int16-Felder (year,
// max_episodes) -- vergleicht über die Dezimaldarstellung.
func resolveAniSearchInt16Takeover(current *int16, jellyfin *int16, aniSearch *int16) (services.FieldTakeoverResult, *int16) {
	currentNormalized := services.NormalizeScalarForComparison(int16TakeoverComparisonString(current))

	var jellyfinNormalized *string
	if jellyfin != nil {
		normalized := services.NormalizeScalarForComparison(int16TakeoverComparisonString(jellyfin))
		jellyfinNormalized = &normalized
	}

	hasAniSearchValue := aniSearch != nil
	decision := services.ResolveFieldTakeover(currentNormalized, jellyfinNormalized, hasAniSearchValue)
	return decision, aniSearch
}

// resolveAniSearchListTakeover ist resolveAniSearchScalarTakeover für Listenfelder (genre, tags)
// -- vergleicht über den ordnungsunabhängigen, kleingeschriebenen Kanonik-Schlüssel aus
// services.NormalizeListForComparison.
func resolveAniSearchListTakeover(current []string, jellyfin []string, aniSearch []string) (services.FieldTakeoverResult, []string) {
	currentNormalized := services.NormalizeListForComparison(current)

	var jellyfinNormalized *string
	if jellyfin != nil {
		normalized := services.NormalizeListForComparison(jellyfin)
		jellyfinNormalized = &normalized
	}

	hasAniSearchValue := len(aniSearch) > 0
	decision := services.ResolveFieldTakeover(currentNormalized, jellyfinNormalized, hasAniSearchValue)
	return decision, aniSearch
}

// int16TakeoverComparisonString wandelt einen *int16 in seine Dezimaldarstellung um ("" für nil),
// damit er über services.NormalizeScalarForComparison laufen kann.
func int16TakeoverComparisonString(value *int16) string {
	if value == nil {
		return ""
	}
	return strconv.FormatInt(int64(*value), 10)
}

// splitAniSearchTakeoverCommaList splittet den Komma-String aus
// AdminJellyfinIntakePreviewResult.Genre (joinNormalizedStrings) zurück in eine Liste, damit er
// mit services.NormalizeListForComparison vergleichbar ist.
func splitAniSearchTakeoverCommaList(raw *string) []string {
	if raw == nil {
		return nil
	}
	parts := strings.Split(*raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	return result
}

// joinAniSearchTakeoverGenreList fasst eine Genre-Liste wieder zu dem Komma-String zusammen, den
// models.AdminAnimePatchInput.Genre erwartet (dieselbe Form wie buildAniSearchDraftPayload's
// joinOptional für den Create-Flow).
func joinAniSearchTakeoverGenreList(values []string) *string {
	cleaned := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		cleaned = append(cleaned, trimmed)
	}
	if len(cleaned) == 0 {
		return nil
	}
	joined := strings.Join(cleaned, ", ")
	return &joined
}
