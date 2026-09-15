package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/models"
)

func TestCleanupOrphanedSegmentSubtitles(t *testing.T) {
	renderDir := t.TempDir()
	tmpDir := segmentSubtitleTempDir(renderDir)
	if err := os.MkdirAll(tmpDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	oldFile := filepath.Join(tmpDir, "segment-subtitle-old.ass")
	freshFile := filepath.Join(tmpDir, "segment-subtitle-fresh.ass")
	keepFile := filepath.Join(tmpDir, "not-a-subtitle.txt")
	for _, p := range []string{oldFile, freshFile, keepFile} {
		if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
			t.Fatalf("write %s: %v", p, err)
		}
	}
	twoHoursAgo := time.Now().Add(-2 * time.Hour)
	if err := os.Chtimes(oldFile, twoHoursAgo, twoHoursAgo); err != nil {
		t.Fatalf("chtimes: %v", err)
	}

	handler := &AdminContentHandler{segmentRenderDir: renderDir}
	removed, err := handler.CleanupOrphanedSegmentSubtitles(time.Hour)
	if err != nil {
		t.Fatalf("cleanup: %v", err)
	}
	if removed != 1 {
		t.Fatalf("expected 1 removed, got %d", removed)
	}
	if _, err := os.Stat(oldFile); !os.IsNotExist(err) {
		t.Fatal("expected old .ass to be removed")
	}
	if _, err := os.Stat(freshFile); err != nil {
		t.Fatalf("expected fresh .ass to remain: %v", err)
	}
	if _, err := os.Stat(keepFile); err != nil {
		t.Fatalf("expected non-.ass file to remain: %v", err)
	}
}

func TestMapJellyfinMediaStreamsToSegmentProbe(t *testing.T) {
	streams := []jellyfinMediaStream{
		{Index: 0, Type: "Video", Codec: "h264"},
		{Index: 1, Type: "Audio", Codec: "aac"},
		{Index: 2, Type: "Subtitle", Codec: "ass", IsDefault: true},
	}

	mapped := mapJellyfinMediaStreamsToSegmentProbe(streams)
	if len(mapped) != 3 {
		t.Fatalf("expected 3 mapped streams, got %d", len(mapped))
	}
	if mapped[2].Index != 2 || mapped[2].Type != "Subtitle" || mapped[2].Codec != "ass" || !mapped[2].IsDefault {
		t.Fatalf("unexpected mapped subtitle stream: %+v", mapped[2])
	}
}

func TestResolveSegmentSubtitle_SuitableTrackDownloadsAndSelects(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/Items":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"Items":[{"Id":"item-1","MediaSources":[{"Id":"item-1","MediaStreams":[
				{"Index":0,"Type":"Video","Codec":"h264"},
				{"Index":1,"Type":"Audio","Codec":"aac"},
				{"Index":2,"Type":"Subtitle","Codec":"ass","IsDefault":true}
			]}]}]}`))
		case strings.HasPrefix(r.URL.Path, "/Videos/item-1/item-1/Subtitles/2/Stream.ass"):
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write([]byte("[Script Info]\n; test ass content\n"))
		default:
			t.Fatalf("unexpected request path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	selection := handler.resolveSegmentSubtitle(context.Background(), "item-1", tempDir)
	if selection.SubtitleFilePath == "" {
		t.Fatalf("expected a subtitle file path, got diagnostic %q", selection.Diagnostic)
	}
	defer os.Remove(selection.SubtitleFilePath)

	if selection.StreamIndex == nil || *selection.StreamIndex != 2 {
		t.Fatalf("expected subtitle stream index 2, got %+v", selection.StreamIndex)
	}
	if selection.Codec == nil || *selection.Codec != "ass" {
		t.Fatalf("expected subtitle codec ass, got %+v", selection.Codec)
	}
	if !strings.HasPrefix(filepath.Base(selection.SubtitleFilePath), "segment-subtitle-") {
		t.Fatalf("expected controlled temp filename, got %q", selection.SubtitleFilePath)
	}
	content, err := os.ReadFile(selection.SubtitleFilePath)
	if err != nil {
		t.Fatalf("read downloaded subtitle: %v", err)
	}
	if !strings.Contains(string(content), "Script Info") {
		t.Fatalf("expected downloaded ass content, got %q", string(content))
	}
}

func TestResolveSegmentSubtitle_NoSuitableTrackYieldsDiagnosticNoError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[{"Id":"item-2","MediaSources":[{"Id":"item-2","MediaStreams":[
			{"Index":0,"Type":"Video","Codec":"h264"},
			{"Index":1,"Type":"Audio","Codec":"aac"}
		]}]}]}`))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	selection := handler.resolveSegmentSubtitle(context.Background(), "item-2", t.TempDir())
	if selection.SubtitleFilePath != "" {
		t.Fatalf("expected no subtitle file path, got %q", selection.SubtitleFilePath)
	}
	if selection.StreamIndex != nil || selection.Codec != nil {
		t.Fatalf("expected no stream index/codec, got index=%+v codec=%+v", selection.StreamIndex, selection.Codec)
	}
	if strings.TrimSpace(selection.Diagnostic) == "" {
		t.Fatal("expected a diagnostic message when no suitable subtitle track exists")
	}
}

