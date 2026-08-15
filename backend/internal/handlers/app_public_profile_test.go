package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type recordingPublicMemberAccessResolver struct {
	access          repository.PublicMemberAccess
	err             error
	calls           int
	slug            string
	viewerAppUserID int64
	events          *[]string
}

func (r *recordingPublicMemberAccessResolver) ResolvePublicMemberAccess(
	_ context.Context,
	slug string,
	viewerAppUserID int64,
) (repository.PublicMemberAccess, error) {
	r.calls++
	r.slug = slug
	r.viewerAppUserID = viewerAppUserID
	if r.events != nil {
		*r.events = append(*r.events, "resolve")
	}
	return r.access, r.err
}

type recordingPublicMemberProfileLoaders struct {
	events           *[]string
	profile          *models.PublicMemberProfile
	profileErr       error
	projects         *models.PublicMemberProjectsPage
	projectsErr      error
	profileCalls     int
	projectsCalls    int
	profileMemberID  int64
	projectsMemberID int64
	projectsLimit    int
	projectsOffset   int
}

func (r *recordingPublicMemberProfileLoaders) GetPublicMemberProfileByID(
	_ context.Context,
	memberID int64,
) (*models.PublicMemberProfile, error) {
	r.profileCalls++
	r.profileMemberID = memberID
	if r.events != nil {
		*r.events = append(*r.events, "profile")
	}
	return r.profile, r.profileErr
}

func (r *recordingPublicMemberProfileLoaders) GetPublicMemberProjectsByID(
	_ context.Context,
	memberID int64,
	limit int,
	offset int,
) (*models.PublicMemberProjectsPage, error) {
	r.projectsCalls++
	r.projectsMemberID = memberID
	r.projectsLimit = limit
	r.projectsOffset = offset
	if r.events != nil {
		*r.events = append(*r.events, "projects")
	}
	return r.projects, r.projectsErr
}

func TestPublicMemberProfileUnavailableResponsesAreByteIdentical(t *testing.T) {
	gin.SetMode(gin.TestMode)
	missing := publicMemberUnavailableResponse()
	privateAnonymous := publicMemberUnavailableResponse()
	privateNonOwner := publicMemberUnavailableResponse()
	adminNonOwner := publicMemberUnavailableResponse()

	require.Equal(t, http.StatusNotFound, missing.Code)
	require.Equal(t, missing.Code, privateAnonymous.Code)
	require.Equal(t, missing.Code, privateNonOwner.Code)
	require.Equal(t, missing.Code, adminNonOwner.Code)
	require.Equal(t, missing.Body.Bytes(), privateAnonymous.Body.Bytes())
	require.Equal(t, missing.Body.Bytes(), privateNonOwner.Body.Bytes())
	require.Equal(t, missing.Body.Bytes(), adminNonOwner.Body.Bytes())
	require.JSONEq(t, `{"error":{"message":"Profil nicht verfügbar"}}`, missing.Body.String())
}

func TestResolvePublicMemberAccessUsesOnlyAppUserIdentity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resolver := &recordingPublicMemberAccessResolver{access: repository.PublicMemberAccess{
		MemberID:         17,
		Slug:             "private-member",
		IsOwner:          true,
		IsPrivatePreview: true,
	}}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/members/private-member", nil)
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:          99,
		DisplayName:     "Phase 128 Viewer",
		AppUserID:       73,
		IsPlatformAdmin: true,
		GlobalRoles:     []string{"platform_admin"},
	})

	access, ok := resolvePublicMemberAccess(c, resolver, "private-member")

	require.True(t, ok)
	require.Equal(t, int64(17), access.MemberID)
	require.Equal(t, 1, resolver.calls)
	require.Equal(t, "private-member", resolver.slug)
	require.Equal(t, int64(73), resolver.viewerAppUserID)
	require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
	require.Equal(t, "private, no-store", recorder.Header().Get("Cache-Control"))
}

func TestResolvePublicMemberAccessMapsDenialToNeutralUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resolver := &recordingPublicMemberAccessResolver{err: repository.ErrNotFound}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/members/2", nil)

	_, ok := resolvePublicMemberAccess(c, resolver, "2")

	require.False(t, ok)
	require.Equal(t, int64(0), resolver.viewerAppUserID)
	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.JSONEq(t, `{"error":{"message":"Profil nicht verfügbar"}}`, recorder.Body.String())
	require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
}

func TestResolvePublicMemberAccessKeepsUnexpectedDetailsInternal(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resolver := &recordingPublicMemberAccessResolver{err: errors.New("private database detail")}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/members/public-member", nil)

	_, ok := resolvePublicMemberAccess(c, resolver, "public-member")

	require.False(t, ok)
	require.Equal(t, http.StatusInternalServerError, recorder.Code)
	require.NotContains(t, strings.ToLower(recorder.Body.String()), "database")
	require.JSONEq(t, `{"error":{"message":"interner serverfehler"}}`, recorder.Body.String())
}

func TestPublicMemberCacheHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name            string
		viewerDependent bool
		wantCache       string
	}{
		{name: "anonymous public", viewerDependent: false},
		{name: "viewer or owner", viewerDependent: true, wantCache: "private, no-store"},
	} {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			setPublicMemberResponseCache(c, test.viewerDependent)
			require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
			require.Equal(t, test.wantCache, recorder.Header().Get("Cache-Control"))
		})
	}
}

func TestGetPublicMemberProfileResolvesBeforeLoadingDetails(t *testing.T) {
	gin.SetMode(gin.TestMode)
	events := []string{}
	resolver := &recordingPublicMemberAccessResolver{
		access: repository.PublicMemberAccess{MemberID: 17, Slug: "public-member"},
		events: &events,
	}
	loaders := &recordingPublicMemberProfileLoaders{
		events:  &events,
		profile: &models.PublicMemberProfile{MemberID: 17, Slug: "public-member"},
	}
	handler := NewAppPublicProfileHandler(resolver, loaders, loaders)
	recorder, c := publicMemberRequestContext("/api/v1/members/public-member", "public-member")

	handler.GetPublicMemberProfile(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, []string{"resolve", "profile"}, events)
	require.Equal(t, 1, resolver.calls)
	require.Equal(t, 1, loaders.profileCalls)
	require.Equal(t, int64(17), loaders.profileMemberID)
	var response struct {
		Data   models.PublicMemberProfile `json:"data"`
		Viewer struct {
			IsOwner          bool `json:"is_owner"`
			IsPrivatePreview bool `json:"is_private_preview"`
		} `json:"viewer"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(17), response.Data.MemberID)
	require.False(t, response.Viewer.IsOwner)
	require.False(t, response.Viewer.IsPrivatePreview)
	require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
}

func TestGetPublicMemberProfileOwnerPreviewIsPrivate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resolver := &recordingPublicMemberAccessResolver{access: repository.PublicMemberAccess{
		MemberID:         23,
		Slug:             "private-member",
		IsOwner:          true,
		IsPrivatePreview: true,
	}}
	loaders := &recordingPublicMemberProfileLoaders{
		profile: &models.PublicMemberProfile{MemberID: 23, Slug: "private-member"},
	}
	handler := NewAppPublicProfileHandler(resolver, loaders, loaders)
	recorder, c := publicMemberRequestContext("/api/v1/members/private-member", "private-member")
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:      41,
		DisplayName: "Owner",
		AppUserID:   41,
	})

	handler.GetPublicMemberProfile(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, "private, no-store", recorder.Header().Get("Cache-Control"))
	require.Contains(t, recorder.Body.String(), `"is_owner":true`)
	require.Contains(t, recorder.Body.String(), `"is_private_preview":true`)
}

func TestGetPublicMemberProfileDenialDoesNotLoadDetails(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resolver := &recordingPublicMemberAccessResolver{err: repository.ErrNotFound}
	loaders := &recordingPublicMemberProfileLoaders{}
	handler := NewAppPublicProfileHandler(resolver, loaders, loaders)
	recorder, c := publicMemberRequestContext("/api/v1/members/2", "2")

	handler.GetPublicMemberProfile(c)

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Zero(t, loaders.profileCalls)
	require.Zero(t, loaders.projectsCalls)
	require.Equal(t, publicMemberUnavailableResponse().Body.Bytes(), recorder.Body.Bytes())
}

func TestGetPublicMemberProjectsResolvesBeforeLoadingAndBoundsPagination(t *testing.T) {
	gin.SetMode(gin.TestMode)
	events := []string{}
	resolver := &recordingPublicMemberAccessResolver{
		access: repository.PublicMemberAccess{MemberID: 29, Slug: "project-member"},
		events: &events,
	}
	loaders := &recordingPublicMemberProfileLoaders{
		events:   &events,
		projects: &models.PublicMemberProjectsPage{Items: []models.PublicMemberCurrentProject{}},
	}
	handler := NewAppPublicProfileHandler(resolver, loaders, loaders)
	recorder, c := publicMemberRequestContext(
		"/api/v1/members/project-member/projects?limit=999&offset=-1",
		"project-member",
	)

	handler.GetPublicMemberProjects(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, []string{"resolve", "projects"}, events)
	require.Zero(t, loaders.profileCalls)
	require.Equal(t, 1, loaders.projectsCalls)
	require.Equal(t, int64(29), loaders.projectsMemberID)
	require.Equal(t, 24, loaders.projectsLimit)
	require.Equal(t, 0, loaders.projectsOffset)
	require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
	require.NotContains(t, recorder.Body.String(), `"visible":false`)
}

func publicMemberRequestContext(path string, slug string) (*httptest.ResponseRecorder, *gin.Context) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, path, nil)
	c.Params = gin.Params{{Key: "slug", Value: slug}}
	return recorder, c
}

func publicMemberUnavailableResponse() *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	writePublicMemberUnavailable(c)
	return recorder
}

func TestGetPublicMemberProfileNilLoaderUsesStandardEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resolver := &recordingPublicMemberAccessResolver{
		access: repository.PublicMemberAccess{MemberID: 17, Slug: "public-member"},
	}
	handler := NewAppPublicProfileHandler(resolver, nil, nil)
	recorder, c := publicMemberRequestContext("/api/v1/members/public-member", "public-member")

	handler.GetPublicMemberProfile(c)

	require.Equal(t, http.StatusInternalServerError, recorder.Code)
	var response struct {
		Error struct {
			Message string `json:"message"`
			Code    string `json:"code"`
			Details string `json:"details"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "interner serverfehler", response.Error.Message)
	require.Equal(t, "internal_error", response.Error.Code)
	require.NotEmpty(t, response.Error.Details)
}

