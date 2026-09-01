package handlers

import (
	"errors"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type createFansubGroupAppMemberRequest struct {
	AppUserID          int64    `json:"app_user_id"`
	Roles              []string `json:"roles"`
	HistoricalMemberID *int64   `json:"historical_member_id"`
}

func (h *AppAuthHandler) ListFansubGroupAppMembers(c *gin.Context) {
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

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_members.view.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupMembersView, result)
		writePermissionDenied(c, result)
		return
	}

	members, err := h.memberRepo.ListByFansubGroup(c.Request.Context(), fansubID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": members})
}

func (h *AppAuthHandler) SearchFansubGroupAppMemberCandidates(c *gin.Context) {
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
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
		return
	}
	linkResult := result
	if !result.Allowed {
		linkResult, err = h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersLink, fansubID)
		if err != nil {
			writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
			return
		}
	}
	if !result.Allowed && !linkResult.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_members.search.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	candidates, err := h.memberRepo.SearchCandidates(c.Request.Context(), fansubID, query, 12)
	if err != nil {
		writePermissionInternalError(c, err, "App-Benutzer konnten nicht gesucht werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": candidates})
}

func (h *AppAuthHandler) CreateFansubGroupAppMember(c *gin.Context) {
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

	var req createFansubGroupAppMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.AppUserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "app_user_id ist erforderlich"}})
		return
	}
	roles, err := normalizeRequestedFansubRoles(req.Roles)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": err.Error()}})
		return
	}
	hasHistoricalLink := req.HistoricalMemberID != nil && *req.HistoricalMemberID > 0
	if len(roles) == 0 && !hasHistoricalLink {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Mindestens eine Gruppenrolle oder historische Identität ist erforderlich."}})
		return
	}

	requiredAction := permissions.ActionFansubGroupMembersManage
	deniedEvent := "fansub_group_members.manage.denied"
	if hasHistoricalLink && len(roles) == 0 {
		requiredAction = permissions.ActionFansubGroupHistoricalMembersLink
		deniedEvent = "hist_group_member.link.denied"
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, requiredAction, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, deniedEvent, &fansubID, "fansub_group", &fansubID, requiredAction, result)
		writePermissionDenied(c, result)
		return
	}

	member, err := h.memberRepo.Create(c.Request.Context(), fansubID, models.FansubGroupMemberCreateInput{
		AppUserID:          req.AppUserID,
		Roles:              roles,
		HistoricalMemberID: req.HistoricalMemberID,
		CreatedByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if conflict, ok := repository.AsMemberMutationConflict(err); ok {
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": conflict.Message, "code": conflict.Code}})
			return
		}
		switch err {
		case repository.ErrConflict:
			c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "mitgliedschaft existiert bereits"}})
		case repository.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansub oder app-user nicht gefunden"}})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		}
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_member.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_member",
		TargetID:       &member.ID,
		Action:         string(requiredAction),
		Outcome:        "allowed",
		Payload:        map[string]any{"app_user_id": req.AppUserID, "roles": roles},
	})

	c.JSON(http.StatusCreated, gin.H{"data": member})
}

func normalizeRequestedFansubRoles(roles []string) ([]string, error) {
	normalized := make([]string, 0, len(roles))
	seen := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		trimmed := strings.TrimSpace(role)
		if trimmed == "" {
			continue
		}
		if !permissions.IsKnownFansubGroupRole(trimmed) {
			return nil, errors.New("unbekannte gruppenrolle")
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	return normalized, nil
}
