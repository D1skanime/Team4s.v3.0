package services

import (
	"context"
	"errors"
	"testing"

	"team4s.v3/backend/internal/models"
)

type stubAniSearchFetcher struct {
	anime  AniSearchAnime
	search []AniSearchSearchCandidate
	err    error
}

func (s stubAniSearchFetcher) FetchAnime(ctx context.Context, aniSearchID string) (AniSearchAnime, error) {
	return s.anime, s.err
}

func (s stubAniSearchFetcher) SearchAnime(ctx context.Context, query string, limit int) ([]AniSearchSearchCandidate, error) {
	return s.search, s.err
}

type stubAnimeCreateEnrichmentRepo struct {
	duplicate *models.AdminAnimeSourceMatch
	matches   []models.AdminAnimeRelationTitleMatch
	sources   []models.AdminAnimeSourceMatch
}

func (s stubAnimeCreateEnrichmentRepo) FindAnimeBySource(ctx context.Context, source string) (*models.AdminAnimeSourceMatch, error) {
	return s.duplicate, nil
}

func (s stubAnimeCreateEnrichmentRepo) ResolveAdminAnimeRelationTargetsByTitles(ctx context.Context, titles []string) ([]models.AdminAnimeRelationTitleMatch, error) {
	return s.matches, nil
}

func (s stubAnimeCreateEnrichmentRepo) ResolveAdminAnimeRelationTargetsBySources(ctx context.Context, sources []string) ([]models.AdminAnimeSourceMatch, error) {
	return s.sources, nil
}

type stubAssetSearchProvider struct {
	source   models.AdminAnimeAssetSearchSource
	supports map[string]bool
	search   func(context.Context, models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error)
	calls    *[]models.AdminAnimeAssetSearchSource
}

func (s stubAssetSearchProvider) Source() models.AdminAnimeAssetSearchSource {
	return s.source
}

func (s stubAssetSearchProvider) SupportsAssetKind(assetKind string) bool {
	if len(s.supports) == 0 {
		return true
	}
	return s.supports[assetKind]
}

func (s stubAssetSearchProvider) SearchAssetCandidates(
	ctx context.Context,
	req models.AdminAnimeAssetSearchRequest,
) ([]models.AdminAnimeAssetSearchCandidate, error) {
	if s.calls != nil {
		*s.calls = append(*s.calls, s.source)
	}
	if s.search == nil {
		return nil, errors.New("unexpected search call")
	}
	return s.search(ctx, req)
}

func TestAnimeCreateEnrichmentService_ReturnsRedirectForDuplicateAniSearchID(t *testing.T) {
	t.Parallel()

	service := NewAnimeCreateEnrichmentService(
		stubAniSearchFetcher{},
		stubAnimeCreateEnrichmentRepo{
			duplicate: &models.AdminAnimeSourceMatch{AnimeID: 77, Title: "Lain"},
		},
		nil,
	)

	result, err := service.Enrich(context.Background(), models.AdminAnimeAniSearchEnrichmentRequest{
		AniSearchID: "12345",
		Draft: models.AdminAnimeCreateDraftPayload{
			Title:       "Lain",
			Type:        "tv",
			ContentType: "anime",
			Status:      "ongoing",
		},
	})
	if err != nil {
		t.Fatalf("enrich: %v", err)
	}

	redirect, ok := result.(models.AdminAnimeAniSearchEnrichmentRedirectResult)
	if !ok {
		t.Fatalf("expected redirect result, got %#v", result)
	}
	if redirect.ExistingAnimeID != 77 || redirect.RedirectPath != "/admin/anime/77/edit" {
		t.Fatalf("unexpected redirect %#v", redirect)
	}
}

