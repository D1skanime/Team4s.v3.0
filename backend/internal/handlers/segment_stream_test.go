package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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
