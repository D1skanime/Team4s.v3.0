package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type AppPublicProfileHandler struct {
	accessResolver publicMemberAccessResolver
	profileLoader  publicMemberProfileLoader
	projectsLoader publicMemberProjectsLoader
}

func NewAppPublicProfileHandler(
	accessResolver publicMemberAccessResolver,
	profileLoader publicMemberProfileLoader,
	projectsLoader publicMemberProjectsLoader,
) *AppPublicProfileHandler {
	return &AppPublicProfileHandler{
		accessResolver: accessResolver,
		profileLoader:  profileLoader,
		projectsLoader: projectsLoader,
	}
}

func (h *AppPublicProfileHandler) GetPublicMemberProfile(c *gin.Context) {
	access, ok := resolvePublicMemberAccess(c, h.accessResolver, c.Param("slug"))
	if !ok {
		return
	}
	if h.profileLoader == nil {
		writeInternalErrorResponse(c, "interner serverfehler", nil, "Profil konnte nicht geladen werden.")
		return
	}

	profile, err := h.profileLoader.GetPublicMemberProfileByID(
		c.Request.Context(),
		access.MemberID,
	)
	if errors.Is(err, repository.ErrNotFound) {
		writePublicMemberUnavailable(c)
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Profil konnte nicht geladen werden.")
		return
	}

	profile.IsOwner = access.IsOwner
	profile.IsPrivatePreview = access.IsPrivatePreview
	c.JSON(http.StatusOK, gin.H{
		"data": profile,
		"viewer": gin.H{
			"is_owner":           access.IsOwner,
			"is_private_preview": access.IsPrivatePreview,
		},
	})
}

func (h *AppPublicProfileHandler) GetPublicMemberProjects(c *gin.Context) {
	access, ok := resolvePublicMemberAccess(c, h.accessResolver, c.Param("slug"))
	if !ok {
		return
	}
	if h.projectsLoader == nil {
		writeInternalErrorResponse(c, "interner serverfehler", nil, "Projekte konnten nicht geladen werden.")
		return
	}

	limit := parseBoundedProjectPageValue(c.Query("limit"), 6, 1, 24)
	offset := parseBoundedProjectPageValue(c.Query("offset"), 0, 0, 10000)
	page, err := h.projectsLoader.GetPublicMemberProjectsByID(
		c.Request.Context(),
		access.MemberID,
		limit,
		offset,
	)
	if errors.Is(err, repository.ErrNotFound) {
		writePublicMemberUnavailable(c)
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Projekte konnten nicht geladen werden.")
		return
	}

	page.IsOwner = access.IsOwner
	page.IsPrivatePreview = access.IsPrivatePreview
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
