package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type projectNoteCreditService interface {
	Upsert(
		context.Context,
		int64,
		int64,
		int64,
		repository.UpsertAnimeFansubProjectNoteRequest,
	) (*repository.AnimeFansubProjectNote, error)
	Delete(context.Context, int64, int64, int64, int64) error
}

var _ projectNoteCreditService = (*services.ProjectNoteCreditService)(nil)

// ---- Request-Structs: anime_fansub_project_notes ----
type upsertAnimeFansubProjectNoteRequest struct {
	Title      string          `json:"title"`
	BodyJSON   json.RawMessage `json:"body_json"`
	Visibility string          `json:"visibility" binding:"required,oneof=public internal"`
	Status     string          `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder  int             `json:"sort_order"`
}

func (h *AdminContentHandler) requireAnimeProjectNoteReadAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return middleware.AuthIdentity{}, false
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return middleware.AuthIdentity{}, false
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einblick-Berechtigung konnte nicht geprüft werden.")
		return middleware.AuthIdentity{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_project_note.read.denied", &fansubID, "anime_fansub_project_note", nil, permissions.ActionReleaseView, result)
		writePermissionDenied(c, result)
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}

// GetAnimeFansubProjectNote verarbeitet GET /api/v1/admin/fansubs/:id/anime/:animeId/notes.
func (h *AdminContentHandler) GetAnimeFansubProjectNote(c *gin.Context) {
	if _, ok := h.requireAnimeProjectNoteReadAccess(c); !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	note, err := h.fansubNotesRepo.GetAnimeFansubProjectNote(c.Request.Context(), animeID, fansubID)
	if errors.Is(err, repository.ErrInvalidAnimeFansubContext) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Anime-Fansub-Zuordnung nicht gefunden"}})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Projektnotiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Fansub-Projektnotiz konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

// UpsertAnimeFansubProjectNote verarbeitet PUT /api/v1/admin/fansubs/:id/anime/:animeId/notes.
func (h *AdminContentHandler) UpsertAnimeFansubProjectNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	var req upsertAnimeFansubProjectNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	bodyJSONStr := string(req.BodyJSON)
	if err := h.tiptapSvc.ValidateJSON(bodyJSONStr); err != nil {
		badRequest(c, "nicht erlaubter Editor-Inhalt: "+err.Error())
		return
	}
	bodyHTML, err := h.tiptapSvc.RenderHTML(bodyJSONStr)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "HTML-Rendering fehlgeschlagen.")
		return
	}
	bodyText, _ := h.tiptapSvc.ExtractText(bodyJSONStr)

	note, err := h.projectNoteCreditSvc.Upsert(
		c.Request.Context(),
		animeID,
		fansubID,
		identity.AppUserID,
		repository.UpsertAnimeFansubProjectNoteRequest{
			Title:                req.Title,
			BodyJSON:             []byte(req.BodyJSON),
			BodyText:             bodyText,
			BodyHTML:             bodyHTML,
			EditorType:           "tiptap",
			ContentSchemaVersion: 1,
			Visibility:           req.Visibility,
			Status:               req.Status,
			SortOrder:            req.SortOrder,
		},
	)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "projektnotiz-konflikt"}})
		return
	}
	if errors.Is(err, repository.ErrInvalidAnimeFansubContext) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Anime-Fansub-Zuordnung nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf(
			"admin_content upsert_project_note: service error (app_user_id=%d, anime_id=%d, fansub_group_id=%d): %v",
			identity.AppUserID,
			animeID,
			fansubID,
			err,
		)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Fansub-Projektnotiz konnte nicht gespeichert werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

// DeleteAnimeFansubProjectNote verarbeitet DELETE /api/v1/admin/fansubs/:id/anime/:animeId/notes/:noteId.
func (h *AdminContentHandler) DeleteAnimeFansubProjectNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	animeID, err := strconv.ParseInt(c.Param("animeId"), 10, 64)
	if err != nil || animeID <= 0 {
		badRequest(c, "ungültige anime id")
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	err = h.projectNoteCreditSvc.Delete(c.Request.Context(), noteID, animeID, fansubID, identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "projektnotiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Anime-Fansub-Projektnotiz konnte nicht gelöscht werden.")
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
