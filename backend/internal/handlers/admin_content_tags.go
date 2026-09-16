package handlers

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// ListTagTokens verarbeitet GET /api/v1/admin/tags und gibt normalisierte Tag-Token absteigend nach Verwendungshäufigkeit zurück, mit optionalem Teilstring-Filter und konfigurierbarem Limit.
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
		badRequest(c, "ungültiger query parameter")
		return
	}

	limit := 200
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

	items, err := h.repo.ListTagTokens(c.Request.Context(), q, limit)
	if err != nil {
		log.Printf("admin_content list_tags: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// upsertNameRequest is the PATCH body shape for setting/clearing a tag's or
// genre's German display name (D-04). Shared between tag and genre handlers.
type upsertNameRequest struct {
	Name string `json:"name"`
}

// ListTagNames verarbeitet GET /api/v1/admin/tags/names und liefert je Tag Grundname,
// Nutzungsanzahl und aktuellen deutschen Namen für die Admin-Pflegeseite (D-04).
func (h *AdminContentHandler) ListTagNames(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	items, err := h.repo.ListTagNamesAdmin(c.Request.Context())
	if err != nil {
		log.Printf("admin_content list_tag_names: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// UpsertTagName verarbeitet PATCH /api/v1/admin/tags/:id/names/de und setzt oder löscht
// (bei leerem/nur-Leerzeichen-Namen) den deutschen Anzeigenamen eines Tags, global für
// alle Anime (D-04).
func (h *AdminContentHandler) UpsertTagName(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}

	tagID, err := strconv.ParseInt(c.Param("id"), 10, 64)
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

	if err := h.repo.UpsertTagGermanName(c.Request.Context(), tagID, req.Name); err != nil {
		log.Printf("admin_content upsert_tag_name: repo error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": tagID, "name_de": strings.TrimSpace(req.Name)}})
}
