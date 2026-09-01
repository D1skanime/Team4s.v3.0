package handlers

import (
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type setFansubGroupMemberRoleRequest struct {
	Role    string `json:"role"`
	Enabled bool   `json:"enabled"`
}

type setFansubGroupMemberStatusRequest struct {
	Status string `json:"status"`
}

type setFansubGroupMemberMediaPermissionsRequest struct {
	CanUpload    bool `json:"can_upload"`
	CanDeleteOwn bool `json:"can_delete_own"`
	CanDeleteAll bool `json:"can_delete_all"`
	CanReorder   bool `json:"can_reorder"`
}

func (h *AppAuthHandler) SetFansubGroupMemberRole(c *gin.Context) {
	h.setFansubGroupMemberRole(c, "")
}

func (h *AppAuthHandler) SetFansubLead(c *gin.Context) {
	h.setFansubGroupMemberRole(c, models.FansubGroupMemberRoleLead)
}

func (h *AppAuthHandler) setFansubGroupMemberRole(c *gin.Context, forcedRole string) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.memberRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_lead.manage.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	appUserID, err := parseFansubID(c.Param("appUserId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige app-user-id"}})
		return
	}

	var req setFansubGroupMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige anfrage"}})
		return
	}
	role := strings.TrimSpace(req.Role)
	if strings.TrimSpace(forcedRole) != "" {
		role = strings.TrimSpace(forcedRole)
	}
	if role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "rolle ist erforderlich"}})
		return
	}
	if !permissions.IsKnownFansubGroupRole(role) {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "unbekannte gruppenrolle"}})
		return
	}

	member, err := h.memberRepo.SetRole(c.Request.Context(), fansubID, appUserID, models.FansubGroupMemberRoleUpdateInput{
		Role:               role,
		Enable:             req.Enabled,
		CreatedByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitgliedschaft nicht gefunden"}})
			return
		}
		if conflict, ok := repository.AsMemberMutationConflict(err); ok {
			reasonCode := conflict.Code
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID: &identity.AppUserID,
				EventType:      "fansub_group_member_role.blocked",
				ScopeType:      permissions.ScopeTypeGroup,
				ScopeID:        &fansubID,
				TargetType:     "app_user",
				TargetID:       &appUserID,
				Action:         string(permissions.ActionFansubGroupMembersManage),
				Outcome:        "denied",
				ReasonCode:     &reasonCode,
				Payload:        map[string]any{"role": role, "enabled": req.Enabled},
			})
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": conflict.Message, "reason_code": conflict.Code}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_member_role.updated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "app_user",
		TargetID:       &appUserID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload: map[string]any{
			"role":    role,
			"enabled": req.Enabled,
		},
	})

	c.JSON(http.StatusOK, gin.H{"data": member})
}

func (h *AppAuthHandler) UpdateFansubGroupMemberStatus(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.memberRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungÃ¼ltige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_members.status.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	appUserID, err := parseFansubID(c.Param("appUserId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungÃ¼ltige app-user-id"}})
		return
	}

	var req setFansubGroupMemberStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungÃ¼ltige anfrage"}})
		return
	}
	status := strings.TrimSpace(req.Status)
	if status != models.FansubGroupMemberStatusActive && status != models.FansubGroupMemberStatusDisabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "status muss active oder disabled sein"}})
		return
	}

	member, err := h.memberRepo.UpdateStatus(c.Request.Context(), fansubID, appUserID, models.FansubGroupMemberStatusUpdateInput{
		Status:             status,
		UpdatedByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitgliedschaft nicht gefunden"}})
			return
		}
		if conflict, ok := repository.AsMemberMutationConflict(err); ok {
			reasonCode := conflict.Code
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID: &identity.AppUserID,
				EventType:      "fansub_group_member_status.blocked",
				ScopeType:      permissions.ScopeTypeGroup,
				ScopeID:        &fansubID,
				TargetType:     "app_user",
				TargetID:       &appUserID,
				Action:         string(permissions.ActionFansubGroupMembersManage),
				Outcome:        "denied",
				ReasonCode:     &reasonCode,
				Payload:        map[string]any{"status": status},
			})
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": conflict.Message, "reason_code": conflict.Code}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	eventType := "fansub_group_member.deactivated"
	if status == models.FansubGroupMemberStatusActive {
		eventType = "fansub_group_member.reactivated"
	}
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      eventType,
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "app_user",
		TargetID:       &appUserID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"status": status},
	})

	c.JSON(http.StatusOK, gin.H{"data": member})
}

func (h *AppAuthHandler) SetFansubGroupMemberMediaPermissions(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.memberRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungÃ¼ltige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_member_media_permissions.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	appUserID, err := parseFansubID(c.Param("appUserId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungÃ¼ltige app-user-id"}})
		return
	}

	var req setFansubGroupMemberMediaPermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungÃ¼ltige anfrage"}})
		return
	}

	member, err := h.memberRepo.SetMediaPermissions(c.Request.Context(), fansubID, appUserID, models.FansubGroupMemberMediaPermissionsUpdateInput{
		Permissions: models.FansubGroupMediaPermissions{
			CanUpload:    req.CanUpload,
			CanDeleteOwn: req.CanDeleteOwn,
			CanDeleteAll: req.CanDeleteAll,
			CanReorder:   req.CanReorder,
		},
		UpdatedByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "mitgliedschaft nicht gefunden"}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_member_media_permissions.updated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "app_user",
		TargetID:       &appUserID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload: map[string]any{
			"can_upload":     req.CanUpload,
			"can_delete_own": req.CanDeleteOwn,
			"can_delete_all": req.CanDeleteAll,
			"can_reorder":    req.CanReorder,
		},
	})

	c.JSON(http.StatusOK, gin.H{"data": member})
}
