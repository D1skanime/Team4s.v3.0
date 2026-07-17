package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func segmentGrantContext(t *testing.T, handler *AdminContentHandler, path string, authenticated bool) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, path, nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	if authenticated {
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 9, AppUserID: 9, DisplayName: "User"})
	}
	handler.CreateSegmentStreamGrant(c)
	return recorder
}

func publicSegmentGrantContext(handler *AdminContentHandler, path string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, path, nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	handler.CreatePublicSegmentStreamGrant(c)
	return recorder
}

func TestCreateSegmentStreamGrantRequiresAuthenticatedSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AdminContentHandler{}
	got := segmentGrantContext(t, h, "/api/v1/segments/42/grant?release_version_id=17", false)
	if got.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", got.Code)
	}
}

func TestCreateSegmentStreamGrantAllowsOrdinaryUserForReadyReleaseBoundSegment(t *testing.T) {
	versionID := int64(17)
	repo := &fakeSegmentStreamThemeRepo{
		source:     &models.ThemeSegmentRenderSource{SegmentID: 42, ReleaseVersionID: &versionID, SourceKind: "episode_version"},
		readyCache: &models.ThemeSegmentRenderCache{ThemeSegmentID: 42, CacheKey: "ready-cache", Status: models.ThemeSegmentRenderStatusReady},
	}
	h := &AdminContentHandler{themeRepo: repo, segmentGrantSecret: "test-secret", segmentGrantTTL: time.Minute}
	got := segmentGrantContext(t, h, "/api/v1/segments/42/grant?release_version_id=17", true)
	if got.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", got.Code, got.Body.String())
	}
}

func TestCreateSegmentStreamGrantRejectsCrossReleaseAndUnavailable(t *testing.T) {
	versionID := int64(17)
	repo := &fakeSegmentStreamThemeRepo{source: &models.ThemeSegmentRenderSource{SegmentID: 42, ReleaseVersionID: &versionID, SourceKind: "episode_version"}}
	h := &AdminContentHandler{themeRepo: repo, segmentGrantSecret: "test-secret", segmentGrantTTL: time.Minute}
	if got := segmentGrantContext(t, h, "/api/v1/segments/42/grant?release_version_id=18", true); got.Code != http.StatusNotFound {
		t.Fatalf("cross-release: want 404, got %d", got.Code)
	}
	if got := segmentGrantContext(t, h, "/api/v1/segments/42/grant?release_version_id=17", true); got.Code != http.StatusConflict {
		t.Fatalf("unavailable: want 409, got %d", got.Code)
	}
}

func TestCreatePublicSegmentStreamGrantNeedsNoSessionAndBindsReleaseAndCache(t *testing.T) {
	versionID := int64(17)
	repo := &fakeSegmentStreamThemeRepo{
		source:     &models.ThemeSegmentRenderSource{SegmentID: 42, ReleaseVersionID: &versionID, SourceKind: "episode_version"},
		readyCache: &models.ThemeSegmentRenderCache{ThemeSegmentID: 42, CacheKey: "ready-cache", Status: models.ThemeSegmentRenderStatusReady},
	}
	h := &AdminContentHandler{themeRepo: repo, segmentGrantSecret: "test-secret", segmentGrantTTL: time.Minute}
	got := publicSegmentGrantContext(h, "/api/v1/public/segments/42/grant?release_version_id=17")
	if got.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", got.Code, got.Body.String())
	}
	var body struct {
		Data struct {
			GrantToken       string `json:"grant_token"`
			ReleaseVersionID int64  `json:"release_version_id"`
			IssuedFor        *int64 `json:"issued_for"`
		} `json:"data"`
	}
	if err := json.Unmarshal(got.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode grant response: %v", err)
	}
	if body.Data.ReleaseVersionID != 17 || body.Data.IssuedFor != nil {
		t.Fatalf("unexpected public response: %+v", body.Data)
	}
	claims, err := auth.ParseAndVerifyPublicSegmentStreamGrant(body.Data.GrantToken, "test-secret", time.Now())
	if err != nil {
		t.Fatalf("verify public token: %v", err)
	}
	if claims.SegmentID != 42 || claims.ReleaseVersionID != 17 || claims.CacheKey != "ready-cache" {
		t.Fatalf("unexpected public claims: %+v", claims)
	}
}

