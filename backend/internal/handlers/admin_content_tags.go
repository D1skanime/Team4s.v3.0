package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// ListTagTokens handles GET /api/v1/admin/tags.
//
// Returns normalized tag tokens sorted by usage count descending, with an
// optional substring filter and configurable limit. Mirrors the genre token
// endpoint shape so frontend state management stays parallel.
func (h *AdminContentHandler) ListTagTokens(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	// Accept both "query" and "q" for consistency with the genre token endpoint.
	q := strings.TrimSpace(c.Query("query"))
	if q == "" {
		q = strings.TrimSpace(c.Query("q"))
	}
	if len([]rune(q)) > 100 {
		badRequest(c, "ungueltiger query parameter")
		return
	}

	limit := 200
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

	items, err := h.repo.ListTagTokens(c.Request.Context(), q, limit)
	if err != nil {
		log.Printf("admin_content list_tags: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}
