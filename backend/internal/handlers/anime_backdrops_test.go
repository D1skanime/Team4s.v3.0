package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestBuildAnimeBackdropProxyURLs(t *testing.T) {
	urls := buildAnimeBackdropProxyURLs("abc123", 4)
	if len(urls) != 4 {
		t.Fatalf("expected 4 backdrop urls, got %d", len(urls))
	}

	if urls[0] != "/api/v1/media/image?item_id=abc123&kind=backdrop&provider=jellyfin" {
		t.Fatalf("unexpected first url: %q", urls[0])
	}
	if urls[1] != "/api/v1/media/image?index=1&item_id=abc123&kind=backdrop&provider=jellyfin" {
		t.Fatalf("unexpected second url: %q", urls[1])
	}
}

func TestFolderLookupTerm(t *testing.T) {
	raw := "Anime.Sub/07 Ghost"
	term := folderLookupTerm(&raw)
	if term != "07 Ghost" {
		t.Fatalf("expected folder term %q, got %q", "07 Ghost", term)
	}
}

func TestProbeJellyfinBackdropProxyURLs_AllowsSparseIndices(t *testing.T) {
	const seriesID = "abc123"

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/Items/abc123/Images/Backdrop":
			w.WriteHeader(http.StatusOK)
		case "/Items/abc123/Images/Backdrop/1":
			w.WriteHeader(http.StatusNotFound)
		case "/Items/abc123/Images/Backdrop/2":
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	handler := &AnimeHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	urls := handler.probeJellyfinBackdropProxyURLs(context.Background(), seriesID)
	expected := []string{
		"/api/v1/media/image?item_id=abc123&kind=backdrop&provider=jellyfin",
		"/api/v1/media/image?index=2&item_id=abc123&kind=backdrop&provider=jellyfin",
	}

	if !reflect.DeepEqual(urls, expected) {
		t.Fatalf("unexpected backdrop urls: got=%v want=%v", urls, expected)
	}
}

func TestProbeJellyfinBackdropProxyURLs_UsesIndexZeroFallbackWhenDefaultMissing(t *testing.T) {
	const seriesID = "abc123"

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/Items/abc123/Images/Backdrop/0":
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	handler := &AnimeHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	urls := handler.probeJellyfinBackdropProxyURLs(context.Background(), seriesID)
	expected := []string{
		"/api/v1/media/image?index=0&item_id=abc123&kind=backdrop&provider=jellyfin",
	}

	if !reflect.DeepEqual(urls, expected) {
		t.Fatalf("unexpected backdrop urls: got=%v want=%v", urls, expected)
	}
}

func TestBuildAnimeBackdropVideoProxyURL(t *testing.T) {
	got := buildAnimeBackdropVideoProxyURL("0eae7971916d6971c6613e132d7d6048")
	want := "/api/v1/media/video?item_id=0eae7971916d6971c6613e132d7d6048&provider=jellyfin"
	if got != want {
		t.Fatalf("unexpected video url: got=%q want=%q", got, want)
	}
}

func TestBuildAnimeBannerProxyURL(t *testing.T) {
	got := buildAnimeBannerProxyURL("abc123")
	want := "/api/v1/media/image?item_id=abc123&kind=banner&provider=jellyfin"
	if got != want {
		t.Fatalf("unexpected banner url: got=%q want=%q", got, want)
	}
}

func TestProbeJellyfinThemeVideoProxyURLs(t *testing.T) {
	const seriesID = "abc123"
	responsePayload := animeJellyfinThemeVideosResponse{
		Items: []animeJellyfinThemeVideoItem{
			{ID: "video-1"},
			{ID: "video-2"},
			{ID: "video-2"},
			{ID: ""},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/Items/abc123/ThemeVideos" {
			t.Fatalf("unexpected path: %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(responsePayload)
	}))
	defer server.Close()

	handler := &AnimeHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	got := handler.probeJellyfinThemeVideoProxyURLs(context.Background(), seriesID)
	want := []string{
		"/api/v1/media/video?item_id=video-1&provider=jellyfin",
		"/api/v1/media/video?item_id=video-2&provider=jellyfin",
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected theme video urls: got=%v want=%v", got, want)
	}
}

func TestProbeJellyfinBannerProxyURL(t *testing.T) {
	const seriesID = "abc123"

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/Items/abc123/Images/Banner":
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	handler := &AnimeHandler{
		jellyfinAPIKey:  "test-key",
		jellyfinBaseURL: server.URL,
		httpClient:      server.Client(),
	}

	got := handler.probeJellyfinBannerProxyURL(context.Background(), seriesID)
	want := "/api/v1/media/image?item_id=abc123&kind=banner&provider=jellyfin"

	if got != want {
		t.Fatalf("unexpected banner proxy url: got=%q want=%q", got, want)
	}
}
