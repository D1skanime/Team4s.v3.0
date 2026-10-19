package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// shouldResubjectByEmail is the D-07 security gate: Re-Subjecting an existing
// app_users row by e-mail match may ONLY happen when Keycloak reports the
// token's e-mail as verified. An unverified e-mail must NEVER take over an
// existing row -- that would let an attacker who merely registers a Keycloak
// account with someone else's (unverified) e-mail address hijack the
// victim's app_users identity (ASVS V2 Authentication).
func shouldResubjectByEmail(emailVerified bool, emailMatchFound bool) bool {
	return emailVerified && emailMatchFound
}

// resubjectAppUserByEmail moves keycloak_subject onto the new token's subject
// for an app_users row that was found by verified e-mail match (D-07). The
// row's legacy_user_id bridge is deliberately left untouched -- the existing
// account's history migrates onto the new subject rather than being
// recreated.
func resubjectAppUserByEmail(
	ctx context.Context,
	tx pgx.Tx,
	existing models.AppUser,
	subject string,
	email string,
	displayName string,
	identity models.KeycloakIdentity,
	now time.Time,
) (models.AppUser, error) {
	var updated models.AppUser
	err := tx.QueryRow(ctx, `
		UPDATE app_users
		SET keycloak_subject = $2,
		    email = $3,
		    display_name = $4,
		    preferred_username = NULLIF($5, ''),
		    given_name = NULLIF($6, ''),
		    family_name = NULLIF($7, ''),
		    status = $8,
		    last_login_at = $9,
		    updated_at = $9
		WHERE id = $1
		RETURNING id, legacy_user_id, keycloak_subject, email, display_name, preferred_username, given_name, family_name, status, last_login_at, last_logout_at, created_at, updated_at
	`,
		existing.ID,
		subject,
		email,
		displayName,
		strings.TrimSpace(identity.PreferredUsername),
		strings.TrimSpace(identity.GivenName),
		strings.TrimSpace(identity.FamilyName),
		resolvedStatusForExistingAppUser(existing.Status),
		now,
	).Scan(
		&updated.ID,
		&updated.LegacyUserID,
		&updated.KeycloakSubject,
		&updated.Email,
		&updated.DisplayName,
		&updated.PreferredUsername,
		&updated.GivenName,
		&updated.FamilyName,
		&updated.Status,
		&updated.LastLoginAt,
		&updated.LastLogoutAt,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)
	if err != nil {
		return models.AppUser{}, fmt.Errorf("ensure app user: resubject by email: %w", err)
	}
	return updated, nil
}

// loadAppUserByEmail loads the oldest app_users row matching email (deterministic
// "oldest row wins" tie-break for the rare case of historical duplicate e-mails --
// see 188-02-PLAN.md threat T-188-05). Mirrors loadAppUserBySubject's shape.
func loadAppUserByEmail(ctx context.Context, tx pgx.Tx, email string) (models.AppUser, bool, error) {
	var user models.AppUser
	err := tx.QueryRow(ctx, `
		SELECT id, legacy_user_id, keycloak_subject, email, display_name, preferred_username, given_name, family_name, status, last_login_at, last_logout_at, created_at, updated_at
		FROM app_users
		WHERE email = $1
		ORDER BY created_at ASC, id ASC
		LIMIT 1
	`, email).Scan(
		&user.ID,
		&user.LegacyUserID,
		&user.KeycloakSubject,
		&user.Email,
		&user.DisplayName,
		&user.PreferredUsername,
		&user.GivenName,
		&user.FamilyName,
		&user.Status,
		&user.LastLoginAt,
		&user.LastLogoutAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return models.AppUser{}, false, nil
		}
		return models.AppUser{}, false, fmt.Errorf("load app user by email %q: %w", email, err)
	}
	return user, true, nil
}
