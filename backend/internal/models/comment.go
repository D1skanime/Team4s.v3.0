package models

import "time"

// Comment represents a comment in the database
type Comment struct {
	ID              int64      `json:"id"`
	AnimeID         int64      `json:"anime_id"`
	UserID          int64      `json:"user_id"`
	ReplyToID       *int64     `json:"reply_to_id,omitempty"`
	Message         string     `json:"message"`
	IsDeleted       bool       `json:"is_deleted"`
	DeletedBy       *int64     `json:"deleted_by,omitempty"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	LegacyCommentID *int64     `json:"legacy_comment_id,omitempty"`
}

// CommentAuthor represents public user info for comment display
type CommentAuthor struct {
	ID          int64   `json:"id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name,omitempty"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
}

// CommentWithAuthor represents a comment with author info for API responses
type CommentWithAuthor struct {
	ID        int64         `json:"id"`
	AnimeID   int64         `json:"anime_id"`
	Message   string        `json:"message"`
	ReplyToID *int64        `json:"reply_to_id,omitempty"`
	Author    CommentAuthor `json:"author"`
	IsOwner   bool          `json:"is_owner"` // True if current user owns this comment
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

// CommentsResponse represents paginated comments response
type CommentsResponse struct {
	Data []CommentWithAuthor `json:"data"`
	Meta CommentsMeta        `json:"meta"`
}

// CommentsMeta represents pagination metadata for comments
type CommentsMeta struct {
	Total      int `json:"total"`
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalPages int `json:"total_pages"`
}

// CreateCommentRequest represents the request body for creating a comment
type CreateCommentRequest struct {
	Message   string `json:"message" binding:"required,min=1,max=2000"`
	ReplyToID *int64 `json:"reply_to_id,omitempty"`
}

// UpdateCommentRequest represents the request body for updating a comment
type UpdateCommentRequest struct {
	Message string `json:"message" binding:"required,min=1,max=2000"`
}

// CommentResponse represents a single comment response (after create/update)
type CommentResponse struct {
	Data CommentWithAuthor `json:"data"`
}

// Comment validation constants
const (
	MaxCommentLength = 2000
	MinCommentLength = 1
)

// ValidateCommentMessage checks if a comment message is valid
func ValidateCommentMessage(message string) bool {
	length := len(message)
	return length >= MinCommentLength && length <= MaxCommentLength
}
