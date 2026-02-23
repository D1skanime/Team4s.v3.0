package handlers

import (
	"crypto/subtle"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/observability"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
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

type AuthIssueConfig struct {
	DevMode        bool
	DevUserID      int64
	DevDisplayName string
	DevKey         string
}

type AuthHandler struct {
	repo            *repository.AuthRepository
	tokenSecret     string
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
	issueConfig     AuthIssueConfig
}

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

func (h *AuthHandler) Issue(c *gin.Context) {
	now := time.Now().UTC()
	userID, displayName, statusCode, message := h.resolveTrustedIssueIdentity(c, now)
	if statusCode != 0 {
		c.JSON(statusCode, gin.H{
			"error": gin.H{
				"message": message,
			},
		})
		return
	}

	session, refreshToken, refreshExpiresAt, err := h.repo.CreateSession(
		c.Request.Context(),
		userID,
		displayName,
		now,
		h.refreshTokenTTL,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	accessToken, accessExpiresAt, err := auth.CreateSignedToken(auth.Claims{
		UserID:      session.UserID,
		DisplayName: session.DisplayName,
		SessionID:   session.SessionID,
	}, h.tokenSecret, now, h.accessTokenTTL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": buildAuthTokenResponse(now, session, accessToken, accessExpiresAt, refreshToken, refreshExpiresAt),
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	refreshToken := strings.TrimSpace(req.RefreshToken)
	if refreshToken == "" {
		badRequest(c, "refresh_token ist erforderlich")
		return
	}

	now := time.Now().UTC()
	session, rotatedRefreshToken, refreshExpiresAt, err := h.repo.RotateSession(
		c.Request.Context(),
		refreshToken,
		now,
		h.refreshTokenTTL,
	)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "ungueltiges refresh-token",
			},
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	accessToken, accessExpiresAt, err := auth.CreateSignedToken(auth.Claims{
		UserID:      session.UserID,
		DisplayName: session.DisplayName,
		SessionID:   session.SessionID,
	}, h.tokenSecret, now, h.accessTokenTTL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": buildAuthTokenResponse(
			now,
			session,
			accessToken,
			accessExpiresAt,
			rotatedRefreshToken,
			refreshExpiresAt,
		),
	})
}

func (h *AuthHandler) Revoke(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"message": "anmeldung erforderlich",
			},
		})
		return
	}

	var req revokeAuthRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			badRequest(c, "ungueltiger request body")
			return
		}
	}

	accessTokenTTL := time.Until(time.Unix(identity.ExpiresAt, 0))
	if accessTokenTTL < 0 {
		accessTokenTTL = 0
	}

	if err := h.repo.RevokeAccessToken(c.Request.Context(), identity.TokenHash, accessTokenTTL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": "interner serverfehler",
			},
		})
		return
	}

	if identity.SessionID != "" {
		if err := h.repo.RevokeSession(c.Request.Context(), identity.SessionID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "interner serverfehler",
				},
			})
			return
		}
	}

	if strings.TrimSpace(req.RefreshToken) != "" {
		if err := h.repo.RevokeRefreshToken(c.Request.Context(), req.RefreshToken); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": "interner serverfehler",
				},
			})
			return
		}
	}

	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) resolveTrustedIssueIdentity(c *gin.Context, now time.Time) (int64, string, int, string) {
	rawAuth := strings.TrimSpace(c.GetHeader(authIssueAuthorizationHeader))
	if rawAuth != "" {
		return h.resolveIssueIdentityFromAccessToken(c, rawAuth, now)
	}

	if !h.issueConfig.DevMode {
		return 0, "", http.StatusUnauthorized, authIssueRequiredMessage
	}

	expectedDevKey := strings.TrimSpace(h.issueConfig.DevKey)
	if expectedDevKey != "" {
		providedDevKey := strings.TrimSpace(c.GetHeader(authIssueDevKeyHeader))
		if providedDevKey == "" || subtle.ConstantTimeCompare([]byte(providedDevKey), []byte(expectedDevKey)) != 1 {
			return 0, "", http.StatusUnauthorized, authIssueRequiredMessage
		}
	}

	displayName := strings.TrimSpace(h.issueConfig.DevDisplayName)
	if h.issueConfig.DevUserID <= 0 || displayName == "" || len([]rune(displayName)) > auth.MaxDisplayNameLengthRune {
		return 0, "", http.StatusInternalServerError, "interner serverfehler"
	}

	return h.issueConfig.DevUserID, displayName, 0, ""
}

func (h *AuthHandler) resolveIssueIdentityFromAccessToken(
	c *gin.Context,
	rawAuthorization string,
	now time.Time,
) (int64, string, int, string) {
	if !strings.HasPrefix(rawAuthorization, authIssueBearerPrefix) {
		return 0, "", http.StatusUnauthorized, authIssueInvalidTokenMessage
	}

	token := strings.TrimSpace(strings.TrimPrefix(rawAuthorization, authIssueBearerPrefix))
	claims, err := auth.ParseAndVerifySignedToken(token, h.tokenSecret, now)
	if err != nil {
		return 0, "", http.StatusUnauthorized, authIssueInvalidTokenMessage
	}

	tokenHash := auth.HashToken(token)
	revoked, err := h.repo.IsAccessTokenRevoked(c.Request.Context(), tokenHash)
	if err != nil {
		total := observability.IncAuthStateUnavailableAuthIssue()
		log.Printf(
			"event=redis_auth_state_unavailable component=auth_issue check=access_token_revoked path=%s method=%s total=%d error=%v",
			c.FullPath(),
			c.Request.Method,
			total,
			err,
		)
		return 0, "", http.StatusServiceUnavailable, authIssueStateErrorMessage
	}
	if revoked {
		return 0, "", http.StatusUnauthorized, authIssueInvalidTokenMessage
	}

	sessionID := strings.TrimSpace(claims.SessionID)
	if sessionID != "" {
		active, err := h.repo.IsSessionActive(c.Request.Context(), sessionID)
		if err != nil {
			total := observability.IncAuthStateUnavailableAuthIssue()
			log.Printf(
				"event=redis_auth_state_unavailable component=auth_issue check=session_active path=%s method=%s total=%d error=%v",
				c.FullPath(),
				c.Request.Method,
				total,
				err,
			)
			return 0, "", http.StatusServiceUnavailable, authIssueStateErrorMessage
		}
		if !active {
			return 0, "", http.StatusUnauthorized, authIssueInvalidTokenMessage
		}
	}

	return claims.UserID, claims.DisplayName, 0, ""
}

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
