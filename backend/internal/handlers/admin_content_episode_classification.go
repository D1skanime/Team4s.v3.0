package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ListEpisodeClassifications verarbeitet GET /api/v1/admin/anime/:id/episode-classifications
// und liefert Canon/Filler und Episodentyp aller Episoden eines Anime.
func (h *AdminContentHandler) ListEpisodeClassifications(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	animeID, err := parseAnimeID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige anime id")
		return
	}

	items, err := h.repo.ListEpisodeClassificationsByAnime(c.Request.Context(), animeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin_content episode_classifications: repo error (user_id=%d, anime_id=%d): %v", identity.UserID, animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Episoden-Einstufungen konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// ListEpisodeClassificationOptions verarbeitet GET /api/v1/admin/episode-classification-options
// und liefert Code+Label-Paare beider Einstufungs-Lookup-Tabellen (GAP-11), damit
// das Admin-Frontend seine hartcodierte Label-Map durch einen DB-Read ersetzen kann.
func (h *AdminContentHandler) ListEpisodeClassificationOptions(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	options, err := h.repo.ListEpisodeClassificationOptions(c.Request.Context())
	if err != nil {
		log.Printf("admin_content episode_classification_options: repo error (user_id=%d): %v", identity.UserID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Einstufungs-Optionen konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": options})
}

// validateEpisodeClassificationPatch prüft Canon/Filler und Episodentyp eines
// Episode-PATCH exakt gegen die Allowlists. Es gibt keinen stillen Fallback.
func validateEpisodeClassificationPatch(req *models.AdminEpisodePatchInput) string {
	if req.FillerType.Set {
		value := normalizeRequiredString(req.FillerType.Value)
		if value == nil || !models.IsValidEpisodeFillerType(*value) {
			return "ungültiger filler_type parameter"
		}
		req.FillerType.Value = value
	}
	if req.EpisodeType.Set {
		value := normalizeRequiredString(req.EpisodeType.Value)
		if value == nil || !models.IsValidEpisodeType(*value) {
			return "ungültiger episode_type parameter"
		}
		req.EpisodeType.Value = value
	}
	return ""
}
