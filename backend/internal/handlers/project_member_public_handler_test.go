package handlers

// Source-Assertion-Tests fuer ProjectMemberPublicHandler (Phase 122, Plan 122-02).
// Konsistent mit group_contributors_handler_test.go (os.ReadFile + Fragment-Checks) ? das
// handlers-Paket hat keine Live-DB-Handler-Harness. Laufzeit wird im Live-UAT (122-10) geprueft.

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type recordingContributionsLoader struct {
	events      *[]string
	memberCalls int
	memberID    int64
}

func (r *recordingContributionsLoader) GetPublicGroupContributions(context.Context, int64) (*repository.PublicGroupContributionsResponse, error) {
	return &repository.PublicGroupContributionsResponse{}, nil
}

func (r *recordingContributionsLoader) GetPublicAnimeContributions(context.Context, int64) (*repository.PublicAnimeContributionsResponse, error) {
	return &repository.PublicAnimeContributionsResponse{}, nil
}

func (r *recordingContributionsLoader) GetPublicMemberContributionsByID(_ context.Context, memberID int64) (*repository.PublicMemberContributionsResponse, error) {
	r.memberCalls++
	r.memberID = memberID
	*r.events = append(*r.events, "contributions")
	return &repository.PublicMemberContributionsResponse{RoleTimeline: []repository.PublicMemberRoleEntry{}}, nil
}

type recordingProjectMemberLoader struct {
	events        *[]string
	relation      bool
	relationCalls int
	summaryCalls  int
	notesCalls    int
	mediaCalls    int
	releaseCalls  int
}

func (r *recordingProjectMemberLoader) HasMemberRelation(_ context.Context, _, _, _ int64) (bool, error) {
	r.relationCalls++
	*r.events = append(*r.events, "relation")
	return r.relation, nil
}

func (r *recordingProjectMemberLoader) GetSummary(_ context.Context, _, _, _ int64) (*repository.ProjectMemberSummary, error) {
	r.summaryCalls++
	*r.events = append(*r.events, "summary")
	return &repository.ProjectMemberSummary{}, nil
}

func (r *recordingProjectMemberLoader) ListNotes(_ context.Context, _, _, _ int64, _ string, _ int) ([]repository.ProjectMemberNote, *string, bool, error) {
	r.notesCalls++
	*r.events = append(*r.events, "notes")
	return []repository.ProjectMemberNote{}, nil, false, nil
}

func (r *recordingProjectMemberLoader) ListMedia(_ context.Context, _, _, _ int64, _ string, _ int) ([]repository.ProjectMemberMediaItem, *string, bool, error) {
	r.mediaCalls++
	*r.events = append(*r.events, "media")
	return []repository.ProjectMemberMediaItem{}, nil, false, nil
}

func (r *recordingProjectMemberLoader) ListReleases(_ context.Context, _, _, _ int64, _ string, _ int) ([]repository.ProjectMemberRelease, *string, bool, error) {
	r.releaseCalls++
	*r.events = append(*r.events, "releases")
	return []repository.ProjectMemberRelease{}, nil, false, nil
}

func (r *recordingProjectMemberLoader) detailCalls() int {
	return r.summaryCalls + r.notesCalls + r.mediaCalls + r.releaseCalls
}

func pmHandlerSource(t *testing.T) string {
	t.Helper()
	raw, err := os.ReadFile("project_member_public_handler.go")
	if err != nil {
		t.Fatal(err)
	}
	return strings.ToLower(string(raw))
}

func pmMainSource(t *testing.T) string {
	t.Helper()
	raw, err := os.ReadFile("../../cmd/server/main.go")
	if err != nil {
		t.Fatal(err)
	}
	return strings.ToLower(string(raw))
}

