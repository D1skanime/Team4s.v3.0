package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type publicMemberProfileStore interface {
	GetPublicMemberProfile(ctx context.Context, slug string) (*models.PublicMemberProfile, error)
}

type publicMemberProjectsStore interface {
	GetPublicMemberProjects(ctx context.Context, slug string, limit int, offset int) (*models.PublicMemberProjectsPage, error)
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

	profile, err := h.profileRepo.GetPublicMemberProfile(c.Request.Context(), slug)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitglied nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht geladen werden.")
		return
	}

	if profile.ProfileVisibility == models.ProfileVisibilityPrivate && !profile.IsOwner {
		c.JSON(http.StatusOK, gin.H{"visible": false, "reason": "private"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": profile})
}

func (h *AppPublicProfileHandler) GetPublicMemberProjects(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "slug fehlt"}})
		return
	}
	store, ok := h.profileRepo.(publicMemberProjectsStore)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}
	limit := parseBoundedProjectPageValue(c.Query("limit"), 6, 1, 24)
	offset := parseBoundedProjectPageValue(c.Query("offset"), 0, 0, 10000)
	page, err := store.GetPublicMemberProjects(c.Request.Context(), slug, limit, offset)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitglied nicht gefunden"}})
			return
		}
		writeInternalErrorResponse(c, "interner serverfehler", err, "Projekte konnten nicht geladen werden.")
		return
	}
	if page.ProfileVisibility == models.ProfileVisibilityPrivate && !page.IsOwner {
		c.JSON(http.StatusOK, gin.H{"visible": false, "reason": "private"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": page})
}

func parseBoundedProjectPageValue(raw string, fallback int, minimum int, maximum int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value < minimum {
		return fallback
	}
	if value > maximum {
		return maximum
	}
	return value
}