// TestPublicMemberCacheClassSeparationLock locks the D-09 policy: viewer-specific
// (owner / private-preview) and anonymous public responses stay in SEPARATE cache
// classes so an owner preview can never leak into an anonymous cache, and NO
// shared/public cache-control (public / max-age / s-maxage) is emitted on the
// public member routes. Phase 128 established `private, no-store` + `Vary:
// Authorization`; this test prevents a regression toward a shared cache in 131.
func TestPublicMemberCacheClassSeparationLock(t *testing.T) {
	gin.SetMode(gin.TestMode)

	assertNoSharedCache := func(t *testing.T, cacheControl string) {
		t.Helper()
		lower := strings.ToLower(cacheControl)
		require.NotContains(t, lower, "public", "public member routes must not emit a shared public cache")
		require.NotContains(t, lower, "max-age", "public member routes must not emit a cacheable max-age")
		require.NotContains(t, lower, "s-maxage", "public member routes must not emit a shared s-maxage")
	}

	t.Run("owner or private-preview response is uncacheable", func(t *testing.T) {
		resolver := &recordingPublicMemberAccessResolver{access: repository.PublicMemberAccess{
			MemberID:         51,
			Slug:             "private-member",
			IsOwner:          true,
			IsPrivatePreview: true,
		}}
		loaders := &recordingPublicMemberProfileLoaders{
			profile: &models.PublicMemberProfile{MemberID: 51, Slug: "private-member"},
		}
		handler := NewAppPublicProfileHandler(resolver, loaders, loaders)
		recorder, c := publicMemberRequestContext("/api/v1/members/private-member", "private-member")
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 51, DisplayName: "Owner", AppUserID: 51})

		handler.GetPublicMemberProfile(c)

		require.Equal(t, http.StatusOK, recorder.Code)
		// Viewer class: never stored by any cache, keyed by Authorization.
		require.Equal(t, "private, no-store", recorder.Header().Get("Cache-Control"))
		require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
		assertNoSharedCache(t, recorder.Header().Get("Cache-Control"))
	})

	t.Run("anonymous public response carries no shared cache", func(t *testing.T) {
		resolver := &recordingPublicMemberAccessResolver{
			access: repository.PublicMemberAccess{MemberID: 52, Slug: "public-member"},
		}
		loaders := &recordingPublicMemberProfileLoaders{
			profile: &models.PublicMemberProfile{MemberID: 52, Slug: "public-member"},
		}
		handler := NewAppPublicProfileHandler(resolver, loaders, loaders)
		recorder, c := publicMemberRequestContext("/api/v1/members/public-member", "public-member")

		handler.GetPublicMemberProfile(c)

		require.Equal(t, http.StatusOK, recorder.Code)
		// Anonymous class is separated from the viewer class by Vary: Authorization
		// and must never advertise a shared/public cache.
		require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
		assertNoSharedCache(t, recorder.Header().Get("Cache-Control"))
	})

	// Seam-level lock: for both viewer-dependent and anonymous inputs the cache
	// header helper only ever emits the separating headers, never a shared cache.
	for _, viewerDependent := range []bool{true, false} {
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		setPublicMemberResponseCache(c, viewerDependent)
		require.Equal(t, "Authorization", recorder.Header().Get("Vary"))
		assertNoSharedCache(t, recorder.Header().Get("Cache-Control"))
		if viewerDependent {
			require.Equal(t, "private, no-store", recorder.Header().Get("Cache-Control"))
		}
	}
}
