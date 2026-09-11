package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeSegmentOriginThemeRepo implementiert nur die Methoden, die SetAnimeSegmentOrigin
// benoetigt -- der Rest der adminThemeRepository-Schnittstelle bleibt bewusst ungesetzt
// (nil-embedded), analog fakeSegmentAssignmentThemeRepo.
type fakeSegmentOriginThemeRepo struct {
	adminThemeRepository

	setOriginErr   error
	setOriginCalls int

	segment       *models.AdminThemeSegment
	getSegmentErr error
}

func (f *fakeSegmentOriginThemeRepo) SetThemeSegmentOrigin(ctx context.Context, segmentID int64, releaseVersionID int64) error {
	f.setOriginCalls++
	return f.setOriginErr
}

func (f *fakeSegmentOriginThemeRepo) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64, currentReleaseVersionID int64) (*models.AdminThemeSegment, error) {
	if f.getSegmentErr != nil {
		return nil, f.getSegmentErr
	}
	if f.segment != nil {
		return f.segment, nil
	}
	return &models.AdminThemeSegment{ID: segmentID, AnimeID: animeID, OriginReleaseVersionID: &currentReleaseVersionID}, nil
}

// TestSetAnimeSegmentOrigin_RequiresCapabilityThenSucceeds beweist beide Haelften des
// requireSegmentManage-Gates (T-156-11: DIESELBE Pruefung wie jeder andere Segment-Schreibpfad,
// keine neue/parallele Autorisierung) -- ohne die Capability release_version.segments.manage
// -> 403 und KEIN Repository-Schreibzugriff; mit der Capability + gueltigem Body -> 200 mit dem
// neu geladenen Segment.
func TestSetAnimeSegmentOrigin_RequiresCapabilityThenSucceeds(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("denied without capability performs no repository write", func(t *testing.T) {
		stub := &fakeSegmentOriginThemeRepo{}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(segmentAssignmentDenyResolverStub{}),
		}

		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/anime/10/segments/7/origin", strings.NewReader(`{"release_version_id":17}`))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}}
		c.Set("auth_identity", segmentAssignmentAuthIdentity())

		handler.SetAnimeSegmentOrigin(c)

		if recorder.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
		}
		if stub.setOriginCalls != 0 {
			t.Fatalf("expected no SetThemeSegmentOrigin call when the permission gate denies, got %d calls", stub.setOriginCalls)
		}
	})

	t.Run("allowed with capability sets origin and returns the reloaded segment", func(t *testing.T) {
		originID := int64(17)
		stub := &fakeSegmentOriginThemeRepo{
			segment: &models.AdminThemeSegment{ID: 7, AnimeID: 10, OriginReleaseVersionID: &originID},
		}
		handler := &AdminContentHandler{
			themeRepo:     stub,
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
		}

		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/anime/10/segments/7/origin", strings.NewReader(`{"release_version_id":17}`))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}}
		c.Set("auth_identity", segmentAssignmentAuthIdentity())

		handler.SetAnimeSegmentOrigin(c)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
		}
		if stub.setOriginCalls != 1 {
			t.Fatalf("expected exactly one SetThemeSegmentOrigin call, got %d", stub.setOriginCalls)
		}
		var resp struct {
			Data models.AdminThemeSegment `json:"data"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if resp.Data.OriginReleaseVersionID == nil || *resp.Data.OriginReleaseVersionID != originID {
			t.Fatalf("expected the reloaded segment's origin_release_version_id=%d in the response, got %+v", originID, resp.Data.OriginReleaseVersionID)
		}
	})
}

// TestSetAnimeSegmentOrigin_RejectsUnassignedReleaseVersion beweist, dass ein Ziel, das dem
// Segment nicht ueber theme_segment_assignments zugewiesen ist (Repository liefert ErrConflict),
// als 409 mit code "origin_not_assigned" abgelehnt wird -- kein stiller Erfolg.
func TestSetAnimeSegmentOrigin_RejectsUnassignedReleaseVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentOriginThemeRepo{setOriginErr: repository.ErrConflict}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/anime/10/segments/7/origin", strings.NewReader(`{"release_version_id":99}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.SetAnimeSegmentOrigin(c)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var resp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Error.Code != "origin_not_assigned" {
		t.Fatalf("expected code=origin_not_assigned, got %q", resp.Error.Code)
	}
}

// TestSetAnimeSegmentOrigin_MissingReleaseVersionIDIsBadRequest beweist, dass ein fehlendes/
// ungueltiges release_version_id mit 400 abgelehnt wird, bevor die Berechtigungspruefung oder
// das Repository ueberhaupt erreicht werden.
func TestSetAnimeSegmentOrigin_MissingReleaseVersionIDIsBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fakeSegmentOriginThemeRepo{}
	handler := &AdminContentHandler{
		themeRepo:     stub,
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/anime/10/segments/7/origin", strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "10"}, {Key: "segmentId", Value: "7"}}
	c.Set("auth_identity", segmentAssignmentAuthIdentity())

	handler.SetAnimeSegmentOrigin(c)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if stub.setOriginCalls != 0 {
		t.Fatalf("expected no SetThemeSegmentOrigin call on a bad request, got %d calls", stub.setOriginCalls)
	}
}
