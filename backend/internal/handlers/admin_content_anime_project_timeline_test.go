package handlers

import (
	"net/http"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

func TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker(t *testing.T) {
	gin.SetMode(gin.TestMode)
	loadAppAuthCapabilityTestCache(t)

	handler := &AdminContentHandler{
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleQualityChecker}},
		}),
	}
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/admin/fansubs/88/anime/9/project-timeline", []byte(`{}`), middleware.AuthIdentity{
		UserID: 112, AppUserID: 55, DisplayName: "Quality Checker", AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"}, gin.Param{Key: "animeId", Value: "9"})

	handler.UpdateAnimeFansubProjectTimeline(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for quality checker, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}
