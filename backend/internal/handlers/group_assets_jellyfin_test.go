package handlers

import (
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestBuildSubgroupSuffixCandidates_IncludesNameVariants(t *testing.T) {
	candidates := buildSubgroupSuffixCandidates("strawhats", "Strawhat Subs")

	assertContains(t, candidates, "strawhats")
	assertContains(t, candidates, "strawhat-subs")
	assertContains(t, candidates, "strawhat subs")
	assertContains(t, candidates, "strawhatsubs")
	assertContains(t, candidates, "strawhat")
}

func TestScoreSubgroupFolderMatch_PrefersExplicitSuffixVariant(t *testing.T) {
	candidates := buildSubgroupSuffixCandidates("strawhats", "Strawhat Subs")

	score := scoreSubgroupFolderMatch("25-11-eyes-strawhat-subs", candidates)
	if score <= 0 {
		t.Fatalf("expected positive score for strawhat-subs folder, got %d", score)
	}

	noMatch := scoreSubgroupFolderMatch("25-11-eyes-flamehazesubs", candidates)
	if noMatch >= score {
		t.Fatalf("expected unrelated folder to score lower than %d, got %d", score, noMatch)
	}
}

func TestClassifyGroupMediaType_RecognizesOpeningByFilename(t *testing.T) {
	assetType, ok := classifyGroupMediaType("Opening", "/media/Subgroups/25_11 eyes_strawhat-subs/Episode 1/Opening.avi")
	if !ok {
		t.Fatal("expected opening asset to be classified")
	}
	if assetType != "opening" {
		t.Fatalf("expected opening, got %q", assetType)
	}
}

func TestBuildGroupAssetHero_UsesRootBackdropAndPrimaryOnly(t *testing.T) {
	root := jellyfinGroupItem{
		ID:                "root-item",
		Name:              "25_11 eyes_strawhat-subs",
		BackdropImageTags: []string{"backdrop-tag"},
		ImageTags: map[string]string{
			"Primary": "primary-tag",
		},
	}

	hero := buildGroupAssetHero(root)
	if hero.BackdropURL == nil || *hero.BackdropURL == "" {
		t.Fatal("expected root backdrop url to be set")
	}
	if hero.PrimaryURL == nil || *hero.PrimaryURL == "" {
		t.Fatal("expected root primary url to be set")
	}
	if hero.PosterURL == nil || *hero.PosterURL == "" {
		t.Fatal("expected root poster url to be set")
	}
}

func TestBuildGroupEpisodeAssets_IgnoresRootPhotosAndKeepsEpisodePhotosAsGallery(t *testing.T) {
	rootPath := "/media/Subgroups/25_11 eyes_strawhat-subs"
	items := []jellyfinGroupItem{
		{
			ID:   "root-photo",
			Name: "landscape",
			Type: "Photo",
			Path: rootPath + "/landscape.png",
		},
		{
			ID:     "episode-photo",
			Name:   "menu",
			Type:   "Photo",
			Path:   rootPath + "/Episode 1/menu.jpg",
			Width:  int32Ptr(4969),
			Height: int32Ptr(6953),
		},
		{
			ID:   "episode-opening",
			Name: "Opening",
			Type: "Video",
			Path: rootPath + "/Episode 1/Opening.avi",
		},
	}

	episodes := buildGroupEpisodeAssets(rootPath, items)
	if len(episodes) != 1 {
		t.Fatalf("expected 1 episode section, got %d", len(episodes))
	}

	episode := episodes[0]
	if episode.EpisodeNumber != 1 {
		t.Fatalf("expected episode number 1, got %d", episode.EpisodeNumber)
	}
	if len(episode.Images) != 1 {
		t.Fatalf("expected only episode photo in gallery, got %d images", len(episode.Images))
	}
	if episode.Images[0].ID != "episode-photo" {
		t.Fatalf("expected gallery image to come from episode folder, got %q", episode.Images[0].ID)
	}
	if len(episode.MediaAssets) != 1 {
		t.Fatalf("expected 1 media asset, got %d", len(episode.MediaAssets))
	}
	if episode.MediaAssets[0].Type != models.GroupAssetMediaTypeOpening {
		t.Fatalf("expected opening media asset, got %q", episode.MediaAssets[0].Type)
	}
}

func int32Ptr(value int32) *int32 {
	return &value
}

func assertContains(t *testing.T, items []string, expected string) {
	t.Helper()
	for _, item := range items {
		if item == expected {
			return
		}
	}
	t.Fatalf("expected %q in %#v", expected, items)
}
