package repository

import (
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

func TestResolvedStatusForNewAppUserDefaultsToActive(t *testing.T) {
	if got := resolvedStatusForNewAppUser(); got != models.AppUserStatusActive {
		t.Fatalf("expected new app user status %q, got %q", models.AppUserStatusActive, got)
	}
}

func TestResolvedStatusForExistingAppUserPromotesPendingToActive(t *testing.T) {
	if got := resolvedStatusForExistingAppUser(models.AppUserStatusPending); got != models.AppUserStatusActive {
		t.Fatalf("expected pending user to promote to %q, got %q", models.AppUserStatusActive, got)
	}
}

func TestResolvedStatusForExistingAppUserKeepsDisabledUsersDisabled(t *testing.T) {
	if got := resolvedStatusForExistingAppUser(models.AppUserStatusDisabled); got != models.AppUserStatusDisabled {
		t.Fatalf("expected disabled user to remain %q, got %q", models.AppUserStatusDisabled, got)
	}
}

// TestEnsureAppUserForIdentityStaysAppUserOnly locks EnsureAppUserForIdentity to an
// app_user(+legacy users bridge)-only side effect (D-10/D-15): registration/login must
// never implicitly create an app role, Member, membership, contribution, or project row.
// Source-invariant because this package has no live test database (see test_helpers.go).
func TestEnsureAppUserForIdentityStaysAppUserOnly(t *testing.T) {
	repoSrc, err := os.ReadFile("app_auth_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	start := strings.Index(content, "func (r *AppAuthRepository) EnsureAppUserForIdentity(")
	require.GreaterOrEqual(t, start, 0, "EnsureAppUserForIdentity must exist")
	rest := content[start:]
	end := strings.Index(rest[1:], "\nfunc (r *AppAuthRepository) MarkLoggedOutBySubject(")
	require.Greater(t, end, 0, "EnsureAppUserForIdentity must be immediately followed by MarkLoggedOutBySubject")
	body := rest[:end+1]

	assert.True(t, strings.Contains(body, "INSERT INTO app_users ("),
		"EnsureAppUserForIdentity must create the app_users row")
	assert.True(t, strings.Contains(body, "UPDATE app_users"),
		"EnsureAppUserForIdentity must update the existing app_users row on repeat logins")
	assert.True(t, strings.Contains(body, "createLegacyUserBridge(ctx, tx, identity)"),
		"EnsureAppUserForIdentity may only additionally create the compatibility legacy users bridge row")

	assert.False(t, strings.Contains(body, "INSERT INTO app_user_global_roles"),
		"EnsureAppUserForIdentity must never assign an app global role as a side effect")
	assert.False(t, strings.Contains(body, "INSERT INTO members"),
		"EnsureAppUserForIdentity must never create a Member row")
	assert.False(t, strings.Contains(body, "INSERT INTO member_claims"),
		"EnsureAppUserForIdentity must never create a member claim")
	assert.False(t, strings.Contains(body, "fansub_group_members"),
		"EnsureAppUserForIdentity must never create or touch a group membership row")
	assert.False(t, strings.Contains(body, "anime_contributions"),
		"EnsureAppUserForIdentity must never create an anime/project contribution row")
	assert.False(t, strings.Contains(body, "release_member_roles"),
		"EnsureAppUserForIdentity must never create a release/project role row")
}
