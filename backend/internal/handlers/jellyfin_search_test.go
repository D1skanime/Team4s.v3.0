package handlers

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildAdminJellyfinIntakeSearchItems_RanksStrongerMatchesFirst(t *testing.T) {
	t.Parallel()

	items := []jellyfinSeriesItem{
		{ID: "weak", Name: "Naruto Shippuden", Path: `D:\Anime\TV\Naruto Shippuden`},
		{ID: "strong", Name: "Naruto", Path: `D:\Anime\TV\Naruto`},
	}

	result := buildAdminJellyfinIntakeSearchItems(items, "Naruto")
	if len(result) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result))
	}
	if result[0].JellyfinSeriesID != "strong" {
		t.Fatalf("expected exact match first, got %+v", result[0])
	}
	if result[0].Confidence != "high" {
		t.Fatalf("expected high confidence, got %q", result[0].Confidence)
	}
}

func TestBuildAdminJellyfinIntakeSearchItems_IncludeEvidenceAndPreviewReferences(t *testing.T) {
	t.Parallel()

	items := []jellyfinSeriesItem{
		{
			ID:             "abc123",
			Name:           "Naruto OVA",
			ProductionYear: intPtr(2003),
			Path:           `D:\Anime\Bonus\Naruto OVA`,
		},
	}

	result := buildAdminJellyfinIntakeSearchItems(items, "Naruto")
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}

	candidate := result[0]
	assertIntakeSearchEvidence(t, candidate)
	if candidate.TypeHint.SuggestedType == nil || *candidate.TypeHint.SuggestedType != "ova" {
		t.Fatalf("expected ova type hint, got %+v", candidate.TypeHint)
	}
	if len(candidate.TypeHint.Reasons) == 0 {
		t.Fatalf("expected visible type-hint reasons")
	}
}

func assertIntakeSearchEvidence(t *testing.T, candidate models.AdminJellyfinIntakeSearchItem) {
	t.Helper()

	if candidate.JellyfinSeriesID == "" {
		t.Fatalf("expected jellyfin_series_id")
	}
	if candidate.Name == "" {
		t.Fatalf("expected candidate name")
	}
	if candidate.Path == nil || *candidate.Path == "" {
		t.Fatalf("expected full path evidence")
	}
	if candidate.ParentContext == nil || *candidate.ParentContext == "" {
		t.Fatalf("expected parent context")
	}
	if candidate.LibraryContext == nil || *candidate.LibraryContext == "" {
		t.Fatalf("expected library context")
	}
	if candidate.PosterURL == nil || *candidate.PosterURL == "" {
		t.Fatalf("expected poster preview reference")
	}
	if candidate.BannerURL == nil || *candidate.BannerURL == "" {
		t.Fatalf("expected banner preview reference")
	}
	if candidate.LogoURL == nil || *candidate.LogoURL == "" {
		t.Fatalf("expected logo preview reference")
	}
	if candidate.BackgroundURL == nil || *candidate.BackgroundURL == "" {
		t.Fatalf("expected background preview reference")
	}
}

func intPtr(v int) *int {
	return &v
}
