package handlers

import (
	"errors"
	"math"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListFansubAnimeReleases verarbeitet GET /api/v1/admin/fansubs/:id/anime/:animeId/releases.
// Liefert Fansub-Releases paginiert für eine Fansub-Anime-Kombination.
func (h *AdminContentHandler) ListFansubAnimeReleases(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "release service nicht verfügbar"}})
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Release-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
	if err != nil {
		badRequest(c, "ungültiger page parameter")
		return
	}
	perPage, err := parsePositiveInt(c.DefaultQuery("per_page", "30"))
	if err != nil {
		badRequest(c, "ungültiger per_page parameter")
		return
	}
	if perPage > 100 {
		perPage = 100
	}

	items, total, err := h.themeRepo.ListFansubAnimeReleasesPage(c.Request.Context(), fansubID, animeID, page, perPage)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansub oder anime nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Releases konnten nicht geladen werden.")
		return
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(perPage)))
	}

	c.JSON(http.StatusOK, models.AdminFansubAnimeReleasesResponse{
		Data: items,
		Meta: models.PaginationMeta{
			Total:      total,
			Page:       page,
			PerPage:    perPage,
			TotalPages: totalPages,
		},
	})
}

// GetCanonicalFansubAnimeReleaseSummary verarbeitet
// GET /api/v1/admin/fansubs/:id/anime/:animeId/releases/canonical.
// Liefert den kanonischen Release-Anker für eine Fansub-Anime-Kombination.
// Wenn kein Anker existiert, wird 200 mit release=null geliefert.
func (h *AdminContentHandler) GetCanonicalFansubAnimeReleaseSummary(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "release service nicht verfügbar"}})
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Release-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	resp, err := h.themeRepo.GetCanonicalFansubAnimeReleaseSummary(c.Request.Context(), fansubID, animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansub oder anime nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Kanonischer Release konnte nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetAdminRelease verarbeitet GET /api/v1/admin/releases/:releaseId.
// Liefert eine vollstaendige Release-Summary für eine explizit adressierte Release-ID.
func (h *AdminContentHandler) GetAdminRelease(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "release service nicht verfügbar"}})
		return
	}

	releaseID, err := strconv.ParseInt(c.Param("releaseId"), 10, 64)
	if err != nil || releaseID <= 0 {
		badRequest(c, "ungültige release id")
		return
	}

	result, err := h.permissionSvc.CanForRelease(c.Request.Context(), actor, permissions.ActionReleaseView, releaseID)
	if err != nil {
		writePermissionInternalError(c, err, "Release-Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	item, err := h.themeRepo.GetAdminReleaseByID(c.Request.Context(), releaseID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release konnte nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": item})
}
