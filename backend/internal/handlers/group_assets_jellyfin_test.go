package handlers

import (
	"context"
	"io"
	"net/http"
	"strings"
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
			"Thumb":   "thumb-tag",
			"Banner":  "banner-tag",
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
	if hero.ThumbURL == nil || *hero.ThumbURL == "" {
		t.Fatal("expected root thumb url to be set")
	}
	if hero.BannerURL == nil || *hero.BannerURL == "" {
		t.Fatal("expected root banner url to be set")
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
			ID:   "episode-folder",
			Name: "Episode 1",
			Type: "Folder",
			Path: rootPath + "/Episode 1",
			BackdropImageTags: []string{
				"backdrop-1",
				"backdrop-2",
			},
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
	if len(episode.Images) != 3 {
		t.Fatalf("expected folder backdrops plus episode photo in gallery, got %d images", len(episode.Images))
	}
	if episode.Images[0].ID != "episode-folder-backdrop-0" {
		t.Fatalf("expected first gallery image to come from episode folder backdrop, got %q", episode.Images[0].ID)
	}
	if episode.Images[1].ID != "episode-folder-backdrop-1" {
		t.Fatalf("expected second gallery image to come from episode folder backdrop, got %q", episode.Images[1].ID)
	}
	if episode.Images[2].ID != "episode-photo" {
		t.Fatalf("expected third gallery image to come from episode photo item, got %q", episode.Images[2].ID)
	}
	if len(episode.MediaAssets) != 1 {
		t.Fatalf("expected 1 media asset, got %d", len(episode.MediaAssets))
	}
	if episode.MediaAssets[0].Type != models.GroupAssetMediaTypeOpening {
		t.Fatalf("expected opening media asset, got %q", episode.MediaAssets[0].Type)
	}
}

func TestGetGroupAssetsLibraryID_PrefersGroupsOverSubgroups(t *testing.T) {
	handler := &GroupAssetsHandler{
		jellyfinBaseURL: "http://example.test",
		jellyfinAPIKey:  "test-key",
		httpClient: stubJSONClient(t, map[string]string{
			"/Library/MediaFolders?api_key=test-key": `{"Items":[{"Id":"subgroups-id","Name":"Subgroups"},{"Id":"groups-id","Name":"Groups"}]}`,
		}),
	}

	id, err := handler.getGroupAssetsLibraryID(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if id != "groups-id" {
		t.Fatalf("expected Groups library id, got %q", id)
	}
}

func TestGetGroupAssetsLibraryID_UsesCacheAfterFirstLookup(t *testing.T) {
	requestCount := 0
	handler := &GroupAssetsHandler{
		jellyfinBaseURL: "http://example.test",
		jellyfinAPIKey:  "test-key",
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount++
				return &http.Response{
					StatusCode: http.StatusOK,
					Header:     make(http.Header),
					Body: io.NopCloser(strings.NewReader(
						`{"Items":[{"Id":"groups-id","Name":"Groups"}]}`,
					)),
				}, nil
			}),
		},
	}

	firstID, err := handler.getGroupAssetsLibraryID(context.Background())
	if err != nil {
		t.Fatalf("expected first lookup to succeed, got %v", err)
	}
	secondID, err := handler.getGroupAssetsLibraryID(context.Background())
	if err != nil {
		t.Fatalf("expected cached lookup to succeed, got %v", err)
	}
	if firstID != "groups-id" || secondID != "groups-id" {
		t.Fatalf("expected cached groups-id result, got %q and %q", firstID, secondID)
	}
	if requestCount != 1 {
		t.Fatalf("expected exactly one upstream request, got %d", requestCount)
	}
}

func stubJSONClient(t *testing.T, responses map[string]string) *http.Client {
	t.Helper()
	return &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			key := req.URL.RequestURI()
			body, ok := responses[key]
			if !ok {
				t.Fatalf("unexpected request uri %q", key)
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     make(http.Header),
				Body:       io.NopCloser(strings.NewReader(body)),
			}, nil
		}),
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
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
