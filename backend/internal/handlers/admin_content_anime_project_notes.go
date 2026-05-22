package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ---- Request-Structs: anime_fansub_project_notes ----
type upsertAnimeFansubProjectNoteRequest struct {
	Title      string          `json:"title"`
	BodyJSON   json.RawMessage `json:"body_json"`
	Visibility string          `json:"visibility" binding:"required,oneof=public internal"`
	Status     string          `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder  int             `json:"sort_order"`
}

// GetAnimeFansubProjectNote verarbeitet GET /api/v1/admin/fansubs/:id/anime/:animeId/notes.
func (h *AdminContentHandler) GetAnimeFansubProjectNote(c *gin.Context) {
	if _, ok := h.requireFansubGroupNoteWriteAccess(c); !ok {
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

	note, err := h.fansubNotesRepo.UpsertAnimeFansubProjectNote(
		c.Request.Context(),
		animeID,
		fansubID,
		identity.UserID,
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

	err = h.fansubNotesRepo.DeleteAnimeFansubProjectNote(c.Request.Context(), noteID, animeID, fansubID, identity.UserID)
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
