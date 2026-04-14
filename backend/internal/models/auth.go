package models

// AuthTokenResponse enthält das vollständige Token-Antwort-Objekt nach erfolgreicher
// Authentifizierung, inklusive Access- und Refresh-Token mit ihren Ablaufzeiten.
type AuthTokenResponse struct {
	TokenType             string `json:"token_type"`
	AccessToken           string `json:"access_token"`
	AccessTokenExpiresAt  int64  `json:"access_token_expires_at"`
	AccessTokenExpiresIn  int64  `json:"access_token_expires_in"`
	RefreshToken          string `json:"refresh_token"`
	RefreshTokenExpiresAt int64  `json:"refresh_token_expires_at"`
	RefreshTokenExpiresIn int64  `json:"refresh_token_expires_in"`
	UserID                int64  `json:"user_id"`
	DisplayName           string `json:"display_name"`
}

// AuthSession repräsentiert eine aktive Benutzersitzung und wird intern
// für Session-Validierung und Token-Widerruf verwendet.
type AuthSession struct {
	SessionID   string
	UserID      int64
	DisplayName string
}
