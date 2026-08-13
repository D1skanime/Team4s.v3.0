package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type publicMemberAccessResolver interface {
	ResolvePublicMemberAccess(
		ctx context.Context,
		slug string,
		viewerAppUserID int64,
	) (repository.PublicMemberAccess, error)
}

type publicMemberProfileLoader interface {
	GetPublicMemberProfileByID(ctx context.Context, memberID int64) (*models.PublicMemberProfile, error)
}

type publicMemberProjectsLoader interface {
	GetPublicMemberProjectsByID(
		ctx context.Context,
		memberID int64,
		limit int,
		offset int,
	) (*models.PublicMemberProjectsPage, error)
}

func resolvePublicMemberAccess(
	c *gin.Context,
	resolver publicMemberAccessResolver,
	slug string,
) (repository.PublicMemberAccess, bool) {
	viewerAppUserID := int64(0)
	if identity, ok := middleware.CommentAuthIdentityFromContext(c); ok {
		viewerAppUserID = identity.AppUserID
	}
	setPublicMemberResponseCache(c, viewerAppUserID > 0)

	if resolver == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return repository.PublicMemberAccess{}, false
	}

	access, err := resolver.ResolvePublicMemberAccess(
		c.Request.Context(),
		slug,
		viewerAppUserID,
	)
	if errors.Is(err, repository.ErrNotFound) {
		writePublicMemberUnavailable(c)
		return repository.PublicMemberAccess{}, false
	}
	if err != nil {
		log.Printf("public member access: resolve failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"message": "interner serverfehler"},
		})
		return repository.PublicMemberAccess{}, false
	}

	setPublicMemberResponseCache(c, access.IsOwner || access.IsPrivatePreview)
	return access, true
}

func writePublicMemberUnavailable(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{
		"error": gin.H{"message": "Profil nicht verfügbar"},
	})
}

func setPublicMemberResponseCache(c *gin.Context, viewerDependent bool) {
	c.Header("Vary", "Authorization")
	if viewerDependent {
		c.Header("Cache-Control", "private, no-store")
	}
}
