package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// requireFansubGroupNoteWriteAccess kapselt die Berechtigungsprüfung für
// fansub_group_notes und member_group_stories. MVP: Admin-only.
// Eigene Funktion ermöglicht spätere Erweiterung ohne Änderung an Call-Sites.
func (h *AdminContentHandler) requireFansubGroupNoteWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	return h.requireAdmin(c)
}

// ---- Request-Structs: fansub_group_notes ----
type createFansubGroupNoteRequest struct {
	Title      string          `json:"title"`
	BodyJSON   json.RawMessage `json:"body_json"`
	Visibility string          `json:"visibility" binding:"required,oneof=public internal"`
	Status     string          `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder  int             `json:"sort_order"`
}

type updateFansubGroupNoteRequest struct {
	Title      *string          `json:"title"`
	BodyJSON   *json.RawMessage `json:"body_json"`
	Visibility *string          `json:"visibility"`
	Status     *string          `json:"status"`
	SortOrder  *int             `json:"sort_order"`
}

// ListFansubGroupNotes verarbeitet GET /admin/fansubs/:id/notes.
func (h *AdminContentHandler) ListFansubGroupNotes(c *gin.Context) {
	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	notes, err := h.fansubNotesRepo.ListFansubGroupNotes(c.Request.Context(), fansubID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notizen konnten nicht geladen werden.")
		return
	}
	if notes == nil {
		notes = []repository.FansubGroupNote{}
	}
	c.JSON(http.StatusOK, gin.H{"data": notes})
}

// CreateFansubGroupNote verarbeitet POST /api/v1/admin/fansubs/:id/notes.
func (h *AdminContentHandler) CreateFansubGroupNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	var req createFansubGroupNoteRequest
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

	note, err := h.fansubNotesRepo.CreateFansubGroupNote(
		c.Request.Context(),
		fansubID,
		identity.UserID,
		repository.CreateFansubGroupNoteRequest{
			Title:     req.Title,
			BodyJSON:  []byte(req.BodyJSON),
			BodyText:  bodyText,
			BodyHTML:  bodyHTML,
			EditorType:            "tiptap",
			ContentSchemaVersion:  1,
			Visibility: req.Visibility,
			Status:     req.Status,
			SortOrder:  req.SortOrder,
		},
	)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notiz konnte nicht erstellt werden.")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": note})
}

// UpdateFansubGroupNote verarbeitet PATCH /api/v1/admin/fansubs/:id/notes/:noteId.
func (h *AdminContentHandler) UpdateFansubGroupNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	var req updateFansubGroupNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	repoReq := repository.UpdateFansubGroupNoteRequest{
		Title:      req.Title,
		Visibility: req.Visibility,
		Status:     req.Status,
		SortOrder:  req.SortOrder,
	}
	if req.BodyJSON != nil {
		bodyJSONStr := string(*req.BodyJSON)
		if err := h.tiptapSvc.ValidateJSON(bodyJSONStr); err != nil {
			badRequest(c, "nicht erlaubter Editor-Inhalt: "+err.Error())
			return
		}
		html, err := h.tiptapSvc.RenderHTML(bodyJSONStr)
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "HTML-Rendering fehlgeschlagen.")
			return
		}
		text, _ := h.tiptapSvc.ExtractText(bodyJSONStr)
		rawBytes := []byte(*req.BodyJSON)
		repoReq.BodyJSON = &rawBytes
		repoReq.BodyHTML = &html
		repoReq.BodyText = &text
	}

	note, err := h.fansubNotesRepo.UpdateFansubGroupNote(c.Request.Context(), noteID, fansubID, identity.UserID, repoReq)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "notiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notiz konnte nicht aktualisiert werden.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": note})
}

// DeleteFansubGroupNote verarbeitet DELETE /api/v1/admin/fansubs/:id/notes/:noteId.
func (h *AdminContentHandler) DeleteFansubGroupNote(c *gin.Context) {
	identity, ok := h.requireFansubGroupNoteWriteAccess(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubRouteID(c)
	if err != nil || fansubID <= 0 {
		badRequest(c, "ungültige fansub id")
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	err = h.fansubNotesRepo.DeleteFansubGroupNote(c.Request.Context(), noteID, fansubID, identity.UserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "notiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Fansub-Notiz konnte nicht gelöscht werden.")
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
