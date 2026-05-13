package handlers

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdminContentReleaseVersionNotes_ContributorGuardSourceInvariants(t *testing.T) {
	handlerSrc, err := os.ReadFile("admin_content_release_version_notes.go")
	require.NoError(t, err)
	content := string(handlerSrc)

	assert.True(t, strings.Contains(content, "ErrInvalidReleaseVersionContributorContext"),
		"handler must map invalid release-version contributor context explicitly")
	assert.True(t, strings.Contains(content, "Mitglied und Rolle sind für diese Release-Version nicht gültig"),
		"handler must return a clear German 4xx message for invalid member/role pairs")
	assert.True(t, strings.Contains(content, "http.StatusBadRequest"),
		"invalid release-version contributor context must not fall through as a 500")
	assert.True(t, strings.Contains(content, "Für dieses Mitglied und diese Rolle existiert bereits eine Notiz"),
		"duplicate-note conflicts must remain distinguishable from invalid contributor context")
}