func TestAnimeCreateEnrichmentService_PreservesManualValuesAndAppliesFillOnlyFollowup(t *testing.T) {
	t.Parallel()

	service := NewAnimeCreateEnrichmentService(
		stubAniSearchFetcher{
			anime: AniSearchAnime{
				AniSearchID:  "12345",
				PrimaryTitle: "AniSearch Title",
				EnglishTitle: stringPtr("AniSearch English"),
				Description:  stringPtr("Provider description"),
				Format:       stringPtr("Film"),
				Year:         int16Ptr(1998),
				Genres:       []string{"Drama"},
				Tags:         []string{"Cyberpunk"},
			},
		},
		stubAnimeCreateEnrichmentRepo{},
		func(ctx context.Context, draft models.AdminAnimeCreateDraftPayload) (JellysyncFollowupResult, error) {
			draft.CoverImage = stringPtr("/media/jellyfin/cover.webp")
			return JellysyncFollowupResult{
				Draft:        draft,
				FilledFields: []string{"cover_image"},
				FilledAssets: []string{"cover"},
				Applied:      true,
			}, nil
		},
	)

	result, err := service.Enrich(context.Background(), models.AdminAnimeAniSearchEnrichmentRequest{
		AniSearchID: "12345",
		Draft: models.AdminAnimeCreateDraftPayload{
			Title:       "Manual Title",
			Type:        "tv",
			ContentType: "anime",
			Status:      "ongoing",
			Description: stringPtr("Manual description"),
		},
	})
	if err != nil {
		t.Fatalf("enrich: %v", err)
	}

	draftResult, ok := result.(models.AdminAnimeAniSearchEnrichmentDraftResult)
	if !ok {
		t.Fatalf("expected draft result, got %#v", result)
	}
	if draftResult.Draft.Title != "Manual Title" {
		t.Fatalf("expected manual title to win, got %q", draftResult.Draft.Title)
	}
	if draftResult.Draft.Description == nil || *draftResult.Draft.Description != "Manual description" {
		t.Fatalf("expected manual description to win, got %#v", draftResult.Draft.Description)
	}
	if draftResult.Draft.TitleEN == nil || *draftResult.Draft.TitleEN != "AniSearch English" {
		t.Fatalf("expected AniSearch english title to fill, got %#v", draftResult.Draft.TitleEN)
	}
	if draftResult.Draft.Type != "film" {
		t.Fatalf("expected AniSearch film type to replace untouched default tv, got %q", draftResult.Draft.Type)
	}
	if draftResult.Draft.CoverImage == nil || *draftResult.Draft.CoverImage != "/media/jellyfin/cover.webp" {
		t.Fatalf("expected Jellysync cover to fill, got %#v", draftResult.Draft.CoverImage)
	}
	if !draftResult.Provider.JellysyncApplied {
		t.Fatalf("expected Jellysync to be marked as applied")
	}
}

func TestAnimeCreateEnrichmentService_PreservesExplicitManualTypeAgainstAniSearch(t *testing.T) {
	t.Parallel()

	service := NewAnimeCreateEnrichmentService(
		stubAniSearchFetcher{
			anime: AniSearchAnime{
				AniSearchID:  "12345",
				PrimaryTitle: "AniSearch Title",
				Format:       stringPtr("Film"),
			},
		},
		stubAnimeCreateEnrichmentRepo{},
		nil,
	)

	result, err := service.Enrich(context.Background(), models.AdminAnimeAniSearchEnrichmentRequest{
		AniSearchID: "12345",
		Draft: models.AdminAnimeCreateDraftPayload{
			Title:       "Manual Title",
			Type:        "ova",
			ContentType: "anime",
			Status:      "ongoing",
		},
	})
	if err != nil {
		t.Fatalf("enrich: %v", err)
	}

	draftResult, ok := result.(models.AdminAnimeAniSearchEnrichmentDraftResult)
	if !ok {
		t.Fatalf("expected draft result, got %#v", result)
	}
	if draftResult.Draft.Type != "ova" {
		t.Fatalf("expected explicit manual type to win, got %q", draftResult.Draft.Type)
	}
	foundType := false
	for _, field := range draftResult.ManualFieldsKept {
		if field == "type" {
			foundType = true
			break
		}
	}
	if !foundType {
		t.Fatalf("expected type to be marked manual-kept, got %#v", draftResult.ManualFieldsKept)
	}
}