func TestResolveSegmentSubtitle_MissingItemIDYieldsDiagnosticNoError(t *testing.T) {
	handler := &AdminContentHandler{}

	selection := handler.resolveSegmentSubtitle(context.Background(), "", t.TempDir())
	if selection.SubtitleFilePath != "" {
		t.Fatalf("expected no subtitle file path, got %q", selection.SubtitleFilePath)
	}
	if strings.TrimSpace(selection.Diagnostic) == "" {
		t.Fatal("expected a diagnostic message when item id is missing")
	}
}

func TestResolveSegmentSubtitleForRender_SkipsUploadedAssetSources(t *testing.T) {
	handler := &AdminContentHandler{}
	itemID := "item-3"
	source := &models.ThemeSegmentRenderSource{
		SourceKind:     "uploaded_asset",
		JellyfinItemID: &itemID,
	}

	selection := handler.resolveSegmentSubtitleForRender(context.Background(), 1, "cache-key", source)
	if selection.SubtitleFilePath != "" || selection.Diagnostic != "" {
		t.Fatalf("expected empty selection for uploaded_asset source, got %+v", selection)
	}
}

func TestResolveSegmentSubtitleForRender_SkipsWhenNoJellyfinItemID(t *testing.T) {
	handler := &AdminContentHandler{}
	source := &models.ThemeSegmentRenderSource{
		SourceKind: "episode_version",
	}

	selection := handler.resolveSegmentSubtitleForRender(context.Background(), 1, "cache-key", source)
	if selection.SubtitleFilePath != "" || selection.Diagnostic != "" {
		t.Fatalf("expected empty selection when jellyfin item id is missing, got %+v", selection)
	}
}

func TestDownloadJellyfinSubtitle_WritesControlledTempFile(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/Videos/item-4/item-4/Subtitles/3/Stream.ass") {
			t.Fatalf("unexpected subtitle request path: %s", r.URL.Path)
		}
		if r.URL.Query().Has("api_key") || r.Header.Get("Authorization") != "MediaBrowser Token=\"test-key\"" {
			t.Fatal("expected header-only subtitle auth")
		}
		_, _ = w.Write([]byte("[Script Info]\ntest\n"))
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	destPath, err := handler.downloadJellyfinSubtitle(context.Background(), "item-4", "item-4", 3, tempDir)
	if err != nil {
		t.Fatalf("download subtitle: %v", err)
	}
	defer os.Remove(destPath)

	if !strings.HasPrefix(destPath, tempDir) {
		t.Fatalf("expected temp file inside controlled dir %q, got %q", tempDir, destPath)
	}
	content, err := os.ReadFile(destPath)
	if err != nil {
		t.Fatalf("read temp subtitle file: %v", err)
	}
	if !strings.Contains(string(content), "Script Info") {
		t.Fatalf("expected downloaded content, got %q", string(content))
	}
}

