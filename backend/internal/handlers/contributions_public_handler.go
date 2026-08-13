package handlers

import (
	"context"
	"errors"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type publicContributionsLoader interface {
	GetPublicGroupContributions(context.Context, int64) (*repository.PublicGroupContributionsResponse, error)
	GetPublicAnimeContributions(context.Context, int64) (*repository.PublicAnimeContributionsResponse, error)
	GetPublicMemberContributionsByID(context.Context, int64) (*repository.PublicMemberContributionsResponse, error)
}

// ContributionsPublicHandler verwaltet öffentliche HTTP-Endpunkte für Contributions.
// Diese Routen erfordern keine Authentifizierung.
type ContributionsPublicHandler struct {
	accessResolver publicMemberAccessResolver
	repo           publicContributionsLoader
}

// NewContributionsPublicHandler erstellt einen neuen ContributionsPublicHandler.
func NewContributionsPublicHandler(
	accessResolver publicMemberAccessResolver,
	repo publicContributionsLoader,
) *ContributionsPublicHandler {
	return &ContributionsPublicHandler{accessResolver: accessResolver, repo: repo}
}

// GetFansubContributions handles GET /api/v1/fansubs/:id/contributions
// Gibt öffentliche Contributions einer Fansub-Gruppe zurück (is_public_on_anime_page=true, visibility='public').
func (h *ContributionsPublicHandler) GetFansubContributions(c *gin.Context) {
	fansubGroupID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub-id")
		return
	}

	response, err := h.repo.GetPublicGroupContributions(c.Request.Context(), fansubGroupID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetAnimeContributions handles GET /api/v1/anime/:id/contributions
// Gibt öffentliche Contributions für einen Anime zurück (is_public_on_anime_page=true).
func (h *ContributionsPublicHandler) GetAnimeContributions(c *gin.Context) {
	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime-id")
		return
	}

	response, err := h.repo.GetPublicAnimeContributions(c.Request.Context(), animeID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetMemberContributions handles GET /api/v1/members/:slug/contributions
// Gibt öffentliche Contributions eines Members zurück (is_public_on_member_profile=true).
func (h *ContributionsPublicHandler) GetMemberContributions(c *gin.Context) {
	access, ok := resolvePublicMemberAccess(c, h.accessResolver, c.Param("slug"))
	if !ok {
		return
	}

	response, err := h.repo.GetPublicMemberContributionsByID(c.Request.Context(), access.MemberID)
	if errors.Is(err, repository.ErrNotFound) {
		writePublicMemberUnavailable(c)
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}
