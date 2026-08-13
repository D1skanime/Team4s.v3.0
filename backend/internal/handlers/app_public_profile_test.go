package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
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
}

func (r *recordingPublicMemberAccessResolver) ResolvePublicMemberAccess(
	_ context.Context,
	slug string,
	viewerAppUserID int64,
) (repository.PublicMemberAccess, error) {
	r.calls++
	r.slug = slug
	r.viewerAppUserID = viewerAppUserID
	return r.access, r.err
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

func publicMemberUnavailableResponse() *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	writePublicMemberUnavailable(c)
	return recorder
}
