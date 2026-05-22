package middleware

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	backendauth "team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/observability"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type CurrentUserResolver interface {
	ResolveCurrentUser(ctx context.Context, rawToken string) (AuthIdentity, error)
}

var ErrCurrentUserUnauthorized = errors.New("current user unauthorized")

type KeycloakCurrentUserResolver struct {
	verifier    *backendauth.KeycloakVerifier
	appAuthRepo *repository.AppAuthRepository
	authzRepo   *repository.AuthzRepository
	stateRepo   *repository.AuthRepository
}

func NewKeycloakCurrentUserResolver(
	verifier *backendauth.KeycloakVerifier,
	appAuthRepo *repository.AppAuthRepository,
	authzRepo *repository.AuthzRepository,
	stateRepo *repository.AuthRepository,
) *KeycloakCurrentUserResolver {
	return &KeycloakCurrentUserResolver{
		verifier:    verifier,
		appAuthRepo: appAuthRepo,
		authzRepo:   authzRepo,
		stateRepo:   stateRepo,
	}
}

func (r *KeycloakCurrentUserResolver) ResolveCurrentUser(ctx context.Context, rawToken string) (AuthIdentity, error) {
	if r == nil || r.verifier == nil || r.appAuthRepo == nil || r.authzRepo == nil {
		return AuthIdentity{}, ErrCurrentUserUnauthorized
	}

	claims, expiresAt, err := r.verifier.VerifyAccessToken(ctx, rawToken)
	if err != nil {
		return AuthIdentity{}, ErrCurrentUserUnauthorized
	}

	if r.stateRepo != nil {
		if revoked, err := r.stateRepo.IsOIDCSessionRevoked(ctx, r.verifier.IssuerURL(), claims.SessionID); err != nil {
			return AuthIdentity{}, err
		} else if revoked {
			return AuthIdentity{}, ErrCurrentUserUnauthorized
		}
		if revoked, err := r.stateRepo.IsOIDCSubjectRevoked(ctx, r.verifier.IssuerURL(), claims.Subject); err != nil {
			return AuthIdentity{}, err
		} else if revoked {
			return AuthIdentity{}, ErrCurrentUserUnauthorized
		}
	}

	displayName := strings.TrimSpace(claims.Name)
	if displayName == "" {
		displayName = strings.TrimSpace(claims.PreferredUsername)
	}
	if displayName == "" {
		displayName = strings.TrimSpace(claims.Email)
	}

	currentUser, err := r.appAuthRepo.ResolveCurrentUser(ctx, models.KeycloakIdentity{
		Subject:           claims.Subject,
		Email:             strings.TrimSpace(claims.Email),
		DisplayName:       displayName,
		PreferredUsername: strings.TrimSpace(claims.PreferredUsername),
		GivenName:         strings.TrimSpace(claims.GivenName),
		FamilyName:        strings.TrimSpace(claims.FamilyName),
		SessionID:         strings.TrimSpace(claims.SessionID),
		ExpiresAt:         expiresAt,
	}, nil)
	if err != nil {
		return AuthIdentity{}, err
	}

	roles, err := r.authzRepo.ListAppUserGlobalRoles(ctx, currentUser.ID)
	if err != nil {
		return AuthIdentity{}, err
	}
	currentUser.GlobalRoles = roles
	currentUser.IsPlatformAdmin = containsString(roles, models.AppGlobalRolePlatformAdmin)

	legacyUserID := int64(0)
	if currentUser.LegacyUserID != nil {
		legacyUserID = *currentUser.LegacyUserID
	}

	return AuthIdentity{
		UserID:           legacyUserID,
		DisplayName:      currentUser.DisplayName,
		SessionID:        currentUser.SessionID,
		ExpiresAt:        expiresAt.Unix(),
		TokenHash:        backendauth.HashToken(rawToken),
		AppUserID:        currentUser.ID,
		KeycloakSubject:  currentUser.KeycloakSubject,
		Email:            currentUser.Email,
		AppUserStatus:    currentUser.Status,
		GlobalRoles:      roles,
		IsPlatformAdmin:  currentUser.IsPlatformAdmin,
		LegacyUserLinked: currentUser.LegacyUserID != nil,
	}, nil
}

func CurrentUserMiddleware(resolver CurrentUserResolver) gin.HandlerFunc {
	return currentUserMiddleware(resolver, false)
}

func CurrentUserOptionalMiddleware(resolver CurrentUserResolver) gin.HandlerFunc {
	return currentUserMiddleware(resolver, true)
}

func currentUserMiddleware(resolver CurrentUserResolver, optional bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawAuth := strings.TrimSpace(c.GetHeader(commentAuthAuthorizationHeader))
		if rawAuth == "" {
			if optional {
				c.Next()
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": commentAuthRequiredMessage}})
			c.Abort()
			return
		}

		if !strings.HasPrefix(rawAuth, commentAuthBearerPrefix) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": commentAuthInvalidTokenMessage}})
			c.Abort()
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(rawAuth, commentAuthBearerPrefix))
		identity, err := resolver.ResolveCurrentUser(c.Request.Context(), token)
		if err != nil {
			if errors.Is(err, ErrCurrentUserUnauthorized) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": commentAuthInvalidTokenMessage}})
				c.Abort()
				return
			}

			total := observability.IncAuthStateUnavailableCommentAuth()
			log.Printf(
				"event=current_user_auth_unavailable path=%s method=%s total=%d error=%v",
				c.FullPath(),
				c.Request.Method,
				total,
				err,
			)
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": commentAuthStateErrorMessage}})
			c.Abort()
			return
		}

		c.Set(commentAuthIdentityContextKey, identity)
		c.Next()
	}
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == target {
			return true
		}
	}
	return false
}
