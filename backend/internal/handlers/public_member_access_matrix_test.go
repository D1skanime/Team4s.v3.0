package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type phase128HandlerAccess struct {
	MemberID         int64
	Slug             string
	IsOwner          bool
	IsPrivatePreview bool
}

type recordingPhase128AccessResolver struct {
	calls int
}

func (r *recordingPhase128AccessResolver) Resolve(_ context.Context, slug string, viewerAppUserID int64) (phase128HandlerAccess, error) {
	r.calls++
	switch {
	case slug == "public-member":
		return phase128HandlerAccess{MemberID: 1, Slug: slug}, nil
	case slug == "stable-private" && viewerAppUserID == 301:
		return phase128HandlerAccess{MemberID: 2, Slug: slug, IsOwner: true, IsPrivatePreview: true}, nil
	default:
		return phase128HandlerAccess{}, repository.ErrNotFound
	}
}

type recordingPhase128DetailLoaders struct {
	calls map[string]int
}

func newRecordingPhase128DetailLoaders() *recordingPhase128DetailLoaders {
	return &recordingPhase128DetailLoaders{calls: map[string]int{
		"profile": 0, "memberships": 0, "badges": 0, "points": 0,
		"projects": 0, "contributions": 0, "summary": 0, "media": 0,
		"story": 0, "notes": 0, "releases": 0,
	}}
}

func (r *recordingPhase128DetailLoaders) load(endpoint string) {
	r.calls[endpoint]++
}

func (r *recordingPhase128DetailLoaders) totalCalls() int {
	total := 0
	for _, calls := range r.calls {
		total += calls
	}
	return total
}

type phase128HandlerRoute struct {
	name       string
	path       string
	endpoint   string
	memberSlug string
}

type phase128HandlerCase struct {
	name            string
	slug            string
	viewerAppUserID int64
	isAdmin         bool
	wantAllowed     bool
	wantOwner       bool
}

// phase128RealAccessResolver implements the REAL publicMemberAccessResolver interface
// (public_member_access.go) consumed by AppPublicProfileHandler and ProjectMemberPublicHandler.
// Unlike recordingPhase128AccessResolver below (the Reference test's own synthetic shape), this
// fake satisfies the production interface exactly, so it plugs directly into the real handler
// constructors and the real resolvePublicMemberAccess/writePublicMemberUnavailable code path.
type phase128RealAccessResolver struct {
	calls int
}

func (r *phase128RealAccessResolver) ResolvePublicMemberAccess(_ context.Context, slug string, viewerAppUserID int64) (repository.PublicMemberAccess, error) {
	r.calls++
	switch {
	case slug == "public-member":
		return repository.PublicMemberAccess{MemberID: 1, Slug: slug}, nil
	case slug == "stable-private" && viewerAppUserID == 301:
		return repository.PublicMemberAccess{MemberID: 2, Slug: slug, IsOwner: true, IsPrivatePreview: true}, nil
	default:
		return repository.PublicMemberAccess{}, repository.ErrNotFound
	}
}

type phase128RealProfileLoader struct{}

func (phase128RealProfileLoader) GetPublicMemberProfileByID(_ context.Context, memberID int64) (*models.PublicMemberProfile, error) {
	return &models.PublicMemberProfile{MemberID: memberID, Slug: "public-member"}, nil
}

type phase128RealProjectsLoader struct{}

func (phase128RealProjectsLoader) GetPublicMemberProjectsByID(_ context.Context, memberID int64, limit int, offset int) (*models.PublicMemberProjectsPage, error) {
	return &models.PublicMemberProjectsPage{Limit: limit, Offset: offset}, nil
}

// phase128RealProjectMemberLoader implements the REAL projectMemberPublicLoader interface
// (project_member_public_handler.go), backing ProjectMemberPublicHandler with a real relation
// check and empty-but-real list results.
type phase128RealProjectMemberLoader struct{}

func (phase128RealProjectMemberLoader) HasMemberRelation(context.Context, int64, int64, int64) (bool, error) {
	return true, nil
}

