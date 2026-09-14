package handlers

import (
	"encoding/base64"
	"net/http/httptest"
	"net/url"
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
	} { queries = append(queries, query) }
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
