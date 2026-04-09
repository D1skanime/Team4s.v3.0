package services

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"
)

type AniSearchFetcher interface {
	FetchAnime(ctx context.Context, aniSearchID string) (AniSearchAnime, error)
}

type AnimeCreateEnrichmentRepository interface {
	FindAnimeBySource(ctx context.Context, source string) (*models.AdminAnimeSourceMatch, error)
	ResolveAdminAnimeRelationTargetsByTitles(ctx context.Context, titles []string) ([]models.AdminAnimeRelationTitleMatch, error)
	ResolveAdminAnimeRelationTargetsBySources(ctx context.Context, sources []string) ([]models.AdminAnimeSourceMatch, error)
}

type JellysyncFollowupResult struct {
	Draft        models.AdminAnimeCreateDraftPayload
	FilledFields []string
	FilledAssets []string
	Applied      bool
}

type JellysyncFollowupFunc func(ctx context.Context, draft models.AdminAnimeCreateDraftPayload) (JellysyncFollowupResult, error)

type AnimeCreateEnrichmentService struct {
	fetcher  AniSearchFetcher
	repo     AnimeCreateEnrichmentRepository
	followup JellysyncFollowupFunc
}

func NewAnimeCreateEnrichmentService(
	fetcher AniSearchFetcher,
	repo AnimeCreateEnrichmentRepository,
	followup JellysyncFollowupFunc,
) *AnimeCreateEnrichmentService {
	return &AnimeCreateEnrichmentService{
		fetcher:  fetcher,
		repo:     repo,
		followup: followup,
	}
}

func (s *AnimeCreateEnrichmentService) Enrich(
	ctx context.Context,
	req models.AdminAnimeAniSearchEnrichmentRequest,
) (any, error) {
	aniSearchID := strings.TrimSpace(req.AniSearchID)
	if aniSearchID == "" {
		return nil, fmt.Errorf("anisearch id is required")
	}

	sourceTag := "anisearch:" + aniSearchID
	if duplicate, err := s.repo.FindAnimeBySource(ctx, sourceTag); err != nil {
		return nil, err
	} else if duplicate != nil {
		return models.AdminAnimeAniSearchEnrichmentRedirectResult{
			Mode:            "redirect",
			AniSearchID:     aniSearchID,
			ExistingAnimeID: duplicate.AnimeID,
			ExistingTitle:   duplicate.Title,
			RedirectPath:    buildAdminAnimeEditPath(duplicate.AnimeID),
		}, nil
	}

	aniSearchAnime, err := s.fetcher.FetchAnime(ctx, aniSearchID)
	if err != nil {
		return nil, err
	}

	draft := req.Draft
	manualFieldsKept := make([]string, 0)
	filledFields := make([]string, 0)
	filledAssets := make([]string, 0)

	aniSearchDraft := buildAniSearchDraftPayload(aniSearchAnime)
	mergeCreateDraftPayload(&draft, aniSearchDraft, &manualFieldsKept, &filledFields, &filledAssets)

	resolvedRelations, relationCandidates, relationMatches, err := s.resolveRelations(ctx, aniSearchAnime.Relations)
	if err != nil {
		return nil, err
	}
	if len(draft.Relations) == 0 && len(resolvedRelations) > 0 {
		draft.Relations = resolvedRelations
		filledFields = appendUniqueStrings(filledFields, "relations")
	}

	jellysyncApplied := false
	if s.followup != nil {
		followup, err := s.followup(ctx, draft)
		if err != nil {
			return nil, err
		}
		if followup.Applied {
			draft = followup.Draft
			jellysyncApplied = true
			filledFields = appendUniqueStrings(filledFields, followup.FilledFields...)
			filledAssets = appendUniqueStrings(filledAssets, followup.FilledAssets...)
		}
	}

	return models.AdminAnimeAniSearchEnrichmentDraftResult{
		Mode:        "draft",
		AniSearchID: aniSearchID,
		Source:      sourceTag,
		Draft:       draft,
		ManualFieldsKept: appendUniqueStrings(
			nil,
			manualFieldsKept...,
		),
		FilledFields: appendUniqueStrings(nil, filledFields...),
		FilledAssets: appendUniqueStrings(nil, filledAssets...),
		Provider: models.AdminAnimeAniSearchEnrichmentProviderSummary{
			AniSearchID:        aniSearchID,
			JellysyncApplied:   jellysyncApplied,
			RelationCandidates: int32(relationCandidates),
			RelationMatches:    int32(relationMatches),
		},
	}, nil
}

