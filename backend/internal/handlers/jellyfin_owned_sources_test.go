package handlers

import (
	"context"
	"errors"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestMatchOwnedJellyfinSource(t *testing.T) {
	owned := []jellyfinOwnedSource{
		{SeriesID: "series-401", FolderPath: "/data/anime/main"},
		{SeriesID: "series-402", FolderPath: "/data/anime/second"},
	}

	t.Run("main folder file matches main pair", func(t *testing.T) {
		match, ok := matchOwnedJellyfinSource(owned, "series-401", "/data/anime/main/one.mkv")
		if !ok {
			t.Fatal("expected match for main folder file")
		}
		if match.SeriesID != "series-401" || match.FolderPath != "/data/anime/main" {
			t.Fatalf("expected main pair, got %+v", match)
		}
	})

	t.Run("second folder file matches second pair", func(t *testing.T) {
		match, ok := matchOwnedJellyfinSource(owned, "series-402", "/data/anime/second/two.mkv")
		if !ok {
			t.Fatal("expected match for second folder file")
		}
		if match.SeriesID != "series-402" || match.FolderPath != "/data/anime/second" {
			t.Fatalf("expected second pair, got %+v", match)
		}
	})

	t.Run("foreign series is rejected", func(t *testing.T) {
		_, ok := matchOwnedJellyfinSource(owned, "series-999", "/data/anime/main/one.mkv")
		if ok {
			t.Fatal("expected no match for foreign series")
		}
	})

	t.Run("correct series with wrong path is rejected", func(t *testing.T) {
		_, ok := matchOwnedJellyfinSource(owned, "series-401", "/data/anime/second/two.mkv")
		if ok {
			t.Fatal("expected no match for correct series but wrong folder path")
		}
	})
}

func TestMatchOwnedJellyfinSource_EmptyFolderPathIsPathWildcard(t *testing.T) {
	owned := []jellyfinOwnedSource{{SeriesID: "series-401", FolderPath: ""}}

	match, ok := matchOwnedJellyfinSource(owned, "series-401", "/anywhere/at/all/one.mkv")
	if !ok {
		t.Fatal("expected empty FolderPath to match any path for the same series")
	}
	if match.SeriesID != "series-401" {
		t.Fatalf("expected matched pair series-401, got %+v", match)
	}

	if _, ok := matchOwnedJellyfinSource(owned, "series-402", "/anywhere/at/all/one.mkv"); ok {
		t.Fatal("expected SeriesID to remain mandatory even with an empty FolderPath")
	}
}

func TestOwnedJellyfinSourcesFromFolders_MainOnly(t *testing.T) {
	mainFolderPath := "/data/anime/main"
	folders := []models.JellyfinFolderOption{{JellyfinItemID: "series-401", IsMain: true, FolderPath: strPtr("/ignored/main/folder/entry")}}

	got := ownedJellyfinSourcesFromFolders("series-401", &mainFolderPath, folders)

	if len(got) != 1 {
		t.Fatalf("expected exactly 1 owned pair, got %d: %+v", len(got), got)
	}
	if got[0].SeriesID != "series-401" || got[0].FolderPath != "/data/anime/main" {
		t.Fatalf("expected main pair to use the caller-supplied mainSeriesID/mainFolderPath verbatim, got %+v", got[0])
	}
}

func TestOwnedJellyfinSourcesFromFolders_MainPlusSecond(t *testing.T) {
	mainFolderPath := "/data/anime/main"
	folders := []models.JellyfinFolderOption{
		{JellyfinItemID: "series-401", IsMain: true},
		{JellyfinItemID: "series-402", IsMain: false, FolderPath: strPtr("/data/anime/second")},
	}

	got := ownedJellyfinSourcesFromFolders("series-401", &mainFolderPath, folders)

	if len(got) != 2 {
		t.Fatalf("expected exactly 2 owned pairs, got %d: %+v", len(got), got)
	}
	if got[0].SeriesID != "series-401" || got[0].FolderPath != "/data/anime/main" {
		t.Fatalf("expected first pair to be the main pair, got %+v", got[0])
	}
	if got[1].SeriesID != "series-402" || got[1].FolderPath != "/data/anime/second" {
		t.Fatalf("expected second pair to come from the non-main folder entry, got %+v", got[1])
	}
}

func TestOwnedJellyfinSourcesFromFolders_LegacyFallbackNoFolders(t *testing.T) {
	mainFolderPath := "/data/anime/legacy"

	got := ownedJellyfinSourcesFromFolders("", &mainFolderPath, nil)

	if len(got) != 1 {
		t.Fatalf("expected exactly 1 owned pair for the legacy fallback, got %d: %+v", len(got), got)
	}
	if got[0].SeriesID != "" || got[0].FolderPath != "/data/anime/legacy" {
		t.Fatalf("expected legacy fallback pair {FolderPath: normalized mainFolderPath}, got %+v", got[0])
	}
}

func TestHydrateFansubFolderPathsForRelink_SkipsCallBelowTwoFolders(t *testing.T) {
	called := false
	getItems := func(ctx context.Context, ids []string) (map[string]jellyfinEpisodeItem, error) {
		called = true
		return nil, nil
	}

	folders := []models.JellyfinFolderOption{{JellyfinItemID: "series-401", IsMain: true}}
	got := hydrateFansubFolderPathsForRelink(context.Background(), folders, getItems)

	if called {
		t.Fatal("expected getItems not to be called for len(folders) <= 1")
	}
	if len(got) != 1 {
		t.Fatalf("expected folders returned unchanged, got %+v", got)
	}
}

func TestHydrateFansubFolderPathsForRelink_BatchesNonMainFolders(t *testing.T) {
	calls := 0
	var requestedIDs []string
	getItems := func(ctx context.Context, ids []string) (map[string]jellyfinEpisodeItem, error) {
		calls++
		requestedIDs = ids
		return map[string]jellyfinEpisodeItem{
			"series-402": {ID: "series-402", Path: "/data/anime/second"},
			"series-403": {ID: "series-403", Path: "/data/anime/third"},
		}, nil
	}

	folders := []models.JellyfinFolderOption{
		{JellyfinItemID: "series-401", IsMain: true},
		{JellyfinItemID: "series-402", IsMain: false},
		{JellyfinItemID: "series-403", IsMain: false},
	}

	got := hydrateFansubFolderPathsForRelink(context.Background(), folders, getItems)

	if calls != 1 {
		t.Fatalf("expected exactly 1 batched call, got %d", calls)
	}
	if len(requestedIDs) != 2 || requestedIDs[0] != "series-402" || requestedIDs[1] != "series-403" {
		t.Fatalf("expected getItems to be called only with the non-main folder IDs, got %+v", requestedIDs)
	}
	if got[0].FolderPath != nil {
		t.Fatalf("expected main folder entry to stay nil, got %+v", got[0])
	}
	if got[1].FolderPath == nil || *got[1].FolderPath != "/data/anime/second" {
		t.Fatalf("expected series-402 FolderPath populated, got %+v", got[1])
	}
	if got[2].FolderPath == nil || *got[2].FolderPath != "/data/anime/third" {
		t.Fatalf("expected series-403 FolderPath populated, got %+v", got[2])
	}
}

func TestHydrateFansubFolderPathsForRelink_FailsOpenOnGetItemsError(t *testing.T) {
	getItems := func(ctx context.Context, ids []string) (map[string]jellyfinEpisodeItem, error) {
		return nil, errors.New("jellyfin unavailable")
	}

	folders := []models.JellyfinFolderOption{
		{JellyfinItemID: "series-401", IsMain: true},
		{JellyfinItemID: "series-402", IsMain: false},
	}

	got := hydrateFansubFolderPathsForRelink(context.Background(), folders, getItems)

	if len(got) != 2 {
		t.Fatalf("expected folders slice unchanged in length on error, got %+v", got)
	}
	if got[1].FolderPath != nil {
		t.Fatalf("expected non-main FolderPath to stay nil on getItems error (fail-open), got %+v", got[1])
	}
}
