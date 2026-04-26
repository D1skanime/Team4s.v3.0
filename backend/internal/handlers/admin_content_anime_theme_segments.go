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

type adminAnimeSegmentCreateRequest struct {
	ThemeID              int64   `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              string  `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
}

type adminAnimeSegmentPatchRequest struct {
	ThemeID              *int64  `json:"theme_id"`
	FansubGroupID        *int64  `json:"fansub_group_id"`
	Version              *string `json:"version"`
	StartEpisode         *int    `json:"start_episode"`
	EndEpisode           *int    `json:"end_episode"`
	StartTime            *string `json:"start_time"`
	EndTime              *string `json:"end_time"`
	SourceJellyfinItemID *string `json:"source_jellyfin_item_id"`
}

// ListAnimeSegments verarbeitet GET /api/v1/admin/anime/:id/segments
// Query-Parameter: group_id (optional, int64), version (optional, string).
func (h *AdminContentHandler) ListAnimeSegments(c *gin.Context) {
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

	var groupID int64
	if raw := c.Query("group_id"); raw != "" {
		groupID, err = strconv.ParseInt(raw, 10, 64)
		if err != nil || groupID <= 0 {
			badRequest(c, "ungueltige group_id")
			return
		}
	}

	version := c.Query("version")

	items, err := h.themeRepo.ListAnimeSegments(c.Request.Context(), animeID, groupID, version)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segments list: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segmente konnten nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateAnimeSegment verarbeitet POST /api/v1/admin/anime/:id/segments
// Body: { theme_id, fansub_group_id?, version, start_episode?, end_episode?,
//
//	start_time?, end_time?, source_jellyfin_item_id? }
func (h *AdminContentHandler) CreateAnimeSegment(c *gin.Context) {
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

	var req adminAnimeSegmentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	if req.ThemeID <= 0 {
		badRequest(c, "theme_id ist erforderlich")
		return
	}

	version := req.Version
	if version == "" {
		version = "v1"
	}

	created, err := h.themeRepo.CreateAnimeSegment(c.Request.Context(), animeID, models.AdminThemeSegmentCreateInput{
		ThemeID:              req.ThemeID,
		FansubGroupID:        req.FansubGroupID,
		Version:              version,
		StartEpisode:         req.StartEpisode,
		EndEpisode:           req.EndEpisode,
		StartTime:            req.StartTime,
		EndTime:              req.EndTime,
		SourceJellyfinItemID: req.SourceJellyfinItemID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime oder theme nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "ungueltige gruppe oder constraint verletzt", "code": "invalid_theme_or_group"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment create: anime_id=%d: %v", animeID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht gespeichert werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

// UpdateAnimeSegment verarbeitet PATCH /api/v1/admin/anime/:id/segments/:segmentId
// Body: alle Felder optional (partieller Patch).
func (h *AdminContentHandler) UpdateAnimeSegment(c *gin.Context) {
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

	var req adminAnimeSegmentPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungueltiger request body")
		return
	}

	err = h.themeRepo.UpdateAnimeSegment(c.Request.Context(), segmentID, models.AdminThemeSegmentPatchInput{
		ThemeID:              req.ThemeID,
		FansubGroupID:        req.FansubGroupID,
		Version:              req.Version,
		StartEpisode:         req.StartEpisode,
		EndEpisode:           req.EndEpisode,
		StartTime:            req.StartTime,
		EndTime:              req.EndTime,
		SourceJellyfinItemID: req.SourceJellyfinItemID,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "constraint verletzt", "code": "constraint_violation"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment update: segment_id=%d: %v", segmentID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht aktualisiert werden.")
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteAnimeSegment verarbeitet DELETE /api/v1/admin/anime/:id/segments/:segmentId.
func (h *AdminContentHandler) DeleteAnimeSegment(c *gin.Context) {
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

	err = h.themeRepo.DeleteAnimeSegment(c.Request.Context(), segmentID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment delete: segment_id=%d: %v", segmentID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geloescht werden.")
		return
	}

	c.Status(http.StatusNoContent)
}