func (phase128RealProjectMemberLoader) GetSummary(context.Context, int64, int64, int64) (*repository.ProjectMemberSummary, error) {
	return &repository.ProjectMemberSummary{}, nil
}

func (phase128RealProjectMemberLoader) ListNotes(context.Context, int64, int64, int64, string, int) ([]repository.ProjectMemberNote, *string, bool, error) {
	return nil, nil, false, nil
}

func (phase128RealProjectMemberLoader) ListMedia(context.Context, int64, int64, int64, string, int) ([]repository.ProjectMemberMediaItem, *string, bool, error) {
	return nil, nil, false, nil
}

func (phase128RealProjectMemberLoader) ListReleases(context.Context, int64, int64, int64, string, int) ([]repository.ProjectMemberRelease, *string, bool, error) {
	return nil, nil, false, nil
}

// newPhase128RealMatrixRouter builds a gin router registering the REAL production handler
// methods behind the REAL cmd/server/main.go route paths (mirroring main.go:360-361,389-392
// verbatim) and the REAL middleware.CommentAuthOptionalMiddlewareWithState constructor
// (the exact function cmd/server/main.go:189 wires up on its non-Keycloak branch) -- not a
// synthetic reimplementation. main.go has no single reusable route-registration function to
// call directly (routes are registered inline in the startup sequence), so this test extracts
// the minimal real call sequence: the real handler constructors, the real middleware
// constructor, and the real route path strings, copied verbatim from main.go.
func newPhase128RealMatrixRouter(t *testing.T, resolver *phase128RealAccessResolver) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()

	authOptionalMiddleware := middleware.CommentAuthOptionalMiddlewareWithState("", nil)

	profileHandler := NewAppPublicProfileHandler(resolver, phase128RealProfileLoader{}, phase128RealProjectsLoader{})
	projectMemberHandler := NewProjectMemberPublicHandler(resolver, phase128RealProjectMemberLoader{}, "")

	// Mirrors cmd/server/main.go:360-361
	router.GET("/members/:slug", authOptionalMiddleware, profileHandler.GetPublicMemberProfile)
	router.GET("/members/:slug/projects", authOptionalMiddleware, profileHandler.GetPublicMemberProjects)
	// Mirrors cmd/server/main.go:389-392
	router.GET("/anime/:id/group/:groupId/members/:memberSlug", authOptionalMiddleware, projectMemberHandler.GetSummary)
	router.GET("/anime/:id/group/:groupId/members/:memberSlug/notes", authOptionalMiddleware, projectMemberHandler.GetNotes)
	router.GET("/anime/:id/group/:groupId/members/:memberSlug/media", authOptionalMiddleware, projectMemberHandler.GetMedia)
	router.GET("/anime/:id/group/:groupId/members/:memberSlug/releases", authOptionalMiddleware, projectMemberHandler.GetReleases)

	return router
}

