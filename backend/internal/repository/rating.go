package repository

import (
	"context"
	"fmt"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RatingRepository struct {
	db *pgxpool.Pool
}

func NewRatingRepository(db *pgxpool.Pool) *RatingRepository {
	return &RatingRepository{db: db}
}

// GetAnimeRating returns aggregated rating data for an anime
func (r *RatingRepository) GetAnimeRating(ctx context.Context, animeID int64) (*models.AnimeRating, error) {
	result := &models.AnimeRating{
		AnimeID:      animeID,
		Average:      0,
		Count:        0,
		Distribution: make(map[int]int),
	}

	// Initialize distribution with zeros for all ratings 1-10
	for i := 1; i <= 10; i++ {
		result.Distribution[i] = 0
	}

	// Query average and count
	avgQuery := `
		SELECT
			COALESCE(AVG(rating)::numeric(3,1), 0) as average,
			COUNT(*) as count
		FROM ratings
		WHERE anime_id = $1
	`

	var avg float64
	var count int
	if err := r.db.QueryRow(ctx, avgQuery, animeID).Scan(&avg, &count); err != nil {
		return nil, fmt.Errorf("query anime rating avg: %w", err)
	}

	result.Average = avg
	result.Count = count

	// If no ratings, return early with initialized distribution
	if count == 0 {
		return result, nil
	}

	// Query distribution
	distQuery := `
		SELECT rating, COUNT(*) as count
		FROM ratings
		WHERE anime_id = $1
		GROUP BY rating
		ORDER BY rating
	`

	rows, err := r.db.Query(ctx, distQuery, animeID)
	if err != nil {
		return nil, fmt.Errorf("query rating distribution: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var rating, ratingCount int
		if err := rows.Scan(&rating, &ratingCount); err != nil {
			return nil, fmt.Errorf("scan rating distribution: %w", err)
		}
		// Only include valid ratings (1-10)
		if rating >= 1 && rating <= 10 {
			result.Distribution[rating] = ratingCount
		}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rating distribution: %w", err)
	}

	return result, nil
}

// GetUserRating returns a user's rating for an anime
// Returns nil, nil if no rating exists
func (r *RatingRepository) GetUserRating(ctx context.Context, animeID, userID int64) (*models.UserRating, error) {
	query := `
		SELECT anime_id, user_id, rating, created_at, updated_at
		FROM ratings
		WHERE anime_id = $1 AND user_id = $2
	`

	var rating models.UserRating
	err := r.db.QueryRow(ctx, query, animeID, userID).Scan(
		&rating.AnimeID,
		&rating.UserID,
		&rating.Rating,
		&rating.CreatedAt,
		&rating.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil // No rating found
		}
		return nil, fmt.Errorf("query user rating: %w", err)
	}

	return &rating, nil
}

// CreateOrUpdateRating creates a new rating or updates an existing one (upsert)
func (r *RatingRepository) CreateOrUpdateRating(ctx context.Context, animeID, userID int64, ratingValue int) (*models.UserRating, error) {
	query := `
		INSERT INTO ratings (anime_id, user_id, rating, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (user_id, anime_id)
		DO UPDATE SET rating = $3, updated_at = NOW()
		RETURNING anime_id, user_id, rating, created_at, updated_at
	`

	var rating models.UserRating
	err := r.db.QueryRow(ctx, query, animeID, userID, ratingValue).Scan(
		&rating.AnimeID,
		&rating.UserID,
		&rating.Rating,
		&rating.CreatedAt,
		&rating.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("create/update rating: %w", err)
	}

	return &rating, nil
}

// DeleteRating removes a user's rating for an anime
// Returns true if a rating was deleted, false if no rating existed
func (r *RatingRepository) DeleteRating(ctx context.Context, animeID, userID int64) (bool, error) {
	query := `
		DELETE FROM ratings
		WHERE anime_id = $1 AND user_id = $2
	`

	result, err := r.db.Exec(ctx, query, animeID, userID)
	if err != nil {
		return false, fmt.Errorf("delete rating: %w", err)
	}

	return result.RowsAffected() > 0, nil
}

// AnimeExists checks if an anime with the given ID exists
func (r *RatingRepository) AnimeExists(ctx context.Context, animeID int64) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`

	var exists bool
	if err := r.db.QueryRow(ctx, query, animeID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime exists: %w", err)
	}

	return exists, nil
}
