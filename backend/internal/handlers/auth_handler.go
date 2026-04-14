package handlers

import (
	"time"

	"team4s.v3/backend/internal/repository"
)

const (
	authIssueAuthorizationHeader = "Authorization"
	authIssueBearerPrefix        = "Bearer "
	authIssueDevKeyHeader        = "X-Auth-Issue-Key"
	authIssueRequiredMessage     = "anmeldung erforderlich"
	authIssueInvalidTokenMessage = "ungueltiges zugriffstoken"
	authIssueStateErrorMessage   = "auth-status voruebergehend nicht verfuegbar"
)

type refreshAuthRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type revokeAuthRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// AuthIssueConfig enthält die Konfiguration für die Token-Ausstellung, einschließlich Dev-Modus-Einstellungen.
type AuthIssueConfig struct {
	DevMode        bool
	DevUserID      int64
	DevDisplayName string
	DevKey         string
}

// AuthHandler verarbeitet alle Authentifizierungs-Endpunkte (Issue, Refresh, Revoke).
type AuthHandler struct {
	repo            *repository.AuthRepository
	tokenSecret     string
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
	issueConfig     AuthIssueConfig
}

// NewAuthHandler erstellt einen neuen AuthHandler mit Repository, Token-Secret und konfigurierten TTL-Werten.
func NewAuthHandler(
	repo *repository.AuthRepository,
	tokenSecret string,
	accessTokenTTL time.Duration,
	refreshTokenTTL time.Duration,
	issueConfig AuthIssueConfig,
) *AuthHandler {
	return &AuthHandler{
		repo:            repo,
		tokenSecret:     tokenSecret,
		accessTokenTTL:  accessTokenTTL,
		refreshTokenTTL: refreshTokenTTL,
		issueConfig:     issueConfig,
	}
}
