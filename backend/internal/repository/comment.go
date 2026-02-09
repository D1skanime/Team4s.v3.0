package repository

import (
	"context"
	"fmt"
	"math"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CommentRepository struct {
	db *pgxpool.Pool
}

func NewCommentRepository(db *pgxpool.Pool) *CommentRepository {
	return &CommentRepository{db: db}
}

// GetCommentsByAnime returns paginated comments for an anime with author info
// currentUserID is optional (0 if not authenticated) - used to set IsOwner flag
func (r *CommentRepository) GetCommentsByAnime(ctx context.Context, animeID int64, page, perPage int, currentUserID int64) (*models.CommentsResponse, error) {
	// Calculate offset
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	// Count total comments (excluding deleted)
	countQuery := `
		SELECT COUNT(*)
		FROM comments
		WHERE anime_id = $1 AND is_deleted = false
	`
	var total int
	if err := r.db.QueryRow(ctx, countQuery, animeID).Scan(&total); err != nil {
		return nil, fmt.Errorf("count comments: %w", err)
	}

	// Calculate total pages
	totalPages := int(math.Ceil(float64(total) / float64(perPage)))

	// No comments found
	if total == 0 {
		return &models.CommentsResponse{
			Data: []models.CommentWithAuthor{},
			Meta: models.CommentsMeta{
				Total:      0,
				Page:       page,
				PerPage:    perPage,
				TotalPages: 0,
			},
		}, nil
	}

	// Query comments with author info
	query := `
		SELECT
			c.id,
			c.anime_id,
			c.user_id,
			c.message,
			c.reply_to_id,
			c.created_at,
			c.updated_at,
			u.id as author_id,
			u.username,
			u.display_name,
			u.avatar_url
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.anime_id = $1 AND c.is_deleted = false
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, animeID, perPage, offset)
	if err != nil {
		return nil, fmt.Errorf("query comments: %w", err)
	}
	defer rows.Close()

	var comments []models.CommentWithAuthor
	for rows.Next() {
		var c models.CommentWithAuthor
		var userID int64
		err := rows.Scan(
			&c.ID,
			&c.AnimeID,
			&userID,
			&c.Message,
			&c.ReplyToID,
			&c.CreatedAt,
			&c.UpdatedAt,
			&c.Author.ID,
			&c.Author.Username,
			&c.Author.DisplayName,
			&c.Author.AvatarURL,
		)
		if err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		// Set IsOwner flag
		c.IsOwner = currentUserID > 0 && currentUserID == userID
		comments = append(comments, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate comments: %w", err)
	}

	return &models.CommentsResponse{
		Data: comments,
		Meta: models.CommentsMeta{
			Total:      total,
			Page:       page,
			PerPage:    perPage,
			TotalPages: totalPages,
		},
	}, nil
}

// CreateComment creates a new comment and returns it with author info
func (r *CommentRepository) CreateComment(ctx context.Context, animeID, userID int64, message string, replyToID *int64) (*models.CommentWithAuthor, error) {
	// Insert comment
	insertQuery := `
		INSERT INTO comments (anime_id, user_id, message, reply_to_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		RETURNING id, anime_id, user_id, message, reply_to_id, created_at, updated_at
	`

	var c models.Comment
	err := r.db.QueryRow(ctx, insertQuery, animeID, userID, message, replyToID).Scan(
		&c.ID,
		&c.AnimeID,
		&c.UserID,
		&c.Message,
		&c.ReplyToID,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert comment: %w", err)
	}

	// Fetch author info
	authorQuery := `
		SELECT id, username, display_name, avatar_url
		FROM users
		WHERE id = $1
	`
	var author models.CommentAuthor
	err = r.db.QueryRow(ctx, authorQuery, userID).Scan(
		&author.ID,
		&author.Username,
		&author.DisplayName,
		&author.AvatarURL,
	)
	if err != nil {
		return nil, fmt.Errorf("fetch author: %w", err)
	}

	return &models.CommentWithAuthor{
		ID:        c.ID,
		AnimeID:   c.AnimeID,
		Message:   c.Message,
		ReplyToID: c.ReplyToID,
		Author:    author,
		IsOwner:   true, // Creator is always the owner
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}, nil
}

// GetCommentByID returns a comment by ID (used for authorization checks)
func (r *CommentRepository) GetCommentByID(ctx context.Context, commentID int64) (*models.Comment, error) {
	query := `
		SELECT id, anime_id, user_id, message, reply_to_id, is_deleted, deleted_by, deleted_at, created_at, updated_at
		FROM comments
		WHERE id = $1
	`

	var c models.Comment
	err := r.db.QueryRow(ctx, query, commentID).Scan(
		&c.ID,
		&c.AnimeID,
		&c.UserID,
		&c.Message,
		&c.ReplyToID,
		&c.IsDeleted,
		&c.DeletedBy,
		&c.DeletedAt,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // Comment not found
		}
		return nil, fmt.Errorf("query comment: %w", err)
	}

	return &c, nil
}

// UpdateComment updates a comment's message
func (r *CommentRepository) UpdateComment(ctx context.Context, commentID int64, message string) (*models.CommentWithAuthor, error) {
	// Update comment
	updateQuery := `
		UPDATE comments
		SET message = $2, updated_at = NOW()
		WHERE id = $1 AND is_deleted = false
		RETURNING id, anime_id, user_id, message, reply_to_id, created_at, updated_at
	`

	var c models.Comment
	err := r.db.QueryRow(ctx, updateQuery, commentID, message).Scan(
		&c.ID,
		&c.AnimeID,
		&c.UserID,
		&c.Message,
		&c.ReplyToID,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // Comment not found or already deleted
		}
		return nil, fmt.Errorf("update comment: %w", err)
	}

	// Fetch author info
	authorQuery := `
		SELECT id, username, display_name, avatar_url
		FROM users
		WHERE id = $1
	`
	var author models.CommentAuthor
	err = r.db.QueryRow(ctx, authorQuery, c.UserID).Scan(
		&author.ID,
		&author.Username,
		&author.DisplayName,
		&author.AvatarURL,
	)
	if err != nil {
		return nil, fmt.Errorf("fetch author: %w", err)
	}

	return &models.CommentWithAuthor{
		ID:        c.ID,
		AnimeID:   c.AnimeID,
		Message:   c.Message,
		ReplyToID: c.ReplyToID,
		Author:    author,
		IsOwner:   true,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}, nil
}

// DeleteComment soft-deletes a comment
func (r *CommentRepository) DeleteComment(ctx context.Context, commentID, deletedByUserID int64) (bool, error) {
	query := `
		UPDATE comments
		SET is_deleted = true, deleted_by = $2, deleted_at = NOW()
		WHERE id = $1 AND is_deleted = false
	`

	result, err := r.db.Exec(ctx, query, commentID, deletedByUserID)
	if err != nil {
		return false, fmt.Errorf("delete comment: %w", err)
	}

	return result.RowsAffected() > 0, nil
}

// AnimeExists checks if an anime with the given ID exists
func (r *CommentRepository) AnimeExists(ctx context.Context, animeID int64) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`

	var exists bool
	if err := r.db.QueryRow(ctx, query, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime exists: %w", err)
	}

	return exists, nil
}

// CommentExists checks if a comment with the given ID exists (used for reply validation)
func (r *CommentRepository) CommentExists(ctx context.Context, commentID int64) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM comments WHERE id = $1 AND is_deleted = false)`

	var exists bool
	if err := r.db.QueryRow(ctx, query, commentID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check comment exists: %w", err)
	}

	return exists, nil
}
