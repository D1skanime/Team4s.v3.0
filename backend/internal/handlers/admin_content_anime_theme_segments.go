package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type adminAnimeThemeSegmentCreateRequest struct {
	StartEpisodeID *int64 `json:"start_episode_id"`
	EndEpisodeID   *int64 `json:"end_episode_id"`
}

// ListAnimeThemeSegments verarbeitet GET /api/v1/admin/anime/:id/themes/:themeId/segments.
func (h *AdminContentHandler) ListAnimeThemeSegments(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	themeID, err := strconv.ParseInt(c.Param("themeId"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungueltige theme id")
		return
	}

	items, err := h.themeRepo.ListAdminAnimeThemeSegments(c.Request.Context(), themeID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "theme nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme segments list: theme_id=%d: %v", themeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Segmente konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateAnimeThemeSegment verarbeitet POST /api/v1/admin/anime/:id/themes/:themeId/segments.
func (h *AdminContentHandler) CreateAnimeThemeSegment(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	themeID, err := strconv.ParseInt(c.Param("themeId"), 10, 64)
	if err != nil || themeID <= 0 {
		badRequest(c, "ungueltige theme id")
		return
	}

	var req adminAnimeThemeSegmentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	created, err := h.themeRepo.CreateAdminAnimeThemeSegment(c.Request.Context(), themeID, models.AdminAnimeThemeSegmentCreateInput{
		StartEpisodeID: req.StartEpisodeID,
		EndEpisodeID:   req.EndEpisodeID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "theme nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "ungueltige episode referenz", "code": "invalid_episode"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme segment create: theme_id=%d: %v", themeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Segment konnte nicht gespeichert werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// DeleteAnimeThemeSegment verarbeitet DELETE /api/v1/admin/anime/:id/themes/:themeId/segments/:segmentId.
func (h *AdminContentHandler) DeleteAnimeThemeSegment(c *gin.Context) {
	if _, ok := h.requireAdmin(c); !ok {
		return
	}
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfuegbar"}})
		return
	}

	segmentID, err := strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungueltige segment id")
		return
	}

	err = h.themeRepo.DeleteAdminAnimeThemeSegment(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime theme segment delete: segment_id=%d: %v", segmentID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Segment konnte nicht geloescht werden.")
		return
	}

	c.Status(http.StatusNoContent)
}
