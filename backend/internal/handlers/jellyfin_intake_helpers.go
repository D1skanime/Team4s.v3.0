package handlers

import (
	"path/filepath"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"
)

func buildAdminJellyfinIntakeSearchItems(
	items []jellyfinSeriesItem,
	query string,
) []models.AdminJellyfinIntakeSearchItem {
	type scoredCandidate struct {
		score     int
		candidate models.AdminJellyfinIntakeSearchItem
	}

	scored := make([]scoredCandidate, 0, len(items))
	for _, item := range items {
		if strings.TrimSpace(item.ID) == "" {
			continue
		}
		candidate, score := buildAdminJellyfinIntakeSearchItem(item, query)
		scored = append(scored, scoredCandidate{score: score, candidate: candidate})
	}

	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score == scored[j].score {
			return strings.ToLower(scored[i].candidate.Name) < strings.ToLower(scored[j].candidate.Name)
		}
		return scored[i].score > scored[j].score
	})

	result := make([]models.AdminJellyfinIntakeSearchItem, 0, len(scored))
	for _, item := range scored {
		result = append(result, item.candidate)
	}

	return result
}

func buildAdminJellyfinIntakeSearchItem(
	item jellyfinSeriesItem,
	query string,
) (models.AdminJellyfinIntakeSearchItem, int) {
	parentContext, libraryContext := deriveJellyfinPathContexts(normalizeNullableStringPtr(item.Path))
	typeHint := buildJellyfinIntakeTypeHint(item.Name, normalizeNullableStringPtr(item.Path))
	score, confidence := scoreJellyfinIntakeCandidate(item, query)
	seriesID := strings.TrimSpace(item.ID)

	return models.AdminJellyfinIntakeSearchItem{
		JellyfinSeriesID: seriesID,
		Name:             strings.TrimSpace(item.Name),
		ProductionYear:   item.ProductionYear,
		Path:             normalizeNullableStringPtr(item.Path),
		ParentContext:    parentContext,
		LibraryContext:   libraryContext,
		Confidence:       confidence,
		TypeHint:         typeHint,
		PosterURL:        normalizeNullableStringPtr(buildGroupMediaImageURL(seriesID, "primary", nil)),
		BannerURL:        normalizeNullableStringPtr(buildGroupMediaImageURL(seriesID, "banner", nil)),
		LogoURL:          normalizeNullableStringPtr(buildGroupMediaImageURL(seriesID, "logo", nil)),
		BackgroundURL:    normalizeNullableStringPtr(buildGroupMediaImageURL(seriesID, "backdrop", nil)),
	}, score
}

func buildAdminJellyfinIntakePreviewResult(
	detail jellyfinSeriesDetailItem,
	themeVideoIDs []string,
) models.AdminJellyfinIntakePreviewResult {
	pathPtr := normalizeNullableStringPtr(detail.Path)
	parentContext, libraryContext := deriveJellyfinPathContexts(pathPtr)
	typeHint := buildJellyfinIntakeTypeHint(detail.Name, pathPtr)
	seriesID := strings.TrimSpace(detail.ID)

	return models.AdminJellyfinIntakePreviewResult{
		JellyfinSeriesID:   seriesID,
		JellyfinSeriesName: strings.TrimSpace(detail.Name),
		JellyfinSeriesPath: pathPtr,
		ParentContext:      parentContext,
		LibraryContext:     libraryContext,
		Description:        normalizeNullableStringPtr(detail.Overview),
		Year:               int16FromInt(detail.ProductionYear),
		Genre:              joinNormalizedStrings(detail.Genres),
		Tags:               normalizeStringSlice(detail.Tags),
		AniDBID:            extractAniDBID(detail.ProviderIDs),
		TypeHint:           typeHint,
		AssetSlots: models.AdminJellyfinIntakeAssetSlots{
			Cover:           buildJellyfinIntakeAssetSlot("cover", buildGroupMediaImageURL(seriesID, "primary", nil), hasImageTag(detail.ImageTags, "Primary")),
			Logo:            buildJellyfinIntakeAssetSlot("logo", buildGroupMediaImageURL(seriesID, "logo", nil), hasImageTag(detail.ImageTags, "Logo")),
			Banner:          buildJellyfinIntakeAssetSlot("banner", buildGroupMediaImageURL(seriesID, "banner", nil), hasImageTag(detail.ImageTags, "Banner")),
			Backgrounds:     buildJellyfinIntakeBackgroundSlots(seriesID, len(detail.BackdropImageTags)),
			BackgroundVideo: buildJellyfinIntakeAssetSlot("background_video", buildAnimeBackdropVideoProxyURL(firstNonEmptyString(themeVideoIDs...)), len(themeVideoIDs) > 0),
		},
	}
}

func buildJellyfinIntakeAssetSlot(kind string, rawURL string, present bool) models.AdminJellyfinIntakeAssetSlot {
	slot := models.AdminJellyfinIntakeAssetSlot{
		Present: present,
		Kind:    kind,
		Source:  "jellyfin",
	}
	if present {
		slot.URL = normalizeNullableStringPtr(rawURL)
	}
	return slot
}

