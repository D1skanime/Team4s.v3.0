package models

import "time"

// AnimeRating represents aggregated rating data for an anime
type AnimeRating struct {
	AnimeID      int64       `json:"anime_id"`
	Average      float64     `json:"average"`      // 0.0 - 10.0
	Count        int         `json:"count"`        // Number of ratings
	Distribution map[int]int `json:"distribution"` // Rating value -> count (1-10)
}

// UserRating represents a user's individual rating for an anime
type UserRating struct {
	AnimeID   int64     `json:"anime_id"`
	UserID    int64     `json:"user_id"`
	Rating    int       `json:"rating"` // 1-10
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SubmitRatingRequest is the request body for rating submission
type SubmitRatingRequest struct {
	Rating int `json:"rating" binding:"required,min=1,max=10"`
}

// SubmitRatingResponse includes both user rating and updated anime rating
type SubmitRatingResponse struct {
	Rating      *UserRating  `json:"rating"`
	AnimeRating *AnimeRating `json:"anime_rating"`
}
