package services

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"
)

type stubAniSearchFetcher struct {
	anime AniSearchAnime
	err   error
}

func (s stubAniSearchFetcher) FetchAnime(ctx context.Context, aniSearchID string) (AniSearchAnime, error) {
	return s.anime, s.err
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

func stringPtr(value string) *string {
	return &value
}

func int16Ptr(value int16) *int16 {
	return &value
}
