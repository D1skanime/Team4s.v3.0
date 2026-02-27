package handlers

import (
	"crypto/subtle"
	"log"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/observability"

	"github.com/gin-gonic/gin"
)

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
