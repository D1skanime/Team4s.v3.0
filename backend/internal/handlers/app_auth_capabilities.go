package handlers

import (
	"net/http"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"

	"github.com/gin-gonic/gin"
)

type fansubGroupCapabilitiesResponse struct {
	CanEditGroup               bool `json:"can_edit_group"`
	CanEditGroupGeneral        bool `json:"can_edit_group_general"`
	CanEditTechnicalLinks      bool `json:"can_edit_technical_links"`
	CanEditFoundingHistory     bool `json:"can_edit_founding_history"`
	CanUpdateGroupLinks        bool `json:"can_update_group_links"`
	CanManageLinks             bool `json:"can_manage_links"`
	CanViewMembers             bool `json:"can_view_members"`
	CanManageMembers           bool `json:"can_manage_members"`
	CanManageHistoricalMembers bool `json:"can_manage_historical_members"`
	CanManageHistoricalRoles   bool `json:"can_manage_historical_roles"`
	CanLinkHistoricalMembers   bool `json:"can_link_historical_members"`
	CanEditNotes               bool `json:"can_edit_notes"`
	CanEditProjectTimeline     bool `json:"can_edit_project_timeline"`
	CanViewInvitations         bool `json:"can_view_invitations"`
	CanCreateInvitation        bool `json:"can_create_invitation"`
	CanCancelInvitation        bool `json:"can_cancel_invitation"`
	CanViewReleases            bool `json:"can_view_releases"`
	CanViewReleaseMedia        bool `json:"can_view_release_media"`
	CanUploadReleaseMedia      bool `json:"can_upload_release_media"`
	CanEditReleaseNotes        bool `json:"can_edit_release_notes"`
	CanViewGroupMedia          bool `json:"can_view_group_media"`
	CanUploadGroupMedia        bool `json:"can_upload_group_media"`
	CanUpdateGroupMedia        bool `json:"can_update_group_media"`
	CanReviewGroupMedia        bool `json:"can_review_group_media"`
	CanReviewText              bool `json:"can_review_text"`
	CanUpdateOwnGroupMedia     bool `json:"can_update_own_group_media"`
	CanDeleteOwnGroupMedia     bool `json:"can_delete_own_group_media"`
	CanDeleteGroupMedia        bool `json:"can_delete_group_media"`
	CanReorderGroupMedia       bool `json:"can_reorder_group_media"`
}

