package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/observability"

	"github.com/gin-gonic/gin"
)

const (
	commentAuthAuthorizationHeader = "Authorization"
	commentAuthBearerPrefix        = "Bearer "
	commentAuthIdentityContextKey  = "auth_identity"
	commentAuthRequiredMessage     = "anmeldung erforderlich"
	commentAuthInvalidTokenMessage = "ungueltiges zugriffstoken"
	commentAuthStateErrorMessage   = "auth-status voruebergehend nicht verfuegbar"
)

var localBypassIdentity *AuthIdentity

type AuthIdentity struct {
	UserID      int64
	DisplayName string
	SessionID   string
	ExpiresAt   int64
	TokenHash   string
}

func ConfigureLocalAuthBypass(enabled bool, userID int64, displayName string) {
	if !enabled || userID <= 0 || strings.TrimSpace(displayName) == "" {
		localBypassIdentity = nil
		return
	}

	identity := AuthIdentity{
		UserID:      userID,
		DisplayName: strings.TrimSpace(displayName),
		SessionID:   "local-auth-bypass",
		TokenHash:   "local-auth-bypass",
	}
	localBypassIdentity = &identity
}

func applyLocalAuthBypass(c *gin.Context) bool {
	if localBypassIdentity == nil {
		return false
	}

	c.Set(commentAuthIdentityContextKey, *localBypassIdentity)
	c.Next()
	return true
}

type AuthTokenStateChecker interface {
	IsAccessTokenRevoked(ctx context.Context, tokenHash string) (bool, error)
	IsSessionActive(ctx context.Context, sessionID string) (bool, error)
}

func CommentAuthMiddleware(secret string) gin.HandlerFunc {
	return CommentAuthMiddlewareWithState(secret, nil)
}

func CommentAuthOptionalMiddlewareWithState(secret string, checker AuthTokenStateChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawAuth := strings.TrimSpace(c.GetHeader(commentAuthAuthorizationHeader))
		if rawAuth == "" {
			if applyLocalAuthBypass(c) {
				return
			}
			c.Next()
			return
		}

		if !strings.HasPrefix(rawAuth, commentAuthBearerPrefix) {
			if applyLocalAuthBypass(c) {
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"message": commentAuthInvalidTokenMessage,
				},
			})
			c.Abort()
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(rawAuth, commentAuthBearerPrefix))
		claims, err := auth.ParseAndVerifySignedToken(token, secret, time.Now())
		if err != nil {
			if applyLocalAuthBypass(c) {
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"message": commentAuthInvalidTokenMessage,
				},
			})
			c.Abort()
			return
		}

		identity := AuthIdentity{
			UserID:      claims.UserID,
			DisplayName: claims.DisplayName,
			SessionID:   claims.SessionID,
			ExpiresAt:   claims.ExpiresAt,
			TokenHash:   auth.HashToken(token),
		}

		if checker != nil {
			revoked, err := checker.IsAccessTokenRevoked(c.Request.Context(), identity.TokenHash)
			if err != nil {
				if applyLocalAuthBypass(c) {
					return
				}
				total := observability.IncAuthStateUnavailableCommentAuth()
				log.Printf(
					"event=redis_auth_state_unavailable component=comment_auth check=access_token_revoked path=%s method=%s total=%d error=%v",
					c.FullPath(),
					c.Request.Method,
					total,
					err,
				)
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"error": gin.H{
						"message": commentAuthStateErrorMessage,
					},
				})
				c.Abort()
				return
			}
			if revoked {
				if applyLocalAuthBypass(c) {
					return
				}
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": gin.H{
						"message": commentAuthInvalidTokenMessage,
					},
				})
				c.Abort()
				return
			}

			if identity.SessionID != "" {
				active, err := checker.IsSessionActive(c.Request.Context(), identity.SessionID)
				if err != nil {
					if applyLocalAuthBypass(c) {
						return
					}
					total := observability.IncAuthStateUnavailableCommentAuth()
					log.Printf(
						"event=redis_auth_state_unavailable component=comment_auth check=session_active path=%s method=%s total=%d error=%v",
						c.FullPath(),
						c.Request.Method,
						total,
						err,
					)
					c.JSON(http.StatusServiceUnavailable, gin.H{
						"error": gin.H{
							"message": commentAuthStateErrorMessage,
						},
					})
					c.Abort()
					return
				}
				if !active {
					if applyLocalAuthBypass(c) {
						return
					}
					c.JSON(http.StatusUnauthorized, gin.H{
						"error": gin.H{
							"message": commentAuthInvalidTokenMessage,
						},
					})
					c.Abort()
					return
				}
			}
		}

		c.Set(commentAuthIdentityContextKey, identity)
		c.Next()
	}
}

