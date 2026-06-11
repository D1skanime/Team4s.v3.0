package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// requireReleaseVersionNoteWriteAccess kapselt die Berechtigungsprüfung für
// release_version_notes. MVP: Admin-only.
func (h *AdminContentHandler) requireReleaseVersionNoteWriteAccess(c *gin.Context) (middleware.AuthIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return middleware.AuthIdentity{}, false
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return middleware.AuthIdentity{}, false
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Notiz-Berechtigung konnte nicht geprüft werden.")
		return middleware.AuthIdentity{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_note.write.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionNotesWrite, result)
		writePermissionDenied(c, result)
		return middleware.AuthIdentity{}, false
	}

	return identity, true
}

func (h *AdminContentHandler) requireReleaseVersionNoteReadAccess(c *gin.Context) (int64, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return 0, false
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungÃ¼ltige version id")
		return 0, false
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Release-Version-Berechtigung konnte nicht geprÃ¼ft werden.")
		return 0, false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_note.read.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionNotesWrite, result)
		writePermissionDenied(c, result)
		return 0, false
	}

	return versionID, true
}

type bulkNoteItemRequest struct {
	ID         int64           `json:"id"`
	MemberID   int64           `json:"member_id" binding:"required"`
	RoleCode   string          `json:"role_code" binding:"required"`
	RoleID     int64           `json:"role_id"` // Legacy-Feld für DB-Persistenz (release_version_notes.role_id)
	Title      *string         `json:"title"`
	BodyJSON   json.RawMessage `json:"body_json"`
	Visibility string          `json:"visibility" binding:"required,oneof=public internal"`
	Status     string          `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder  int             `json:"sort_order"`
}

type bulkUpsertReleaseVersionNotesRequest struct {
	Notes []bulkNoteItemRequest `json:"notes" binding:"required"`
}

func (h *AdminContentHandler) ListReleaseVersionNotes(c *gin.Context) {
	versionID, ok := h.requireReleaseVersionNoteReadAccess(c)
	if !ok {
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

func (h *AdminContentHandler) GetMemberRolesForVersion(c *gin.Context) {
	versionID, ok := h.requireReleaseVersionNoteReadAccess(c)
	if !ok {
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
		bodyJSONStr := string(note.BodyJSON)
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
		inputs = append(inputs, repository.BulkNoteInput{
			ID:         note.ID,
			MemberID:   note.MemberID,
			RoleCode:   note.RoleCode,
			RoleID:     note.RoleID,
			Title:      note.Title,
			BodyJSON:   []byte(note.BodyJSON),
			BodyHTML:   bodyHTML,
			BodyText:   bodyText,
			Visibility: note.Visibility,
			Status:     note.Status,
			SortOrder:  note.SortOrder,
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
	if errors.Is(err, repository.ErrInvalidReleaseVersionContributorContext) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"message": "Mitglied und Rolle sind für diese Release-Version nicht gültig"},
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
