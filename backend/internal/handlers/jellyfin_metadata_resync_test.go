package handlers

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildMetadataFieldPreview_FillOnlyRule(t *testing.T) {
	incoming := "jellyfin:series-42"

	field := buildMetadataFieldPreview("source", "Quelle", nil, &incoming)
	if !field.Apply {
		t.Fatalf("expected empty current value to be fillable")
	}
	if field.Action != "fill" {
		t.Fatalf("expected fill action, got %q", field.Action)
	}
}

func TestBuildMetadataFieldPreview_ProtectsExistingValue(t *testing.T) {
	current := "Bestehende Beschreibung"
	incoming := "Neue Provider-Beschreibung"

	field := buildMetadataFieldPreview("description", "Beschreibung", &current, &incoming)
	if field.Apply {
		t.Fatalf("expected existing manual value to remain protected")
	}
	if field.Action != "protect" {
		t.Fatalf("expected protect action, got %q", field.Action)
	}
}

func TestBuildJellyfinCoverPreview_DetectsProviderBackedCover(t *testing.T) {
	current := "/api/v1/media/image?item_id=abc&kind=primary"
	slot := models.AdminJellyfinIntakeAssetSlot{
		Present: true,
		Kind:    "cover",
		Source:  "jellyfin",
		URL:     &current,
	}

	preview := buildJellyfinCoverPreview(&current, slot)
	if preview.CurrentSource != "provider" {
		t.Fatalf("expected provider cover source, got %q", preview.CurrentSource)
	}
	if !preview.CanApply {
		t.Fatalf("expected provider-backed slot to be applicable")
	}
}

func TestMapPersistedAnimeAssets_PreservesOwnershipAndOrdering(t *testing.T) {
	bannerMediaID := "banner-1"
	backgroundMediaID := "bg-1"
	persisted := &models.AnimeResolvedAssets{
		Banner: &models.AnimeResolvedAsset{
			MediaID:   &bannerMediaID,
			URL:       "/media/anime/banner-1/original.webp",
			Ownership: models.AnimeAssetOwnershipManual,
		},
		Backgrounds: []models.AnimeBackgroundAsset{
			{
				ID:        21,
				MediaID:   &backgroundMediaID,
				URL:       "/media/anime/bg-1/original.webp",
				Ownership: models.AnimeAssetOwnershipProvider,
				SortOrder:  4,
			},
		},
	}

	mapped := mapPersistedAnimeAssets(persisted)
	if mapped.Banner == nil {
		t.Fatal("expected banner asset to be mapped")
	}
	if mapped.Banner.Ownership != string(models.AnimeAssetOwnershipManual) {
		t.Fatalf("unexpected banner ownership %q", mapped.Banner.Ownership)
	}
	if len(mapped.Backgrounds) != 1 {
		t.Fatalf("expected one background asset, got %d", len(mapped.Backgrounds))
	}
	if mapped.Backgrounds[0].Ownership != string(models.AnimeAssetOwnershipProvider) {
		t.Fatalf("unexpected background ownership %q", mapped.Backgrounds[0].Ownership)
	}
	if mapped.Backgrounds[0].SortOrder != 4 {
		t.Fatalf("unexpected background sort order %d", mapped.Backgrounds[0].SortOrder)
	}
}
