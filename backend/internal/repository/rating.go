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
