package handlers

import (
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

type releaseVersionCapabilitiesResponse struct {
	CanViewMedia        bool `json:"can_view_media"`
	CanUploadMedia      bool `json:"can_upload_media"`
	CanUpdateMedia      bool `json:"can_update_media"`
	CanDeleteMedia      bool `json:"can_delete_media"`
	CanDeleteOwnMedia   bool `json:"can_delete_own_media"`
	CanReorderMedia     bool `json:"can_reorder_media"`
	CanManageHighlights bool `json:"can_manage_highlights"`
	CanEditNotes        bool `json:"can_edit_notes"`
	CanManageSegments   bool `json:"can_manage_segments"`
	CanEditMetadata     bool `json:"can_edit_metadata"`
}

func (h *AdminContentHandler) GetReleaseVersionCapabilities(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.mediaRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "media repository nicht verfügbar"}})
		return
	}

	versionID, err := strconv.ParseInt(c.Param("versionId"), 10, 64)
	if err != nil || versionID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige version id"}})
		return
	}

	canViewVersion, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaView, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUploadMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUpdateMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canDeleteMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaDelete, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canReorderMedia, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaReorder, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageHighlights, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaHighlight, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditNotes, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageSegments, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionSegmentsManage, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}

	canEditMetadata, err := h.permissionSvc.CanForReleaseVersion(c.Request.Context(), actor, permissions.ActionReleaseVersionMetadataUpdate, versionID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}

	if !canViewVersion.Allowed && !canViewMedia.Allowed && !canUploadMedia.Allowed && !canUpdateMedia.Allowed && !canDeleteMedia.Allowed && !canReorderMedia.Allowed && !canManageHighlights.Allowed && !canEditNotes.Allowed && !canManageSegments.Allowed && !canEditMetadata.Allowed {
		writePermissionDenied(c, canViewVersion)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": releaseVersionCapabilitiesResponse{
		CanViewMedia:        canViewMedia.Allowed,
		CanUploadMedia:      canUploadMedia.Allowed,
		CanUpdateMedia:      canUpdateMedia.Allowed,
		CanDeleteMedia:      canDeleteMedia.Allowed,
		CanDeleteOwnMedia:   releaseVersionMediaCanDeleteOwn(canViewMedia, canUploadMedia, canUpdateMedia, canDeleteMedia),
		CanReorderMedia:     canReorderMedia.Allowed,
		CanManageHighlights: canManageHighlights.Allowed,
		CanEditNotes:        canEditNotes.Allowed,
		CanManageSegments:   canManageSegments.Allowed,
		CanEditMetadata:     canEditMetadata.Allowed,
	}})
}
