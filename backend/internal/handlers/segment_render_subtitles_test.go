package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

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
			_, _ = w.Write([]byte(`{"Items":[{"Id":"item-1","MediaStreams":[
				{"Index":0,"Type":"Video","Codec":"h264"},
				{"Index":1,"Type":"Audio","Codec":"aac"},
				{"Index":2,"Type":"Subtitle","Codec":"ass","IsDefault":true}
			]}]}`))
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
		_, _ = w.Write([]byte(`{"Items":[{"Id":"item-2","MediaStreams":[
			{"Index":0,"Type":"Video","Codec":"h264"},
			{"Index":1,"Type":"Audio","Codec":"aac"}
		]}]}`))
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
		if got := r.URL.Query().Get("api_key"); got != "test-key" {
			t.Fatalf("expected api_key query param, got %q", got)
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
