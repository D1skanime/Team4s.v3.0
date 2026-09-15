package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http/httptest"
	"net/url"
	"team4s.v3/backend/internal/repository"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestEpisodeVersionPublicInvalidOptions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	queries := []string{"projection=unknown", "projection=public&limit=1&limit=2", "projection=public&cursor=&cursor=invalid", "projection=public&limit=0", "projection=public&limit=-1", "projection=public&limit=101", "projection=public&limit=1abc", "projection=public&limit=1.5", "projection=public&limit=", "projection=public&limit=999999999999999999999999", "limit=24", "cursor=anything", "projection=public&includeVersions=false", "projection=public&includeFansubs=false", "projection=public&includeFansubs=TRUE", "projection=public&cursor=invalid"}
	for _, query := range []string{
		"projection=public&cursor=%ZZ", "projection=public&limit=%ZZ", "projection=%ZZ",
		"projection=public&%63ursor=%ZZ", "projection=public&%6cimit=%ZZ", "%70rojection=%ZZ",
		"projection=public&projection=%ZZ", "projection=public&limit=24&limit=%ZZ",
		"projection=public&cursor=&cursor=%ZZ", "projection=public&cursor=x;y",
		"projection=public&includeVersions=%ZZ", "projection=public&includeFansubs=%ZZ",
		"limit=%ZZ", "cursor=%ZZ", "projection=public&%69ncludeFansubs=%ZZ",
	} {
		queries = append(queries, query)
	}
	for _, raw := range []string{`{"v":2,"a":1,"n":1,"e":11,"i":100}`, `{"v":1,"a":2,"n":1,"e":11,"i":100}`, `{"v":1,"a":1,"n":0,"e":11,"i":100}`, `{"v":1,"a":1,"n":1,"e":0,"i":100}`, `{"v":1,"a":1,"n":1,"e":11,"i":-1}`, `{"v":1,"a":1,"n":1,"e":11}`, `{"v":1,"a":1,"n":1,"e":11,"i":100,"x":0}`, `{"v":1,"a":1,"n":1,"e":11,"i":100} {}`, "[1,1,1,11,0]", "[2,1,1,11,100]", "[1,2,1,11,100]", "[1,1,-1,11,100]", "[1,1,1,0,100]", "[1,1,1,11,-1]", "[1,1,1,11,100,99]"} {
		queries = append(queries, "projection=public&cursor="+url.QueryEscape(base64.RawURLEncoding.EncodeToString([]byte(raw))))
	}
	for _, query := range queries {
		t.Run(query, func(t *testing.T) {
			// No repository: malformed options must stop before any DB request.
			h := &FansubHandler{}
			router := gin.New()
			router.Use(gin.Recovery())
			router.GET("/anime/:id/episodes", h.ListGroupedEpisodes)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest("GET", "/anime/1/episodes?"+query, nil))
			require.Equal(t, 400, w.Code, w.Body.String())
		})
	}
}

func TestEpisodeVersionPublicHidesPrivateSourceSelector(t *testing.T) {
	pool := openVersionHydrationFixture(t)
	repo := repository.NewEpisodeVersionRepository(pool)
	before := hydrationState(t, pool)
	bound, err := repo.GetByID(context.Background(), 3301)
	require.NoError(t, err)
	require.Equal(t, hydrationText("source-a"), bound.MediaSourceID)
	require.NotNil(t, bound.JellyfinSource)

	router := gin.New()
	h := NewFansubHandler(repository.NewFansubRepository(pool), repo, nil, "admin", FansubProxyConfig{})
	router.GET("/episode-versions/:versionId", h.GetEpisodeVersionByID)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest("GET", "/episode-versions/3301", nil))
	require.Equal(t, 200, response.Code, response.Body.String())
	var body struct {
		Data map[string]json.RawMessage `json:"data"`
	}
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
	require.NotContains(t, body.Data, "media_source_id", "public reads must not expose the editor's private source selector")
	require.NotContains(t, response.Body.String(), "source-a")
	require.NotContains(t, response.Body.String(), "source_path")
	require.Contains(t, body.Data, "id")
	require.Contains(t, body.Data, "release_version_id")

	// Public serialization must not erase the binding required by authorized editors.
	stored, err := repo.GetByID(context.Background(), 3301)
	require.NoError(t, err)
	require.Equal(t, bound.MediaSourceID, stored.MediaSourceID)
	require.Equal(t, bound.JellyfinSource, stored.JellyfinSource)
	require.Equal(t, before, hydrationState(t, pool))
}
