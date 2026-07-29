package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeSegmentAssignmentThemeRepo implementiert nur die Methoden, die die vier neuen
// Zuweisungs-/Override-Handler benoetigen -- der Rest der adminThemeRepository-Schnittstelle
// bleibt bewusst ungesetzt (nil-embedded), analog fakeAssignmentOverrideRepo in
// segment_render_fanout_test.go.
type fakeSegmentAssignmentThemeRepo struct {
	adminThemeRepository

	assignErr    error
	assignResult *models.AdminThemeSegmentAssignment

	upsertOverrideErr error
	deleteOverrideErr error

	segment       *models.AdminThemeSegment
	getSegmentErr error
}

func (f *fakeSegmentAssignmentThemeRepo) AssignThemeSegmentToReleaseVersion(ctx context.Context, segmentID int64, releaseVersionID int64) (*models.AdminThemeSegmentAssignment, error) {
	if f.assignErr != nil {
		return nil, f.assignErr
	}
	if f.assignResult != nil {
		return f.assignResult, nil
	}
	return &models.AdminThemeSegmentAssignment{ID: 1, ThemeSegmentID: segmentID, ReleaseVersionID: releaseVersionID}, nil
}

func (f *fakeSegmentAssignmentThemeRepo) UnassignThemeSegmentFromReleaseVersion(ctx context.Context, segmentID int64, releaseVersionID int64) error {
	return nil
}

func (f *fakeSegmentAssignmentThemeRepo) UpsertThemeSegmentEpisodeOverride(ctx context.Context, input models.AdminThemeSegmentEpisodeOverrideUpsertInput) (*models.AdminThemeSegmentEpisodeOverride, error) {
	if f.upsertOverrideErr != nil {
		return nil, f.upsertOverrideErr
	}
	return &models.AdminThemeSegmentEpisodeOverride{
		ID:               1,
		ThemeSegmentID:   input.ThemeSegmentID,
		ReleaseVersionID: input.ReleaseVersionID,
		StartTime:        input.StartTime,
		EndTime:          input.EndTime,
	}, nil
}

func (f *fakeSegmentAssignmentThemeRepo) DeleteThemeSegmentEpisodeOverride(ctx context.Context, segmentID int64, releaseVersionID int64) error {
	return f.deleteOverrideErr
}

func (f *fakeSegmentAssignmentThemeRepo) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	if f.getSegmentErr != nil {
		return nil, f.getSegmentErr
	}
	if f.segment != nil {
		return f.segment, nil
	}
	return &models.AdminThemeSegment{ID: segmentID, AnimeID: animeID}, nil
}

func (f *fakeSegmentAssignmentThemeRepo) GetSegmentReleaseDuration(ctx context.Context, animeID int64, fansubGroupID int64, version string, startEpisode int, endEpisode int) (*int32, error) {
	return nil, nil
}

// segmentAssignmentDenyResolverStub implementiert permissions.Resolver so, dass der Actor in
// KEINER Gruppe eine Rolle hat und auch keine Contribution-Rolle besitzt -- CanForReleaseVersion
// liefert damit Allowed=false (ReasonNoMembership), requireSegmentManage also false (403).
type segmentAssignmentDenyResolverStub struct{}

func (segmentAssignmentDenyResolverStub) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}

func (segmentAssignmentDenyResolverStub) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}

func (segmentAssignmentDenyResolverStub) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}

func (segmentAssignmentDenyResolverStub) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}

func (segmentAssignmentDenyResolverStub) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

func (segmentAssignmentDenyResolverStub) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

func segmentAssignmentAuthIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{UserID: 1, AppUserID: 1, AppUserStatus: models.AppUserStatusActive, DisplayName: "Lead"}
}

// TestAnimeSegmentAssignment_AssignRequiresCapabilityThenSucceeds beweist beide Haelften des
// requireSegmentManage-Gates fuer den neuen Zuweisungs-Endpunkt (D-03): ohne die Capability
// release_version.segments.manage -> 403, mit der Capability + gueltigem Body -> 201.
func TestAnimeSegmentAssignment_AssignRequiresCapabilityThenSucceeds(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("denied without capability", func(t *testing.T) {
		stub := &fakeSegmentAssignmentThemeRepo{}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(segmentAssignmentDenyResolverStub{}),
		}

		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/10/segments/7/assignments", strings.NewReader(`{"release_version_id":17}`))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}}
		c.Set("auth_identity", segmentAssignmentAuthIdentity())

		handler.AssignAnimeSegment(c)

		if recorder.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
		}
	})

	t.Run("allowed with capability creates assignment", func(t *testing.T) {
		stub := &fakeSegmentAssignmentThemeRepo{
			segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10, AssignedReleaseVersionIDs: []int64{17}, IsShared: true},
		}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
		}

		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime/10/segments/7/assignments", strings.NewReader(`{"release_version_id":17}`))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}}
		c.Set("auth_identity", segmentAssignmentAuthIdentity())

		handler.AssignAnimeSegment(c)

		if recorder.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d body=%s", recorder.Code, recorder.Body.String())
		}
		var resp struct {
			Data models.AdminThemeSegment `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if !resp.Data.IsShared || len(resp.Data.AssignedReleaseVersionIDs) != 1 {
			t.Fatalf("unexpected assignment response: %+v", resp.Data)
		}
	})
}

// TestAnimeSegmentAssignment_UpsertOverrideRejectsEndBeforeStart beweist, dass der Override-Endpunkt
// dieselbe Validierungsmeldung wie der Basis-Zeitbereich liefert (validateSegmentTimes
// wiederverwendet, keine abweichende Fehlermeldung fuer dieselbe Regel).
func TestAnimeSegmentAssignment_UpsertOverrideRejectsEndBeforeStart(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentAssignmentThemeRepo{
		segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10},
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/anime/10/segments/7/assignments/17/override", strings.NewReader(`{"start_time":"00:01:30","end_time":"00:01:00"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}, {Key: "releaseVersionId", Value: "17"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.UpsertAnimeSegmentEpisodeOverride(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var resp struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Error.Message != "start_time muss vor end_time liegen" {
		t.Fatalf("expected the shared validateSegmentTimes message, got %q", resp.Error.Message)
	}
}

// TestAnimeSegmentAssignment_UpsertOverrideRejectsUnassignedReleaseVersion beweist, dass ein Override
// gegen eine nicht zugewiesene release_version_id ueber die DB-seitige composite FK
// (Repository liefert ErrConflict) als 409 abgelehnt wird, kein stiller Erfolg.
func TestAnimeSegmentAssignment_UpsertOverrideRejectsUnassignedReleaseVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentAssignmentThemeRepo{
		segment:           &models.AdminThemeSegment{ID: 7, AnimeID: 10},
		upsertOverrideErr: repository.ErrConflict,
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/anime/10/segments/7/assignments/17/override", strings.NewReader(`{"start_time":"00:00:10","end_time":"00:01:00"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}, {Key: "releaseVersionId", Value: "17"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.UpsertAnimeSegmentEpisodeOverride(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

// TestAnimeSegmentAssignment_DeleteOverrideNotFoundWhenNoOverrideExists beweist, dass das Entfernen
// eines nicht existierenden Overrides 404 liefert, statt still zu "gelingen".
func TestAnimeSegmentAssignment_DeleteOverrideNotFoundWhenNoOverrideExists(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentAssignmentThemeRepo{
		deleteOverrideErr: repository.ErrNotFound,
	}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/10/segments/7/assignments/17/override", nil)
	c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}, {Key: "releaseVersionId", Value: "17"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.DeleteAnimeSegmentEpisodeOverride(c)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
