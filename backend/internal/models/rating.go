package models

// AnimeRating represents aggregated rating data for an anime
type AnimeRating struct {
	AnimeID      int64        `json:"anime_id"`
	Average      float64      `json:"average"`       // 0.0 - 10.0
	Count        int          `json:"count"`         // Number of ratings
	Distribution map[int]int  `json:"distribution"`  // Rating value -> count (1-10)
}
