package handlers

import (
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ContributionsPublicHandler verwaltet öffentliche HTTP-Endpunkte für Contributions.
// Diese Routen erfordern keine Authentifizierung.
type ContributionsPublicHandler struct {
	repo *repository.AnimeContributionsRepository
}

// NewContributionsPublicHandler erstellt einen neuen ContributionsPublicHandler.
func NewContributionsPublicHandler(repo *repository.AnimeContributionsRepository) *ContributionsPublicHandler {
	return &ContributionsPublicHandler{repo: repo}
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
	memberSlug := c.Param("slug")
	if len(memberSlug) < 2 {
		badRequest(c, "ungültiger member-slug")
		return
	}

	response, err := h.repo.GetPublicMemberContributions(c.Request.Context(), memberSlug)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, response)
}
