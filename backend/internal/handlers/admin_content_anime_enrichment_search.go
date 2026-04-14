package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// SearchAnimeCreateAniSearchCandidates verarbeitet GET /api/v1/admin/anime/anisearch/search und liefert AniSearch-Kandidaten für die Anime-Erstellung.
func (h *AdminContentHandler) SearchAnimeCreateAniSearchCandidates(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		badRequest(c, "q ist erforderlich")
		return
	}

	limit := 12
	if rawLimit := strings.TrimSpace(c.Query("limit")); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 {
			badRequest(c, "limit muss eine positive Zahl sein")
			return
		}
		if parsedLimit > 20 {
			parsedLimit = 20
		}
		limit = parsedLimit
	}

	if h.enrichmentService == nil {
		writeInternalErrorResponse(
			c,
			"interner serverfehler",
			http.ErrNotSupported,
			"AniSearch-Suche ist aktuell nicht verfuegbar.",
		)
		return
	}

	results, err := h.enrichmentService.SearchAniSearchCandidates(c.Request.Context(), query, limit)
	if err != nil {
		log.Printf("admin_content anisearch_search: candidate search failed: %v", err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "AniSearch-Treffer konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}
