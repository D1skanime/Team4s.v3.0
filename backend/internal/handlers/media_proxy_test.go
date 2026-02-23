package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestBuildProviderImageURL_IncludesResizeAndQuality(t *testing.T) {
	width := 640
	quality := 85

	handler := &FansubHandler{
		jellyfinBaseURL: "http://media.local:8096",
		jellyfinAPIKey:  "media-key",
	}

	targetURL, err := handler.buildProviderImageURL("jellyfin", "6425", "primary", &width, &quality, nil)
	if err != nil {
		t.Fatalf("build image url: %v", err)
	}

	parsed, err := url.Parse(targetURL)
	if err != nil {
		t.Fatalf("parse target url: %v", err)
	}
	if parsed.Path != "/Items/6425/Images/Primary" {
		t.Fatalf("unexpected path: %q", parsed.Path)
	}
	query := parsed.Query()
	if query.Get("api_key") != "media-key" {
		t.Fatalf("expected api key in query, got %q", query.Get("api_key"))
	}
	if query.Get("maxWidth") != "640" {
		t.Fatalf("expected maxWidth=640, got %q", query.Get("maxWidth"))
	}
	if query.Get("quality") != "85" {
		t.Fatalf("expected quality=85, got %q", query.Get("quality"))
	}
}

func TestBuildProviderImageURL_BackdropWithIndex(t *testing.T) {
	index := 3

	handler := &FansubHandler{
		jellyfinBaseURL: "http://media.local:8096",
		jellyfinAPIKey:  "media-key",
	}

	targetURL, err := handler.buildProviderImageURL("jellyfin", "6425", "backdrop", nil, nil, &index)
	if err != nil {
		t.Fatalf("build image url: %v", err)
	}

	parsed, err := url.Parse(targetURL)
	if err != nil {
		t.Fatalf("parse target url: %v", err)
	}
	if parsed.Path != "/Items/6425/Images/Backdrop/3" {
		t.Fatalf("unexpected path: %q", parsed.Path)
	}
}

func TestBuildProviderImageURL_Banner(t *testing.T) {
	handler := &FansubHandler{
		jellyfinBaseURL: "http://media.local:8096",
		jellyfinAPIKey:  "media-key",
	}

	targetURL, err := handler.buildProviderImageURL("jellyfin", "6425", "banner", nil, nil, nil)
	if err != nil {
		t.Fatalf("build image url: %v", err)
	}

	parsed, err := url.Parse(targetURL)
	if err != nil {
		t.Fatalf("parse target url: %v", err)
	}
	if parsed.Path != "/Items/6425/Images/Banner" {
		t.Fatalf("unexpected path: %q", parsed.Path)
	}
}

func TestMediaImage_ProxiesAndSetsCachingHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/Items/6425/Images/Primary" {
			t.Fatalf("unexpected upstream path: %q", r.URL.Path)
		}
		query := r.URL.Query()
		if query.Get("api_key") != "media-key" {
			t.Fatalf("missing upstream api key")
		}
		if query.Get("maxWidth") != "480" {
			t.Fatalf("unexpected maxWidth: %q", query.Get("maxWidth"))
		}
		if query.Get("quality") != "80" {
			t.Fatalf("unexpected quality: %q", query.Get("quality"))
		}
		if r.Header.Get("Accept") != "image/*" {
			t.Fatalf("expected Accept=image/*, got %q", r.Header.Get("Accept"))
		}

		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("ETag", "\"img-etag\"")
		w.Header().Set("Last-Modified", "Tue, 20 Feb 2026 10:00:00 GMT")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("image-bytes"))
	}))
	defer upstream.Close()

	handler := NewFansubHandler(
		nil,
		nil,
		nil,
		"",
		FansubProxyConfig{
			JellyfinAPIKey:  "media-key",
			JellyfinBaseURL: upstream.URL,
		},
	)
	handler.httpClient = upstream.Client()

	router := gin.New()
	router.GET("/api/v1/media/image", handler.MediaImage)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/media/image?provider=jellyfin&item_id=6425&kind=primary&width=480&quality=80",
		nil,
	)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.Code)
	}
	if resp.Body.String() != "image-bytes" {
		t.Fatalf("unexpected body: %q", resp.Body.String())
	}
	if resp.Header().Get("Cache-Control") != "public, max-age=3600" {
		t.Fatalf("unexpected cache-control: %q", resp.Header().Get("Cache-Control"))
	}
	if resp.Header().Get("Content-Type") != "image/jpeg" {
		t.Fatalf("unexpected content-type: %q", resp.Header().Get("Content-Type"))
	}
	if resp.Header().Get("ETag") != "\"img-etag\"" {
		t.Fatalf("unexpected etag: %q", resp.Header().Get("ETag"))
	}
}

