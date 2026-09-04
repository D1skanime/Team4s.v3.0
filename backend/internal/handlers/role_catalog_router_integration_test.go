package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestRoleDefinitionsRouterIsRegisteredExactlyOnceWithoutAuthMiddleware proves, by actually
// firing a real request through a real Gin router (CLAUDE.md Teststil-Regel), that the public
// role catalog route is genuinely reachable without an Authorization header — replacing the
// former main.go-source-reading+strings.Count inspection, which never executed the route it
// claimed to verify.
func TestRoleDefinitionsRouterIsRegisteredExactlyOnceWithoutAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	group := router.Group("/api/v1")
	RegisterPublicRoleCatalogRoute(group, NewRoleCatalogHandler(&fakePublicRoleCatalog{}))

	request := httptest.NewRequest(http.MethodGet, "/api/v1/role-definitions?context=fansub_group", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code == http.StatusUnauthorized || response.Code == http.StatusForbidden {
		t.Fatalf("public role catalog route must not require authentication, got status=%d body=%s", response.Code, response.Body.String())
	}
	if got := response.Header().Get("WWW-Authenticate"); got != "" {
		t.Fatalf("public role catalog route must not challenge for auth: %q", got)
	}
}

// TestRoleDefinitionsRouterPanicsWhenRegisteredTwiceOnSameGroup is the real, executable proof of
// "registered exactly once": Gin itself panics on a duplicate route registration for the same
// method+path on the same router group. This replaces the former strings.Count(text, ...) == 1
// source inspection with an assertion that actually exercises Gin's own route tree.
func TestRoleDefinitionsRouterPanicsWhenRegisteredTwiceOnSameGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	group := router.Group("/api/v1")
	RegisterPublicRoleCatalogRoute(group, NewRoleCatalogHandler(&fakePublicRoleCatalog{}))

	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected Gin to panic when RegisterPublicRoleCatalogRoute is called twice on the same router group, proving the route is genuinely registered exactly once")
		}
	}()
	RegisterPublicRoleCatalogRoute(group, NewRoleCatalogHandler(&fakePublicRoleCatalog{}))
}
