package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
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

func TestPhase128PublicMemberAccessMatrix(t *testing.T) {
	helperPath := filepath.Join("public_member_access.go")
	helper, err := os.ReadFile(helperPath)
	if errors.Is(err, os.ErrNotExist) {
		t.Fatalf("missing Phase-128 shared handler access contract: %s", helperPath)
	}
	require.NoError(t, err)
	normalizedHelper := strings.ToLower(string(helper))
	require.Contains(t, normalizedHelper, "writepublicmemberunavailable")
	require.Contains(t, normalizedHelper, "resolvepublicmemberaccess")
	require.Contains(t, normalizedHelper, `c.header("vary", "authorization")`)

	for _, file := range []string{
		"app_public_profile.go",
		"project_member_public_handler.go",
	} {
		source, readErr := os.ReadFile(file)
		require.NoError(t, readErr)
		normalized := strings.ToLower(string(source))
		require.Contains(t, normalized, "resolvepublicmemberaccess", file)
		require.Contains(t, normalized, "writepublicmemberunavailable", file)
		require.NotContains(t, normalized, `c.header("vary"`, file)
	}

	mainSource, err := os.ReadFile(filepath.Join("..", "..", "cmd", "server", "main.go"))
	require.NoError(t, err)
	normalizedMain := strings.ToLower(string(mainSource))
	for _, route := range []string{
		`/members/:slug", authoptionalmiddleware`,
		`/members/:slug/projects", authoptionalmiddleware`,
		`/anime/:id/group/:groupid/members/:memberslug", authoptionalmiddleware`,
		`/members/:memberslug/notes", authoptionalmiddleware`,
		`/members/:memberslug/media", authoptionalmiddleware`,
		`/members/:memberslug/releases", authoptionalmiddleware`,
	} {
		require.Contains(t, normalizedMain, route)
	}
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
