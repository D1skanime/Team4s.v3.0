package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// segmentPreviewThemeRepoFake implements adminThemeRepository via a nil-embedded interface
// (same pattern as fakeSegmentAssignmentThemeRepo in
// admin_content_anime_theme_segment_assignments_test.go) -- only the methods the four new
// preview-image handlers actually call carry configurable func fields/call-tracking; any other
// method is never exercised by these tests and would panic on a nil embedded interface if it
// were (proving, by construction, that this file's tests never reach undeclared repo surface).
type segmentPreviewThemeRepoFake struct {
	adminThemeRepository

	segment            *models.AdminThemeSegment
	segmentAfterMutate *models.AdminThemeSegment
	getSegErr          error
	getSegmentCalls    int

	setManualPreviewFunc   func(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error)
	setManualPreviewCalled bool

	resetManualPreviewFunc   func(ctx context.Context, segmentID int64) (*int64, error)
	resetManualPreviewCalled bool

	attachFunc   func(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error)
	attachCalled bool

	listCandidatesFunc   func(ctx context.Context, segmentID int64, mediaStorageDir string) ([]models.AdminSegmentPreviewImageCandidate, error)
	listCandidatesCalled bool
}

func (f *segmentPreviewThemeRepoFake) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	f.getSegmentCalls++
	if f.getSegErr != nil {
		return nil, f.getSegErr
	}
	if f.getSegmentCalls > 1 && f.segmentAfterMutate != nil {
		return f.segmentAfterMutate, nil
	}
	if f.segment != nil {
		return f.segment, nil
	}
	return &models.AdminThemeSegment{ID: segmentID, AnimeID: animeID}, nil
}

func (f *segmentPreviewThemeRepoFake) SetThemeSegmentManualPreview(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error) {
	f.setManualPreviewCalled = true
	if f.setManualPreviewFunc != nil {
		return f.setManualPreviewFunc(ctx, segmentID, mediaAssetID)
	}
	return nil, nil
}

func (f *segmentPreviewThemeRepoFake) ResetThemeSegmentManualPreview(ctx context.Context, segmentID int64) (*int64, error) {
	f.resetManualPreviewCalled = true
	if f.resetManualPreviewFunc != nil {
		return f.resetManualPreviewFunc(ctx, segmentID)
	}
	return nil, nil
}

func (f *segmentPreviewThemeRepoFake) AttachSegmentPreviewImageFromReleaseVersion(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error) {
	f.attachCalled = true
	if f.attachFunc != nil {
		return f.attachFunc(ctx, segmentID, mediaAssetID)
	}
	return nil, repository.ErrNotFound
}

func (f *segmentPreviewThemeRepoFake) ListSegmentPreviewImageCandidates(ctx context.Context, segmentID int64, mediaStorageDir string) ([]models.AdminSegmentPreviewImageCandidate, error) {
	f.listCandidatesCalled = true
	if f.listCandidatesFunc != nil {
		return f.listCandidatesFunc(ctx, segmentID, mediaStorageDir)
	}
	return []models.AdminSegmentPreviewImageCandidate{}, nil
}

// segmentPreviewDeniedIdentity/segmentPreviewAdminIdentity: a non-platform-admin (forced through
// the real requireSegmentManage permission check) and a platform-admin (bypasses the check,
// same shortcut UploadSegmentAsset's own callers rely on).
func segmentPreviewDeniedIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID: 9301, AppUserID: 9301, AppUserStatus: models.AppUserStatusActive, IsPlatformAdmin: false, DisplayName: "Denied",
	}
}

func segmentPreviewAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID: 9302, AppUserID: 9302, AppUserStatus: models.AppUserStatusActive, IsPlatformAdmin: true, DisplayName: "Admin",
	}
}

// segmentPreviewContext builds a *gin.Context/*httptest.ResponseRecorder pair for the four new
// handlers, mirroring releaseThemeAssetContext's shape (same package, reused convention).
func segmentPreviewContext(req *http.Request, animeID, segmentID string, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: animeID}, {Key: "segmentId", Value: segmentID}}
	c.Set("auth_identity", identity)
	return c, recorder
}

