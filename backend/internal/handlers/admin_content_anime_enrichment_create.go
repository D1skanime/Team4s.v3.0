package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// adminAniSearchCreateEnricher definiert die Schnittstelle für den AniSearch-Anreicherungsdienst beim Erstellen eines neuen Anime.
type adminAniSearchCreateEnricher interface {
	Enrich(ctx context.Context, req models.AdminAnimeAniSearchEnrichmentRequest) (any, error)
}

// LoadAnimeCreateAniSearchEnrichment verarbeitet POST /api/v1/admin/anime/anisearch/enrich und lädt AniSearch-Daten für einen neuen Anime-Entwurf.
func (h *AdminContentHandler) LoadAnimeCreateAniSearchEnrichment(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req models.AdminAnimeAniSearchEnrichmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	req.AniSearchID = strings.TrimSpace(req.AniSearchID)
	if req.AniSearchID == "" {
		badRequest(c, "anisearch_id ist erforderlich")
		return
	}

	service, ok := h.enrichmentService.(adminAniSearchCreateEnricher)
	if !ok || service == nil {
		writeInternalErrorResponse(c, "interner serverfehler", fmt.Errorf("anisearch create enrichment unavailable"), "AniSearch-Daten konnten nicht geladen werden.")
		return
	}

	result, err := service.Enrich(c.Request.Context(), req)
	if err != nil {
		log.Printf("admin_content anisearch_create: enrichment load failed (user_id=%d): %v", identity.UserID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "AniSearch-Daten konnten nicht geladen werden.")
		return
	}

	switch payload := result.(type) {
	case models.AdminAnimeAniSearchEnrichmentDraftResult:
		c.JSON(http.StatusOK, gin.H{"data": payload})
	case models.AdminAnimeAniSearchEnrichmentRedirectResult:
		c.JSON(http.StatusConflict, gin.H{"data": payload})
	default:
		writeInternalErrorResponse(c, "interner serverfehler", fmt.Errorf("unexpected anisearch create enrichment result %T", result), "AniSearch-Daten konnten nicht geladen werden.")
	}
}
