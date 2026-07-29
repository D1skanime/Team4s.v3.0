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

// adminAnimeSegmentAssignmentRequest ist der Body fuer
// POST /api/v1/admin/anime/:id/segments/:segmentId/assignments (D-03).
type adminAnimeSegmentAssignmentRequest struct {
	ReleaseVersionID int64 `json:"release_version_id"`
}

// adminAnimeSegmentOverrideRequest ist der Body fuer
// PUT /api/v1/admin/anime/:id/segments/:segmentId/assignments/:releaseVersionId/override (D-01).
type adminAnimeSegmentOverrideRequest struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

// derefEpisodeOrZero liefert 0 (== "kein Bereichsfilter" fuer
// GetSegmentReleaseDuration), wenn value nil ist.
func derefEpisodeOrZero(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}

func parseSegmentAssignmentPathIDs(c *gin.Context) (animeID int64, segmentID int64, ok bool) {
	animeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return 0, 0, false
	}
	segmentID, err = strconv.ParseInt(c.Param("segmentId"), 10, 64)
	if err != nil || segmentID <= 0 {
		badRequest(c, "ungültige segment id")
		return 0, 0, false
	}
	return animeID, segmentID, true
}

func parseSegmentAssignmentReleaseVersionIDParam(c *gin.Context) (int64, bool) {
	releaseVersionID, err := strconv.ParseInt(c.Param("releaseVersionId"), 10, 64)
	if err != nil || releaseVersionID <= 0 {
		badRequest(c, "ungültige release_version_id")
		return 0, false
	}
	return releaseVersionID, true
}

// AssignAnimeSegment verarbeitet POST /api/v1/admin/anime/:id/segments/:segmentId/assignments.
// Weist ein geteiltes Kara-Segment einer weiteren Release-Version zu (D-03).
func (h *AdminContentHandler) AssignAnimeSegment(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, segmentID, ok := parseSegmentAssignmentPathIDs(c)
	if !ok {
		return
	}

	var req adminAnimeSegmentAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ReleaseVersionID <= 0 {
		badRequest(c, "release_version_id ist erforderlich")
		return
	}

	if !h.requireSegmentManage(c, req.ReleaseVersionID) {
		return
	}

	if _, err := h.themeRepo.AssignThemeSegmentToReleaseVersion(c.Request.Context(), segmentID, req.ReleaseVersionID); err != nil {
		if errors.Is(err, repository.ErrConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "zuweisung konnte nicht angelegt werden", "code": "assignment_conflict"}})
			return
		}
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
			return
		}
		log.Printf("admin anime segment assign: segment=%d release_version=%d: %v", segmentID, req.ReleaseVersionID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Zuweisung konnte nicht gespeichert werden.")
		return
	}

	segment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, req.ReleaseVersionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nach der Zuweisung nicht geladen werden.")
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": segment})
}

// UnassignAnimeSegment verarbeitet
// DELETE /api/v1/admin/anime/:id/segments/:segmentId/assignments/:releaseVersionId.
// Entzieht einem geteilten Kara-Segment eine Release-Version-Zuweisung (D-03).
func (h *AdminContentHandler) UnassignAnimeSegment(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, segmentID, ok := parseSegmentAssignmentPathIDs(c)
	if !ok {
		return
	}
	releaseVersionID, ok := parseSegmentAssignmentReleaseVersionIDParam(c)
	if !ok {
		return
	}

	if !h.requireSegmentManage(c, releaseVersionID) {
		return
	}

	if err := h.themeRepo.UnassignThemeSegmentFromReleaseVersion(c.Request.Context(), segmentID, releaseVersionID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "zuweisung nicht gefunden"}})
			return
		}
		log.Printf("admin anime segment unassign: segment=%d release_version=%d: %v", segmentID, releaseVersionID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Zuweisung konnte nicht entfernt werden.")
		return
	}

	// currentReleaseVersionID=0: die soeben entzogene Release-Version ist keine gueltige
	// Hydrations-Referenz mehr; GetAnimeSegmentByID faellt deterministisch auf eine
	// repraesentative verbleibende Zuweisung zurueck (siehe 117-04-SUMMARY.md).
	segment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, 0)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nach dem Entziehen nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": segment})
}

