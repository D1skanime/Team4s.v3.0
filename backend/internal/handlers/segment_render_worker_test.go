package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeSegmentStreamThemeRepo implementiert segmentStreamThemeRepository (und via eingebettetem
// adminThemeRepository das breitere Handler-Feld), damit RenderSegment ohne echte DB getestet
// werden kann. Nicht gesetzte Funktionsfelder liefern ErrNotFound bzw. bleiben no-op.
type fakeSegmentStreamThemeRepo struct {
	adminThemeRepository

	source     *models.ThemeSegmentRenderSource
	readyCache *models.ThemeSegmentRenderCache

	upsertCalled bool
	upsertResult *models.ThemeSegmentRenderCache
	upsertErr    error

	claimCalled bool
}

func (f *fakeSegmentStreamThemeRepo) GetThemeSegmentRenderSource(ctx context.Context, segmentID int64) (*models.ThemeSegmentRenderSource, error) {
	if f.source == nil {
		return nil, repository.ErrNotFound
	}
	return f.source, nil
}

func (f *fakeSegmentStreamThemeRepo) GetThemeSegmentRenderCacheByKey(ctx context.Context, cacheKey string) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) GetReadyThemeSegmentRenderCache(ctx context.Context, segmentID int64) (*models.ThemeSegmentRenderCache, error) {
	if f.readyCache != nil {
		return f.readyCache, nil
	}
	return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) GetLatestThemeSegmentRenderCache(ctx context.Context, segmentID int64) (*models.ThemeSegmentRenderCache, error) {
	return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) ListThemeSegmentRenderCaches(ctx context.Context, segmentID int64) ([]models.ThemeSegmentRenderCache, error) {
	return nil, nil
}

func (f *fakeSegmentStreamThemeRepo) DeleteThemeSegmentRenderCaches(ctx context.Context, segmentID int64) (int64, error) {
	return 0, nil
}

func (f *fakeSegmentStreamThemeRepo) UpsertThemeSegmentRenderCacheQueued(ctx context.Context, input models.ThemeSegmentRenderCacheUpsertInput) (*models.ThemeSegmentRenderCache, error) {
	f.upsertCalled = true
	if f.upsertErr != nil {
		return nil, f.upsertErr
	}
	if f.upsertResult != nil {
		return f.upsertResult, nil
	}
	return &models.ThemeSegmentRenderCache{
		ID:             1,
		ThemeSegmentID: input.ThemeSegmentID,
		CacheKey:       input.CacheKey,
		SourceKind:     input.SourceKind,
		Status:         models.ThemeSegmentRenderStatusQueued,
	}, nil
}

func (f *fakeSegmentStreamThemeRepo) ClaimNextQueuedThemeSegmentRender(ctx context.Context) (*models.ThemeSegmentRenderCache, error) {
	f.claimCalled = true
	return nil, repository.ErrNotFound
}

func (f *fakeSegmentStreamThemeRepo) MarkThemeSegmentRenderCacheReady(ctx context.Context, input models.ThemeSegmentRenderCacheReadyInput) error {
	return nil
}

func (f *fakeSegmentStreamThemeRepo) MarkThemeSegmentRenderCacheFailed(ctx context.Context, cacheKey string, errorCode string, errorMessage string) error {
	return nil
}

func segmentRenderTestSource() *models.ThemeSegmentRenderSource {
	start := int32(10)
	end := int32(30)
	streamURL := "https://jellyfin.example/stream"
	return &models.ThemeSegmentRenderSource{
		SegmentID:          42,
		PlaybackSourceID:   7,
		SourceKind:         "jellyfin_theme",
		StartOffsetSeconds: &start,
		EndOffsetSeconds:   &end,
		StreamURL:          &streamURL,
	}
}

// TestRenderSegment_ReturnsAcceptedAndDoesNotRenderInline verifiziert, dass RenderSegment nur
// noch enqueued (202 + queued-Status) und KEIN ffmpeg inline ausfuehrt. Der Fake-Repo hat keinen
// ffmpeg-Pfad konfiguriert; wuerde synchron gerendert, wuerde der Handler mit einem ffmpeg-Fehler
// (409/500) statt 202 antworten.
func TestRenderSegment_ReturnsAcceptedAndDoesNotRenderInline(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repoStub := &fakeSegmentStreamThemeRepo{source: segmentRenderTestSource()}
	handler := &AdminContentHandler{
		themeRepo:               repoStub,
		segmentRenderEnabled:    true,
		segmentRenderDir:        t.TempDir(),
		segmentRenderMaxSeconds: 300,
		segmentRenderFFmpegPath: "/nonexistent/ffmpeg-should-never-run",
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/segments/42/render", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Admin", IsPlatformAdmin: true})

	handler.RenderSegment(c)

	if recorder.Code != http.StatusAccepted {
		t.Fatalf("expected 202 Accepted, got %d (body=%s)", recorder.Code, recorder.Body.String())
	}
	if !repoStub.upsertCalled {
		t.Fatal("expected UpsertThemeSegmentRenderCacheQueued to be called")
	}
	if repoStub.claimCalled {
		t.Fatal("RenderSegment must not claim/render inline; the background worker owns that")
	}

	var payload struct {
		Data models.ThemeSegmentRenderCache `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.Data.Status != models.ThemeSegmentRenderStatusQueued {
		t.Fatalf("expected queued status in response, got %q", payload.Data.Status)
	}
}

// TestRenderSegment_UploadedAssetSourceRejected verifiziert, dass hochgeladene Segment-Quellen
// weiterhin sofort mit 409 abgelehnt werden, ohne die Queue zu beruehren.
func TestRenderSegment_UploadedAssetSourceRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)

	source := segmentRenderTestSource()
	source.SourceKind = "uploaded_asset"
	repoStub := &fakeSegmentStreamThemeRepo{source: source}
	handler := &AdminContentHandler{
		themeRepo:            repoStub,
		segmentRenderEnabled: true,
		segmentRenderDir:     t.TempDir(),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/segments/42/render", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Admin", IsPlatformAdmin: true})

	handler.RenderSegment(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict, got %d (body=%s)", recorder.Code, recorder.Body.String())
	}
	if repoStub.upsertCalled {
		t.Fatal("uploaded_asset sources must not be enqueued for rendering")
	}
}

// TestRenderSegment_DisabledReturnsServiceUnavailable verifiziert das bestehende Verhalten,
// dass ein deaktiviertes Segment-Rendering weiterhin 503 liefert.
func TestRenderSegment_DisabledReturnsServiceUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repoStub := &fakeSegmentStreamThemeRepo{source: segmentRenderTestSource()}
	handler := &AdminContentHandler{
		themeRepo:            repoStub,
		segmentRenderEnabled: false,
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/segments/42/render", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 1, DisplayName: "Admin", IsPlatformAdmin: true})

	handler.RenderSegment(c)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", recorder.Code)
	}
}
