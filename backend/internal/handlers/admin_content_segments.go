package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// GetAnimeSegmentSuggestions verarbeitet GET /api/v1/admin/anime/:id/segments/suggestions
// Query-Parameter: episode (int, Pflicht), exclude_group_id (int, optional), exclude_version (string, optional).
// Gibt Segmente zurueck, deren Episodenbereich den angegebenen episode-Wert abdeckt,
// mit Ausnahme der aktuellen (exclude_group_id, exclude_version)-Kombination.
func (h *AdminContentHandler) GetAnimeSegmentSuggestions(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungueltige anime id")
		return
	}

	rawEpisode := c.Query("episode")
	if rawEpisode == "" {
		badRequest(c, "episode parameter ist erforderlich")
		return
	}
	episode64, err := strconv.ParseInt(rawEpisode, 10, 64)
	if err != nil || episode64 <= 0 {
		badRequest(c, "ungueltige episode")
		return
	}
	episodeNumber := int(episode64)

	var excludeGroupID int64
	if raw := c.Query("exclude_group_id"); raw != "" {
		excludeGroupID, err = strconv.ParseInt(raw, 10, 64)
		if err != nil || excludeGroupID <= 0 {
			badRequest(c, "ungueltige exclude_group_id")
			return
		}
	}

	excludeVersion := c.Query("exclude_version")

	segments, err := h.themeRepo.ListAnimeSegmentSuggestions(c.Request.Context(), animeID, episodeNumber, excludeGroupID, excludeVersion)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment suggestions: anime_id=%d episode=%d: %v", animeID, episodeNumber, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Vorschlaege konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": segments})
}