// UpsertAnimeSegmentEpisodeOverride verarbeitet
// PUT /api/v1/admin/anime/:id/segments/:segmentId/assignments/:releaseVersionId/override.
// Legt einen Per-Release-Version-Zeit-Override fuer eine zugewiesene Folge an oder
// aktualisiert ihn (D-01), ohne ein neues Segment anzulegen.
func (h *AdminContentHandler) UpsertAnimeSegmentEpisodeOverride(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, segmentID, ok := parseSegmentAssignmentPathIDs(c)
	if !ok {
		return
	}
	releaseVersionID, ok := parseSegmentAssignmentReleaseVersionIDParam(c)
	if !ok {
		return
	}

	if !h.requireSegmentManage(c, releaseVersionID) {
		return
	}

	var req adminAnimeSegmentOverrideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	segment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVersionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nicht geladen werden.")
		return
	}

	// Laufzeit DIESER Release-Version fuer die Validierung (RESEARCH.md Risk 3): Bereichsfilter
	// ueber den tatsaechlichen Episodenbereich des Segments statt einer ungefilterten Suche.
	var duration *int32
	if segment.FansubGroupID != nil && *segment.FansubGroupID > 0 {
		dur, durErr := h.themeRepo.GetSegmentReleaseDuration(
			c.Request.Context(), animeID, *segment.FansubGroupID, segment.Version,
			derefEpisodeOrZero(segment.StartEpisode), derefEpisodeOrZero(segment.EndEpisode),
		)
		if durErr != nil {
			log.Printf("admin anime segment override upsert: lookup release duration segment=%d release_version=%d: %v", segmentID, releaseVersionID, durErr)
		} else {
			duration = dur
		}
	}

	startTime := req.StartTime
	endTime := req.EndTime
	if msg := validateSegmentTimes(&startTime, &endTime, duration); msg != "" {
		badRequest(c, msg)
		return
	}

	_, err = h.themeRepo.UpsertThemeSegmentEpisodeOverride(c.Request.Context(), models.AdminThemeSegmentEpisodeOverrideUpsertInput{
		ThemeSegmentID:   segmentID,
		ReleaseVersionID: releaseVersionID,
		StartTime:        startTime,
		EndTime:          endTime,
	})
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "release_version_id ist diesem Segment nicht zugewiesen", "code": "not_assigned"}})
		return
	}
	if err != nil {
		log.Printf("admin anime segment override upsert: segment=%d release_version=%d: %v", segmentID, releaseVersionID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Override konnte nicht gespeichert werden.")
		return
	}

	// Invalidierung fuer GENAU diese eine release_version_id (kein Fan-Out: ein Override
	// betrifft ausschließlich seine eigene Zuweisung).
	if err := h.resetAndQueueSegmentRenderAfterChange(c.Request.Context(), segmentID, releaseVersionID); err != nil {
		log.Printf("admin anime segment override upsert: refresh render cache segment=%d release_version=%d: %v", segmentID, releaseVersionID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Render konnte nach dem Override nicht neu vorbereitet werden.")
		return
	}

	updated, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVersionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Aktualisiertes Segment konnte nach dem Override nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// DeleteAnimeSegmentEpisodeOverride verarbeitet
// DELETE /api/v1/admin/anime/:id/segments/:segmentId/assignments/:releaseVersionId/override.
// Entfernt einen Per-Release-Version-Zeit-Override; die Basis-Zeit des Segments greift
// danach wieder fuer diese Folge (D-01).
func (h *AdminContentHandler) DeleteAnimeSegmentEpisodeOverride(c *gin.Context) {
	if h.themeRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "theme service nicht verfügbar"}})
		return
	}

	animeID, segmentID, ok := parseSegmentAssignmentPathIDs(c)
	if !ok {
		return
	}
	releaseVersionID, ok := parseSegmentAssignmentReleaseVersionIDParam(c)
	if !ok {
		return
	}

	if !h.requireSegmentManage(c, releaseVersionID) {
		return
	}

	if err := h.themeRepo.DeleteThemeSegmentEpisodeOverride(c.Request.Context(), segmentID, releaseVersionID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "override nicht gefunden"}})
			return
		}
		log.Printf("admin anime segment override delete: segment=%d release_version=%d: %v", segmentID, releaseVersionID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Override konnte nicht gelöscht werden.")
		return
	}

	// Render-relevante Aenderung: die Basis-Zeit greift jetzt wieder fuer diese Release-Version.
	if err := h.resetAndQueueSegmentRenderAfterChange(c.Request.Context(), segmentID, releaseVersionID); err != nil {
		log.Printf("admin anime segment override delete: refresh render cache segment=%d release_version=%d: %v", segmentID, releaseVersionID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment-Render konnte nach dem Entfernen des Overrides nicht neu vorbereitet werden.")
		return
	}

	segment, err := h.themeRepo.GetAnimeSegmentByID(c.Request.Context(), animeID, segmentID, releaseVersionID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "segment nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Segment konnte nach dem Entfernen des Overrides nicht geladen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": segment})
}