func (s *AnimeCreateEnrichmentService) LoadAniSearchDraft(
	ctx context.Context,
	aniSearchID string,
) (models.AdminAnimeCreateDraftPayload, []models.AdminAnimeRelation, error) {
	trimmedID := strings.TrimSpace(aniSearchID)
	if trimmedID == "" {
		return models.AdminAnimeCreateDraftPayload{}, nil, fmt.Errorf("anisearch id is required")
	}

	aniSearchAnime, err := s.fetcher.FetchAnime(ctx, trimmedID)
	if err != nil {
		return models.AdminAnimeCreateDraftPayload{}, nil, err
	}

	resolvedRelations, _, _, err := s.resolveRelations(ctx, aniSearchAnime.Relations)
	if err != nil {
		return models.AdminAnimeCreateDraftPayload{}, nil, err
	}

	draft := buildAniSearchDraftPayload(aniSearchAnime)
	draft.Relations = append([]models.AdminAnimeRelation(nil), resolvedRelations...)
	return draft, resolvedRelations, nil
}

func buildAniSearchDraftPayload(anime AniSearchAnime) models.AdminAnimeCreateDraftPayload {
	draft := models.AdminAnimeCreateDraftPayload{
		Title:       strings.TrimSpace(anime.PrimaryTitle),
		TitleDE:     anime.GermanTitle,
		TitleEN:     anime.EnglishTitle,
		Type:        mapAniSearchFormatToAnimeType(anime.Format),
		ContentType: "anime",
		Status:      "ongoing",
		Year:        anime.Year,
		MaxEpisodes: anime.EpisodeCount,
		Genre:       joinOptional(anime.Genres),
		Description: anime.Description,
		Source:      normalizeStringPtr("anisearch:" + anime.AniSearchID),
		AltTitles:   buildAniSearchAltTitles(anime),
		Tags:        append([]string(nil), anime.Tags...),
	}

	return draft
}

func buildAniSearchAltTitles(anime AniSearchAnime) []models.AdminAnimeAltTitle {
	result := make([]models.AdminAnimeAltTitle, 0, 4)
	appendIfPresent := func(language string, kind string, value *string) {
		if value == nil || strings.TrimSpace(*value) == "" {
			return
		}
		lang := language
		typeKind := kind
		result = append(result, models.AdminAnimeAltTitle{
			Language: &lang,
			Kind:     &typeKind,
			Title:    strings.TrimSpace(*value),
		})
	}

	appendIfPresent("ja", "official", anime.OriginalTitle)
	appendIfPresent("ja-Latn", "romanized", anime.RomajiTitle)
	appendIfPresent("en", "official", anime.EnglishTitle)
	appendIfPresent("de", "official", anime.GermanTitle)
	return result
}

func mapAniSearchFormatToAnimeType(format *string) string {
	value := strings.ToLower(strings.TrimSpace(derefString(format)))
	switch value {
	case "movie", "film":
		return "film"
	case "ova":
		return "ova"
	case "ona", "web":
		return "ona"
	case "special":
		return "special"
	case "bonus":
		return "bonus"
	default:
		return "tv"
	}
}

