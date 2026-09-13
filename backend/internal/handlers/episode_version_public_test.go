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
	queries := []string{"projection=unknown", "projection=public&limit=0", "projection=public&limit=-1", "projection=public&limit=101", "projection=public&limit=1abc", "projection=public&limit=1.5", "projection=public&limit=", "projection=public&limit=999999999999999999999999", "limit=24", "cursor=anything", "projection=public&includeVersions=false", "projection=public&includeFansubs=false", "projection=public&includeFansubs=TRUE", "projection=public&cursor=invalid"}
	for _, raw := range []string{"[1,1,1,11,0]", "[2,1,1,11,100]", "[1,2,1,11,100]", "[1,1,-1,11,100]", "[1,1,1,0,100]", "[1,1,1,11,-1]", "[1,1,1,11,100,99]"} {
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