func CommentAuthMiddlewareWithState(secret string, checker AuthTokenStateChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawAuth := strings.TrimSpace(c.GetHeader(commentAuthAuthorizationHeader))
		if rawAuth == "" {
			if applyLocalAuthBypass(c) {
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"message": commentAuthRequiredMessage,
				},
			})
			c.Abort()
			return
		}

		if !strings.HasPrefix(rawAuth, commentAuthBearerPrefix) {
			if applyLocalAuthBypass(c) {
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"message": commentAuthInvalidTokenMessage,
				},
			})
			c.Abort()
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(rawAuth, commentAuthBearerPrefix))
		claims, err := auth.ParseAndVerifySignedToken(token, secret, time.Now())
		if err != nil {
			if applyLocalAuthBypass(c) {
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"message": commentAuthInvalidTokenMessage,
				},
			})
			c.Abort()
			return
		}

		identity := AuthIdentity{
			UserID:      claims.UserID,
			DisplayName: claims.DisplayName,
			SessionID:   claims.SessionID,
			ExpiresAt:   claims.ExpiresAt,
			TokenHash:   auth.HashToken(token),
		}

		if checker != nil {
			revoked, err := checker.IsAccessTokenRevoked(c.Request.Context(), identity.TokenHash)
			if err != nil {
				if applyLocalAuthBypass(c) {
					return
				}
				total := observability.IncAuthStateUnavailableCommentAuth()
				log.Printf(
					"event=redis_auth_state_unavailable component=comment_auth check=access_token_revoked path=%s method=%s total=%d error=%v",
					c.FullPath(),
					c.Request.Method,
					total,
					err,
				)
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"error": gin.H{
						"message": commentAuthStateErrorMessage,
					},
				})
				c.Abort()
				return
			}
			if revoked {
				if applyLocalAuthBypass(c) {
					return
				}
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": gin.H{
						"message": commentAuthInvalidTokenMessage,
					},
				})
				c.Abort()
				return
			}

			if identity.SessionID != "" {
				active, err := checker.IsSessionActive(c.Request.Context(), identity.SessionID)
				if err != nil {
					if applyLocalAuthBypass(c) {
						return
					}
					total := observability.IncAuthStateUnavailableCommentAuth()
					log.Printf(
						"event=redis_auth_state_unavailable component=comment_auth check=session_active path=%s method=%s total=%d error=%v",
						c.FullPath(),
						c.Request.Method,
						total,
						err,
					)
					c.JSON(http.StatusServiceUnavailable, gin.H{
						"error": gin.H{
							"message": commentAuthStateErrorMessage,
						},
					})
					c.Abort()
					return
				}
				if !active {
					if applyLocalAuthBypass(c) {
						return
					}
					c.JSON(http.StatusUnauthorized, gin.H{
						"error": gin.H{
							"message": commentAuthInvalidTokenMessage,
						},
					})
					c.Abort()
					return
				}
			}
		}

		c.Set(commentAuthIdentityContextKey, identity)
		c.Next()
	}
}

func CommentAuthIdentityFromContext(c *gin.Context) (AuthIdentity, bool) {
	raw, ok := c.Get(commentAuthIdentityContextKey)
	if !ok {
		if localBypassIdentity == nil {
			return AuthIdentity{}, false
		}
		return *localBypassIdentity, true
	}

	identity, ok := raw.(AuthIdentity)
	if !ok {
		return AuthIdentity{}, false
	}

	if identity.UserID <= 0 {
		return AuthIdentity{}, false
	}

	displayName := strings.TrimSpace(identity.DisplayName)
	if displayName == "" {
		return AuthIdentity{}, false
	}

	return AuthIdentity{
		UserID:      identity.UserID,
		DisplayName: displayName,
		SessionID:   strings.TrimSpace(identity.SessionID),
		ExpiresAt:   identity.ExpiresAt,
		TokenHash:   strings.TrimSpace(identity.TokenHash),
	}, true
}

func CommentAuthUserFromContext(c *gin.Context) (string, bool) {
	identity, ok := CommentAuthIdentityFromContext(c)
	if !ok {
		return "", false
	}

	return identity.DisplayName, true
}