func mergeCreateDraftPayload(
	target *models.AdminAnimeCreateDraftPayload,
	incoming models.AdminAnimeCreateDraftPayload,
	manualFieldsKept *[]string,
	filledFields *[]string,
	filledAssets *[]string,
) {
	if target == nil {
		return
	}

	mergeString := func(field string, current *string, next *string, assign func(*string)) {
		if next == nil || strings.TrimSpace(*next) == "" {
			return
		}
		if current != nil && strings.TrimSpace(*current) != "" {
			*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, field)
			return
		}
		assign(next)
		*filledFields = appendUniqueStrings(*filledFields, field)
	}

	if strings.TrimSpace(target.Title) != "" {
		if strings.TrimSpace(incoming.Title) != "" {
			*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "title")
		}
	} else if strings.TrimSpace(incoming.Title) != "" {
		target.Title = strings.TrimSpace(incoming.Title)
		*filledFields = appendUniqueStrings(*filledFields, "title")
	}

	mergeString("title_de", target.TitleDE, incoming.TitleDE, func(value *string) { target.TitleDE = value })
	mergeString("title_en", target.TitleEN, incoming.TitleEN, func(value *string) { target.TitleEN = value })
	mergeString("genre", target.Genre, incoming.Genre, func(value *string) { target.Genre = value })
	mergeString("description", target.Description, incoming.Description, func(value *string) { target.Description = value })
	mergeString("cover_image", target.CoverImage, incoming.CoverImage, func(value *string) { target.CoverImage = value })
	mergeString("source", target.Source, incoming.Source, func(value *string) { target.Source = value })
	mergeString("folder_name", target.FolderName, incoming.FolderName, func(value *string) { target.FolderName = value })

	if shouldFillAniSearchType(target.Type, incoming.Type) {
		target.Type = incoming.Type
		*filledFields = appendUniqueStrings(*filledFields, "type")
	} else if strings.TrimSpace(target.Type) != "" && strings.TrimSpace(incoming.Type) != "" && !strings.EqualFold(target.Type, incoming.Type) {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "type")
	}

	if target.Year == nil && incoming.Year != nil {
		target.Year = incoming.Year
		*filledFields = appendUniqueStrings(*filledFields, "year")
	} else if target.Year != nil && incoming.Year != nil && *target.Year != *incoming.Year {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "year")
	}

	if target.MaxEpisodes == nil && incoming.MaxEpisodes != nil {
		target.MaxEpisodes = incoming.MaxEpisodes
		*filledFields = appendUniqueStrings(*filledFields, "max_episodes")
	} else if target.MaxEpisodes != nil && incoming.MaxEpisodes != nil && *target.MaxEpisodes != *incoming.MaxEpisodes {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "max_episodes")
	}

	if len(target.AltTitles) == 0 && len(incoming.AltTitles) > 0 {
		target.AltTitles = append([]models.AdminAnimeAltTitle(nil), incoming.AltTitles...)
		*filledFields = appendUniqueStrings(*filledFields, "alt_titles")
	} else if len(target.AltTitles) > 0 && len(incoming.AltTitles) > 0 {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "alt_titles")
	}

	if len(target.Tags) == 0 && len(incoming.Tags) > 0 {
		target.Tags = append([]string(nil), incoming.Tags...)
		*filledFields = appendUniqueStrings(*filledFields, "tags")
	} else if len(target.Tags) > 0 && len(incoming.Tags) > 0 {
		*manualFieldsKept = appendUniqueStrings(*manualFieldsKept, "tags")
	}

	if target.AssetSuggestions == nil && incoming.AssetSuggestions != nil {
		target.AssetSuggestions = cloneDraftAssetSuggestions(incoming.AssetSuggestions)
		*filledAssets = appendDraftSuggestionKinds(*filledAssets, incoming.AssetSuggestions)
	}
}

func cloneDraftAssetSuggestions(input *models.AdminAnimeCreateDraftAssetSuggestions) *models.AdminAnimeCreateDraftAssetSuggestions {
	if input == nil {
		return nil
	}
	copyValue := *input
	if len(input.Backgrounds) > 0 {
		copyValue.Backgrounds = append([]string(nil), input.Backgrounds...)
	}
	return &copyValue
}

func appendDraftSuggestionKinds(target []string, suggestions *models.AdminAnimeCreateDraftAssetSuggestions) []string {
	if suggestions == nil {
		return target
	}
	if strings.TrimSpace(derefString(suggestions.Cover)) != "" {
		target = appendUniqueStrings(target, "cover")
	}
	if strings.TrimSpace(derefString(suggestions.Banner)) != "" {
		target = appendUniqueStrings(target, "banner")
	}
	if strings.TrimSpace(derefString(suggestions.Logo)) != "" {
		target = appendUniqueStrings(target, "logo")
	}
	if len(suggestions.Backgrounds) > 0 {
		target = appendUniqueStrings(target, "background")
	}
	if strings.TrimSpace(derefString(suggestions.BackgroundVideo)) != "" {
		target = appendUniqueStrings(target, "background_video")
	}
	return target
}

