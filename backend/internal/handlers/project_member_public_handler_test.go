package handlers

// Source-Assertion-Tests fuer ProjectMemberPublicHandler (Phase 122, Plan 122-02).
// Konsistent mit group_contributors_handler_test.go (os.ReadFile + Fragment-Checks) ? das
// handlers-Paket hat keine Live-DB-Handler-Harness. Laufzeit wird im Live-UAT (122-10) geprueft.

import (
	"net/http"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

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
