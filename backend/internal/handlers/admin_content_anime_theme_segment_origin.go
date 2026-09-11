package handlers

import (
	"errors"
	"log"
	"net/http"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// adminAnimeSegmentOriginRequest ist der Body fuer
// PUT /api/v1/admin/anime/:id/segments/:segmentId/origin (Phase 156, Workstream C, P156-06).
type adminAnimeSegmentOriginRequest struct {
	ReleaseVersionID int64 `json:"release_version_id"`
}

// SetAnimeSegmentOrigin verarbeitet PUT /api/v1/admin/anime/:id/segments/:segmentId/origin.
// Setzt oder korrigiert die administrativ korrigierbare origin_release_version_id eines
// Kara-Segments (P156-06). Die Ziel-Release-Version muss dem Segment bereits ueber
// theme_segment_assignments zugewiesen sein -- ein abweichendes Ziel wird mit 409
// (code "origin_not_assigned") abgelehnt, nicht still uebernommen (T-156-02). Die Berechtigung
// laeuft ueber DIESELBE requireSegmentManage-Pruefung wie jeder andere Segment-Schreibpfad,
// keine neue/parallele Autorisierung (T-156-11).
func (h *AdminContentHandler) SetAnimeSegmentOrigin(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, segmentID, ok := parseSegmentAssignmentPathIDs(c)
	if !ok {
		return
	}

	var req adminAnimeSegmentOriginRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ReleaseVersionID <= 0 {
		badRequest(c, "release_version_id ist erforderlich")
		return
	}

	if !h.requireSegmentManage(c, req.ReleaseVersionID) {
		return
	}

	if err := h.themeRepo.SetThemeSegmentOrigin(c.Request.Context(), segmentID, req.ReleaseVersionID); err != nil {
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "release_version_id ist diesem Segment nicht zugewiesen", "code": "origin_not_assigned"}})
			return
		}
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
			return
		}
		log.Printf("admin anime segment origin set: segment=%d release_version=%d: %v", segmentID, req.ReleaseVersionID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Origin konnte nicht gespeichert werden.")
		return
	}

	segment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, req.ReleaseVersionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nach dem Setzen der Origin nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": segment})
}