func TestAnimeCreateEnrichmentService_ResolvesOnlyApprovedLocalRelations(t *testing.T) {
	t.Parallel()

	service := NewAnimeCreateEnrichmentService(
		stubAniSearchFetcher{
			anime: AniSearchAnime{
				AniSearchID:  "12345",
				PrimaryTitle: "Lain",
				Relations: []AniSearchAnimeRelation{
					{RelationLabel: "Fortsetzung", Title: "Lain OVA"},
					{RelationLabel: "Spinoff", Title: "Unapproved"},
					{RelationLabel: "Hauptgeschichte", Title: "Missing"},
				},
			},
		},
		stubAnimeCreateEnrichmentRepo{
			matches: []models.AdminAnimeRelationTitleMatch{
				{
					MatchedTitle: "Lain OVA",
					Target: models.AdminAnimeRelationTarget{
						AnimeID: 12,
						Title:   "Lain OVA",
						Type:    "ova",
						Status:  "ongoing",
					},
				},
			},
		},
		nil,
	)

	result, err := service.Enrich(context.Background(), models.AdminAnimeAniSearchEnrichmentRequest{
		AniSearchID: "12345",
		Draft: models.AdminAnimeCreateDraftPayload{
			Title:       "Lain",
			Type:        "tv",
			ContentType: "anime",
			Status:      "ongoing",
		},
	})
	if err != nil {
		t.Fatalf("enrich: %v", err)
	}

	draftResult := result.(models.AdminAnimeAniSearchEnrichmentDraftResult)
	if len(draftResult.Draft.Relations) != 1 {
		t.Fatalf("expected one resolved relation, got %#v", draftResult.Draft.Relations)
	}
	if draftResult.Draft.Relations[0].RelationLabel != "Fortsetzung" || draftResult.Provider.RelationCandidates != 2 || draftResult.Provider.RelationMatches != 1 {
		t.Fatalf("unexpected relation result %#v", draftResult)
	}
}

func TestAnimeCreateEnrichmentService_PrefersAniSearchSourceMatchesBeforeTitleFallback(t *testing.T) {
	t.Parallel()

	service := NewAnimeCreateEnrichmentService(
		stubAniSearchFetcher{
			anime: AniSearchAnime{
				AniSearchID:  "12345",
				PrimaryTitle: "Lain",
				Relations: []AniSearchAnimeRelation{
					{RelationLabel: "Fortsetzung", Title: "Shared Title", AniSearchID: "9001"},
				},
			},
		},
		stubAnimeCreateEnrichmentRepo{
			matches: []models.AdminAnimeRelationTitleMatch{
				{
					MatchedTitle: "Shared Title",
					Target: models.AdminAnimeRelationTarget{
						AnimeID: 12,
						Title:   "Shared Title",
						Type:    "tv",
						Status:  "done",
					},
				},
			},
			sources: []models.AdminAnimeSourceMatch{
				{Source: "anisearch:9001", AnimeID: 44, Title: "Shared Title"},
			},
		},
		nil,
	)

	result, err := service.Enrich(context.Background(), models.AdminAnimeAniSearchEnrichmentRequest{
		AniSearchID: "12345",
		Draft: models.AdminAnimeCreateDraftPayload{
			Title:       "Lain",
			Type:        "tv",
			ContentType: "anime",
			Status:      "ongoing",
			Source:      stringPtr("anisearch:12345"),
		},
	})
	if err != nil {
		t.Fatalf("enrich: %v", err)
	}

	draftResult := result.(models.AdminAnimeAniSearchEnrichmentDraftResult)
	if len(draftResult.Draft.Relations) != 1 {
		t.Fatalf("expected one resolved relation, got %#v", draftResult.Draft.Relations)
	}
	if draftResult.Draft.Relations[0].TargetAnimeID != 44 {
		t.Fatalf("expected source-first target 44, got %#v", draftResult.Draft.Relations[0])
	}
}

func TestAnimeCreateEnrichmentService_FiltersAlreadyImportedAniSearchSearchCandidates(t *testing.T) {
	t.Parallel()

	service := NewAnimeCreateEnrichmentService(
		stubAniSearchFetcher{
			search: []AniSearchSearchCandidate{
				{AniSearchID: "1078", Title: "Bleach", Type: "TV-Serie", Year: int16Ptr(2004)},
				{AniSearchID: "15085", Title: "Bleach: Thousand-Year Blood War", Type: "TV-Serie", Year: int16Ptr(2022)},
			},
		},
		stubAnimeCreateEnrichmentRepo{
			sources: []models.AdminAnimeSourceMatch{
				{Source: "anisearch:1078", AnimeID: 21, Title: "Bleach"},
			},
		},
		nil,
	)

	result, err := service.SearchAniSearchCandidates(context.Background(), "Bleach", 12)
	if err != nil {
		t.Fatalf("search anisearch candidates: %v", err)
	}

	if result.FilteredExistingCount != 1 {
		t.Fatalf("expected one filtered existing candidate, got %#v", result)
	}
	if len(result.Data) != 1 {
		t.Fatalf("expected one remaining candidate, got %#v", result.Data)
	}
	if result.Data[0].AniSearchID != "15085" {
		t.Fatalf("expected only still-creatable candidate, got %#v", result.Data[0])
	}
}