func (s *AnimeCreateEnrichmentService) resolveRelations(
	ctx context.Context,
	relations []AniSearchAnimeRelation,
) ([]models.AdminAnimeRelation, int, int, error) {
	candidates := make([]AniSearchAnimeRelation, 0, len(relations))
	sources := make([]string, 0, len(relations))
	titles := make([]string, 0, len(relations))

	for _, relation := range relations {
		if !isAllowedAdminRelationLabel(relation.RelationLabel) {
			continue
		}
		title := strings.TrimSpace(relation.Title)
		if title == "" {
			continue
		}
		candidates = append(candidates, relation)
		titles = append(titles, title)
		if relation.AniSearchID != "" {
			sources = append(sources, "anisearch:"+strings.TrimSpace(relation.AniSearchID))
		}
	}
	if len(candidates) == 0 {
		return []models.AdminAnimeRelation{}, 0, 0, nil
	}

	// Source-based lookup (reliable — matches by anisearch:{id} in source field).
	matchBySource := make(map[string]models.AdminAnimeRelationTarget)
	if len(sources) > 0 {
		sourceMatches, err := s.repo.ResolveAdminAnimeRelationTargetsBySources(ctx, sources)
		if err != nil {
			return nil, 0, 0, err
		}
		for _, m := range sourceMatches {
			matchBySource[normalizeLookupKey(m.Source)] = models.AdminAnimeRelationTarget{
				AnimeID: m.AnimeID,
				Title:   m.Title,
			}
		}
	}

	// Title-based lookup as fallback for relations without AniSearch IDs.
	matchByTitle := make(map[string]models.AdminAnimeRelationTarget)
	titleMatches, err := s.repo.ResolveAdminAnimeRelationTargetsByTitles(ctx, titles)
	if err != nil {
		return nil, 0, 0, err
	}
	for _, m := range titleMatches {
		matchByTitle[normalizeLookupKey(m.MatchedTitle)] = m.Target
	}

	result := make([]models.AdminAnimeRelation, 0)
	for _, relation := range candidates {
		var target models.AdminAnimeRelationTarget
		var ok bool

		// Prefer source match; fall back to title match.
		if relation.AniSearchID != "" {
			target, ok = matchBySource[normalizeLookupKey("anisearch:"+strings.TrimSpace(relation.AniSearchID))]
		}
		if !ok {
			target, ok = matchByTitle[normalizeLookupKey(relation.Title)]
		}
		if !ok {
			continue
		}

		result = append(result, models.AdminAnimeRelation{
			TargetAnimeID:  target.AnimeID,
			RelationLabel:  relation.RelationLabel,
			TargetTitle:    target.Title,
			TargetType:     target.Type,
			TargetStatus:   target.Status,
			TargetYear:     target.Year,
			TargetCoverURL: target.CoverURL,
		})
	}

	return result, len(candidates), len(result), nil
}

