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

type releaseVersionNoteAccess struct {
	identity     middleware.AuthIdentity
	versionID    int64
	canManageAll bool
	memberID     int64
}

type bulkNoteItemRequest struct {
	ID         int64           `json:"id"`
	MemberID   int64           `json:"member_id" binding:"required"`
	RoleCode   string          `json:"role_code" binding:"required"`
	RoleID     int64           `json:"role_id"`
	Title      *string         `json:"title"`
	BodyJSON   json.RawMessage `json:"body_json"`
	Visibility string          `json:"visibility" binding:"required,oneof=public internal"`
	Status     string          `json:"status" binding:"required,oneof=draft published archived deleted"`
	SortOrder  int             `json:"sort_order"`
}

type bulkUpsertReleaseVersionNotesRequest struct {
	Notes []bulkNoteItemRequest `json:"notes" binding:"required"`
}

func canManageAllReleaseVersionNotes(result permissions.Result) bool {
	return result.ReasonCode == permissions.ReasonPlatformAdmin ||
		result.MatchedRole == permissions.RoleFansubLead ||
		result.MatchedRole == permissions.RoleProjectLead
}

func filterReleaseVersionNotesByMember(notes []repository.ReleaseVersionNote, memberID int64) []repository.ReleaseVersionNote {
	filtered := make([]repository.ReleaseVersionNote, 0, len(notes))
	for _, note := range notes {
		if note.MemberID == memberID {
			filtered = append(filtered, note)
		}
	}
	return filtered
}

func filterMemberRolesForMember(memberRoles []repository.MemberRoleForVersion, memberID int64) []repository.MemberRoleForVersion {
	filtered := make([]repository.MemberRoleForVersion, 0, len(memberRoles))
	for _, memberRole := range memberRoles {
		if memberRole.MemberID == memberID {
			filtered = append(filtered, memberRole)
		}
	}
	return filtered
}

func (h *AdminContentHandler) requireReleaseVersionNoteAccess(c *gin.Context) (releaseVersionNoteAccess, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return releaseVersionNoteAccess{}, false
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		badRequest(c, "ungültige version id")
		return releaseVersionNoteAccess{}, false
	}

	result, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Notiz-Berechtigung konnte nicht geprüft werden.")
		return releaseVersionNoteAccess{}, false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "release_version_note.write.denied", nil, "release_version", &versionID, permissions.ActionReleaseVersionNotesWrite, result)
		writePermissionDenied(c, result)
		return releaseVersionNoteAccess{}, false
	}

	access := releaseVersionNoteAccess{
		identity:     identity,
		versionID:    versionID,
		canManageAll: canManageAllReleaseVersionNotes(result),
	}
	if access.canManageAll {
		return access, true
	}

	memberID, found, err := h.releaseVersionNotesRepo.ResolveMemberIDForAppUser(c.Request.Context(), identity.AppUserID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Member-Zuordnung konnte nicht geladen werden.")
		return releaseVersionNoteAccess{}, false
	}
	if !found {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{"message": "Für deinen Account ist kein Member-Profil verknüpft."},
		})
		return releaseVersionNoteAccess{}, false
	}

	access.memberID = memberID
	return access, true
}

func (h *AdminContentHandler) ListReleaseVersionNotes(c *gin.Context) {
	access, ok := h.requireReleaseVersionNoteAccess(c)
	if !ok {
		return
	}

	var notes []repository.ReleaseVersionNote
	var err error
	if access.canManageAll {
		notes, err = h.releaseVersionNotesRepo.ListReleaseVersionNotes(c.Request.Context(), access.versionID)
	} else {
		notes, err = h.releaseVersionNotesRepo.ListReleaseVersionNotesForMember(c.Request.Context(), access.versionID, access.memberID)
	}
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
	access, ok := h.requireReleaseVersionNoteAccess(c)
	if !ok {
		return
	}

	memberRoles, err := h.releaseVersionNotesRepo.GetMemberRolesForVersion(c.Request.Context(), access.versionID)
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Member-Rollen für Version konnten nicht geladen werden.")
		return
	}
	if !access.canManageAll {
		memberRoles = filterMemberRolesForMember(memberRoles, access.memberID)
	}
	if memberRoles == nil {
		memberRoles = []repository.MemberRoleForVersion{}
	}
	c.JSON(http.StatusOK, gin.H{"data": memberRoles})
}

func (h *AdminContentHandler) BulkUpsertReleaseVersionNotes(c *gin.Context) {
	access, ok := h.requireReleaseVersionNoteAccess(c)
	if !ok {
		return
	}

	var req bulkUpsertReleaseVersionNotesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültige anfragedaten: "+err.Error())
		return
	}

	inputs := make([]repository.BulkNoteInput, 0, len(req.Notes))
	for _, note := range req.Notes {
		if !access.canManageAll && note.MemberID != access.memberID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{"message": "Du darfst nur deine eigenen Notizen bearbeiten."},
			})
			return
		}

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
		c.Request.Context(), access.versionID, access.identity.UserID, inputs,
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
	if !access.canManageAll {
		updatedNotes = filterReleaseVersionNotesByMember(updatedNotes, access.memberID)
	}
	c.JSON(http.StatusOK, gin.H{"data": updatedNotes})
}

func (h *AdminContentHandler) DeleteReleaseVersionNote(c *gin.Context) {
	access, ok := h.requireReleaseVersionNoteAccess(c)
	if !ok {
		return
	}

	noteID, err := strconv.ParseInt(c.Param("noteId"), 10, 64)
	if err != nil || noteID <= 0 {
		badRequest(c, "ungültige note id")
		return
	}

	if !access.canManageAll {
		notes, err := h.releaseVersionNotesRepo.ListReleaseVersionNotesForMember(c.Request.Context(), access.versionID, access.memberID)
		if err != nil {
			writeInternalErrorResponse(c, "interner serverfehler", err, "Release-Version-Notizen konnten nicht geladen werden.")
			return
		}
		found := false
		for _, note := range notes {
			if note.ID == noteID {
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{"message": "Du darfst nur deine eigenen Notizen bearbeiten."},
			})
			return
		}
	}

	err = h.releaseVersionNotesRepo.DeleteReleaseVersionNote(c.Request.Context(), noteID, access.versionID, access.identity.UserID)
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