func TestBuildAdminAnimeCreateAniSearchSummary_PreservesSourceAndAppliedCounts(t *testing.T) {
	t.Parallel()

	source := "anisearch:12345"
	summary := BuildAdminAnimeCreateAniSearchSummary(
		&source,
		2,
		2,
		0,
		nil,
	)

	if summary == nil {
		t.Fatal("expected summary")
	}
	if summary.Source == nil || *summary.Source != "anisearch:12345" {
		t.Fatalf("expected anisearch provenance, got %#v", summary)
	}
	if summary.RelationsAttempted != 2 {
		t.Fatalf("expected attempted count, got %#v", summary)
	}
	if summary.RelationsApplied != 2 {
		t.Fatalf("expected applied count, got %#v", summary)
	}
	if summary.RelationsSkippedExisting != 0 {
		t.Fatalf("expected skipped count, got %#v", summary)
	}
	if len(summary.Warnings) != 0 {
		t.Fatalf("expected no warnings, got %#v", summary.Warnings)
	}
}

func TestBuildAdminAnimeCreateAniSearchSummary_CollectsNonBlockingWarnings(t *testing.T) {
	t.Parallel()

	source := "anisearch:12345"
	summary := BuildAdminAnimeCreateAniSearchSummary(
		&source,
		3,
		1,
		1,
		[]string{"relation follow-through failed"},
	)

	if summary == nil {
		t.Fatal("expected summary")
	}
	if summary.RelationsAttempted != 3 || summary.RelationsApplied != 1 || summary.RelationsSkippedExisting != 1 {
		t.Fatalf("unexpected counts %#v", summary)
	}
	if len(summary.Warnings) != 1 || summary.Warnings[0] != "relation follow-through failed" {
		t.Fatalf("expected warning to be preserved, got %#v", summary.Warnings)
	}
}

func TestAnimeAssetSearchService_UsesSlotAwareSourceOrderingAndAggregatesResults(t *testing.T) {
	t.Parallel()

	callOrder := make([]models.AdminAnimeAssetSearchSource, 0, 2)
	service := NewAnimeAssetSearchService(
		stubAssetSearchProvider{
			source:   models.AdminAnimeAssetSearchSourceTMDB,
			supports: map[string]bool{"background": true},
			calls:    &callOrder,
			search: func(_ context.Context, req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error) {
				if req.AssetKind != "background" {
					t.Fatalf("expected background slot, got %q", req.AssetKind)
				}
				return []models.AdminAnimeAssetSearchCandidate{
					{
						ID:         "tmdb-1",
						AssetKind:  "background",
						Source:     models.AdminAnimeAssetSearchSourceTMDB,
						PreviewURL: "https://img.example/tmdb-preview.jpg",
						ImageURL:   "https://img.example/tmdb-full.jpg",
					},
				}, nil
			},
		},
		stubAssetSearchProvider{
			source:   models.AdminAnimeAssetSearchSourceZerochan,
			supports: map[string]bool{"background": true},
			calls:    &callOrder,
			search: func(_ context.Context, req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error) {
				// With limit=3 across two providers, both providers get a fair
				// first-pass share so later sources are not squeezed out.
				if req.Limit != 2 {
					t.Fatalf("expected fair per-provider limit 2, got %d", req.Limit)
				}
				return []models.AdminAnimeAssetSearchCandidate{
					{
						ID:         "zerochan-1",
						AssetKind:  "background",
						Source:     models.AdminAnimeAssetSearchSourceZerochan,
						PreviewURL: "https://img.example/zerochan-preview.jpg",
						ImageURL:   "https://img.example/zerochan-full.jpg",
					},
				}, nil
			},
		},
	)

	results, err := service.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{
		AssetKind: "background",
		Query:     "Lain",
		Limit:     3,
	})
	if err != nil {
		t.Fatalf("search asset candidates: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected aggregated results from two providers, got %#v", results)
	}
	expectedOrder := []models.AdminAnimeAssetSearchSource{
		models.AdminAnimeAssetSearchSourceTMDB,
		models.AdminAnimeAssetSearchSourceZerochan,
	}
	if len(callOrder) != len(expectedOrder) {
		t.Fatalf("unexpected call order length: %#v", callOrder)
	}
	for idx, source := range expectedOrder {
		if callOrder[idx] != source {
			t.Fatalf("expected call order %#v, got %#v", expectedOrder, callOrder)
		}
	}
}

