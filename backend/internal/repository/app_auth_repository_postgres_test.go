package repository

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// Phase 188 (Plan 02, D-07): shouldResubjectByEmail is the pure gate deciding
// whether EnsureAppUserForIdentity may reuse an existing app_users row found
// by e-mail when no keycloak_subject match exists. Re-Subjecting per
// e-mail-match may NEVER happen for an unverified e-mail -- a naive fallback
// without this gate would let an attacker who merely registers a Keycloak
// account with someone else's (unverified) e-mail address take over the
// victim's existing app_users row.
func TestShouldResubjectByEmail(t *testing.T) {
	cases := []struct {
		name            string
		emailVerified   bool
		emailMatchFound bool
		want            bool
	}{
		{"verified and match found resubjects", true, true, true},
		{"verified but no match does not resubject", true, false, false},
		{"unverified with match does not resubject (D-07 account takeover gate)", false, true, false},
		{"unverified and no match does not resubject", false, false, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := shouldResubjectByEmail(tc.emailVerified, tc.emailMatchFound)
			require.Equal(t, tc.want, got)
		})
	}
}

// TestEnsureAppUserForIdentityResubjectsOnVerifiedEmailMatch proves the D-07
// POSITIVE case: a Keycloak delete+recreate (new subject, same e-mail) with a
// Keycloak-verified e-mail claim reuses the existing app_users row instead of
// creating an orphaned duplicate.
func TestEnsureAppUserForIdentityResubjectsOnVerifiedEmailMatch(t *testing.T) {
	pool := testsupport.OpenPhase188Postgres(t)
	repo := NewAppAuthRepository(pool)
	ctx := context.Background()

	first, err := repo.EnsureAppUserForIdentity(ctx, models.KeycloakIdentity{
		Subject:       "kc-sub-old",
		Email:         "resubject@example.test",
		EmailVerified: true,
		DisplayName:   "Resubject Test",
	})
	require.NoError(t, err)
	require.NotZero(t, first.ID)
	require.Equal(t, "kc-sub-old", first.KeycloakSubject)

	second, err := repo.EnsureAppUserForIdentity(ctx, models.KeycloakIdentity{
		Subject:       "kc-sub-new",
		Email:         "resubject@example.test",
		EmailVerified: true,
		DisplayName:   "Resubject Test",
	})
	require.NoError(t, err)

	require.Equal(t, first.ID, second.ID, "verified e-mail match must reuse the existing app_users row")
	require.Equal(t, "kc-sub-new", second.KeycloakSubject, "re-subjecting must move keycloak_subject onto the new token's subject")
	require.Equal(t, first.LegacyUserID, second.LegacyUserID, "re-subjecting must not touch the existing legacy_user_id bridge")

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM app_users`).Scan(&rowCount))
	require.Equal(t, 1, rowCount, "verified re-subjecting must never leave an orphaned duplicate row")
}

// TestEnsureAppUserForIdentityDoesNotResubjectUnverifiedEmail proves the D-07
// NEGATIVE case: today's behavior (a new app_users row per unmatched subject)
// is preserved when the e-mail claim is NOT verified -- an attacker-controlled
// Keycloak account with an unverified copy of someone else's e-mail can never
// take over the existing row.
func TestEnsureAppUserForIdentityDoesNotResubjectUnverifiedEmail(t *testing.T) {
	pool := testsupport.OpenPhase188Postgres(t)
	repo := NewAppAuthRepository(pool)
	ctx := context.Background()

	first, err := repo.EnsureAppUserForIdentity(ctx, models.KeycloakIdentity{
		Subject:       "kc-sub-old-2",
		Email:         "unverified-resubject@example.test",
		EmailVerified: true,
		DisplayName:   "Unverified Resubject Test",
	})
	require.NoError(t, err)

	second, err := repo.EnsureAppUserForIdentity(ctx, models.KeycloakIdentity{
		Subject:       "kc-sub-new-2",
		Email:         "unverified-resubject@example.test",
		EmailVerified: false,
		DisplayName:   "Unverified Resubject Test",
	})
	require.NoError(t, err)

	require.NotEqual(t, first.ID, second.ID, "unverified e-mail match must never reuse the existing app_users row")
	require.Equal(t, "kc-sub-new-2", second.KeycloakSubject)

	var rowCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM app_users`).Scan(&rowCount))
	require.Equal(t, 2, rowCount, "unverified e-mail must fall back to today's new-row-per-subject behavior")
}
