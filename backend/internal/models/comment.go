package models

import "time"

type CommentFilter struct {
	Page    int
	PerPage int
}

type CommentListItem struct {
	ID         int64     `json:"id"`
	AnimeID    int64     `json:"anime_id"`
	AuthorName string    `json:"author_name"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

type CommentCreateInput struct {
	AuthorName string
	Content    string
}