func TestPhase128PublicMemberAccessMatrix(t *testing.T) {
	const neutralUnavailableBody = `{"error":{"message":"Profil nicht verfügbar"}}`

	t.Run("app_public_profile.go: real requests prove the Vary header, resolver usage, and the neutral-404 unavailable body", func(t *testing.T) {
		resolver := &phase128RealAccessResolver{}
		router := newPhase128RealMatrixRouter(t, resolver)

		publicReq := httptest.NewRequest(http.MethodGet, "/members/public-member", nil)
		publicResp := httptest.NewRecorder()
		router.ServeHTTP(publicResp, publicReq)
		require.Equal(t, http.StatusOK, publicResp.Code)
		require.Equal(t, []string{"Authorization"}, publicResp.Header().Values("Vary"),
			"Vary must be set exactly once by the shared resolvePublicMemberAccess helper, not duplicated by the handler")
		require.Equal(t, 1, resolver.calls, "GetPublicMemberProfile must invoke the real access resolver")

		privateReq := httptest.NewRequest(http.MethodGet, "/members/stable-private", nil)
		privateResp := httptest.NewRecorder()
		router.ServeHTTP(privateResp, privateReq)
		require.Equal(t, http.StatusNotFound, privateResp.Code)
		require.Equal(t, []string{"Authorization"}, privateResp.Header().Values("Vary"))
		require.JSONEq(t, neutralUnavailableBody, privateResp.Body.String(),
			"the private-anonymous case must return the real writePublicMemberUnavailable body")
	})

	t.Run("project_member_public_handler.go: real requests prove the Vary header, resolver usage, and the neutral-404 unavailable body", func(t *testing.T) {
		resolver := &phase128RealAccessResolver{}
		router := newPhase128RealMatrixRouter(t, resolver)

		publicReq := httptest.NewRequest(http.MethodGet, "/anime/7/group/11/members/public-member", nil)
		publicResp := httptest.NewRecorder()
		router.ServeHTTP(publicResp, publicReq)
		require.Equal(t, http.StatusOK, publicResp.Code)
		require.Equal(t, []string{"Authorization"}, publicResp.Header().Values("Vary"),
			"Vary must be set exactly once by the shared resolvePublicMemberAccess helper, not duplicated by the handler")
		require.Equal(t, 1, resolver.calls, "GetSummary's resolve() must invoke the real access resolver")

		privateReq := httptest.NewRequest(http.MethodGet, "/anime/7/group/11/members/stable-private", nil)
		privateResp := httptest.NewRecorder()
		router.ServeHTTP(privateResp, privateReq)
		require.Equal(t, http.StatusNotFound, privateResp.Code)
		require.Equal(t, []string{"Authorization"}, privateResp.Header().Values("Vary"))
		require.JSONEq(t, neutralUnavailableBody, privateResp.Body.String(),
			"the private-anonymous case must return the real writePublicMemberUnavailable body")
	})

	t.Run("all 6 real production routes accept unauthenticated requests via authOptionalMiddleware", func(t *testing.T) {
		resolver := &phase128RealAccessResolver{}
		router := newPhase128RealMatrixRouter(t, resolver)

		routes := []struct {
			name string
			path string
		}{
			{"profile", "/members/public-member"},
			{"projects", "/members/public-member/projects"},
			{"project summary", "/anime/7/group/11/members/public-member"},
			{"project notes", "/anime/7/group/11/members/public-member/notes"},
			{"project media", "/anime/7/group/11/members/public-member/media"},
			{"project releases", "/anime/7/group/11/members/public-member/releases"},
		}
		require.Len(t, routes, 6)

		for _, route := range routes {
			req := httptest.NewRequest(http.MethodGet, route.path, nil)
			resp := httptest.NewRecorder()
			router.ServeHTTP(resp, req)
			require.NotEqual(t, http.StatusUnauthorized, resp.Code,
				route.name+": an unauthenticated request must not be rejected by authOptionalMiddleware")
		}
	})
}

