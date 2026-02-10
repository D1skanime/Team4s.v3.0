package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUsernameExists    = errors.New("username already exists")
	ErrEmailExists       = errors.New("email already exists")
	ErrUserNotActive     = errors.New("user is not active")
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user in the database
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (username, email, password_hash, display_name, is_active, email_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	err := r.db.QueryRow(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.DisplayName,
		true,  // is_active
		false, // email_verified - always false on registration
		now,
		now,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		// Check for unique constraint violations
		errStr := err.Error()
		if contains(errStr, "users_username_key") || contains(errStr, "unique constraint") && contains(errStr, "username") {
			return ErrUsernameExists
		}
		if contains(errStr, "users_email_key") || contains(errStr, "unique constraint") && contains(errStr, "email") {
			return ErrEmailExists
		}
		return fmt.Errorf("create user: %w", err)
	}

	user.IsActive = true
	user.EmailVerified = false
	return nil
}

// GetByID returns a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, display_name, avatar_url,
		       is_active, email_verified, last_login_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.IsActive,
		&user.EmailVerified,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	return &user, nil
}

// GetByUsername returns a user by username
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, display_name, avatar_url,
		       is_active, email_verified, last_login_at, created_at, updated_at
		FROM users
		WHERE LOWER(username) = LOWER($1)
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.IsActive,
		&user.EmailVerified,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by username: %w", err)
	}

	return &user, nil
}

// GetByEmail returns a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, display_name, avatar_url,
		       is_active, email_verified, last_login_at, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.IsActive,
		&user.EmailVerified,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}

	return &user, nil
}

// GetByUsernameOrEmail returns a user by username or email
func (r *UserRepository) GetByUsernameOrEmail(ctx context.Context, login string) (*models.User, error) {
	query := `
		SELECT id, username, email, password_hash, display_name, avatar_url,
		       is_active, email_verified, last_login_at, created_at, updated_at
		FROM users
		WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
	`

	var user models.User
	err := r.db.QueryRow(ctx, query, login).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.AvatarURL,
		&user.IsActive,
		&user.EmailVerified,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by username or email: %w", err)
	}

	return &user, nil
}

// UpdateLastLogin updates the last login timestamp for a user
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id int64) error {
	query := `
		UPDATE users
		SET last_login_at = $1, updated_at = $1
		WHERE id = $2
	`

	now := time.Now()
	_, err := r.db.Exec(ctx, query, now, id)
	if err != nil {
		return fmt.Errorf("update last login: %w", err)
	}

	return nil
}

// ExistsByUsername checks if a username already exists
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(username) = LOWER($1))`

	var exists bool
	err := r.db.QueryRow(ctx, query, username).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check username exists: %w", err)
	}

	return exists, nil
}

// ExistsByEmail checks if an email already exists
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER($1))`

	var exists bool
	err := r.db.QueryRow(ctx, query, email).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check email exists: %w", err)
	}

	return exists, nil
}

// Update updates user profile fields
func (r *UserRepository) Update(ctx context.Context, userID int64, displayName *string, avatarURL *string) error {
	query := `
		UPDATE users
		SET display_name = COALESCE($1, display_name),
		    avatar_url = COALESCE($2, avatar_url),
		    updated_at = $3
		WHERE id = $4
	`

	now := time.Now()
	result, err := r.db.Exec(ctx, query, displayName, avatarURL, now, userID)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

// UpdatePassword updates the user's password hash
func (r *UserRepository) UpdatePassword(ctx context.Context, userID int64, newHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`

	now := time.Now()
	result, err := r.db.Exec(ctx, query, newHash, now, userID)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

// Delete deactivates a user account (soft delete)
func (r *UserRepository) Delete(ctx context.Context, userID int64) error {
	query := `
		UPDATE users
		SET is_active = false, updated_at = $1
		WHERE id = $2
	`

	now := time.Now()
	result, err := r.db.Exec(ctx, query, now, userID)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

// UpdateEmailVerified sets the email_verified status for a user
func (r *UserRepository) UpdateEmailVerified(ctx context.Context, userID int64, verified bool) error {
	query := `
		UPDATE users
		SET email_verified = $1, updated_at = $2
		WHERE id = $3
	`

	now := time.Now()
	result, err := r.db.Exec(ctx, query, verified, now, userID)
	if err != nil {
		return fmt.Errorf("update email verified: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

// GetEmailByUserID returns only the email for a user (used for verification emails)
func (r *UserRepository) GetEmailByUserID(ctx context.Context, userID int64) (string, error) {
	query := `SELECT email FROM users WHERE id = $1`

	var email string
	err := r.db.QueryRow(ctx, query, userID).Scan(&email)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrUserNotFound
	}
	if err != nil {
		return "", fmt.Errorf("get email by user id: %w", err)
	}

	return email, nil
}

// GetStats returns user statistics (watchlist, ratings, comments counts)
func (r *UserRepository) GetStats(ctx context.Context, userID int64) (*models.UserStats, error) {
	stats := &models.UserStats{}

	// Get watchlist stats
	watchlistQuery := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'done') as anime_watched,
			COUNT(*) FILTER (WHERE status = 'watching') as anime_watching
		FROM watchlist WHERE user_id = $1
	`
	err := r.db.QueryRow(ctx, watchlistQuery, userID).Scan(
		&stats.AnimeWatched,
		&stats.AnimeWatching,
	)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get watchlist stats: %w", err)
	}

	// Get ratings count
	ratingsQuery := `SELECT COUNT(*) FROM ratings WHERE user_id = $1`
	err = r.db.QueryRow(ctx, ratingsQuery, userID).Scan(&stats.RatingsCount)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get ratings count: %w", err)
	}

	// Get comments count
	commentsQuery := `SELECT COUNT(*) FROM comments WHERE user_id = $1`
	err = r.db.QueryRow(ctx, commentsQuery, userID).Scan(&stats.CommentsCount)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get comments count: %w", err)
	}

	return stats, nil
}

