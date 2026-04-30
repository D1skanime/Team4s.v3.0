package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListFansubAnimeReleases verarbeitet GET /api/v1/admin/fansubs/:id/anime/:animeId/releases.
// Liefert alle Fansub-Releases fuer eine Fansub-Anime-Kombination als explizite Admin-Ressourcen.
func (h *AdminContentHandler) ListFansubAnimeReleases(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "release service nicht verfuegbar"}})
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungueltige fansub id")
		return
	}
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}

	items, err := h.themeRepo.ListFansubAnimeReleases(c.Request.Context(), fansubID, animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansub oder anime nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Releases konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// GetCanonicalFansubAnimeReleaseSummary verarbeitet
// GET /api/v1/admin/fansubs/:id/anime/:animeId/releases/canonical.
// Liefert den kanonischen Release-Anker fuer eine Fansub-Anime-Kombination.
// Wenn kein Anker existiert, wird 200 mit release=null geliefert.
func (h *AdminContentHandler) GetCanonicalFansubAnimeReleaseSummary(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "release service nicht verfuegbar"}})
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungueltige fansub id")
		return
	}
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
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
// Liefert eine vollstaendige Release-Summary fuer eine explizit adressierte Release-ID.
func (h *AdminContentHandler) GetAdminRelease(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "release service nicht verfuegbar"}})
		return
	}

	releaseID, err := strconv.ParseInt(c.Param("releaseId"), 10, 64)
	if err != nil || releaseID <= 0 {
		badRequest(c, "ungueltige release id")
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
