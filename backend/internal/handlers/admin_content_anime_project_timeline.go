package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type updateAnimeFansubProjectTimelineRequest struct {
	ProductionStartedOn   *string `json:"production_started_on"`
	ProductionCompletedOn *string `json:"production_completed_on"`
}

func parseOptionalProjectDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

// GetAnimeFansubProjectTimeline handles the concrete project duration for one
// anime/fansub assignment.
func (h *AdminContentHandler) GetAnimeFansubProjectTimeline(c *gin.Context) {
	if _, ok := h.requireAnimeProjectNoteReadAccess(c); !ok {
		return
	}
	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ung\u00fcltige fansub id")
		return
	}
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ung\u00fcltige anime id")
		return
	}

	timeline, err := h.fansubNotesRepo.GetAnimeFansubProjectTimeline(c.Request.Context(), animeID, fansubID)
	if errors.Is(err, repository.ErrInvalidAnimeFansubContext) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Anime-Fansub-Zuordnung nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Projektzeitraum konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": timeline})
}

func (h *AdminContentHandler) requireAnimeProjectTimelineWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return middleware.AuthIdentity{}, false
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return middleware.AuthIdentity{}, false
	}

	result, err := h.permissionSvc.CanForFansubGroup(
		c.Request.Context(), actor, permissions.ActionAnimeFansubProjectTimelineUpdate, fansubID,
	)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung für den Projektzeitraum konnte nicht geprüft werden.")
		return middleware.AuthIdentity{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(
			c, h.auditLogRepo, identity, "anime_project_timeline.update.denied",
			&fansubID, "anime_fansub_group", nil, permissions.ActionAnimeFansubProjectTimelineUpdate, result,
		)
		writePermissionDenied(c, result)
		return middleware.AuthIdentity{}, false
	}
	return identity, true
}

// UpdateAnimeFansubProjectTimeline updates the project range only for the
// addressed anime/fansub assignment.
func (h *AdminContentHandler) UpdateAnimeFansubProjectTimeline(c *gin.Context) {
	if _, ok := h.requireAnimeProjectTimelineWriteAccess(c); !ok {
		return
	}
	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ung\u00fcltige fansub id")
		return
	}
	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ung\u00fcltige anime id")
		return
	}

	var req updateAnimeFansubProjectTimelineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ung\u00fcltige anfragedaten: "+err.Error())
		return
	}
	startedOn, err := parseOptionalProjectDate(req.ProductionStartedOn)
	if err != nil {
		badRequest(c, "Bearbeitung begonnen am muss ein g\u00fcltiges Datum sein.")
		return
	}
	completedOn, err := parseOptionalProjectDate(req.ProductionCompletedOn)
	if err != nil {
		badRequest(c, "Projekt abgeschlossen am muss ein g\u00fcltiges Datum sein.")
		return
	}

	timeline, err := h.fansubNotesRepo.UpdateAnimeFansubProjectTimeline(c.Request.Context(), animeID, fansubID, startedOn, completedOn)
	if errors.Is(err, repository.ErrInvalidAnimeFansubContext) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Anime-Fansub-Zuordnung nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrInvalidProjectTimeline) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "Der Projektzeitraum ist ung\u00fcltig oder endet vor einem bereits abgeschlossenen Release."}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Projektzeitraum konnte nicht gespeichert werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": timeline})
}
