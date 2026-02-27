package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) ListGenreTokens(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	q := strings.TrimSpace(c.Query("q"))
	if len([]rune(q)) > 100 {
		badRequest(c, "ungueltiger q parameter")
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

	items, err := h.repo.ListGenreTokens(c.Request.Context(), q, limit)
	if err != nil {
		log.Printf("admin_content list_genres: repo error (user_id=%d): %v", identity.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}
