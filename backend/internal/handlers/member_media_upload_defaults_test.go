package handlers

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMemberMediaHandler_LockI_OwnerFromSession proves member_media_upload.go's
// claims by real execution instead of source-substring assertions (D-12,
// CLAUDE.md Teststil-Regel).
//
// applyBrandingDefaults and applyProzessmedienDefaults are pure, deterministic
// functions with no exported call site anywhere in this codebase (grepped
// repo-wide during Plan 146-11 — only member_media_upload.go itself
// references them); calling them directly IS the real-execution proof, since
// neither function touches gin.Context, HTTP, or Postgres. This test
// intentionally lives in package handlers (not
// internal/repository/release_version_media_repository_test.go, where the
// original source-substring version of this claim lived) because both
// functions are unexported — package repository/repository_test cannot call
// them. See 146-11-SUMMARY.md's Deviations section for the full rationale
// (this is the one function of Plan 146-11's 14 that could not be resolved
// via the repository_test external-package workaround used for the other
// three, since it needs unexported-symbol access rather than just avoiding
// an import cycle).
func TestMemberMediaHandler_LockI_OwnerFromSession(t *testing.T) {
	// Presence claims (D-09): real function calls, not source reads.
	visibility, review := applyBrandingDefaults("", "")
	assert.Equal(t, "public", visibility, "member_media_upload.go muss 'public' als Branding-Default für Avatar/Hintergrund setzen (D-09)")
	assert.Equal(t, "approved", review, "member_media_upload.go muss 'approved' als Branding-Default für Avatar/Hintergrund setzen (D-09)")

	// Explicit non-empty input must pass through unchanged — defaults apply only when empty.
	visibility, review = applyBrandingDefaults("private", "rejected")
	assert.Equal(t, "private", visibility)
	assert.Equal(t, "rejected", review)

	// Prozessmedien defaults (D-03), same real-execution proof.
	visibility, review = applyProzessmedienDefaults("", "")
	assert.Equal(t, "private", visibility)
	assert.Equal(t, "in_review", review)

	// Absence check retained per CLAUDE.md Teststil exception 1 ("ein
	// Bezeichner darf NIRGENDS in der Datei vorkommen") — proving
	// owner_member_id is NEVER read from PostForm is inherently a
	// source-presence question, not a behavior claim standing in for
	// execution.
	src, err := os.ReadFile("member_media_upload.go")
	require.NoError(t, err)
	assert.False(t, strings.Contains(string(src), `PostForm("owner_member_id")`),
		"member_media_upload.go darf owner_member_id NICHT aus dem Request lesen (Lock I)")
}