func TestProjectMemberHandler_MethodsExist(t *testing.T) {
	src := pmHandlerSource(t)
	for _, frag := range []string{
		"func (h *projectmemberpublichandler) getsummary(",
		"func (h *projectmemberpublichandler) getnotes(",
		"func (h *projectmemberpublichandler) getmedia(",
		"func (h *projectmemberpublichandler) getreleases(",
	} {
		if !strings.Contains(src, frag) {
			t.Fatalf("Handler-Methode fehlt: %q", frag)
		}
	}
}

func TestProjectMemberPublicUnavailableResponsesAreByteIdentical(t *testing.T) {
	gin.SetMode(gin.TestMode)
	missing := phase128UnavailableResponse()
	privateAnonymous := phase128UnavailableResponse()
	privateNonOwner := phase128UnavailableResponse()
	adminNonOwner := phase128UnavailableResponse()

	require.Equal(t, http.StatusNotFound, missing.Code)
	require.Equal(t, missing.Code, privateAnonymous.Code)
	require.Equal(t, missing.Code, privateNonOwner.Code)
	require.Equal(t, missing.Code, adminNonOwner.Code)
	require.Equal(t, missing.Body.Bytes(), privateAnonymous.Body.Bytes())
	require.Equal(t, missing.Body.Bytes(), privateNonOwner.Body.Bytes())
	require.Equal(t, missing.Body.Bytes(), adminNonOwner.Body.Bytes())
}

func TestMemberContributionsNoDetailLoadBeforeAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	events := []string{}
	resolver := &recordingPublicMemberAccessResolver{err: repository.ErrNotFound, events: &events}
	loader := &recordingContributionsLoader{events: &events}
	handler := NewContributionsPublicHandler(resolver, loader)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/members/private-member/contributions", nil)
	c.Params = gin.Params{{Key: "slug", Value: "private-member"}}

	handler.GetMemberContributions(c)

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Equal(t, []string{"resolve"}, events)
	require.Zero(t, loader.memberCalls)
	require.Equal(t, publicMemberUnavailableResponse().Body.Bytes(), recorder.Body.Bytes())
}

func TestMemberContributionsOwnerPreviewLoadsByResolvedID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	events := []string{}
	resolver := &recordingPublicMemberAccessResolver{
		access: repository.PublicMemberAccess{MemberID: 17, Slug: "private-member", IsOwner: true, IsPrivatePreview: true},
		events: &events,
	}
	loader := &recordingContributionsLoader{events: &events}
	handler := NewContributionsPublicHandler(resolver, loader)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/members/private-member/contributions", nil)
	c.Params = gin.Params{{Key: "slug", Value: "private-member"}}

	handler.GetMemberContributions(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, []string{"resolve", "contributions"}, events)
	require.Equal(t, int64(17), loader.memberID)
	require.Equal(t, "private, no-store", recorder.Header().Get("Cache-Control"))
}

func TestProjectMemberNoDetailLoadBeforeAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, route := range projectMemberTestRoutes() {
		t.Run(route.name, func(t *testing.T) {
			events := []string{}
			resolver := &recordingPublicMemberAccessResolver{err: repository.ErrNotFound, events: &events}
			loader := &recordingProjectMemberLoader{events: &events}
			handler := NewProjectMemberPublicHandler(resolver, loader, "/media")
			recorder, c := projectMemberRequestContext()

			route.call(handler, c)

			require.Equal(t, http.StatusNotFound, recorder.Code)
			require.Equal(t, []string{"resolve"}, events)
			require.Zero(t, loader.relationCalls)
			require.Zero(t, loader.detailCalls())
			require.Equal(t, publicMemberUnavailableResponse().Body.Bytes(), recorder.Body.Bytes())
		})
	}
}

