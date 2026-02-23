package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CommentRepository struct {
	db *pgxpool.Pool
}

func NewCommentRepository(db *pgxpool.Pool) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) ListByAnimeID(
	ctx context.Context,
	animeID int64,
	filter models.CommentFilter,
) ([]models.CommentListItem, int64, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, 0, err
	}
	if !exists {
		return nil, 0, ErrNotFound
	}

	var total int64
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM comments WHERE anime_id = $1`, animeID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count comments for anime %d: %w", animeID, err)
	}

	offset := (filter.Page - 1) * filter.PerPage
	rows, err := r.db.Query(ctx, `
		SELECT id, anime_id, author_name, content, created_at
		FROM comments
		WHERE anime_id = $1
		ORDER BY created_at DESC, id DESC
		LIMIT $2 OFFSET $3
	`, animeID, filter.PerPage, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query comments for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	items := make([]models.CommentListItem, 0, filter.PerPage)
	for rows.Next() {
		var item models.CommentListItem
		if err := rows.Scan(
			&item.ID,
			&item.AnimeID,
			&item.AuthorName,
			&item.Content,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan comment row: %w", err)
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate comment rows: %w", err)
	}

	return items, total, nil
}

func (r *CommentRepository) CreateByAnimeID(
	ctx context.Context,
	animeID int64,
	input models.CommentCreateInput,
) (*models.CommentListItem, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	var item models.CommentListItem
	if err := r.db.QueryRow(ctx, `
		INSERT INTO comments (anime_id, author_name, content)
		VALUES ($1, $2, $3)
		RETURNING id, anime_id, author_name, content, created_at
	`, animeID, input.AuthorName, input.Content).Scan(
		&item.ID,
		&item.AnimeID,
		&item.AuthorName,
		&item.Content,
		&item.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("insert comment for anime %d: %w", animeID, err)
	}

	return &item, nil
}

func (r *CommentRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1 AND status <> 'disabled')`,
		animeID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
}
