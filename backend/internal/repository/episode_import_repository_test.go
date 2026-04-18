package repository

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestEpisodeImportApply_CreatesCoverageJoinRowsForMultiEpisodeMedia(t *testing.T) {
	t.Parallel()

	input := models.EpisodeImportApplyInput{
		AnimeID: 42,
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{
			{EpisodeNumber: 9},
			{EpisodeNumber: 10},
		},
		Mappings: []models.EpisodeImportMappingRow{{
			MediaItemID:          "jellyfin-naruto-009-010",
			TargetEpisodeNumbers: []int32{9, 10},
			Status:               models.EpisodeImportMappingStatusConfirmed,
		}},
	}

	plan, err := buildEpisodeImportApplyPlan(input)
	if err != nil {
		t.Fatalf("build apply plan: %v", err)
	}

	if len(plan.mappings) != 1 {
		t.Fatalf("expected one mapping, got %d", len(plan.mappings))
	}
	targets := plan.mappings[0].TargetEpisodeNumbers
	if len(targets) != 2 || targets[0] != 9 || targets[1] != 10 {
		t.Fatalf("expected normalized multi-episode coverage [9 10], got %v", targets)
	}
	if primary := targets[0]; primary != 9 {
		t.Fatalf("expected compatibility primary episode 9, got %d", primary)
	}
}

func TestEpisodeImportApply_PreservesExistingManualEpisodeTitle(t *testing.T) {
	t.Parallel()

	existingTitle := "Manual curated title"
	incomingTitle := "AniSearch imported title"
	input := models.EpisodeImportApplyInput{
		AnimeID: 42,
		CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{
			EpisodeNumber: 9,
			Title:         &incomingTitle,
			ExistingTitle: &existingTitle,
		}},
	}

	plan, err := buildEpisodeImportApplyPlan(input)
	if err != nil {
		t.Fatalf("build apply plan: %v", err)
	}

	canonical := plan.canonicalByNumber[9]
	if canonical.ExistingTitle == nil || *canonical.ExistingTitle != existingTitle {
		t.Fatalf("expected existing manual title to stay in apply plan, got %#v", canonical.ExistingTitle)
	}
	if canonical.Title == nil || *canonical.Title != incomingTitle {
		t.Fatalf("expected incoming AniSearch title to remain available for fill-only use, got %#v", canonical.Title)
	}
}

func TestEpisodeImportApply_RejectsConflictingCanonicalClaims(t *testing.T) {
	t.Parallel()

	_, err := buildEpisodeImportApplyPlan(models.EpisodeImportApplyInput{
		AnimeID: 42,
		Mappings: []models.EpisodeImportMappingRow{
			{
				MediaItemID:          "jellyfin-a",
				TargetEpisodeNumbers: []int32{9},
				Status:               models.EpisodeImportMappingStatusConfirmed,
			},
			{
				MediaItemID:          "jellyfin-b",
				TargetEpisodeNumbers: []int32{9},
				Status:               models.EpisodeImportMappingStatusConfirmed,
			},
		},
	})
	if err == nil {
		t.Fatal("expected conflicting canonical claims to be rejected before mutation")
	}
}
