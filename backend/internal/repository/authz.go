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
