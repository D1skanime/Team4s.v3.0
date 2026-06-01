package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// FansubAnimeContributionsHandler verwaltet Admin-Endpunkte für anime_contributions.
type FansubAnimeContributionsHandler struct {
	contributionsRepo *repository.AnimeContributionsRepository
	rolesRepo         *repository.HistGroupMemberRolesRepository
}

// NewFansubAnimeContributionsHandler erstellt einen neuen FansubAnimeContributionsHandler.
func NewFansubAnimeContributionsHandler(
	contributionsRepo *repository.AnimeContributionsRepository,
	rolesRepo *repository.HistGroupMemberRolesRepository,
) *FansubAnimeContributionsHandler {
	return &FansubAnimeContributionsHandler{
		contributionsRepo: contributionsRepo,
		rolesRepo:         rolesRepo,
	}
}

type animeContributionCreateRequest struct {
	FansubGroupMemberID     int64    `json:"fansub_group_member_id"`
	RoleCodes               []string `json:"role_codes"`
	StartedYear             *int     `json:"started_year"`
	EndedYear               *int     `json:"ended_year"`
	Note                    *string  `json:"note"`
	IsPublicOnAnimePage     bool     `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile bool     `json:"is_public_on_member_profile"`
}

type animeContributionPatchRequest struct {
	RoleCodes               *[]string `json:"role_codes"`
	StartedYear             **int     `json:"started_year"`
	EndedYear               **int     `json:"ended_year"`
	Note                    **string  `json:"note"`
	IsPublicOnAnimePage     *bool     `json:"is_public_on_anime_page"`
	IsPublicOnMemberProfile *bool     `json:"is_public_on_member_profile"`
	Status                  *string   `json:"status"`
}

// parseAnimeIDParam parst den :animeId-Parameter zu int64.
func parseAnimeIDParam(c *gin.Context) (int64, error) {
	raw := c.Param("animeId")
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("ungültige anime id: %q", raw)
	}
	return id, nil
}

// ListAnimeContributions gibt alle Beiträge einer Fansub-Gruppe für ein Anime zurück.
// GET /admin/fansubs/:id/anime/:animeId/contributions
func (h *FansubAnimeContributionsHandler) ListAnimeContributions(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := parseAnimeIDParam(c)
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	items, err := h.contributionsRepo.ListByFansubAndAnime(c.Request.Context(), fansubID, animeID)
	if err != nil {
		log.Printf("anime contributions list: repo error (fansub_id=%d, anime_id=%d): %v", fansubID, animeID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateAnimeContribution legt einen neuen Beitragseintrag an.
// POST /admin/fansubs/:id/anime/:animeId/contributions
func (h *FansubAnimeContributionsHandler) CreateAnimeContribution(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := parseAnimeIDParam(c)
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	var req animeContributionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.FansubGroupMemberID <= 0 {
		badRequest(c, "fansub_group_member_id ist erforderlich")
		return
	}

	for _, code := range req.RoleCodes {
		valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), code, "anime_contribution")
		if err != nil {
			log.Printf("anime contributions create: role validation error (code=%s): %v", code, err)
			internalError(c, "interner serverfehler")
			return
		}
		if !valid {
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error": gin.H{
					"message": fmt.Sprintf("ungültiger role_code für anime_contribution-Kontext: %s", code),
				},
			})
			return
		}
	}

	input := repository.AnimeContributionInput{
		FansubGroupMemberID:     req.FansubGroupMemberID,
		RoleCodes:               req.RoleCodes,
		StartedYear:             req.StartedYear,
		EndedYear:               req.EndedYear,
		Note:                    req.Note,
		IsPublicOnAnimePage:     req.IsPublicOnAnimePage,
		IsPublicOnMemberProfile: req.IsPublicOnMemberProfile,
	}

	item, err := h.contributionsRepo.Create(c.Request.Context(), fansubID, animeID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe, anime oder mitglied nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime contributions create: repo error (fansub_id=%d, anime_id=%d): %v", fansubID, animeID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// UpdateAnimeContribution aktualisiert einen Beitragseintrag.
// PATCH /admin/fansubs/:id/anime/:animeId/contributions/:contributionId
func (h *FansubAnimeContributionsHandler) UpdateAnimeContribution(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := parseAnimeIDParam(c)
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	contributionID, err := strconv.ParseInt(c.Param("contributionId"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige contribution id")
		return
	}

	var req animeContributionPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.RoleCodes != nil && len(*req.RoleCodes) > 0 {
		for _, code := range *req.RoleCodes {
			valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), code, "anime_contribution")
			if err != nil {
				log.Printf("anime contributions update: role validation error (code=%s): %v", code, err)
				internalError(c, "interner serverfehler")
				return
			}
			if !valid {
				c.JSON(http.StatusUnprocessableEntity, gin.H{
					"error": gin.H{
						"message": fmt.Sprintf("ungültiger role_code für anime_contribution-Kontext: %s", code),
					},
				})
				return
			}
		}
	}

	input := repository.AnimeContributionPatchInput{
		RoleCodes:               req.RoleCodes,
		StartedYear:             req.StartedYear,
		EndedYear:               req.EndedYear,
		Note:                    req.Note,
		IsPublicOnAnimePage:     req.IsPublicOnAnimePage,
		IsPublicOnMemberProfile: req.IsPublicOnMemberProfile,
		Status:                  req.Status,
	}

	item, err := h.contributionsRepo.Update(c.Request.Context(), contributionID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "beitragseintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("anime contributions update: repo error (fansub_id=%d, anime_id=%d, contribution_id=%d): %v", fansubID, animeID, contributionID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}

// DeleteAnimeContribution entfernt einen Beitragseintrag.
// DELETE /admin/fansubs/:id/anime/:animeId/contributions/:contributionId
func (h *FansubAnimeContributionsHandler) DeleteAnimeContribution(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := parseAnimeIDParam(c)
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	contributionID, err := strconv.ParseInt(c.Param("contributionId"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige contribution id")
		return
	}

	if err := h.contributionsRepo.Delete(c.Request.Context(), contributionID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "beitragseintrag nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("anime contributions delete: repo error (fansub_id=%d, anime_id=%d, contribution_id=%d): %v", fansubID, animeID, contributionID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.Status(http.StatusNoContent)
}
