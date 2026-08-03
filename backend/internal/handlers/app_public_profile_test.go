package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

type publicMemberProfileRepoStub struct {
	profile *models.PublicMemberProfile
	err     error
}

func (s publicMemberProfileRepoStub) GetPublicMemberProfile(_ context.Context, _ string) (*models.PublicMemberProfile, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.profile, nil
}

func makePublicProfileTestContext(identity *middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/members/3", nil)
	c.Params = gin.Params{{Key: "slug", Value: "3"}}
	if identity != nil {
		c.Set("auth_identity", *identity)
	}
	return c, recorder
}

func TestGetPublicMemberProfileAllowsOwnerPreviewForMembersOnlyProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewAppPublicProfileHandler(publicMemberProfileRepoStub{
		profile: &models.PublicMemberProfile{
			MemberID:          3,
			AppUserID:         42,
			FansubName:        "Subaru",
			ProfileVisibility: models.ProfileVisibilityMembersOnly,
			Memberships:       []models.MemberProfileMembership{},
		},
	})
	identity := middleware.AuthIdentity{
		UserID:        101,
		AppUserID:     42,
		DisplayName:   "Subaru",
		AppUserStatus: models.AppUserStatusActive,
	}
	c, recorder := makePublicProfileTestContext(&identity)

	handler.GetPublicMemberProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() == `{"reason":"members_only","visible":false}` {
		t.Fatalf("expected owner preview data, got hidden response")
	}
}

func TestGetPublicMemberProfileHidesMembersOnlyProfileForAnonymousVisitor(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewAppPublicProfileHandler(publicMemberProfileRepoStub{
		profile: &models.PublicMemberProfile{
			MemberID:          3,
			AppUserID:         42,
			FansubName:        "Subaru",
			ProfileVisibility: models.ProfileVisibilityMembersOnly,
			Memberships:       []models.MemberProfileMembership{},
		},
	})
	c, recorder := makePublicProfileTestContext(nil)

	handler.GetPublicMemberProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != `{"reason":"members_only","visible":false}` {
		t.Fatalf("expected hidden response, got %s", recorder.Body.String())
	}
}

func TestGetPublicMemberProfileHidesMembersOnlyProfileForOtherAuthenticatedMember(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewAppPublicProfileHandler(publicMemberProfileRepoStub{
		profile: &models.PublicMemberProfile{
			MemberID:          3,
			AppUserID:         42,
			FansubName:        "Subaru",
			ProfileVisibility: models.ProfileVisibilityMembersOnly,
			Memberships:       []models.MemberProfileMembership{},
		},
	})
	identity := middleware.AuthIdentity{
		UserID:        102,
		AppUserID:     99,
		DisplayName:   "Other",
		AppUserStatus: models.AppUserStatusActive,
	}
	c, recorder := makePublicProfileTestContext(&identity)

	handler.GetPublicMemberProfile(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if recorder.Body.String() != `{"reason":"members_only","visible":false}` {
		t.Fatalf("expected hidden response, got %s", recorder.Body.String())
	}
}

func TestGetPublicMemberProfileIncludesBadgeProgressOnlyAfterVisibilityGate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	profile := &models.PublicMemberProfile{
		MemberID: 3, AppUserID: 42, FansubName: "Subaru",
		ProfileVisibility: models.ProfileVisibilityPublic,
		Memberships: []models.MemberProfileMembership{},
	}
	handler := NewAppPublicProfileHandler(publicMemberProfileRepoStub{profile: profile})
	publicContext, publicRecorder := makePublicProfileTestContext(nil)
	handler.GetPublicMemberProfile(publicContext)
	if publicRecorder.Code != http.StatusOK {
		t.Fatalf("expected public response 200, got %d", publicRecorder.Code)
	}
	if !strings.Contains(publicRecorder.Body.String(), `"badge_progress"`) {
		t.Fatalf("expected public response to include authoritative badge_progress, got %s", publicRecorder.Body.String())
	}

	profile.ProfileVisibility = models.ProfileVisibilityMembersOnly
	hiddenContext, hiddenRecorder := makePublicProfileTestContext(nil)
	handler.GetPublicMemberProfile(hiddenContext)
	if strings.Contains(hiddenRecorder.Body.String(), "badge_progress") {
		t.Fatalf("anonymous hidden response leaked exact badge metrics: %s", hiddenRecorder.Body.String())
	}
	// This remains the anonymous public handler path; no browser refresh/token seam is invoked.
	if hiddenRecorder.Body.String() != `{"reason":"members_only","visible":false}` {
		t.Fatalf("expected unchanged hidden response, got %s", hiddenRecorder.Body.String())
	}
}
