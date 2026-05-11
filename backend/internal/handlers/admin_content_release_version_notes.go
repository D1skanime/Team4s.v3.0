package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// requireReleaseVersionNoteWriteAccess kapselt die Berechtigungsprüfung für
// release_version_notes. MVP: Admin-only.
// Eigene Funktion ermöglicht spätere Erweiterung ohne Änderung an Call-Sites.
func (h *AdminContentHandler) requireReleaseVersionNoteWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	return h.requireAdmin(c)
}

// ---- Request-Structs ----

// bulkNoteItemRequest beschreibt ein einzelnes Note-Element im Bulk-Save-Array.
// ID == 0 bedeutet "neu erstellen"; ID > 0 bedeutet "vorhandene Note aktualisieren".
type bulkNoteItemRequest struct {
	ID           int64   `json:"id"`
	MemberID     int64   `json:"member_id" binding:"required"`
	RoleID       int64   `json:"role_id" binding:"required"`
	Title        *string `json:"title"`
	BodyMarkdown string  `json:"body_markdown"`
	Visibility   string  `json:"visibility" binding:"required,oneof=public internal"`
	Status       string  `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder    int     `json:"sort_order"`
}

// bulkUpsertReleaseVersionNotesRequest ist der Request-Body für POST /notes.
type bulkUpsertReleaseVersionNotesRequest struct {
	Notes []bulkNoteItemRequest `json:"notes" binding:"required"`
}

// ---- Handler-Methoden ----

// ListReleaseVersionNotes verarbeitet GET /admin/release-versions/:versionId/notes.
func (h *AdminContentHandler) ListReleaseVersionNotes(c *gin.Context) {
	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return
	}

	notes, err := h.releaseVersionNotesRepo.ListReleaseVersionNotes(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version-Notizen konnten nicht geladen werden.")
		return
	}
	if notes == nil {
		notes = []repository.ReleaseVersionNote{}
	}
	c.JSON(http.StatusOK, gin.H{"data": notes})
}

// GetMemberRolesForVersion verarbeitet GET /admin/release-versions/:versionId/member-roles.
// Gibt die beteiligten Member+Rollen für eine Release-Version zurück,
// damit die Frontend-UI die richtigen Rollenfelder anzeigen kann.
func (h *AdminContentHandler) GetMemberRolesForVersion(c *gin.Context) {
	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return
	}

	memberRoles, err := h.releaseVersionNotesRepo.GetMemberRolesForVersion(c.Request.Context(), versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Member-Rollen für Version konnten nicht geladen werden.")
		return
	}
	if memberRoles == nil {
		memberRoles = []repository.MemberRoleForVersion{}
	}
	c.JSON(http.StatusOK, gin.H{"data": memberRoles})
}

// BulkUpsertReleaseVersionNotes verarbeitet POST /admin/release-versions/:versionId/notes.
// Akzeptiert ein Array von Note-Elementen und speichert alle in einem Request.
// body_html wird für jede Note automatisch aus body_markdown gerendert.
// Bei UNIQUE-Verletzung (member+role bereits vorhanden) wird 409 zurückgegeben.
func (h *AdminContentHandler) BulkUpsertReleaseVersionNotes(c *gin.Context) {
	identity, ok := h.requireReleaseVersionNoteWriteAccess(c)
	if !ok {
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return
	}

	var req bulkUpsertReleaseVersionNotesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	inputs := make([]repository.BulkNoteInput, 0, len(req.Notes))
	for _, note := range req.Notes {
		bodyHTML, err := h.markdownSvc.RenderMarkdown(note.BodyMarkdown)
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Markdown-Rendering fehlgeschlagen.")
			return
		}
		inputs = append(inputs, repository.BulkNoteInput{
			ID:           note.ID,
			MemberID:     note.MemberID,
			RoleID:       note.RoleID,
			Title:        note.Title,
			BodyMarkdown: note.BodyMarkdown,
			BodyHTML:     bodyHTML,
			Visibility:   note.Visibility,
			Status:       note.Status,
			SortOrder:    note.SortOrder,
		})
	}

	updatedNotes, err := h.releaseVersionNotesRepo.BulkUpsertReleaseVersionNotes(
		c.Request.Context(), versionID, identity.UserID, inputs,
	)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"message": "Für dieses Mitglied und diese Rolle existiert bereits eine Notiz"},
		})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "notiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version-Notizen konnten nicht gespeichert werden.")
		return
	}
	if updatedNotes == nil {
		updatedNotes = []repository.ReleaseVersionNote{}
	}
	c.JSON(http.StatusOK, gin.H{"data": updatedNotes})
}

// DeleteReleaseVersionNote verarbeitet DELETE /admin/release-versions/:versionId/notes/:noteId.
// Soft-löscht eine einzelne Note.
func (h *AdminContentHandler) DeleteReleaseVersionNote(c *gin.Context) {
	identity, ok := h.requireReleaseVersionNoteWriteAccess(c)
	if !ok {
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	err = h.releaseVersionNotesRepo.DeleteReleaseVersionNote(c.Request.Context(), noteID, versionID, identity.UserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "notiz nicht gefunden"}})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version-Notiz konnte nicht gelöscht werden.")
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
