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
		badRequest(c, "ungueltiger query parameter")
		return
	}

	limit := 20
	if limitRaw := strings.TrimSpace(c.Query("limit")); limitRaw != "" {
		value, err := strconv.Atoi(limitRaw)
		if err != nil || value <= 0 {
			badRequest(c, "ungueltiger limit parameter")
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
