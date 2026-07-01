package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// FansubHistGroupMembersHandler verwaltet Admin-Endpunkte für hist_fansub_group_members.
type FansubHistGroupMembersHandler struct {
	histMembersRepo *repository.HistGroupMembersRepository
	badgeService    *services.BadgeService
	permissionSvc   *permissions.Service
	auditLogRepo    *repository.AuditLogRepository
}

// NewFansubHistGroupMembersHandler erstellt einen neuen FansubHistGroupMembersHandler.
// badgeService darf nil sein; in dem Fall wird die Badge-Neuberechnung übersprungen.
func NewFansubHistGroupMembersHandler(
	repo *repository.HistGroupMembersRepository,
	badgeService *services.BadgeService,
	permissionSvc *permissions.Service,
	auditLogRepo *repository.AuditLogRepository,
) *FansubHistGroupMembersHandler {
	return &FansubHistGroupMembersHandler{
		histMembersRepo: repo,
		badgeService:    badgeService,
		permissionSvc:   permissionSvc,
		auditLogRepo:    auditLogRepo,
	}
}

// recomputeBadges löst die Badge-Neuberechnung für den Member aus. Fehler werden im
// Service geloggt und nicht propagiert — eine fehlgeschlagene Badge-Berechnung darf
// die Mitgliedschafts-Mutation nicht scheitern lassen.
func (h *FansubHistGroupMembersHandler) recomputeBadges(c *gin.Context, memberID int64) {
	if h.badgeService == nil || memberID <= 0 {
		return
	}
	_ = h.badgeService.ComputeAndStoreBadges(c.Request.Context(), memberID)
}

type histGroupMemberCreateRequest struct {
	MemberID    int64   `json:"member_id"`
	DisplayName string  `json:"display_name"`
	JoinedDate  *string `json:"joined_date"`
	LeftDate    *string `json:"left_date"`
	Status      string  `json:"status"`
	Visibility  string  `json:"visibility"`
}

type histGroupMemberPatchRequest struct {
	JoinedDate **string `json:"joined_date"`
	LeftDate   **string `json:"left_date"`
	Status     *string  `json:"status"`
	Visibility *string  `json:"visibility"`
}

func confirmedActorForStatus(status string, actorAppUserID int64) *int64 {
	if status != "confirmed" || actorAppUserID <= 0 {
		return nil
	}
	return &actorAppUserID
}

// ListHistGroupMembers gibt alle historischen Mitgliedschaften einer Fansub-Gruppe zurück.
// GET /admin/fansubs/:id/group-members
func (h *FansubHistGroupMembersHandler) ListHistGroupMembers(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member.list.denied", &fansubID, "hist_fansub_group_member", nil, permissions.ActionFansubGroupMembersView, result)
		writePermissionDenied(c, result)
		return
	}

	items, err := h.histMembersRepo.ListByFansubGroupWithDisplay(c.Request.Context(), fansubID)
	if err != nil {
		log.Printf("hist group members list: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateHistGroupMember legt einen neuen historischen Mitgliedschaftseintrag an.
// POST /admin/fansubs/:id/group-members
func (h *FansubHistGroupMembersHandler) CreateHistGroupMember(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member.create.denied", &fansubID, "hist_fansub_group_member", nil, permissions.ActionFansubGroupHistoricalMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	var req histGroupMemberCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		badRequest(c, "display_name ist erforderlich")
		return
	}
	status, ok := normalizeHistoricalContributionStatus(req.Status)
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "ungültiger status-wert",
			},
		})
		return
	}
	visibility, ok := normalizeHistoricalContributionVisibility(req.Visibility)
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "ungültiger visibility-wert",
			},
		})
		return
	}

	joinedDate, err := parseOptionalDate(req.JoinedDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}
	leftDate, err := parseOptionalDate(req.LeftDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}

	input := repository.HistGroupMemberAutoCreateInput{
		FansubGroupID: fansubID,
		DisplayName:   displayName,
		JoinedDate:    joinedDate,
		LeftDate:      leftDate,
		Status:        status,
		Visibility:    visibility,
		ConfirmedBy:   confirmedActorForStatus(status, identity.AppUserID),
		CreatedBy:     &identity.AppUserID,
	}

	item, err := h.histMembersRepo.CreateWithAutoMember(c.Request.Context(), input)
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"message": "dieses mitglied ist bereits in der gruppe eingetragen",
			},
		})
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "fansubgruppe nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("hist group members create: repo error (fansub_id=%d, display_name=%q): %v", fansubID, displayName, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "hist_group_member.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "hist_fansub_group_member",
		TargetID:       &item.ID,
		Action:         string(permissions.ActionFansubGroupHistoricalMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"display_name": displayName},
	})

	h.recomputeBadges(c, item.MemberID)

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// UpdateHistGroupMember aktualisiert einen historischen Mitgliedschaftseintrag.
// PATCH /admin/fansubs/:id/group-members/:memberId
func (h *FansubHistGroupMembersHandler) UpdateHistGroupMember(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member.update.denied", &fansubID, "hist_fansub_group_member", nil, permissions.ActionFansubGroupHistoricalMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	memberID, err := strconv.ParseInt(c.Param("memberId"), 10, 64)
	if err != nil || memberID <= 0 {
		badRequest(c, "ungültige member id")
		return
	}

	var req histGroupMemberPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}
	if req.Status != nil && !validHistoricalContributionStatus(*req.Status) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "ungültiger status-wert",
			},
		})
		return
	}
	if req.Visibility != nil && !validHistoricalContributionVisibility(*req.Visibility) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "ungültiger visibility-wert",
			},
		})
		return
	}

	joinedDate, err := parseOptionalPatchDate(req.JoinedDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}
	leftDate, err := parseOptionalPatchDate(req.LeftDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}

	input := repository.HistGroupMemberPatchInput{
		JoinedDate:  joinedDate,
		LeftDate:    leftDate,
		Status:      req.Status,
		Visibility:  req.Visibility,
		ConfirmedBy: &identity.AppUserID,
	}

	item, err := h.histMembersRepo.Update(c.Request.Context(), fansubID, memberID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitgliedschaftseintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("hist group members update: repo error (fansub_id=%d, member_id=%d): %v", fansubID, memberID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "hist_group_member.updated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "hist_fansub_group_member",
		TargetID:       &memberID,
		Action:         string(permissions.ActionFansubGroupHistoricalMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{},
	})

	h.recomputeBadges(c, item.MemberID)

	c.JSON(http.StatusOK, gin.H{"data": item})
}

// DeleteHistGroupMember entfernt einen historischen Mitgliedschaftseintrag.
// DELETE /admin/fansubs/:id/group-members/:memberId
func (h *FansubHistGroupMembersHandler) DeleteHistGroupMember(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupHistoricalMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member.delete.denied", &fansubID, "hist_fansub_group_member", nil, permissions.ActionFansubGroupHistoricalMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	memberID, err := strconv.ParseInt(c.Param("memberId"), 10, 64)
	if err != nil || memberID <= 0 {
		badRequest(c, "ungültige member id")
		return
	}

	if err := h.histMembersRepo.Delete(c.Request.Context(), fansubID, memberID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitgliedschaftseintrag nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("hist group members delete: repo error (fansub_id=%d, member_id=%d): %v", fansubID, memberID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "hist_group_member.deleted",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "hist_fansub_group_member",
		TargetID:       &memberID,
		Action:         string(permissions.ActionFansubGroupHistoricalMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{},
	})

	c.Status(http.StatusNoContent)
}