func TestCreatePublicSegmentStreamGrantRejectsCrossReleaseAndUnavailable(t *testing.T) {
	versionID := int64(17)
	repo := &fakeSegmentStreamThemeRepo{source: &models.ThemeSegmentRenderSource{SegmentID: 42, ReleaseVersionID: &versionID, SourceKind: "episode_version"}}
	h := &AdminContentHandler{themeRepo: repo, segmentGrantSecret: "test-secret", segmentGrantTTL: time.Minute}
	if got := publicSegmentGrantContext(h, "/api/v1/public/segments/42/grant?release_version_id=18"); got.Code != http.StatusNotFound {
		t.Fatalf("cross-release: want 404, got %d", got.Code)
	}
	if got := publicSegmentGrantContext(h, "/api/v1/public/segments/42/grant?release_version_id=17"); got.Code != http.StatusConflict {
		t.Fatalf("unavailable: want 409, got %d", got.Code)
	}
}

func TestCreatePublicSegmentStreamGrantRejectsInvalidBindingAndMissingConfig(t *testing.T) {
	versionID := int64(17)
	repo := &fakeSegmentStreamThemeRepo{
		source:     &models.ThemeSegmentRenderSource{SegmentID: 42, ReleaseVersionID: &versionID, SourceKind: "episode_version"},
		readyCache: &models.ThemeSegmentRenderCache{ThemeSegmentID: 42, CacheKey: "ready-cache", Status: models.ThemeSegmentRenderStatusReady},
	}
	h := &AdminContentHandler{themeRepo: repo}
	if got := publicSegmentGrantContext(h, "/api/v1/public/segments/42/grant?release_version_id=nope"); got.Code != http.StatusBadRequest {
		t.Fatalf("invalid binding: want 400, got %d", got.Code)
	}
	if got := publicSegmentGrantContext(h, "/api/v1/public/segments/42/grant?release_version_id=17"); got.Code != http.StatusServiceUnavailable {
		t.Fatalf("missing config: want 503, got %d", got.Code)
	}
}

func TestStreamSegmentAcceptsMatchingPublicGrant(t *testing.T) {
	versionID := int64(17)
	outputPath := "clip.mp4"
	mimeType := "video/mp4"
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, outputPath), []byte("bounded-kara"), 0o600); err != nil {
		t.Fatalf("write segment fixture: %v", err)
	}
	repo := &fakeSegmentStreamThemeRepo{
		source: &models.ThemeSegmentRenderSource{SegmentID: 42, ReleaseVersionID: &versionID, SourceKind: "episode_version"},
		readyCache: &models.ThemeSegmentRenderCache{
			ThemeSegmentID: 42, CacheKey: "current-cache", Status: models.ThemeSegmentRenderStatusReady,
			OutputPath: &outputPath, MimeType: &mimeType,
		},
	}
	h := &AdminContentHandler{themeRepo: repo, segmentGrantSecret: "test-secret", segmentRenderDir: dir}
	token, _, err := auth.CreatePublicSegmentStreamGrant(42, 17, "current-cache", "test-secret", time.Now(), time.Minute)
	if err != nil {
		t.Fatalf("create public grant: %v", err)
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/segments/42/stream?grant="+token, nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	h.StreamSegment(c)
	if recorder.Code != http.StatusOK || recorder.Body.String() != "bounded-kara" {
		t.Fatalf("want bounded stream, got %d: %q", recorder.Code, recorder.Body.String())
	}
}

func TestStreamSegmentRejectsPublicGrantAcrossReleaseOrStaleCache(t *testing.T) {
	versionID := int64(17)
	repo := &fakeSegmentStreamThemeRepo{
		source:     &models.ThemeSegmentRenderSource{SegmentID: 42, ReleaseVersionID: &versionID, SourceKind: "episode_version"},
		readyCache: &models.ThemeSegmentRenderCache{ThemeSegmentID: 42, CacheKey: "current-cache", Status: models.ThemeSegmentRenderStatusReady},
	}
	h := &AdminContentHandler{themeRepo: repo, segmentGrantSecret: "test-secret"}

	for name, tc := range map[string]struct {
		releaseID int64
		cacheKey  string
	}{
		"cross release": {releaseID: 18, cacheKey: "current-cache"},
		"stale cache":   {releaseID: 17, cacheKey: "stale-cache"},
	} {
		t.Run(name, func(t *testing.T) {
			token, _, err := auth.CreatePublicSegmentStreamGrant(42, tc.releaseID, tc.cacheKey, "test-secret", time.Now(), time.Minute)
			if err != nil {
				t.Fatalf("create public grant: %v", err)
			}
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/segments/42/stream?grant="+token, nil)
			c.Params = gin.Params{{Key: "id", Value: "42"}}
			h.StreamSegment(c)
			if recorder.Code != http.StatusUnauthorized {
				t.Fatalf("want 401, got %d: %s", recorder.Code, recorder.Body.String())
			}
		})
	}
}

func TestRejectsCallerControlledSegmentBounds(t *testing.T) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/segments/42/stream?grant=x&start=0&end=9999", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	(&AdminContentHandler{}).StreamSegment(c)
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", recorder.Code)
	}
}