func (h *AppAuthHandler) GetFansubGroupCapabilities(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	canEditGroup, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditGroupGeneral, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupPageGeneralEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditTechnicalLinks, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupPageTechnicalLinksEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditFoundingHistory, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupPageFoundingHistoryEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUpdateGroupLinks, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupLinksUpdate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewMembers, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageMembers, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageHistoricalMembers, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageHistoricalRoles, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalRolesManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canLinkHistoricalMembers, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersLink, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageLinks, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupLinksManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditNotes, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupNotesWrite, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditProjectTimeline, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionAnimeFansubProjectTimelineUpdate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung für den Projektzeitraum konnte nicht geprüft werden.")
		return
	}
	canViewInvitations, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canCreateInvitation, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCreate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canCancelInvitation, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCancel, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewReleases, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewReleaseMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUploadReleaseMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditReleaseNotes, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseVersionNotesWrite, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewGroupMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUploadGroupMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaUpload, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canUpdateGroupMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaUpdate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canReviewText, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReviewTextDecide, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung für Textprüfung konnte nicht geprüft werden.")
		return
	}
	canUpdateOwnGroupMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaUpdateOwn, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canDeleteGroupMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaDelete, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}

	var customMediaPermissions models.FansubGroupMediaPermissions
	if h.memberRepo != nil {
		customMediaPermissions, err = h.memberRepo.GetMediaPermissionsForAppUser(c.Request.Context(), fansubID, identity.AppUserID)
		if err != nil {
			writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
			return
		}
	}
	hasAnyCustomMediaPermission := customMediaPermissions.CanUpload ||
		customMediaPermissions.CanDeleteOwn ||
		customMediaPermissions.CanDeleteAll ||
		customMediaPermissions.CanReorder
	canViewGroupMediaAllowed := canViewGroupMedia.Allowed || hasAnyCustomMediaPermission
	canUploadGroupMediaAllowed := canUploadGroupMedia.Allowed || customMediaPermissions.CanUpload
	canReorderGroupMedia, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMediaReorder, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung für Medien-Reihenfolge konnte nicht geprüft werden.")
		return
	}
	canReorderGroupMediaAllowed := canReorderGroupMedia.Allowed || customMediaPermissions.CanReorder
	canDeleteOwnGroupMediaAllowed := canDeleteGroupMedia.Allowed || customMediaPermissions.CanDeleteAll || customMediaPermissions.CanDeleteOwn
	canDeleteGroupMediaAllowed := canDeleteGroupMedia.Allowed || customMediaPermissions.CanDeleteAll

	if !canEditGroup.Allowed &&
		!canEditGroupGeneral.Allowed &&
		!canEditTechnicalLinks.Allowed &&
		!canEditFoundingHistory.Allowed &&
		!canUpdateGroupLinks.Allowed &&
		!canViewMembers.Allowed &&
		!canManageMembers.Allowed &&
		!canManageHistoricalMembers.Allowed &&
		!canManageHistoricalRoles.Allowed &&
		!canLinkHistoricalMembers.Allowed &&
		!canManageLinks.Allowed &&
		!canEditNotes.Allowed &&
		!canEditProjectTimeline.Allowed &&
		!canViewInvitations.Allowed &&
		!canCreateInvitation.Allowed &&
		!canCancelInvitation.Allowed &&
		!canViewReleases.Allowed &&
		!canViewReleaseMedia.Allowed &&
		!canUploadReleaseMedia.Allowed &&
		!canEditReleaseNotes.Allowed &&
		!canViewGroupMediaAllowed &&
		!canUploadGroupMediaAllowed &&
		!canReviewText.Allowed &&
		!canUpdateOwnGroupMedia.Allowed &&
		!canDeleteOwnGroupMediaAllowed &&
		!canDeleteGroupMediaAllowed &&
		!canReorderGroupMediaAllowed {
		writePermissionDenied(c, canViewMembers)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": fansubGroupCapabilitiesResponse{
		CanEditGroup:               canEditGroup.Allowed,
		CanEditGroupGeneral:        canEditGroupGeneral.Allowed,
		CanEditTechnicalLinks:      canEditTechnicalLinks.Allowed,
		CanEditFoundingHistory:     canEditFoundingHistory.Allowed,
		CanUpdateGroupLinks:        canUpdateGroupLinks.Allowed,
		CanManageLinks:             canManageLinks.Allowed,
		CanViewMembers:             canViewMembers.Allowed,
		CanManageMembers:           canManageMembers.Allowed,
		CanManageHistoricalMembers: canManageHistoricalMembers.Allowed,
		CanManageHistoricalRoles:   canManageHistoricalRoles.Allowed,
		CanLinkHistoricalMembers:   canLinkHistoricalMembers.Allowed,
		CanEditNotes:               canEditNotes.Allowed,
		CanEditProjectTimeline:     canEditProjectTimeline.Allowed,
		CanViewInvitations:         canViewInvitations.Allowed,
		CanCreateInvitation:        canCreateInvitation.Allowed,
		CanCancelInvitation:        canCancelInvitation.Allowed,
		CanViewReleases:            canViewReleases.Allowed,
		CanReviewGroupMedia:        canEditGroup.Allowed,
		CanReviewText:              canReviewText.Allowed,
		CanViewReleaseMedia:        canViewReleaseMedia.Allowed,
		CanUploadReleaseMedia:      canUploadReleaseMedia.Allowed,
		CanEditReleaseNotes:        canEditReleaseNotes.Allowed,
		CanViewGroupMedia:          canViewGroupMediaAllowed,
		CanUploadGroupMedia:        canUploadGroupMediaAllowed,
		CanUpdateGroupMedia:        canUpdateGroupMedia.Allowed,
		CanUpdateOwnGroupMedia:     canUpdateOwnGroupMedia.Allowed,
		CanDeleteOwnGroupMedia:     canDeleteOwnGroupMediaAllowed,
		CanDeleteGroupMedia:        canDeleteGroupMediaAllowed,
		CanReorderGroupMedia:       canReorderGroupMediaAllowed,
	}})
}
