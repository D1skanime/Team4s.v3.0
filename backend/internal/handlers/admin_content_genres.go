package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// ListGenreTokens verarbeitet GET /api/v1/admin/genres und gibt normalisierte Genre-Token für Admins zurück.
func (h *AdminContentHandler) ListGenreTokens(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	h.listGenreTokens(c)
}

// ListGenreTokensPublic verarbeitet GET /api/v1/genres und gibt normalisierte Genre-Token ohne Authentifizierungspflicht zurück.
func (h *AdminContentHandler) ListGenreTokensPublic(c *gin.Context) {
	h.listGenreTokens(c)
}

func (h *AdminContentHandler) listGenreTokens(c *gin.Context) {
	q := strings.TrimSpace(c.Query("query"))
	if q == "" {
		q = strings.TrimSpace(c.Query("q"))
	}
	if len([]rune(q)) > 100 {
		badRequest(c, "ungültiger query parameter")
		return
	}

	limit := 20
	if limitRaw := strings.TrimSpace(c.Query("limit")); limitRaw != "" {
		value, err := strconv.Atoi(limitRaw)
		if err != nil || value <= 0 {
			badRequest(c, "ungültiger limit parameter")
			return
		}
		limit = value
	}
	if limit > 1000 {
		limit = 1000
	}

	items, err := h.repo.ListGenreTokens(c.Request.Context(), q, limit)
	if err != nil {
		log.Printf("admin_content list_genres: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// ListGenreNames verarbeitet GET /api/v1/admin/genres/names und liefert je Genre Grundname,
// Nutzungsanzahl und aktuellen deutschen Namen für die Admin-Pflegeseite (D-04/D-07).
func (h *AdminContentHandler) ListGenreNames(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	items, err := h.repo.ListGenreNamesAdmin(c.Request.Context())
	if err != nil {
		log.Printf("admin_content list_genre_names: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// UpsertGenreName verarbeitet PATCH /api/v1/admin/genres/:id/names/de und setzt oder löscht
// (bei leerem/nur-Leerzeichen-Namen) den deutschen Anzeigenamen eines Genres, global für
// alle Anime (D-04/D-07).
func (h *AdminContentHandler) UpsertGenreName(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	genreID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequest(c, "ungültiger id parameter")
		return
	}

	var req upsertNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger anfrage-body")
		return
	}
	if len([]rune(req.Name)) > 100 {
		badRequest(c, "ungültiger name parameter")
		return
	}

	if err := h.repo.UpsertGenreGermanName(c.Request.Context(), genreID, req.Name); err != nil {
		log.Printf("admin_content upsert_genre_name: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": genreID, "name_de": strings.TrimSpace(req.Name)}})
}
