package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

type fansubMediaPermissionResolver struct {
	roles []string
}

func (s fansubMediaPermissionResolver) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}

func (s fansubMediaPermissionResolver) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s fansubMediaPermissionResolver) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s fansubMediaPermissionResolver) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s fansubMediaPermissionResolver) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return s.roles, nil
}

func TestFansubMediaUploadAllowsFansubLeadPastPermissionGate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{roles: []string{permissions.RoleFansubLead}}),
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/88/media", nil)
	c.Params = gin.Params{{Key: "id", Value: "88"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 2, AppUserStatus: "active", DisplayName: "Lead"})

	handler.UploadFansubMedia(c)

	if recorder.Code == http.StatusForbidden {
		t.Fatalf("expected fansub_lead to pass the media permission gate, got 403: %s", recorder.Body.String())
	}
	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected media-service guard after permission gate, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestFansubMediaDeleteRejectsMissingGroupRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}),
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/fansubs/88/media/logo", nil)
	c.Params = gin.Params{{Key: "id", Value: "88"}, {Key: "kind", Value: "logo"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 2, AppUserStatus: "active", DisplayName: "Member"})

	handler.DeleteFansubMedia(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