func BuildJellysyncFollowupResult(
	draft models.AdminAnimeCreateDraftPayload,
	preview models.AdminJellyfinIntakePreviewResult,
) JellysyncFollowupResult {
	result := draft
	filledFields := make([]string, 0)
	filledAssets := make([]string, 0)

	if result.Year == nil && preview.Year != nil {
		result.Year = preview.Year
		filledFields = appendUniqueStrings(filledFields, "year")
	}
	if result.Description == nil && preview.Description != nil {
		result.Description = preview.Description
		filledFields = appendUniqueStrings(filledFields, "description")
	}
	if result.Genre == nil && preview.Genre != nil {
		result.Genre = preview.Genre
		filledFields = appendUniqueStrings(filledFields, "genre")
	}
	if len(result.Tags) == 0 && len(preview.Tags) > 0 {
		result.Tags = append([]string(nil), preview.Tags...)
		filledFields = appendUniqueStrings(filledFields, "tags")
	}

	assetSuggestions := cloneDraftAssetSuggestions(result.AssetSuggestions)
	if assetSuggestions == nil {
		assetSuggestions = &models.AdminAnimeCreateDraftAssetSuggestions{}
	}
	if assetSuggestions.Cover == nil && preview.AssetSlots.Cover.URL != nil {
		assetSuggestions.Cover = preview.AssetSlots.Cover.URL
		filledAssets = appendUniqueStrings(filledAssets, "cover")
	}
	if assetSuggestions.Banner == nil && preview.AssetSlots.Banner.URL != nil {
		assetSuggestions.Banner = preview.AssetSlots.Banner.URL
		filledAssets = appendUniqueStrings(filledAssets, "banner")
	}
	if assetSuggestions.Logo == nil && preview.AssetSlots.Logo.URL != nil {
		assetSuggestions.Logo = preview.AssetSlots.Logo.URL
		filledAssets = appendUniqueStrings(filledAssets, "logo")
	}
	if len(assetSuggestions.Backgrounds) == 0 && len(preview.AssetSlots.Backgrounds) > 0 {
		backgrounds := make([]string, 0, len(preview.AssetSlots.Backgrounds))
		for _, slot := range preview.AssetSlots.Backgrounds {
			if slot.URL != nil && strings.TrimSpace(*slot.URL) != "" {
				backgrounds = append(backgrounds, strings.TrimSpace(*slot.URL))
			}
		}
		if len(backgrounds) > 0 {
			assetSuggestions.Backgrounds = backgrounds
			filledAssets = appendUniqueStrings(filledAssets, "background")
		}
	}
	if assetSuggestions.BackgroundVideo == nil && preview.AssetSlots.BackgroundVideo.URL != nil {
		assetSuggestions.BackgroundVideo = preview.AssetSlots.BackgroundVideo.URL
		filledAssets = appendUniqueStrings(filledAssets, "background_video")
	}
	if len(filledAssets) > 0 {
		result.AssetSuggestions = assetSuggestions
	}

	return JellysyncFollowupResult{
		Draft:        result,
		FilledFields: filledFields,
		FilledAssets: filledAssets,
		Applied:      len(filledFields) > 0 || len(filledAssets) > 0,
	}
}

func BuildAdminAnimeCreateAniSearchSummary(
	source *string,
	relationsAttempted int,
	relationsApplied int,
	relationsSkippedExisting int,
	warnings []string,
) *models.AdminAnimeCreateAniSearchSummary {
	normalizedSource := normalizeStringPtr(derefString(source))
	if normalizedSource == nil && relationsAttempted == 0 && relationsApplied == 0 && relationsSkippedExisting == 0 && len(warnings) == 0 {
		return nil
	}

	return &models.AdminAnimeCreateAniSearchSummary{
		Source:                   normalizedSource,
		RelationsAttempted:       int32(relationsAttempted),
		RelationsApplied:         int32(relationsApplied),
		RelationsSkippedExisting: int32(relationsSkippedExisting),
		Warnings:                 appendUniqueStrings(nil, warnings...),
	}
}

func buildAdminAnimeEditPath(animeID int64) string {
	return fmt.Sprintf("/admin/anime/%d/edit", animeID)
}

func isAllowedAdminRelationLabel(label string) bool {
	switch strings.TrimSpace(label) {
	case "Hauptgeschichte", "Nebengeschichte", "Fortsetzung", "Zusammenfassung":
		return true
	default:
		return false
	}
}

func normalizeLookupKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func appendUniqueStrings(target []string, values ...string) []string {
	seen := make(map[string]struct{}, len(target))
	for _, value := range target {
		seen[normalizeLookupKey(value)] = struct{}{}
	}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := normalizeLookupKey(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		target = append(target, trimmed)
	}
	return target
}

func joinOptional(values []string) *string {
	if len(values) == 0 {
		return nil
	}
	joined := strings.Join(values, ", ")
	return &joined
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func shouldFillAniSearchType(current string, incoming string) bool {
	currentType := strings.TrimSpace(strings.ToLower(current))
	incomingType := strings.TrimSpace(strings.ToLower(incoming))
	if incomingType == "" {
		return false
	}
	if currentType == "" {
		return true
	}

	// The create form starts as "tv". Treat that untouched default as replaceable
	// when AniSearch returns a more specific format like "film".
	return currentType == "tv" && incomingType != "tv"
}