// HasRole checks if a user has a specific role
func (r *UserRepository) HasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id
			WHERE ur.user_id = $1 AND r.name = $2
		)
	`

	var hasRole bool
	err := r.db.QueryRow(ctx, query, userID, roleName).Scan(&hasRole)
	if err != nil {
		return false, fmt.Errorf("check user role: %w", err)
	}

	return hasRole, nil
}

// GetUserRoles returns all role names for a user
func (r *UserRepository) GetUserRoles(ctx context.Context, userID int64) ([]string, error) {
	query := `
		SELECT r.name FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.name
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get user roles: %w", err)
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		roles = append(roles, role)
	}

	return roles, nil
}

// ========== Admin User Management Methods ==========

// ListUsersAdmin returns a paginated list of users for admin with filtering
func (r *UserRepository) ListUsersAdmin(ctx context.Context, filter models.UserAdminFilter) ([]models.UserAdminListItem, int64, error) {
	filter.SetDefaults()

	// Base query with admin role check
	baseQuery := `
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id AND r.name = 'admin'
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 0

	// Search filter
	if filter.Search != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND (LOWER(u.username) LIKE LOWER($%d) OR LOWER(u.email) LIKE LOWER($%d))", argCount, argCount)
		args = append(args, "%"+filter.Search+"%")
	}

	// Role filter
	if filter.Role == "admin" {
		baseQuery += " AND r.id IS NOT NULL"
	} else if filter.Role == "user" {
		baseQuery += " AND r.id IS NULL"
	}

	// Status filter
	if filter.Status == "active" {
		baseQuery += " AND u.is_active = true"
	} else if filter.Status == "banned" {
		baseQuery += " AND u.is_active = false"
	}

	// Verified filter
	if filter.Verified == "true" {
		baseQuery += " AND u.email_verified = true"
	} else if filter.Verified == "false" {
		baseQuery += " AND u.email_verified = false"
	}

	// Count total
	countQuery := "SELECT COUNT(DISTINCT u.id) " + baseQuery
	var total int64
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	// Build sort clause
	sortColumn := "u.created_at"
	switch filter.SortBy {
	case "username":
		sortColumn = "u.username"
	case "last_login_at":
		sortColumn = "u.last_login_at"
	case "email":
		sortColumn = "u.email"
	}

	sortDir := "DESC"
	if filter.SortDir == "asc" {
		sortDir = "ASC"
	}

	// Main query
	argCount++
	limitArg := argCount
	argCount++
	offsetArg := argCount

	selectQuery := fmt.Sprintf(`
		SELECT DISTINCT
			u.id, u.username, u.email, u.display_name, u.avatar_url,
			u.is_active, u.email_verified, u.last_login_at, u.created_at, u.updated_at,
			CASE WHEN r.id IS NOT NULL THEN true ELSE false END as is_admin
		%s
		ORDER BY %s %s NULLS LAST
		LIMIT $%d OFFSET $%d
	`, baseQuery, sortColumn, sortDir, limitArg, offsetArg)

	offset := (filter.Page - 1) * filter.PerPage
	args = append(args, filter.PerPage, offset)

	rows, err := r.db.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []models.UserAdminListItem
	for rows.Next() {
		var u models.UserAdminListItem
		err := rows.Scan(
			&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.AvatarURL,
			&u.IsActive, &u.EmailVerified, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
			&u.IsAdmin,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}

	if users == nil {
		users = []models.UserAdminListItem{}
	}

	return users, total, nil
}

// GetUserByIDAdmin returns detailed user info for admin
func (r *UserRepository) GetUserByIDAdmin(ctx context.Context, id int64) (*models.UserAdminDetail, error) {
	query := `
		SELECT
			u.id, u.username, u.email, u.display_name, u.avatar_url,
			u.is_active, u.email_verified, u.last_login_at, u.created_at, u.updated_at
		FROM users u
		WHERE u.id = $1
	`

	var user models.UserAdminDetail
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.AvatarURL,
		&user.IsActive, &user.EmailVerified, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	// Get roles
	roles, err := r.GetUserRoles(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get user roles: %w", err)
	}
	user.Roles = roles

	// Check if admin
	for _, role := range roles {
		if role == "admin" {
			user.IsAdmin = true
			break
		}
	}

	// Get stats
	stats, err := r.GetStats(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get user stats: %w", err)
	}
	user.Stats = *stats

	return &user, nil
}

// UpdateUserAdmin updates user fields as admin
func (r *UserRepository) UpdateUserAdmin(ctx context.Context, userID int64, req models.UpdateUserAdminRequest) error {
	now := time.Now()

	// Build dynamic update query
	setClauses := []string{"updated_at = $1"}
	args := []interface{}{now}
	argCount := 1

	if req.DisplayName != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("display_name = $%d", argCount))
		args = append(args, *req.DisplayName)
	}

	if req.Email != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("email = $%d", argCount))
		args = append(args, *req.Email)
	}

	if req.IsActive != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("is_active = $%d", argCount))
		args = append(args, *req.IsActive)
	}

	if req.EmailVerified != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("email_verified = $%d", argCount))
		args = append(args, *req.EmailVerified)
	}

	// Update user fields
	argCount++
	query := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE id = $%d
	`, joinStrings(setClauses, ", "), argCount)
	args = append(args, userID)

	result, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		// Check for unique constraint violations
		errStr := err.Error()
		if contains(errStr, "users_email_key") || (contains(errStr, "unique constraint") && contains(errStr, "email")) {
			return ErrEmailExists
		}
		return fmt.Errorf("update user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	// Handle admin role change
	if req.IsAdmin != nil {
		if *req.IsAdmin {
			err = r.AddUserRole(ctx, userID, "admin")
		} else {
			err = r.RemoveUserRole(ctx, userID, "admin")
		}
		if err != nil {
			return fmt.Errorf("update admin role: %w", err)
		}
	}

	return nil
}

