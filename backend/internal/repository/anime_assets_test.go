package repository

import (
	"reflect"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestReconcileAnimeProviderBackgrounds_PreservesManualAndAppendsNewProvider(t *testing.T) {
	existing := []storedAnimeBackgroundAsset{
		{ID: 1, Source: "manual", SortOrder: 0},
		{ID: 2, Source: "provider", ProviderKey: repoTestStringPtr("bg:0"), SortOrder: 1},
		{ID: 3, Source: "provider", ProviderKey: repoTestStringPtr("bg:1"), SortOrder: 2},
	}
	incoming := []models.AnimeProviderAssetInput{
		{ProviderKey: "bg:1", URL: "/api/v1/media/image?item_id=abc&kind=backdrop&index=1"},
		{ProviderKey: "bg:3", URL: "/api/v1/media/image?item_id=abc&kind=backdrop&index=3"},
	}

	plan := reconcileAnimeProviderBackgrounds(existing, incoming)

	wantUpdates := []animeProviderBackgroundUpdate{
		{ID: 3, URL: "/api/v1/media/image?item_id=abc&kind=backdrop&index=1"},
	}
	if !reflect.DeepEqual(plan.Updates, wantUpdates) {
		t.Fatalf("expected updates %#v, got %#v", wantUpdates, plan.Updates)
	}

	wantInserts := []animeProviderBackgroundInsert{
		{
			URL:         "/api/v1/media/image?item_id=abc&kind=backdrop&index=3",
			ProviderKey: "bg:3",
			SortOrder:   3,
		},
	}
	if !reflect.DeepEqual(plan.Inserts, wantInserts) {
		t.Fatalf("expected inserts %#v, got %#v", wantInserts, plan.Inserts)
	}

	wantDeletes := []int64{2}
	if !reflect.DeepEqual(plan.DeleteIDs, wantDeletes) {
		t.Fatalf("expected deletes %#v, got %#v", wantDeletes, plan.DeleteIDs)
	}
}

func repoTestStringPtr(value string) *string {
	return &value
}

func TestResolveAnimeAssetURL_PrefersLocalMediaPath(t *testing.T) {
	mediaID := "asset-1"
	resolvedURL := "/api/v1/media/image?provider=jellyfin"
	mediaPath := "/media/anime/25/banner/asset-1/original.webp"

	got := resolveAnimeAssetURL(&mediaID, &resolvedURL, &mediaPath)
	if got != mediaPath {
		t.Fatalf("expected media path %q, got %q", mediaPath, got)
	}
}
