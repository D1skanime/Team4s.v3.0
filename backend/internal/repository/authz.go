package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthzRepository struct {
	db *pgxpool.Pool
}

func NewAuthzRepository(db *pgxpool.Pool) *AuthzRepository {
	return &AuthzRepository{db: db}
}

func (r *AuthzRepository) UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	if userID <= 0 {
		return false, nil
	}
	if roleName == "" {
		return false, nil
	}

	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM user_roles ur
			JOIN roles ro ON ro.id = ur.role_id
			WHERE ur.user_id = $1 AND ro.name = $2
		)
	`, userID, roleName).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check role %q for user %d: %w", roleName, userID, err)
	}

	return exists, nil
}

func (r *AuthzRepository) EnsureRole(ctx context.Context, roleName string) (int64, error) {
	name := strings.TrimSpace(roleName)
	if name == "" {
		return 0, fmt.Errorf("ensure role: role name is required")
	}

	var roleID int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO roles (name)
		VALUES ($1)
		ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`, name).Scan(&roleID)
	if err != nil {
		return 0, fmt.Errorf("ensure role %q: %w", name, err)
	}

	return roleID, nil
}

func (r *AuthzRepository) AssignRole(ctx context.Context, userID int64, roleName string) error {
	if userID <= 0 {
		return fmt.Errorf("assign role: invalid user id %d", userID)
	}

	roleID, err := r.EnsureRole(ctx, roleName)
	if err != nil {
		return err
	}

	if _, err := r.db.Exec(ctx, `
		INSERT INTO user_roles (user_id, role_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, role_id) DO NOTHING
	`, userID, roleID); err != nil {
		return fmt.Errorf("assign role %q to user %d: %w", strings.TrimSpace(roleName), userID, err)
	}

	return nil
}

func (r *AuthzRepository) AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error) {
	if appUserID <= 0 {
		return false, nil
	}
	if strings.TrimSpace(roleName) == "" {
		return false, nil
	}

	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM app_user_global_roles
			WHERE app_user_id = $1 AND role = $2
		)
	`, appUserID, strings.TrimSpace(roleName)).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check app role %q for app user %d: %w", roleName, appUserID, err)
	}

	return exists, nil
}

func (r *AuthzRepository) ListAppUserGlobalRoles(ctx context.Context, appUserID int64) ([]string, error) {
	if appUserID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT role
		FROM app_user_global_roles
		WHERE app_user_id = $1
		ORDER BY role
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("list app roles for app user %d: %w", appUserID, err)
	}
	defer rows.Close()

	roles := make([]string, 0)
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("list app roles for app user %d: scan: %w", appUserID, err)
		}
		roles = append(roles, strings.TrimSpace(role))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list app roles for app user %d: iterate: %w", appUserID, err)
	}

	return roles, nil
}

func (r *AuthzRepository) AssignAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error {
	if appUserID <= 0 {
		return fmt.Errorf("assign app role: invalid app user id %d", appUserID)
	}

	role := strings.TrimSpace(roleName)
	if role == "" {
		return fmt.Errorf("assign app role: role name is required")
	}

	if _, err := r.db.Exec(ctx, `
		INSERT INTO app_user_global_roles (app_user_id, role)
		VALUES ($1, $2)
		ON CONFLICT (app_user_id, role) DO NOTHING
	`, appUserID, role); err != nil {
		return fmt.Errorf("assign app role %q to app user %d: %w", role, appUserID, err)
	}

	return nil
}

// RevokeAppUserGlobalRole entfernt eine globale Rolle von einem App-User (idempotent).
// Kein Last-Admin-Guard hier — Guard-Logik gehört in den Handler (Phase 80-03).
func (r *AuthzRepository) RevokeAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error {
	if appUserID <= 0 {
		return fmt.Errorf("revoke app role: invalid app user id %d", appUserID)
	}
	role := strings.TrimSpace(roleName)
	if role == "" {
		return fmt.Errorf("revoke app role: role name is required")
	}
	if _, err := r.db.Exec(ctx, `
		DELETE FROM app_user_global_roles
		WHERE app_user_id = $1 AND role = $2
	`, appUserID, role); err != nil {
		return fmt.Errorf("revoke app role %q from app user %d: %w", role, appUserID, err)
	}
	return nil
}

// CountActivePlatformAdmins gibt die Anzahl aktiver Plattform-Admins zurück.
// Wird vom Handler als Last-Admin-Guard vor Revoke und Status-Disable verwendet.
func (r *AuthzRepository) CountActivePlatformAdmins(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM app_user_global_roles agr
		JOIN app_users au ON au.id = agr.app_user_id
		WHERE agr.role = 'platform_admin'
		  AND au.status = 'active'
	`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count active platform admins: %w", err)
	}
	return count, nil
}
