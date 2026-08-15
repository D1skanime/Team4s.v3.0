package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// Phase 131-05 (CONTEXT D-04): documented, enforced page-size bounds for every public
// profile list. INITIALS are the fixed contract (they match today's behaviour); MAX
// values are the enforced ceiling a continuation request is clamped to (tunable after the
// 131-08 baseline, hence named constants rather than literals). The repository package
// owns the matching INITIAL constants it passes on the embedded profile load; these
// handler-side constants own the HTTP-facing INITIAL default + MAX clamp for each list.
//
// current_projects is the only list with a live continuation endpoint today
// (GetPublicMemberProjects); the latest/previous/contributions bounds are documented here
// as the contract their continuation endpoints (OpenAPI in 131-06) will clamp to.
const (
	currentProjectsInitialPageSize = 6
	currentProjectsMaxPageSize     = 24

	latestContributionsInitialPageSize = 3
	latestContributionsMaxPageSize     = 20

	previousContributionsInitialPageSize = 6
	previousContributionsMaxPageSize     = 24

	contributionsEndpointInitialPageSize = 20
	contributionsEndpointMaxPageSize     = 50

	// memberPageOffsetMax bounds honest offset pagination (D-01) to a sane ceiling.
	memberPageOffsetMax = 10000
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

	limit := parseBoundedProjectPageValue(c.Query("limit"), currentProjectsInitialPageSize, 1, currentProjectsMaxPageSize)
	offset := parseBoundedProjectPageValue(c.Query("offset"), 0, 0, memberPageOffsetMax)
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