func TestDownloadJellyfinSubtitle_UpstreamErrorDoesNotLeakSecrets(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	handler := &AdminContentHandler{
		jellyfinAPIKey:  "super-secret-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	_, err := handler.downloadJellyfinSubtitle(context.Background(), "item-5", "item-5", 1, t.TempDir())
	if err == nil {
		t.Fatal("expected error for upstream 404")
	}
	if strings.Contains(err.Error(), "super-secret-key") {
		t.Fatalf("error must not contain the api key: %v", err)
	}
}

func TestSegmentSubtitleTempDir(t *testing.T) {
	if got := segmentSubtitleTempDir(""); got != "" {
		t.Fatalf("expected empty temp dir for empty render dir, got %q", got)
	}
	got := segmentSubtitleTempDir(filepath.Join("var", "segment-renders"))
	want := filepath.Join("var", "segment-renders", "subtitle-tmp")
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestSegmentSubtitleAuthStatusAndCancellation(t *testing.T) {
	for _, status := range []int{200, 401, 503} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("Authorization") != "MediaBrowser Token=\"subtitle-key\"" || r.URL.Query().Has("api_key") {
					t.Error("subtitle auth boundary")
				}
				if r.URL.Path != "/prefix/Videos/item/source/Subtitles/2/Stream.ass" {
					t.Error("subtitle path changed")
				}
				w.WriteHeader(status)
				w.Write([]byte("[Script Info]"))
			}))
			defer server.Close()
			h := &AdminContentHandler{jellyfinAPIKey: "subtitle-key", jellyfinBaseURL: server.URL + "/prefix", httpClient: server.Client()}
			path, err := h.downloadJellyfinSubtitle(context.Background(), "item", "source", 2, t.TempDir())
			if (err != nil) != (status >= 400) {
				t.Fatalf("status handling: %v", err)
			}
			if status == 200 && path == "" {
				t.Fatal("missing subtitle file")
			}
		})
	}
	h := &AdminContentHandler{jellyfinAPIKey: "subtitle-key", jellyfinBaseURL: "https://jellyfin.test", httpClient: &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("subtitle-key: %w", context.Canceled)
	})}}
	_, err := h.downloadJellyfinSubtitle(context.Background(), "item", "source", 2, t.TempDir())
	if err == nil || strings.Contains(err.Error(), "subtitle-key") || !errors.Is(err, context.Canceled) {
		t.Fatal("unsafe subtitle transport failure")
	}
}

func TestSegmentSubtitleUsesBoundSourceTracks(t *testing.T) {
	metadata, downloads := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/Items":
			metadata++
			w.Write([]byte(`{"Items":[{"Id":"item","Path":"/A.mkv","MediaStreams":[{"Index":1,"Type":"Subtitle","Codec":"ass"}],"MediaSources":[{"Id":"A","Path":"/A.mkv","MediaStreams":[{"Index":2,"Type":"Subtitle","Codec":"ass"}]},{"Id":"B","Path":"/B.mkv","MediaStreams":[{"Index":8,"Type":"Subtitle","Codec":"ass"}]}]}]}`))
		case "/Videos/item/B/Subtitles/8/Stream.ass":
			downloads++
			w.Write([]byte("[Script Info]"))
		default:
			t.Errorf("unexpected request: %s", r.URL.Path)
			w.WriteHeader(404)
		}
	}))
	defer server.Close()
	item := "item"
	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "fixture", httpClient: server.Client(), segmentRenderDir: t.TempDir()}
	source := &models.ThemeSegmentRenderSource{SourceKind: "episode_version", JellyfinItemID: &item, StreamExternalID: &item, JellyfinSource: &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "B", SourcePath: "/B.mkv"}}
	result := h.resolveSegmentSubtitleForRender(context.Background(), 1, "fixture", source)
	if result.StreamIndex == nil || *result.StreamIndex != 8 || metadata != 1 || downloads != 1 {
		t.Fatalf("wrong bound subtitle or fanout: %+v metadata=%d downloads=%d", result, metadata, downloads)
	}
}