func TestPhase128PublicMemberAccessMatrixReference(t *testing.T) {
	gin.SetMode(gin.TestMode)
	routes := []phase128HandlerRoute{
		{name: "profile", path: "/members/:slug", endpoint: "profile", memberSlug: "slug"},
		{name: "projects", path: "/members/:slug/projects", endpoint: "projects", memberSlug: "slug"},
		{name: "project summary", path: "/anime/:id/group/:groupId/members/:memberSlug", endpoint: "summary", memberSlug: "memberSlug"},
		{name: "project notes", path: "/anime/:id/group/:groupId/members/:memberSlug/notes", endpoint: "notes", memberSlug: "memberSlug"},
		{name: "project media", path: "/anime/:id/group/:groupId/members/:memberSlug/media", endpoint: "media", memberSlug: "memberSlug"},
		{name: "project releases", path: "/anime/:id/group/:groupId/members/:memberSlug/releases", endpoint: "releases", memberSlug: "memberSlug"},
	}
	cases := []phase128HandlerCase{
		{name: "public anonymous", slug: "public-member", wantAllowed: true},
		{name: "private anonymous", slug: "stable-private"},
		{name: "verified owner", slug: "stable-private", viewerAppUserID: 301, wantAllowed: true, wantOwner: true},
		{name: "private non-owner", slug: "stable-private", viewerAppUserID: 302},
		{name: "admin non-owner", slug: "stable-private", viewerAppUserID: 303, isAdmin: true},
		{name: "missing", slug: "missing-member"},
		{name: "numeric", slug: "2", viewerAppUserID: 301},
		{name: "guessed post-nickname slug", slug: "renamed-private", viewerAppUserID: 301},
	}
	require.Len(t, routes, 6)
	require.Len(t, cases, 8)

	var neutralBody []byte
	for _, route := range routes {
		for _, test := range cases {
			resolver := &recordingPhase128AccessResolver{}
			loaders := newRecordingPhase128DetailLoaders()
			response := servePhase128ReferenceRequest(t, route, test, resolver, loaders)

			require.Equal(t, 1, resolver.calls, route.name+" / "+test.name)
			require.Equal(t, "Authorization", response.Header().Get("Vary"), route.name+" / "+test.name)
			if !test.wantAllowed {
				require.Equal(t, http.StatusNotFound, response.Code, route.name+" / "+test.name)
				require.Zero(t, loaders.totalCalls(), route.name+" / "+test.name)
				if neutralBody == nil {
					neutralBody = append([]byte(nil), response.Body.Bytes()...)
				}
				require.Equal(t, neutralBody, response.Body.Bytes(), route.name+" / "+test.name)
				continue
			}

			require.Equal(t, http.StatusOK, response.Code, route.name+" / "+test.name)
			require.Equal(t, 1, loaders.calls[route.endpoint], route.name+" / "+test.name)
			require.Equal(t, 1, loaders.totalCalls(), route.name+" / "+test.name)
			if test.wantOwner {
				require.Equal(t, "private, no-store", response.Header().Get("Cache-Control"), route.name+" / "+test.name)
			}
		}
	}
}

func servePhase128ReferenceRequest(
	t testing.TB,
	route phase128HandlerRoute,
	test phase128HandlerCase,
	resolver *recordingPhase128AccessResolver,
	loaders *recordingPhase128DetailLoaders,
) *httptest.ResponseRecorder {
	t.Helper()
	router := gin.New()
	router.Use(func(c *gin.Context) {
		if raw := c.GetHeader("X-Test-App-User-ID"); raw != "" {
			appUserID, err := strconv.ParseInt(raw, 10, 64)
			require.NoError(t, err)
			c.Set("auth_identity", middleware.AuthIdentity{UserID: appUserID, AppUserID: appUserID, DisplayName: "Phase 128 Viewer"})
		}
		c.Next()
	})
	router.GET(route.path, func(c *gin.Context) {
		c.Header("Vary", "Authorization")
		identity, _ := middleware.CommentAuthIdentityFromContext(c)
		access, err := resolver.Resolve(c.Request.Context(), c.Param(route.memberSlug), identity.AppUserID)
		if errors.Is(err, repository.ErrNotFound) {
			writePhase128TestUnavailable(c)
			return
		}
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return
		}
		if access.IsPrivatePreview {
			c.Header("Cache-Control", "private, no-store")
		}
		loaders.load(route.endpoint)
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"member_id": access.MemberID}})
	})

	path := strings.ReplaceAll(route.path, ":slug", test.slug)
	path = strings.ReplaceAll(path, ":memberSlug", test.slug)
	path = strings.ReplaceAll(path, ":groupId", "11")
	path = strings.ReplaceAll(path, ":id", "7")
	request := httptest.NewRequest(http.MethodGet, path, nil)
	if test.viewerAppUserID > 0 {
		request.Header.Set("X-Test-App-User-ID", strconv.FormatInt(test.viewerAppUserID, 10))
	}
	if test.isAdmin {
		request.Header.Set("X-Test-Platform-Admin", "true")
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func writePhase128TestUnavailable(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Profil nicht verf?gbar"}})
}

func phase128UnavailableResponse() *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	writePhase128TestUnavailable(c)
	return recorder
}

func phase128MatrixLabel(route, test string) string {
	return fmt.Sprintf("%s / %s", route, test)
}
