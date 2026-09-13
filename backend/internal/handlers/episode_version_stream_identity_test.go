package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

type streamIdentityEntitlement struct {
	calls   []int64
	allowed bool
}

func (s *streamIdentityEntitlement) ResolveReleasePlaybackEntitlement(_ context.Context, actor permissions.Actor, id int64) (permissions.ReleasePlaybackEntitlementDecision, error) {
	s.calls = append(s.calls, id)
	return permissions.ReleasePlaybackEntitlementDecision{Allowed: s.allowed && actor.AppUserID == 7 && id == 10}, nil
}

type streamIdentityTransport func(*http.Request) (*http.Response, error)

func (fn streamIdentityTransport) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func streamIdentityHandler(t *testing.T) (*FansubHandler, *streamIdentityEntitlement, *[]string) {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	_, err := pool.Exec(context.Background(), `
 INSERT INTO anime VALUES (1),(2);
 INSERT INTO episodes (id,anime_id,episode_number) VALUES (1,1,'1'),(2,2,'1');
 INSERT INTO fansub_releases (id,episode_id) VALUES (1,1),(2,2);
 INSERT INTO release_versions (id,release_id) VALUES (10,1),(20,2);
 INSERT INTO release_variants (id,release_version_id) VALUES (100,10),(101,10),(102,10),(10,20);
 INSERT INTO stream_sources (id,provider_type,external_id,url) VALUES
 (1,'external','foreign','https://fixture.invalid/foreign'),(2,'external','own','https://fixture.invalid/own'),(3,'external','second','https://fixture.invalid/second');
 INSERT INTO release_streams (id,variant_id,stream_source_id) VALUES (1,10,1),(2,100,2),(3,101,3);
 `)
	require.NoError(t, err)
	entitlement := &streamIdentityEntitlement{allowed: true}
	targets := []string{}
	h := &FansubHandler{episodeVersionRepo: repository.NewEpisodeVersionRepository(pool), releaseGrantSecret: "phase159-secret", releaseGrantTTL: time.Minute, releasePlaybackEntitlements: entitlement}
	h.httpClient = &http.Client{Transport: streamIdentityTransport(func(r *http.Request) (*http.Response, error) {
		targets = append(targets, r.URL.String())
		require.Equal(t, "bytes=0-3", r.Header.Get("Range"))
		require.Equal(t, "fixture-agent", r.Header.Get("User-Agent"))
		return &http.Response{StatusCode: 206, Header: http.Header{"Content-Type": []string{"video/mp4"}, "Content-Range": []string{"bytes 0-3/10"}}, Body: io.NopCloser(strings.NewReader("data"))}, nil
	})}
	return h, entitlement, &targets
}
func streamIdentityRequest(h *FansubHandler, path, query string, grantEndpoint, identity bool) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	method := "GET"
	if grantEndpoint {
		method = "POST"
	}
	c.Request = httptest.NewRequest(method, "/release/"+url.PathEscape(path)+"?"+query, nil)
	c.Params = gin.Params{{Key: "id", Value: path}}
	c.Request.Header.Set("Range", "bytes=0-3")
	c.Request.Header.Set("User-Agent", "fixture-agent")
	if identity {
		c.Set("auth_identity", middleware.AuthIdentity{UserID: 7, DisplayName: "Fixture", AppUserID: 7, AppUserStatus: "active"})
	}
	if grantEndpoint {
		h.CreateReleaseStreamGrant(c)
	} else {
		h.StreamRelease(c)
	}
	return w
}