func buildJellyfinIntakeBackgroundSlots(seriesID string, count int) []models.AdminJellyfinIntakeAssetSlot {
	if count <= 0 {
		return []models.AdminJellyfinIntakeAssetSlot{}
	}

	result := make([]models.AdminJellyfinIntakeAssetSlot, 0, count)
	for i := 0; i < count; i++ {
		index := i
		slot := buildJellyfinIntakeAssetSlot("background", buildAnimeBackdropProxyURL(seriesID, &index), true)
		slot.Index = &index
		result = append(result, slot)
	}

	return result
}

func buildJellyfinIntakeTypeHint(name string, rawPath *string) models.AdminJellyfinIntakeTypeHint {
	signal := strings.ToLower(strings.TrimSpace(name + " " + derefString(rawPath)))
	reasons := make([]string, 0, 2)
	confidence := "low"

	switch {
	case strings.Contains(signal, " bonus "):
		suggested := "bonus"
		reasons = append(reasons, `Token "Bonus" im Pfad oder Namen erkannt.`)
		confidence = "high"
		return models.AdminJellyfinIntakeTypeHint{SuggestedType: &suggested, Confidence: confidence, Reasons: reasons}
	case strings.Contains(signal, " ova") || strings.Contains(signal, "ova "):
		suggested := "ova"
		reasons = append(reasons, `Token "OVA" im Pfad oder Namen erkannt.`)
		confidence = "high"
		return models.AdminJellyfinIntakeTypeHint{SuggestedType: &suggested, Confidence: confidence, Reasons: reasons}
	case strings.Contains(signal, " ona") || strings.Contains(signal, "web"):
		suggested := "ona"
		reasons = append(reasons, `Web- oder ONA-Hinweis im Pfad oder Namen erkannt.`)
		confidence = "medium"
		return models.AdminJellyfinIntakeTypeHint{SuggestedType: &suggested, Confidence: confidence, Reasons: reasons}
	case strings.Contains(signal, "special") || strings.Contains(signal, "season 00"):
		suggested := "special"
		reasons = append(reasons, `Special-Hinweis oder "Season 00" im Pfad erkannt.`)
		confidence = "medium"
		return models.AdminJellyfinIntakeTypeHint{SuggestedType: &suggested, Confidence: confidence, Reasons: reasons}
	case strings.Contains(signal, "movie") || strings.Contains(signal, "film"):
		suggested := "film"
		reasons = append(reasons, `Film-Hinweis im Pfad oder Namen erkannt.`)
		confidence = "high"
		return models.AdminJellyfinIntakeTypeHint{SuggestedType: &suggested, Confidence: confidence, Reasons: reasons}
	default:
		suggested := "tv"
		reasons = append(reasons, `Kein spezieller Sonderfall erkannt; Standard-Vorschlag fuer Serienordner.`)
		return models.AdminJellyfinIntakeTypeHint{SuggestedType: &suggested, Confidence: confidence, Reasons: reasons}
	}
}

func scoreJellyfinIntakeCandidate(item jellyfinSeriesItem, query string) (int, string) {
	normalizedQuery := normalizeJellyfinLookup(query)
	normalizedName := normalizeJellyfinLookup(item.Name)
	normalizedPath := normalizeJellyfinLookup(item.Path)

	score := 10
	switch {
	case normalizedQuery != "" && normalizedName == normalizedQuery:
		score = 100
	case normalizedQuery != "" && strings.Contains(normalizedPath, normalizedQuery):
		score = 80
	case normalizedQuery != "" && strings.Contains(normalizedName, normalizedQuery):
		score = 60
	}

	switch {
	case score >= 90:
		return score, "high"
	case score >= 60:
		return score, "medium"
	default:
		return score, "low"
	}
}

func deriveJellyfinPathContexts(rawPath *string) (*string, *string) {
	trimmed := strings.TrimSpace(derefString(rawPath))
	if trimmed == "" {
		return nil, nil
	}

	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	parts := strings.Split(normalized, "/")
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if len(part) == 2 && strings.HasSuffix(part, ":") {
			continue
		}
		filtered = append(filtered, part)
	}
	if len(filtered) == 0 {
		return nil, nil
	}

	library := normalizeNullableStringPtr(filtered[0])
	if len(filtered) == 1 {
		return nil, library
	}

	parentIndex := len(filtered) - 2
	if parentIndex < 0 {
		return nil, library
	}
	parent := normalizeNullableStringPtr(filtered[parentIndex])
	if parent != nil && filepath.Base(filtered[len(filtered)-1]) == *parent {
		parent = nil
	}

	return parent, library
}

func hasImageTag(tags map[string]string, key string) bool {
	for candidateKey, value := range tags {
		if !strings.EqualFold(strings.TrimSpace(candidateKey), key) {
			continue
		}
		return strings.TrimSpace(value) != ""
	}
	return false
}

func joinNormalizedStrings(values []string) *string {
	normalized := normalizeStringSlice(values)
	if len(normalized) == 0 {
		return nil
	}
	joined := strings.Join(normalized, ", ")
	return &joined
}

func normalizeStringSlice(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func extractAniDBID(providerIDs map[string]string) *string {
	for key, value := range providerIDs {
		if !strings.EqualFold(strings.TrimSpace(key), "AniDB") {
			continue
		}
		return normalizeNullableStringPtr(value)
	}
	return nil
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
