package handlers

import (
	"time"

	"team4s.v3/backend/internal/models"
)

func buildAuthTokenResponse(
	now time.Time,
	session models.AuthSession,
	accessToken string,
	accessExpiresAt int64,
	refreshToken string,
	refreshExpiresAt int64,
) models.AuthTokenResponse {
	accessExpiresIn := accessExpiresAt - now.Unix()
	if accessExpiresIn < 0 {
		accessExpiresIn = 0
	}

	refreshExpiresIn := refreshExpiresAt - now.Unix()
	if refreshExpiresIn < 0 {
		refreshExpiresIn = 0
	}

	return models.AuthTokenResponse{
		TokenType:             "Bearer",
		AccessToken:           accessToken,
		AccessTokenExpiresAt:  accessExpiresAt,
		AccessTokenExpiresIn:  accessExpiresIn,
		RefreshToken:          refreshToken,
		RefreshTokenExpiresAt: refreshExpiresAt,
		RefreshTokenExpiresIn: refreshExpiresIn,
		UserID:                session.UserID,
		DisplayName:           session.DisplayName,
	}
}
