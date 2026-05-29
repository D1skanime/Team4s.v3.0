package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type publicMemberProfileStore interface {
	GetPublicMemberProfile(ctx context.Context, slug string) (*models.PublicMemberProfile, error)
}

type AppPublicProfileHandler struct {
	profileRepo publicMemberProfileStore
}

func NewAppPublicProfileHandler(profileRepo publicMemberProfileStore) *AppPublicProfileHandler {
	return &AppPublicProfileHandler{profileRepo: profileRepo}
}

func (h *AppPublicProfileHandler) GetPublicMemberProfile(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "slug fehlt"}})
		return
	}
	if h.profileRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_, isAuthenticated := middleware.CommentAuthIdentityFromContext(c)

	profile, err := h.profileRepo.GetPublicMemberProfile(c.Request.Context(), slug)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitglied nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht geladen werden.")
		return
	}

	if profile.ProfileVisibility == models.ProfileVisibilityMembersOnly && !isAuthenticated {
		c.JSON(http.StatusOK, gin.H{"visible": false, "reason": "members_only"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": profile})
}