// AddUserRole adds a role to a user
func (r *UserRepository) AddUserRole(ctx context.Context, userID int64, roleName string) error {
	query := `
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, r.id FROM roles r WHERE r.name = $2
		ON CONFLICT (user_id, role_id) DO NOTHING
	`

	_, err := r.db.Exec(ctx, query, userID, roleName)
	if err != nil {
		return fmt.Errorf("add user role: %w", err)
	}

	return nil
}

// RemoveUserRole removes a role from a user
func (r *UserRepository) RemoveUserRole(ctx context.Context, userID int64, roleName string) error {
	query := `
		DELETE FROM user_roles
		WHERE user_id = $1 AND role_id = (SELECT id FROM roles WHERE name = $2)
	`

	_, err := r.db.Exec(ctx, query, userID, roleName)
	if err != nil {
		return fmt.Errorf("remove user role: %w", err)
	}

	return nil
}

// DeleteUserAdmin permanently deletes a user (hard delete) or soft delete
func (r *UserRepository) DeleteUserAdmin(ctx context.Context, userID int64, hardDelete bool) error {
	if hardDelete {
		// First delete related data
		deleteQueries := []string{
			"DELETE FROM user_roles WHERE user_id = $1",
			"DELETE FROM watchlist WHERE user_id = $1",
			"DELETE FROM ratings WHERE user_id = $1",
			"DELETE FROM comments WHERE user_id = $1",
			"DELETE FROM users WHERE id = $1",
		}

		for _, query := range deleteQueries {
			_, err := r.db.Exec(ctx, query, userID)
			if err != nil {
				return fmt.Errorf("delete user data: %w", err)
			}
		}

		return nil
	}

	// Soft delete - just deactivate
	return r.Delete(ctx, userID)
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsAt(s, substr, 0))
}

func containsAt(s, substr string, start int) bool {
	for i := start; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Helper function to join strings
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