func TestReleaseStreamIdentityCanonicalGrantAndSource(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, entitlement, targets := streamIdentityHandler(t)
	minted := streamIdentityRequest(h, "10", "variant_id=100", true, true)
	require.Equal(t, 201, minted.Code, minted.Body.String())
	var response struct {
		Data struct {
			ReleaseID int64  `json:"release_id"`
			Grant     string `json:"grant_token"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(minted.Body.Bytes(), &response))
	require.EqualValues(t, 10, response.Data.ReleaseID)
	claims, err := auth.ParseAndVerifyReleaseStreamGrant(response.Data.Grant, "phase159-secret", time.Now())
	require.NoError(t, err)
	require.EqualValues(t, 10, claims.ReleaseID)
	require.EqualValues(t, 7, claims.UserID)
	grant := url.QueryEscape(response.Data.Grant)
	own := streamIdentityRequest(h, "10", "variant_id=100&grant="+grant+"&startTimeTicks=500", false, false)
	require.Equal(t, 206, own.Code, own.Body.String())
	require.Equal(t, "bytes 0-3/10", own.Header().Get("Content-Range"))
	require.Equal(t, []string{"https://fixture.invalid/own?startTimeTicks=500"}, *targets)
	second := streamIdentityRequest(h, "10", "variant_id=101&grant="+grant, false, false)
	require.Equal(t, 206, second.Code)
	require.Equal(t, "https://fixture.invalid/second", (*targets)[1])
	for _, endpoint := range []bool{true, false} {
		for _, selector := range []string{"10", "102", "999"} {
			result := streamIdentityRequest(h, "10", "variant_id="+selector+"&grant="+grant, endpoint, true)
			require.Equal(t, 404, result.Code, "foreign or missing source selector must not fall back: %s", result.Body.String())
		}
	}
	require.Len(t, *targets, 2, "rejected selectors never access an upstream")
	for _, id := range entitlement.calls {
		require.EqualValues(t, 10, id, "canonical version is the entitlement owner")
	}
	wrongClaim := streamIdentityRequest(h, "20", "variant_id=10&grant="+grant, false, false)
	require.Equal(t, 401, wrongClaim.Code)
	denied := streamIdentityRequest(h, "20", "variant_id=10", true, true)
	require.Equal(t, 403, denied.Code)
	entitlement.allowed = false
	denied = streamIdentityRequest(h, "10", "variant_id=100&grant="+grant, false, false)
	require.Equal(t, 403, denied.Code)
	require.Len(t, *targets, 2)
}

func TestReleaseStreamIdentityStrictSelectorsAndUnauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &FansubHandler{}
	for _, grantEndpoint := range []bool{true, false} {
		for _, selector := range []string{"", "0", "-1", "1.5", "1abc", "+1", " 1", "999999999999999999999999"} {
			got := streamIdentityRequest(h, "10", "variant_id="+url.QueryEscape(selector), grantEndpoint, true)
			require.Equal(t, 400, got.Code, "selector %q grant=%t: %s", selector, grantEndpoint, got.Body.String())
		}
		for _, rawQuery := range []string{"variant_id=%ZZ", "variant_id=100;variant_id=10", "%76ariant_id=%ZZ"} {
			got := streamIdentityRequest(h, "10", rawQuery, grantEndpoint, true)
			require.Equal(t, 400, got.Code, "malformed selector cannot disappear into legacy lookup: %s", rawQuery)
		}
		got := streamIdentityRequest(h, "10", "variant_id=100&variant_id=10", grantEndpoint, true)
		require.Equal(t, 400, got.Code)
		for _, path := range []string{"10abc", "+10", " 10", "1.5", "9223372036854775808"} {
			got = streamIdentityRequest(h, path, "variant_id=100", grantEndpoint, true)
			require.Equal(t, 400, got.Code, "path %q", path)
		}
		got = streamIdentityRequest(h, "10", "variant_id=100", grantEndpoint, false)
		require.Equal(t, 401, got.Code)
	}
}

func TestReleaseStreamIdentityLegacyWithoutSelector(t *testing.T) {
	h, _, targets := streamIdentityHandler(t)
	token, _, err := auth.CreateReleaseStreamGrant(10, 7, "phase159-secret", time.Now(), time.Minute)
	require.NoError(t, err)
	result := streamIdentityRequest(h, "10", "grant="+url.QueryEscape(token), false, false)
	require.Equal(t, 206, result.Code)
	require.Equal(t, []string{"https://fixture.invalid/foreign"}, *targets, "no selector keeps the historical OR ordering")
	result = streamIdentityRequest(h, "+10", "", true, true)
	require.Equal(t, 201, result.Code, "legacy path parser remains unchanged without selector")
}