func TestProjectMemberOwnerPreviewResolvesRelationBeforeDetail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, route := range projectMemberTestRoutes() {
		t.Run(route.name, func(t *testing.T) {
			events := []string{}
			resolver := &recordingPublicMemberAccessResolver{
				access: repository.PublicMemberAccess{MemberID: 17, Slug: "private-member", IsOwner: true, IsPrivatePreview: true},
				events: &events,
			}
			loader := &recordingProjectMemberLoader{events: &events, relation: true}
			handler := NewProjectMemberPublicHandler(resolver, loader, "/media")
			recorder, c := projectMemberRequestContext()

			route.call(handler, c)

			require.Equal(t, http.StatusOK, recorder.Code)
			require.Equal(t, []string{"resolve", "relation", route.name}, events)
			require.Equal(t, 1, loader.relationCalls)
			require.Equal(t, 1, loader.detailCalls())
			require.Equal(t, "private, no-store", recorder.Header().Get("Cache-Control"))
		})
	}
}

func TestProjectMemberMissingRelationUsesNeutralUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	events := []string{}
	resolver := &recordingPublicMemberAccessResolver{
		access: repository.PublicMemberAccess{MemberID: 17, Slug: "public-member"},
		events: &events,
	}
	loader := &recordingProjectMemberLoader{events: &events}
	handler := NewProjectMemberPublicHandler(resolver, loader, "/media")
	recorder, c := projectMemberRequestContext()

	handler.GetSummary(c)

	require.Equal(t, http.StatusNotFound, recorder.Code)
	require.Equal(t, []string{"resolve", "relation"}, events)
	require.Zero(t, loader.detailCalls())
	require.Equal(t, publicMemberUnavailableResponse().Body.Bytes(), recorder.Body.Bytes())
}

type projectMemberTestRoute struct {
	name string
	call func(*ProjectMemberPublicHandler, *gin.Context)
}

func projectMemberTestRoutes() []projectMemberTestRoute {
	return []projectMemberTestRoute{
		{name: "summary", call: func(h *ProjectMemberPublicHandler, c *gin.Context) { h.GetSummary(c) }},
		{name: "notes", call: func(h *ProjectMemberPublicHandler, c *gin.Context) { h.GetNotes(c) }},
		{name: "media", call: func(h *ProjectMemberPublicHandler, c *gin.Context) { h.GetMedia(c) }},
		{name: "releases", call: func(h *ProjectMemberPublicHandler, c *gin.Context) { h.GetReleases(c) }},
	}
}

func projectMemberRequestContext() (*httptest.ResponseRecorder, *gin.Context) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/anime/7/group/11/members/private-member", nil)
	c.Params = gin.Params{{Key: "id", Value: "7"}, {Key: "groupId", Value: "11"}, {Key: "memberSlug", Value: "private-member"}}
	return recorder, c
}

func TestProjectMemberHandler_CursorEnvelopeAndLimit(t *testing.T) {
	src := pmHandlerSource(t)
	for _, frag := range []string{
		`json:"next_cursor"`,
		`json:"has_more"`,
		"parsecursorlimitquery(c)",
		"c.query(\"cursor\")",
	} {
		if !strings.Contains(src, frag) {
			t.Fatalf("Cursor-Envelope-Fragment fehlt: %q", frag)
		}
	}
}

func TestProjectMemberHandler_MediaURLBuilding(t *testing.T) {
	src := pmHandlerSource(t)
	for _, frag := range []string{
		"func (h *projectmemberpublichandler) buildmediaurl(",
		`json:"thumbnail_url"`,
		`json:"preview_url"`,
		"\"/media/\" + rel",
	} {
		if !strings.Contains(src, frag) {
			t.Fatalf("Media-URL-Fragment fehlt: %q", frag)
		}
	}
}

func TestProjectMemberHandler_RoutesRegistered(t *testing.T) {
	src := pmMainSource(t)
	for _, frag := range []string{
		"/anime/:id/group/:groupid/members/:memberslug\", projectmemberpublichandler.getsummary",
		"/members/:memberslug/notes\", projectmemberpublichandler.getnotes",
		"/members/:memberslug/media\", projectmemberpublichandler.getmedia",
		"/members/:memberslug/releases\", projectmemberpublichandler.getreleases",
	} {
		if !strings.Contains(src, frag) {
			t.Fatalf("Route nicht registriert: %q", frag)
		}
	}
}