func TestSegmentSourceIdentitySelectionAndVideo(t *testing.T) {
	cases := []struct {
		name               string
		binding            *models.JellyfinSourceSnapshot
		sources            []jellyfinMediaSource
		itemID, path, want string
		bad                bool
	}{
		{"no snapshot", nil, []jellyfinMediaSource{{ID: "A", Path: "/A"}, {ID: "B", Path: "/B"}}, "item", "/A", "A", false},
		{"bound B", &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "B", SourcePath: "/B"}, []jellyfinMediaSource{{ID: "A", Path: "/A"}, {ID: "B", Path: "/B"}}, "item", "/A", "B", false},
		{"reordered", &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "B", SourcePath: "/B"}, []jellyfinMediaSource{{ID: "B", Path: "/B"}, {ID: "A", Path: "/A"}}, "item", "/A", "B", false},
		{"path recovered", &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "old", SourcePath: "/B"}, []jellyfinMediaSource{{ID: "A", Path: "/A"}, {ID: "B", Path: "/B"}}, "item", "/A", "B", false},
		{"disappeared", &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "old", SourcePath: "/gone"}, []jellyfinMediaSource{{ID: "A", Path: "/A"}}, "item", "/A", "", true},
		{"ambiguous", nil, []jellyfinMediaSource{{ID: "A"}, {ID: "B"}}, "item", "", "", true},
		{"missing", nil, nil, "item", "", "", true},
		{"wrong item", nil, []jellyfinMediaSource{{ID: "B"}}, "other", "", "", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			metadata := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				metadata++
				if r.URL.Query().Get("Ids") != "item" {
					t.Error("wrong item request")
				}
				json.NewEncoder(w).Encode(jellyfinEpisodeListResponse{Items: []jellyfinEpisodeItem{{ID: tc.itemID, Path: tc.path, MediaSources: tc.sources}}})
			}))
			defer server.Close()
			item, provider := "item", "jellyfin"
			source := &models.ThemeSegmentRenderSource{SourceKind: "episode_version", StreamProvider: &provider, StreamExternalID: &item, JellyfinSource: tc.binding}
			h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "fixture", httpClient: server.Client()}
			identity, selected, err := h.prepareSegmentSource(context.Background(), source, true)
			if tc.bad {
				if err == nil {
					t.Fatal("expected explicit selection failure")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			parsed, _ := url.Parse(*source.StreamURL)
			if parsed.Path != "/Videos/item/stream" || parsed.Query().Get("MediaSourceId") != tc.want || !strings.HasSuffix(identity, ":"+tc.want) || selected.Snapshot.MediaSourceID != tc.want || metadata != 1 {
				t.Fatalf("wrong selected request %s identity=%s calls=%d", parsed, identity, metadata)
			}
			// Bound release video uses the same pair with zero additional metadata calls
			// and rebuilds the item URL even if an old stored URL names another item.
			badURL := server.URL + "/Videos/foreign/stream"
			fansub := &FansubHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "fixture", httpClient: server.Client()}
			target, err := fansub.buildReleaseSourceStreamURL(context.Background(), &models.ReleaseStreamSource{MediaProvider: "jellyfin", MediaItemID: "item", StreamURL: &badURL, JellyfinSource: &selected.Snapshot})
			if err != nil {
				t.Fatal(err)
			}
			video, _ := url.Parse(target)
			if video.Path != parsed.Path || video.Query().Get("MediaSourceId") != tc.want || metadata != 1 {
				t.Fatalf("release/render mismatch: %s", video)
			}
		})
	}
}