func TestAnimeAssetSearchService_PrefersFanartForLogoAndBanner(t *testing.T) {
	t.Parallel()

	callOrder := make([]models.AdminAnimeAssetSearchSource, 0, 2)
	service := NewAnimeAssetSearchService(
		stubAssetSearchProvider{
			source:   models.AdminAnimeAssetSearchSourceFanartTV,
			supports: map[string]bool{"logo": true},
			calls:    &callOrder,
			search: func(_ context.Context, req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error) {
				return []models.AdminAnimeAssetSearchCandidate{
					{
						ID:         "fanart-1",
						AssetKind:  req.AssetKind,
						Source:     models.AdminAnimeAssetSearchSourceFanartTV,
						PreviewURL: "https://img.example/fanart-preview.png",
						ImageURL:   "https://img.example/fanart-full.png",
					},
				}, nil
			},
		},
		stubAssetSearchProvider{
			source:   models.AdminAnimeAssetSearchSourceTMDB,
			supports: map[string]bool{"logo": true},
			calls:    &callOrder,
			search: func(_ context.Context, req models.AdminAnimeAssetSearchRequest) ([]models.AdminAnimeAssetSearchCandidate, error) {
				return []models.AdminAnimeAssetSearchCandidate{
					{
						ID:         "tmdb-1",
						AssetKind:  req.AssetKind,
						Source:     models.AdminAnimeAssetSearchSourceTMDB,
						PreviewURL: "https://img.example/tmdb-preview.png",
						ImageURL:   "https://img.example/tmdb-full.png",
					},
				}, nil
			},
		},
	)

	_, err := service.SearchAssetCandidates(context.Background(), models.AdminAnimeAssetSearchRequest{
		AssetKind: "logo",
		Query:     "Lain",
		Limit:     2,
	})
	if err != nil {
		t.Fatalf("search asset candidates: %v", err)
	}

	expectedOrder := []models.AdminAnimeAssetSearchSource{
		models.AdminAnimeAssetSearchSourceFanartTV,
		models.AdminAnimeAssetSearchSourceTMDB,
	}
	for idx, source := range expectedOrder {
		if callOrder[idx] != source {
			t.Fatalf("expected call order %#v, got %#v", expectedOrder, callOrder)
		}
	}
}

func TestMapAniSearchGraphRelation_IncomingSequelMapsToHauptgeschichte(t *testing.T) {
	t.Parallel()

	// Regression: when 11eyes has a "Sequel" edge pointing TO 6123 (11eyes Pink
	// Phantasmagoria), parsing from 6123's perspective gives outgoing=false with
	// legend "Sequel". This must return "Hauptgeschichte" so the relation is
	// matched rather than silently dropped.
	legend := []string{"Sequel"}
	got := mapAniSearchGraphRelation(legend, 0, false)
	if got != "Hauptgeschichte" {
		t.Fatalf("expected Hauptgeschichte for incoming Sequel, got %q", got)
	}
}

func TestMapAniSearchGraphRelation_OutgoingSequelRemainsFortsetzung(t *testing.T) {
	t.Parallel()

	// Outgoing "Sequel" (current anime IS the sequel) should stay "Fortsetzung".
	legend := []string{"Sequel"}
	got := mapAniSearchGraphRelation(legend, 0, true)
	if got != "Fortsetzung" {
		t.Fatalf("expected Fortsetzung for outgoing Sequel, got %q", got)
	}
}

func stringPtr(value string) *string {
	return &value
}

func int16Ptr(value int16) *int16 {
	return &value
}
