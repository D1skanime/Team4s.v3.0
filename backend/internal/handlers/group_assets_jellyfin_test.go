package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
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
			"/Library/MediaFolders": `{"Items":[{"Id":"subgroups-id","Name":"Subgroups"},{"Id":"groups-id","Name":"Groups"}]}`,
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

func TestFindSubgroupRoot_PaginatesBeyondFirst500Folders(t *testing.T) {
	firstPageItems := make([]string, 0, 500)
	for i := 0; i < 500; i++ {
		firstPageItems = append(firstPageItems, `{"Id":"root-`+strconv.Itoa(i)+`","Name":"25_other-group","Type":"Folder","Path":"/media/Groups/25_other-group"}`)
	}
	firstPageBody := `{"Items":[` + strings.Join(firstPageItems, ",") + `],"TotalRecordCount":501}`

	handler := &GroupAssetsHandler{
		jellyfinBaseURL: "http://example.test",
		jellyfinAPIKey:  "test-key",
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Path {
				case "/Library/MediaFolders":
					return jsonResponse(`{"Items":[{"Id":"groups-id","Name":"Groups"}]}`), nil
				case "/Items":
					query := req.URL.Query()
					startIndex := query.Get("StartIndex")
					switch startIndex {
					case "0":
						return jsonResponse(firstPageBody), nil
					case "500":
						return jsonResponse(`{"Items":[{"Id":"target-root","Name":"25_strawhat-subs","Type":"Folder","Path":"/media/Groups/25_strawhat-subs"}],"TotalRecordCount":501}`), nil
					default:
						t.Fatalf("unexpected StartIndex %q in query %q", startIndex, req.URL.RawQuery)
					}
				}
				t.Fatalf("unexpected request uri %q", req.URL.RequestURI())
				return nil, nil
			}),
		},
	}

	root, err := handler.findSubgroupRoot(context.Background(), 25, buildSubgroupSuffixCandidates("strawhats", "Strawhat Subs"))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if root == nil {
		t.Fatal("expected subgroup root to be found on second page")
	}
	if root.ID != "target-root" {
		t.Fatalf("expected target-root, got %q", root.ID)
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

func jsonResponse(body string) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
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

func TestGroupAssetsDirectRootExcludesNestedMatches(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		q := r.URL.Query()
		if r.URL.Path != "/Items" || q.Get("ParentId") != "library" || q.Get("Recursive") != "false" {
			t.Error("root query must select direct children")
		}
		if q.Get("Fields") != "Path" {
			t.Error("invalid root ItemFields")
		}
		body := jellyfinGroupItemsResponse{Items: []jellyfinGroupItem{{ID: "direct", Name: "25_test", Path: "/Groups/25_test"}}}
		if q.Get("Recursive") != "false" {
			body.Items = append(body.Items, jellyfinGroupItem{ID: "nested", Name: "25_strawhat-subs", Path: "/Groups/other/25_strawhat-subs"})
		}
		json.NewEncoder(w).Encode(body)
	}))
	defer server.Close()
	h := &GroupAssetsHandler{httpClient: server.Client(), jellyfinBaseURL: server.URL, jellyfinAPIKey: jellyfin12TestKey}
	h.setCachedGroupAssetsLibraryID("library")
	root, err := h.findSubgroupRoot(context.Background(), 25, []string{"test", "strawhat-subs"})
	if err != nil || root == nil || root.ID != "direct" {
		t.Fatalf("wrong root: %+v %v", root, err)
	}
	if calls != 1 {
		t.Fatalf("request count=%d", calls)
	}
}

func TestGroupAssetsChildrenPagesEveryIDAndSorts(t *testing.T) {
	count := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count++
		q := r.URL.Query()
		if q.Get("Recursive") != "true" || q.Get("ParentId") != "root" || q.Get("Limit") != "200" || q.Get("Fields") != "Path,Width,Height" {
			t.Errorf("wrong child query: %s", r.URL)
		}
		start, _ := strconv.Atoi(q.Get("StartIndex"))
		items := []jellyfinGroupItem{}
		for i := start; i < 201 && i < start+200; i++ {
			items = append(items, jellyfinGroupItem{ID: fmt.Sprintf("id-%03d", i), Path: fmt.Sprintf("/root/%03d", 200-i)})
		}
		json.NewEncoder(w).Encode(map[string]any{"Items": items, "TotalRecordCount": 201})
	}))
	defer server.Close()
	h := &GroupAssetsHandler{httpClient: server.Client(), jellyfinBaseURL: server.URL, jellyfinAPIKey: jellyfin12TestKey}
	items, err := h.listSubgroupChildren(context.Background(), "root")
	if err != nil || len(items) != 201 {
		t.Fatalf("incomplete children: %d %v", len(items), err)
	}
	seen := map[string]bool{}
	for i, item := range items {
		if seen[item.ID] {
			t.Fatal("duplicate ID")
		}
		seen[item.ID] = true
		if i > 0 && items[i-1].Path > item.Path {
			t.Fatal("sorting changed")
		}
	}
	if count != 2 {
		t.Fatalf("request count=%d want=2", count)
	}
}

