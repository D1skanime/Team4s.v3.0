package handlers

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildAdminJellyfinIntakePreviewResult_ReturnsMetadataSlotsAndReasons(t *testing.T) {
	t.Parallel()

	detail := jellyfinSeriesDetailItem{
		ID:                "series-1",
		Name:              "Naruto OVA",
		Path:              `D:\Anime\Bonus\Naruto OVA`,
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
	if result.TypeHint.SuggestedType == nil || *result.TypeHint.SuggestedType != "ova" {
		t.Fatalf("expected ova suggestion, got %+v", result.TypeHint)
	}
	if len(result.TypeHint.Reasons) == 0 {
		t.Fatalf("expected visible reason strings")
	}

	assertSlotPresent(t, result.AssetSlots.Cover, "cover")
	assertSlotPresent(t, result.AssetSlots.Logo, "logo")
	assertSlotPresent(t, result.AssetSlots.Banner, "banner")
	assertSlotPresent(t, result.AssetSlots.Background, "background")
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
	assertSlotEmpty(t, result.AssetSlots.Background, "background")
	assertSlotEmpty(t, result.AssetSlots.BackgroundVideo, "background_video")
	if result.TypeHint.SuggestedType == nil || *result.TypeHint.SuggestedType != "tv" {
		t.Fatalf("expected advisory tv fallback, got %+v", result.TypeHint)
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
