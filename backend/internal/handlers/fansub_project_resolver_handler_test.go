package handlers

// Behavioral httptest+fake-repo tests for ResolveFansubProject (Plan 155-01),
// mirroring TestProjectMemberNoDetailLoadBeforeAccess's httptest.NewRecorder()
// + gin.CreateTestContext() + hand-rolled fake shape. CLAUDE.md's Teststil
// section forbids reading a handler's own source file and substring-matching
// it, a pattern some sibling tests in this package still use (e.g.
// TestProjectMemberHandler_MethodsExist) -- every assertion here calls the
// real FansubHandler.ResolveFansubProject method and inspects
// recorder.Code/recorder.Body.

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// fakeProjectResolverRepo implements fansubProjectResolverRepo without a
// database, recording calls so tests can assert on invocation shape as well
// as the response.
type fakeProjectResolverRepo struct {
	resolveErr      error
	resolved        *repository.ResolvedFansubProject
	navigationItems []repository.ProjectNavigationItem
	navigationErr   error
	resolveCalls    int
	navigationCalls int
}

func (f *fakeProjectResolverRepo) ResolveProject(_ context.Context, _ string, _ string) (*repository.ResolvedFansubProject, error) {
	f.resolveCalls++
	if f.resolveErr != nil {
		return nil, f.resolveErr
	}
	return f.resolved, nil
}

func (f *fakeProjectResolverRepo) ListProjectNavigationProjects(_ context.Context, _ int64) ([]repository.ProjectNavigationItem, error) {
	f.navigationCalls++
	if f.navigationErr != nil {
		return nil, f.navigationErr
	}
	return f.navigationItems, nil
}

func resolveFansubProjectTestContext(groupSlug, animeSlug string) (*httptest.ResponseRecorder, *gin.Context) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/fansub-slugs/"+groupSlug+"/projects/"+animeSlug+"/resolve", nil)
	c.Params = gin.Params{{Key: "slug", Value: groupSlug}, {Key: "animeSlug", Value: animeSlug}}
	return recorder, c
}

func TestResolveFansubProject_NotFoundIsByteIdenticalForBothBranches(t *testing.T) {
	gin.SetMode(gin.TestMode)

	unknownGroupHandler := &FansubHandler{projectResolverRepo: &fakeProjectResolverRepo{resolveErr: repository.ErrNotFound}}
	unknownGroupRecorder, unknownGroupCtx := resolveFansubProjectTestContext("unknown-group", "known-anime")
	unknownGroupHandler.ResolveFansubProject(unknownGroupCtx)

	unknownAnimeHandler := &FansubHandler{projectResolverRepo: &fakeProjectResolverRepo{resolveErr: repository.ErrNotFound}}
	unknownAnimeRecorder, unknownAnimeCtx := resolveFansubProjectTestContext("known-group", "unknown-anime")
	unknownAnimeHandler.ResolveFansubProject(unknownAnimeCtx)

	require.Equal(t, http.StatusNotFound, unknownGroupRecorder.Code)
	require.Equal(t, http.StatusNotFound, unknownAnimeRecorder.Code)
	require.Equal(t, unknownGroupRecorder.Body.Bytes(), unknownAnimeRecorder.Body.Bytes(),
		"unknown groupSlug and unknown animeSlug-in-known-group must return byte-identical 404 bodies (T-155-01)")
}

func TestResolveFansubProject_BadRequestForInvalidSlug(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tooLong := make([]byte, 121)
	for i := range tooLong {
		tooLong[i] = 'a'
	}

	fake := &fakeProjectResolverRepo{}
	handler := &FansubHandler{projectResolverRepo: fake}

	recorder, c := resolveFansubProjectTestContext(string(tooLong), "anime-slug")
	handler.ResolveFansubProject(c)
	require.Equal(t, http.StatusBadRequest, recorder.Code)

	recorder, c = resolveFansubProjectTestContext("", "anime-slug")
	handler.ResolveFansubProject(c)
	require.Equal(t, http.StatusBadRequest, recorder.Code)

	require.Zerof(t, fake.resolveCalls, "an invalid slug must never reach the repository")
}

func TestResolveFansubProject_SuccessReturnsIdentityAndProjects(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fake := &fakeProjectResolverRepo{
		resolved: &repository.ResolvedFansubProject{GroupID: 42, AnimeID: 7, AnimeSlug: "known-anime"},
		navigationItems: []repository.ProjectNavigationItem{
			{ID: 7, Title: "Known Anime", AnimeSlug: "known-anime"},
		},
	}
	handler := &FansubHandler{projectResolverRepo: fake}
	recorder, c := resolveFansubProjectTestContext("known-group", "known-anime")

	handler.ResolveFansubProject(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Equal(t, 1, fake.resolveCalls)
	require.Equal(t, 1, fake.navigationCalls)
	body := recorder.Body.String()
	require.Contains(t, body, `"group_id":42`)
	require.Contains(t, body, `"anime_id":7`)
	require.Contains(t, body, `"anime_slug":"known-anime"`)
	require.Contains(t, body, `"projects":[`)
}

// TestResolveFansubProject_NavigationErrorFallsBackToEmptyProjects proves the
// navigation-siblings query is treated as non-fatal: the core identity
// response still succeeds with an empty projects array.
func TestResolveFansubProject_NavigationErrorFallsBackToEmptyProjects(t *testing.T) {
	gin.SetMode(gin.TestMode)

	fake := &fakeProjectResolverRepo{
		resolved:      &repository.ResolvedFansubProject{GroupID: 42, AnimeID: 7, AnimeSlug: "known-anime"},
		navigationErr: repository.ErrConflict,
	}
	handler := &FansubHandler{projectResolverRepo: fake}
	recorder, c := resolveFansubProjectTestContext("known-group", "known-anime")

	handler.ResolveFansubProject(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"projects":[]`)
}

func TestResolveFansubProject_ArtworkPresentation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, artwork := range []string{
		`{"banner_url":"/media/anime/7/banner.webp","cover_image":"/covers/7.jpg"}`,
		`{"banner_url":null,"cover_image":null}`,
	} {
		t.Run(artwork, func(t *testing.T) {
			resolved := &repository.ResolvedFansubProject{GroupID: 42, AnimeID: 7, AnimeSlug: "known-anime"}
			require.NoError(t, json.Unmarshal([]byte(artwork), resolved))
			fake := &fakeProjectResolverRepo{resolved: resolved, navigationItems: []repository.ProjectNavigationItem{}}
			handler := &FansubHandler{projectResolverRepo: fake}
			recorder, c := resolveFansubProjectTestContext("known-group", "known-anime")
			handler.ResolveFansubProject(c)
			require.Equal(t, http.StatusOK, recorder.Code)
			var response struct {
				Data map[string]any `json:"data"`
			}
			var expected map[string]any
			require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
			require.NoError(t, json.Unmarshal([]byte(artwork), &expected))
			for key, value := range expected {
				require.Contains(t, response.Data, key)
				require.Equal(t, value, response.Data[key])
			}
			require.Equal(t, 1, fake.resolveCalls)
			require.Equal(t, 1, fake.navigationCalls)
		})
	}
}