func TestMediaImage_UpstreamNotFoundReturnsGermanMessage(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer upstream.Close()

	handler := NewFansubHandler(
		nil,
		nil,
		nil,
		"",
		FansubProxyConfig{
			JellyfinAPIKey:  "media-key",
			JellyfinBaseURL: upstream.URL,
		},
	)
	handler.httpClient = upstream.Client()

	router := gin.New()
	router.GET("/api/v1/media/image", handler.MediaImage)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/media/image?provider=jellyfin&item_id=6425&kind=primary", nil)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.Code)
	}
	if message := decodeErrorMessage(t, resp.Body.Bytes()); message != "bild nicht gefunden" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestMediaImage_InvalidWidthReturnsBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewFansubHandler(
		nil,
		nil,
		nil,
		"",
		FansubProxyConfig{
			JellyfinAPIKey:  "media-key",
			JellyfinBaseURL: "http://media.local:8096",
		},
	)

	router := gin.New()
	router.GET("/api/v1/media/image", handler.MediaImage)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/media/image?provider=jellyfin&item_id=6425&kind=primary&width=abc", nil)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.Code)
	}
	if message := decodeErrorMessage(t, resp.Body.Bytes()); message != "ungueltiger width parameter" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func TestMediaVideo_ProxiesRangeRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/Videos/0eae7971916d6971c6613e132d7d6048/stream" {
			t.Fatalf("unexpected upstream path: %q", r.URL.Path)
		}
		query := r.URL.Query()
		if query.Get("api_key") != "media-key" {
			t.Fatalf("missing upstream api key")
		}
		if query.Get("static") != "true" {
			t.Fatalf("expected static=true")
		}
		if r.Header.Get("Range") != "bytes=0-1023" {
			t.Fatalf("expected range header to be forwarded, got %q", r.Header.Get("Range"))
		}
		if r.Header.Get("Accept") != "video/*" {
			t.Fatalf("expected Accept=video/*, got %q", r.Header.Get("Accept"))
		}

		w.Header().Set("Content-Type", "video/mp4")
		w.Header().Set("Content-Range", "bytes 0-1023/8192")
		w.Header().Set("Accept-Ranges", "bytes")
		w.WriteHeader(http.StatusPartialContent)
		_, _ = w.Write([]byte("video-bytes"))
	}))
	defer upstream.Close()

	handler := NewFansubHandler(
		nil,
		nil,
		nil,
		"",
		FansubProxyConfig{
			JellyfinAPIKey:  "media-key",
			JellyfinBaseURL: upstream.URL,
		},
	)
	handler.httpClient = upstream.Client()

	router := gin.New()
	router.GET("/api/v1/media/video", handler.MediaVideo)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/media/video?provider=jellyfin&item_id=0eae7971916d6971c6613e132d7d6048",
		nil,
	)
	req.Header.Set("Range", "bytes=0-1023")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusPartialContent {
		t.Fatalf("expected 206, got %d", resp.Code)
	}
	if resp.Body.String() != "video-bytes" {
		t.Fatalf("unexpected body: %q", resp.Body.String())
	}
	if resp.Header().Get("Content-Type") != "video/mp4" {
		t.Fatalf("unexpected content-type: %q", resp.Header().Get("Content-Type"))
	}
	if resp.Header().Get("Content-Range") != "bytes 0-1023/8192" {
		t.Fatalf("unexpected content-range: %q", resp.Header().Get("Content-Range"))
	}
}

func TestMediaVideo_UpstreamNotFoundReturnsGermanMessage(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer upstream.Close()

	handler := NewFansubHandler(
		nil,
		nil,
		nil,
		"",
		FansubProxyConfig{
			JellyfinAPIKey:  "media-key",
			JellyfinBaseURL: upstream.URL,
		},
	)
	handler.httpClient = upstream.Client()

	router := gin.New()
	router.GET("/api/v1/media/video", handler.MediaVideo)

	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/media/video?provider=jellyfin&item_id=0eae7971916d6971c6613e132d7d6048",
		nil,
	)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.Code)
	}
	if message := decodeErrorMessage(t, resp.Body.Bytes()); message != "video nicht gefunden" {
		t.Fatalf("unexpected message: %q", message)
	}
}

func decodeErrorMessage(t *testing.T, body []byte) string {
	t.Helper()

	var payload struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	return payload.Error.Message
}