func segmentPreviewUploadRequest(t *testing.T, fileBytes []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("file", "preview.png")
	require.NoError(t, err)
	_, err = part.Write(fileBytes)
	require.NoError(t, err)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/7/segments/42/preview-image", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func segmentPreviewJSONRequest(method, target string, payload any) *http.Request {
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(method, target, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return req
}

type segmentPreviewDataEnvelope struct {
	Data struct {
		PreviewSource *string `json:"preview_source"`
	} `json:"data"`
}

// TestUploadSegmentPreviewImage_Success proves, via a real Postgres-backed mediaRepo and a real
// MediaService writing to a tmp dir, that a genuine multipart upload creates a public/approved
// media asset (D-03) and sets it as the segment's manual preview (D-11), then returns the
// re-fetched segment with preview_source=manual (proving the handler's step-7 re-fetch, not a
// static stub value).
func TestUploadSegmentPreviewImage_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openReleaseThemeAssetMediaFixture(t)

	manual := "manual"
	fake := &segmentPreviewThemeRepoFake{
		segment:            &models.AdminThemeSegment{ID: 42, AnimeID: 7},
		segmentAfterMutate: &models.AdminThemeSegment{ID: 42, AnimeID: 7, PreviewSource: &manual},
	}
	handler := &AdminContentHandler{
		themeRepo:    fake,
		mediaRepo:    repository.NewMediaRepository(pool, ""),
		mediaService: services.NewMediaService(t.TempDir(), ""),
	}

	pngBytes := buildMinimalPNGWithDimensions(t, 100, 100)
	req := segmentPreviewUploadRequest(t, pngBytes)
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewAdminIdentity())

	handler.UploadSegmentPreviewImage(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.True(t, fake.setManualPreviewCalled)

	var resp segmentPreviewDataEnvelope
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.NotNil(t, resp.Data.PreviewSource)
	require.Equal(t, "manual", *resp.Data.PreviewSource)

	var mediaCount int
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM media_assets ma JOIN visibilities v ON v.id = ma.visibility_id JOIN review_statuses rs ON rs.id = ma.review_status_id WHERE v.name = 'public' AND rs.code = 'approved'`,
	).Scan(&mediaCount))
	require.Equal(t, 1, mediaCount)
}

// TestUploadSegmentPreviewImage_Forbidden proves a real permission denial (via
// requireSegmentManage's genuine resolver path, not a simulated 403) returns 403 BEFORE any
// mutation -- SetThemeSegmentManualPreview is never called.
func TestUploadSegmentPreviewImage_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	variantID := int64(55)
	fake := &segmentPreviewThemeRepoFake{
		segment: &models.AdminThemeSegment{ID: 42, AnimeID: 7, PlaybackVariantID: &variantID},
	}
	handler := &AdminContentHandler{
		themeRepo:     fake,
		mediaRepo:     &repository.MediaRepository{},
		mediaService:  services.NewMediaService(t.TempDir(), ""),
		permissionSvc: permissions.NewService(releaseThemeAssetDeniedResolverStub{}),
	}

	req := segmentPreviewUploadRequest(t, buildMinimalPNGWithDimensions(t, 10, 10))
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewDeniedIdentity())

	handler.UploadSegmentPreviewImage(c)

	require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	require.False(t, fake.setManualPreviewCalled, "SetThemeSegmentManualPreview darf vor einer 403-Antwort nie aufgerufen werden")
}

// TestGetSegmentPreviewImageCandidates_Forbidden proves the candidate-list read path is gated
// identically to the mutating endpoints (Acceptance: "Ohne Segment-Recht -> 403" fuer alle vier
// Endpunkte) -- ListSegmentPreviewImageCandidates is never reached.
func TestGetSegmentPreviewImageCandidates_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	variantID := int64(55)
	fake := &segmentPreviewThemeRepoFake{
		segment: &models.AdminThemeSegment{ID: 42, AnimeID: 7, PlaybackVariantID: &variantID},
	}
	handler := &AdminContentHandler{
		themeRepo:     fake,
		permissionSvc: permissions.NewService(releaseThemeAssetDeniedResolverStub{}),
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/anime/7/segments/42/preview-image/candidates", nil)
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewDeniedIdentity())

	handler.GetSegmentPreviewImageCandidates(c)

	require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	require.False(t, fake.listCandidatesCalled, "ListSegmentPreviewImageCandidates darf vor einer 403-Antwort nie aufgerufen werden")
}

// TestAttachSegmentPreviewImage_Forbidden mirrors the Upload/Candidates forbidden proofs for the
// attach endpoint -- AttachSegmentPreviewImageFromReleaseVersion is never reached.
func TestAttachSegmentPreviewImage_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	variantID := int64(55)
	fake := &segmentPreviewThemeRepoFake{
		segment: &models.AdminThemeSegment{ID: 42, AnimeID: 7, PlaybackVariantID: &variantID},
	}
	handler := &AdminContentHandler{
		themeRepo:     fake,
		permissionSvc: permissions.NewService(releaseThemeAssetDeniedResolverStub{}),
	}

	req := segmentPreviewJSONRequest(http.MethodPost, "/api/v1/admin/anime/7/segments/42/preview-image/attach", adminSegmentPreviewImageAttachRequest{MediaAssetID: 900})
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewDeniedIdentity())

	handler.AttachSegmentPreviewImage(c)

	require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	require.False(t, fake.attachCalled, "AttachSegmentPreviewImageFromReleaseVersion darf vor einer 403-Antwort nie aufgerufen werden")
}

// TestResetSegmentPreviewImage_Forbidden mirrors the Upload/Candidates/Attach forbidden proofs
// for the reset endpoint -- ResetThemeSegmentManualPreview is never reached.
func TestResetSegmentPreviewImage_Forbidden(t *testing.T) {
	gin.SetMode(gin.TestMode)
	variantID := int64(55)
	fake := &segmentPreviewThemeRepoFake{
		segment: &models.AdminThemeSegment{ID: 42, AnimeID: 7, PlaybackVariantID: &variantID},
	}
	handler := &AdminContentHandler{
		themeRepo:     fake,
		permissionSvc: permissions.NewService(releaseThemeAssetDeniedResolverStub{}),
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/7/segments/42/preview-image/reset", nil)
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewDeniedIdentity())

	handler.ResetSegmentPreviewImage(c)

	require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	require.False(t, fake.resetManualPreviewCalled, "ResetThemeSegmentManualPreview darf vor einer 403-Antwort nie aufgerufen werden")
}

// TestAttachSegmentPreviewImage_ForeignAsset404 proves that a media_asset_id outside the
// segment's assigned/public/approved set (as reported by AttachSegmentPreviewImageFromReleaseVersion
// returning repository.ErrNotFound, the real Plan 172-03 ownership-gate signal) surfaces as a 404,
// per Acceptance "Fremde -> 404/403".
func TestAttachSegmentPreviewImage_ForeignAsset404(t *testing.T) {
	gin.SetMode(gin.TestMode)
	fake := &segmentPreviewThemeRepoFake{
		segment: &models.AdminThemeSegment{ID: 42, AnimeID: 7},
		attachFunc: func(ctx context.Context, segmentID int64, mediaAssetID int64) (*int64, error) {
			return nil, repository.ErrNotFound
		},
	}
	handler := &AdminContentHandler{themeRepo: fake}

	req := segmentPreviewJSONRequest(http.MethodPost, "/api/v1/admin/anime/7/segments/42/preview-image/attach", adminSegmentPreviewImageAttachRequest{MediaAssetID: 999})
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewAdminIdentity())

	handler.AttachSegmentPreviewImage(c)

	require.Equal(t, http.StatusNotFound, rec.Code, rec.Body.String())
	require.True(t, fake.attachCalled)
}

// TestResetSegmentPreviewImage_ClearsManual proves the reset endpoint re-fetches the segment
// after clearing the manual column, returning a preview_source that is no longer "manual".
func TestResetSegmentPreviewImage_ClearsManual(t *testing.T) {
	gin.SetMode(gin.TestMode)
	manual := "manual"
	auto := "auto"
	fake := &segmentPreviewThemeRepoFake{
		segment:            &models.AdminThemeSegment{ID: 42, AnimeID: 7, PreviewSource: &manual},
		segmentAfterMutate: &models.AdminThemeSegment{ID: 42, AnimeID: 7, PreviewSource: &auto},
		// Kein vorheriges manuelles Asset (oldAssetID=nil): cleanupOldPreviewAsset muss dann
		// fruehzeitig zurueckkehren, OHNE h.mediaRepo zu beruehren (siehe Guard-Klausel dort) --
		// dieser Test prueft ausschliesslich den Re-Fetch/preview_source-Pfad, nicht den
		// Cleanup-Pfad (der bereits durch registerSegmentAutoPreview/Plan 172-04 abgedeckt ist).
		resetManualPreviewFunc: func(ctx context.Context, segmentID int64) (*int64, error) {
			return nil, nil
		},
	}
	handler := &AdminContentHandler{
		themeRepo: fake,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/7/segments/42/preview-image/reset", nil)
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewAdminIdentity())

	handler.ResetSegmentPreviewImage(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.True(t, fake.resetManualPreviewCalled)

	var resp segmentPreviewDataEnvelope
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.NotNil(t, resp.Data.PreviewSource)
	require.NotEqual(t, "manual", *resp.Data.PreviewSource)
}

// TestGetSegmentPreviewImageCandidates_PassesThrough proves the handler passes the fake repo's
// candidate list through to the JSON response unchanged (no silent filtering/mutation).
func TestGetSegmentPreviewImageCandidates_PassesThrough(t *testing.T) {
	gin.SetMode(gin.TestMode)
	expected := []models.AdminSegmentPreviewImageCandidate{
		{MediaAssetID: 501, ThumbnailURL: "http://example/1.jpg", ReleaseVersionLabel: "Folge 7 (v1)"},
		{MediaAssetID: 502, ThumbnailURL: "http://example/2.jpg", ReleaseVersionLabel: "Folge 8 (v2)"},
	}
	fake := &segmentPreviewThemeRepoFake{
		segment: &models.AdminThemeSegment{ID: 42, AnimeID: 7},
		listCandidatesFunc: func(ctx context.Context, segmentID int64, mediaStorageDir string) ([]models.AdminSegmentPreviewImageCandidate, error) {
			return expected, nil
		},
	}
	handler := &AdminContentHandler{themeRepo: fake}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/anime/7/segments/42/preview-image/candidates", nil)
	c, rec := segmentPreviewContext(req, "7", "42", segmentPreviewAdminIdentity())

	handler.GetSegmentPreviewImageCandidates(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.True(t, fake.listCandidatesCalled)

	var resp struct {
		Data []models.AdminSegmentPreviewImageCandidate `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, expected, resp.Data)
}
