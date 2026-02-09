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
