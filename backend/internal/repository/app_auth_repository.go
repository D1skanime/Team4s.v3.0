package repository

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AppAuthRepository struct {
	db *pgxpool.Pool
}

func NewAppAuthRepository(db *pgxpool.Pool) *AppAuthRepository {
	return &AppAuthRepository{db: db}
}

func (r *AppAuthRepository) ResolveCurrentUser(
	ctx context.Context,
	identity models.KeycloakIdentity,
	globalRoles []string,
) (models.CurrentUser, error) {
	appUser, err := r.EnsureAppUserForIdentity(ctx, identity)
	if err != nil {
		return models.CurrentUser{}, err
	}

	roles := normalizeDistinctStrings(globalRoles)
	appUser.GlobalRoles = roles

	return models.CurrentUser{
		AppUser:         appUser,
		SessionID:       strings.TrimSpace(identity.SessionID),
		IsPlatformAdmin: containsString(roles, models.AppGlobalRolePlatformAdmin),
	}, nil
}

func (r *AppAuthRepository) EnsureAppUserForIdentity(ctx context.Context, identity models.KeycloakIdentity) (models.AppUser, error) {
	subject := strings.TrimSpace(identity.Subject)
	email := strings.TrimSpace(identity.Email)
	displayName := strings.TrimSpace(identity.DisplayName)
	if subject == "" {
		return models.AppUser{}, fmt.Errorf("ensure app user: keycloak subject is required")
	}
	if email == "" {
		return models.AppUser{}, fmt.Errorf("ensure app user: email is required")
	}
	if displayName == "" {
		displayName = fallbackDisplayName(identity)
	}
	if displayName == "" {
		return models.AppUser{}, fmt.Errorf("ensure app user: display name is required")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return models.AppUser{}, fmt.Errorf("ensure app user: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	existing, found, err := loadAppUserBySubject(ctx, tx, subject)
	if err != nil {
		return models.AppUser{}, err
	}

	now := time.Now().UTC()
	if !found {
		legacyUserID, err := createLegacyUserBridge(ctx, tx, identity)
		if err != nil {
			return models.AppUser{}, err
		}

		var appUser models.AppUser
		err = tx.QueryRow(ctx, `
			INSERT INTO app_users (
				legacy_user_id,
				keycloak_subject,
				email,
				display_name,
				preferred_username,
				given_name,
				family_name,
				status,
				last_login_at,
				created_at,
				updated_at
			)
			VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), $8, $9, $9, $9)
			RETURNING id, legacy_user_id, keycloak_subject, email, display_name, preferred_username, given_name, family_name, status, last_login_at, last_logout_at, created_at, updated_at
		`,
			legacyUserID,
			subject,
			email,
			displayName,
			strings.TrimSpace(identity.PreferredUsername),
			strings.TrimSpace(identity.GivenName),
			strings.TrimSpace(identity.FamilyName),
			resolvedStatusForNewAppUser(),
			now,
		).Scan(
			&appUser.ID,
			&appUser.LegacyUserID,
			&appUser.KeycloakSubject,
			&appUser.Email,
			&appUser.DisplayName,
			&appUser.PreferredUsername,
			&appUser.GivenName,
			&appUser.FamilyName,
			&appUser.Status,
			&appUser.LastLoginAt,
			&appUser.LastLogoutAt,
			&appUser.CreatedAt,
			&appUser.UpdatedAt,
		)
		if err != nil {
			return models.AppUser{}, fmt.Errorf("ensure app user: insert app user: %w", err)
		}

		if err := tx.Commit(ctx); err != nil {
			return models.AppUser{}, fmt.Errorf("ensure app user: commit create: %w", err)
		}
		return appUser, nil
	}

	legacyUserID := existing.LegacyUserID
	if legacyUserID == nil {
		createdLegacyUserID, err := createLegacyUserBridge(ctx, tx, identity)
		if err != nil {
			return models.AppUser{}, err
		}
		legacyUserID = &createdLegacyUserID
	}

	var updated models.AppUser
	err = tx.QueryRow(ctx, `
		UPDATE app_users
		SET legacy_user_id = $2,
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
		legacyUserID,
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
		return models.AppUser{}, fmt.Errorf("ensure app user: update app user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.AppUser{}, fmt.Errorf("ensure app user: commit update: %w", err)
	}
	return updated, nil
}

func (r *AppAuthRepository) MarkLoggedOutBySubject(ctx context.Context, subject string, at time.Time) error {
	if strings.TrimSpace(subject) == "" {
		return nil
	}
	if _, err := r.db.Exec(ctx, `
		UPDATE app_users
		SET last_logout_at = $2, updated_at = $2
		WHERE keycloak_subject = $1
	`, strings.TrimSpace(subject), at.UTC()); err != nil {
		return fmt.Errorf("mark logout by subject: %w", err)
	}
	return nil
}

func (r *AppAuthRepository) ListAppUsers(ctx context.Context) ([]models.AppUserListItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			au.id,
			au.legacy_user_id,
			au.keycloak_subject,
			au.email,
			au.display_name,
			au.preferred_username,
			au.given_name,
			au.family_name,
			au.status,
			au.last_login_at,
			au.last_logout_at,
			au.created_at,
			au.updated_at,
			COALESCE(
				ARRAY(
					SELECT agr.role
					FROM app_user_global_roles agr
					WHERE agr.app_user_id = au.id
					ORDER BY agr.role
				),
				ARRAY[]::varchar[]
			) AS roles
		FROM app_users au
		ORDER BY au.created_at DESC, au.id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list app users: %w", err)
	}
	defer rows.Close()

	users := make([]models.AppUserListItem, 0)
	for rows.Next() {
		var item models.AppUserListItem
		var roles []string
		if err := rows.Scan(
			&item.ID,
			&item.LegacyUserID,
			&item.KeycloakSubject,
			&item.Email,
			&item.DisplayName,
			&item.PreferredUsername,
			&item.GivenName,
			&item.FamilyName,
			&item.Status,
			&item.LastLoginAt,
			&item.LastLogoutAt,
			&item.CreatedAt,
			&item.UpdatedAt,
			&roles,
		); err != nil {
			return nil, fmt.Errorf("list app users: scan: %w", err)
		}
		item.GlobalRoles = normalizeDistinctStrings(roles)
		users = append(users, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list app users: iterate: %w", err)
	}

	return users, nil
}

func loadAppUserBySubject(ctx context.Context, tx pgx.Tx, subject string) (models.AppUser, bool, error) {
	var user models.AppUser
	err := tx.QueryRow(ctx, `
		SELECT id, legacy_user_id, keycloak_subject, email, display_name, preferred_username, given_name, family_name, status, last_login_at, last_logout_at, created_at, updated_at
		FROM app_users
		WHERE keycloak_subject = $1
	`, subject).Scan(
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
		return models.AppUser{}, false, fmt.Errorf("load app user by subject %q: %w", subject, err)
	}
	return user, true, nil
}

func createLegacyUserBridge(ctx context.Context, tx pgx.Tx, identity models.KeycloakIdentity) (int64, error) {
	hash := sha1.Sum([]byte(strings.TrimSpace(identity.Subject)))
	suffix := hex.EncodeToString(hash[:])[:12]
	username := fmt.Sprintf("kc_%s", suffix)
	email := fmt.Sprintf("keycloak-%s@team4s.local", suffix)

	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id
	`, username, email, "!keycloak-managed!").Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("create legacy user bridge: %w", err)
	}
	return id, nil
}

func fallbackDisplayName(identity models.KeycloakIdentity) string {
	if value := strings.TrimSpace(identity.PreferredUsername); value != "" {
		return value
	}
	fullName := strings.TrimSpace(strings.TrimSpace(identity.GivenName) + " " + strings.TrimSpace(identity.FamilyName))
	if fullName != "" {
		return fullName
	}
	return strings.TrimSpace(identity.Email)
}

func resolvedStatusForNewAppUser() string {
	return models.AppUserStatusActive
}

func resolvedStatusForExistingAppUser(current string) string {
	if strings.TrimSpace(current) == models.AppUserStatusDisabled {
		return models.AppUserStatusDisabled
	}
	return models.AppUserStatusActive
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
