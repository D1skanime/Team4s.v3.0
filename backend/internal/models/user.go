package models

import "time"

// User represents a user in the database
type User struct {
	ID           int64      `json:"id"`
	Username     string     `json:"username"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"` // Never expose in JSON
	DisplayName  *string    `json:"display_name,omitempty"`
	AvatarURL    *string    `json:"avatar_url,omitempty"`
	IsActive     bool       `json:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// UserPublic represents public user information (safe to expose)
type UserPublic struct {
	ID          int64   `json:"id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name,omitempty"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
}

// ToPublic converts User to UserPublic
func (u *User) ToPublic() UserPublic {
	return UserPublic{
		ID:          u.ID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		AvatarURL:   u.AvatarURL,
	}
}

// RegisterRequest represents the registration request body
type RegisterRequest struct {
	Username    string  `json:"username" binding:"required,min=3,max=50,alphanum"`
	Email       string  `json:"email" binding:"required,email"`
	Password    string  `json:"password" binding:"required,min=8"`
	DisplayName *string `json:"display_name" binding:"omitempty,max=100"`
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Login    string `json:"login" binding:"required"` // Username or Email
	Password string `json:"password" binding:"required"`
}

// RefreshRequest represents the refresh token request body
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	User         UserPublic `json:"user"`
	AccessToken  string     `json:"access_token"`
	RefreshToken string     `json:"refresh_token"`
	ExpiresIn    int        `json:"expires_in"` // Seconds until access token expires
}

// TokenResponse represents the token refresh response
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message"`
}

// UserStats represents user statistics
type UserStats struct {
	AnimeWatched  int `json:"anime_watched"`
	AnimeWatching int `json:"anime_watching"`
	RatingsCount  int `json:"ratings_count"`
	CommentsCount int `json:"comments_count"`
}

// UserProfile represents a public user profile with stats
type UserProfile struct {
	ID          int64     `json:"id"`
	Username    string    `json:"username"`
	DisplayName *string   `json:"display_name,omitempty"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	Stats       UserStats `json:"stats"`
}

// UpdateProfileRequest represents the profile update request
type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name" binding:"omitempty,max=100"`
	AvatarURL   *string `json:"avatar_url" binding:"omitempty,url"`
}

// ChangePasswordRequest represents the password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// DeleteAccountRequest represents the account deletion confirmation
type DeleteAccountRequest struct {
	Password string `json:"password" binding:"required"`
}
