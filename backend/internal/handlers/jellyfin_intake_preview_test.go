package handlers

import (
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildAdminJellyfinIntakePreviewResult_ReturnsMetadataSlotsAndReasons(t *testing.T) {
	t.Parallel()

	detail := jellyfinSeriesDetailItem{
		ID:                "series-1",
		Name:              "Naruto OVA",
		Path:              `D:\Anime\Bonus\Naruto OVA (2003)`,
		Overview:          "Leaf village side story",
		ProductionYear:    intPtr(2003),
		Genres:            []string{"Action", "Adventure"},
		Tags:              []string{"Shounen", "Classic"},
		ProviderIDs:       map[string]string{"AniDB": "4567"},
		ImageTags:         map[string]string{"Primary": "p1", "Logo": "l1", "Banner": "b1"},
		BackdropImageTags: []string{"bg-1"},
	}

	result := buildAdminJellyfinIntakePreviewResult(detail, []string{"video-1"})
	if result.Description == nil || *result.Description != "Leaf village side story" {
		t.Fatalf("expected description, got %+v", result.Description)
	}
	if result.Year == nil || *result.Year != 2003 {
		t.Fatalf("expected year 2003, got %+v", result.Year)
	}
	if result.Genre == nil || *result.Genre != "Action, Adventure" {
		t.Fatalf("expected joined genres, got %+v", result.Genre)
	}
	if result.AniDBID == nil || *result.AniDBID != "4567" {
		t.Fatalf("expected AniDB ID, got %+v", result.AniDBID)
	}
	if result.FolderNameTitleSeed == nil || *result.FolderNameTitleSeed != "Naruto OVA (2003)" {
		t.Fatalf("expected folder-name title seed, got %+v", result.FolderNameTitleSeed)
	}
	if result.FolderNameTitleSeed != nil && *result.FolderNameTitleSeed == result.JellyfinSeriesName {
		t.Fatalf("expected folder-name title seed to stay distinct from display title")
	}
	if result.TypeHint.SuggestedType == nil || *result.TypeHint.SuggestedType != "ova" {
		t.Fatalf("expected ova suggestion, got %+v", result.TypeHint)
	}
	if len(result.TypeHint.Reasons) == 0 {
		t.Fatalf("expected visible reason strings")
	}

	assertSlotPresent(t, result.AssetSlots.Cover, "cover")
	assertSlotPresent(t, result.AssetSlots.Logo, "logo")
	assertSlotPresent(t, result.AssetSlots.Banner, "banner")
	assertBackgroundSlotsPresent(t, result.AssetSlots.Backgrounds, 1)
	assertSlotPresent(t, result.AssetSlots.BackgroundVideo, "background_video")
}

func TestBuildAdminJellyfinIntakePreviewResult_UsesExplicitEmptySlots(t *testing.T) {
	t.Parallel()

	result := buildAdminJellyfinIntakePreviewResult(jellyfinSeriesDetailItem{
		ID:   "series-2",
		Name: "Naruto",
		Path: `D:\Anime\TV\Naruto`,
	}, nil)

	assertSlotEmpty(t, result.AssetSlots.Cover, "cover")
	assertSlotEmpty(t, result.AssetSlots.Logo, "logo")
	assertSlotEmpty(t, result.AssetSlots.Banner, "banner")
	if len(result.AssetSlots.Backgrounds) != 0 {
		t.Fatalf("expected no background slots, got %+v", result.AssetSlots.Backgrounds)
	}
	assertSlotEmpty(t, result.AssetSlots.BackgroundVideo, "background_video")
	if result.TypeHint.SuggestedType == nil || *result.TypeHint.SuggestedType != "tv" {
		t.Fatalf("expected advisory tv fallback, got %+v", result.TypeHint)
	}
}

func TestBuildAdminJellyfinIntakePreviewResult_RecognizesOVAFromPathSegments(t *testing.T) {
	t.Parallel()

	result := buildAdminJellyfinIntakePreviewResult(jellyfinSeriesDetailItem{
		ID:   "series-macross",
		Name: "Macross",
		Path: `/media/Anime/OVA/Anime.OVA.Sub/Macross Flash Back 2012`,
	}, nil)

	if result.ParentContext == nil || *result.ParentContext != "Anime.OVA.Sub" {
		t.Fatalf("expected parent context Anime.OVA.Sub, got %+v", result.ParentContext)
	}
	if result.TypeHint.SuggestedType == nil || *result.TypeHint.SuggestedType != "ova" {
		t.Fatalf("expected ova suggestion, got %+v", result.TypeHint)
	}
	if len(result.TypeHint.Reasons) == 0 || !strings.Contains(result.TypeHint.Reasons[0], `"OVA"`) {
		t.Fatalf("expected visible OVA reason, got %+v", result.TypeHint.Reasons)
	}
}

func assertBackgroundSlotsPresent(t *testing.T, slots []models.AdminJellyfinIntakeAssetSlot, expectedCount int) {
	t.Helper()

	if len(slots) != expectedCount {
		t.Fatalf("expected %d background slots, got %d", expectedCount, len(slots))
	}
	for index, slot := range slots {
		if !slot.Present {
			t.Fatalf("expected background slot %d to be present", index)
		}
		if slot.Kind != "background" {
			t.Fatalf("expected slot kind background, got %q", slot.Kind)
		}
		if slot.Index == nil || *slot.Index != index {
			t.Fatalf("expected background slot index %d, got %+v", index, slot.Index)
		}
		if slot.URL == nil || *slot.URL == "" {
			t.Fatalf("expected background slot url for index %d", index)
		}
	}
}

func assertSlotPresent(t *testing.T, slot models.AdminJellyfinIntakeAssetSlot, kind string) {
	t.Helper()

	if !slot.Present {
		t.Fatalf("expected %s slot to be present", kind)
	}
	if slot.Kind != kind {
		t.Fatalf("expected slot kind %q, got %q", kind, slot.Kind)
	}
	if slot.Source != "jellyfin" {
		t.Fatalf("expected jellyfin source, got %q", slot.Source)
	}
	if slot.URL == nil || *slot.URL == "" {
		t.Fatalf("expected slot URL for %s", kind)
	}
}

func assertSlotEmpty(t *testing.T, slot models.AdminJellyfinIntakeAssetSlot, kind string) {
	t.Helper()

	if slot.Present {
		t.Fatalf("expected %s slot to be empty", kind)
	}
	if slot.Kind != kind {
		t.Fatalf("expected slot kind %q, got %q", kind, slot.Kind)
	}
	if slot.Source != "jellyfin" {
		t.Fatalf("expected jellyfin source, got %q", slot.Source)
	}
	if slot.URL != nil {
		t.Fatalf("expected no URL for empty %s slot, got %q", kind, *slot.URL)
	}
}