func TestGroupAssetsPaginationTerminationAndInconsistentResponses(t *testing.T) {
	tests := []struct {
		name      string
		pages     []string
		want      int
		wantError bool
	}{
		{"empty", []string{`{"Items":[],"TotalRecordCount":0}`}, 0, false},
		{"unknown-total-partial", []string{`{"Items":[{"Id":"a"},{"Id":"b"}]}`, `{"Items":[{"Id":"c"}]}`}, 3, false},
		{"unknown-total-empty-end", []string{`{"Items":[{"Id":"a"},{"Id":"b"}]}`, `{"Items":[]}`}, 2, false},
		{"repeated", []string{`{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":4}`, `{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":4}`}, 0, true},
		{"partial-duplicate", []string{`{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":4}`, `{"Items":[{"Id":"b"},{"Id":"c"}],"TotalRecordCount":4}`}, 0, true},
		{"empty-before-total", []string{`{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":4}`, `{"Items":[],"TotalRecordCount":4}`}, 0, true},
		{"total-changed", []string{`{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":4}`, `{"Items":[{"Id":"c"}],"TotalRecordCount":3}`}, 0, true},
		{"total-exceeded", []string{`{"Items":[{"Id":"a"},{"Id":"b"}],"TotalRecordCount":1}`}, 0, true},
		{"zero-total-with-item", []string{`{"Items":[{"Id":"a"}],"TotalRecordCount":0}`}, 0, true},
		{"missing-id", []string{`{"Items":[{"Name":"not-identifiable"}],"TotalRecordCount":1}`}, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if calls >= len(tt.pages) {
					t.Error("paging did not terminate")
					io.WriteString(w, `{"Items":[]}`)
					return
				}
				io.WriteString(w, tt.pages[calls])
				calls++
			}))
			defer server.Close()
			h := &GroupAssetsHandler{httpClient: server.Client(), jellyfinBaseURL: server.URL, jellyfinAPIKey: jellyfin12TestKey}
			items, err := h.listPagedGroupItems(context.Background(), url.Values{"Recursive": {"true"}}, 2)
			if (err != nil) != tt.wantError || len(items) != tt.want {
				t.Fatalf("items=%d err=%v", len(items), err)
			}
			if calls != len(tt.pages) {
				t.Fatalf("calls=%d want=%d", calls, len(tt.pages))
			}
		})
	}
}

func TestGroupAssetsDetailsRequiresExactIDViaBatchEndpoint(t *testing.T) {
	for _, id := range []string{"wanted", "wrong", ""} {
		t.Run(id, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				q := r.URL.Query()
				if r.URL.Path != "/Items" || q.Get("Ids") != "wanted" || q.Get("Fields") != "Path,Width,Height" {
					t.Errorf("wrong exact request: %s", r.URL)
				}
				items := []jellyfinGroupItem{}
				if id != "" {
					items = append(items, jellyfinGroupItem{ID: id, Name: "group", BackdropImageTags: []string{"tag"}})
				}
				json.NewEncoder(w).Encode(map[string]any{"Items": items})
			}))
			defer server.Close()
			h := &GroupAssetsHandler{httpClient: server.Client(), jellyfinBaseURL: server.URL, jellyfinAPIKey: jellyfin12TestKey}
			item, err := h.getGroupItemDetails(context.Background(), " wanted ")
			if err != nil {
				t.Fatal(err)
			}
			if id == "wanted" {
				if item == nil || item.ID != "wanted" || len(item.BackdropImageTags) != 1 {
					t.Fatalf("exact base fields missing: %+v", item)
				}
			} else if item != nil {
				t.Fatal("wrong item accepted")
			}
			if calls != 1 {
				t.Fatalf("request count=%d", calls)
			}
		})
	}
}
