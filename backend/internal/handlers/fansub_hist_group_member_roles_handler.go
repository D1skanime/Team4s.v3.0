package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// FansubHistGroupMemberRolesHandler verwaltet Admin-Endpunkte für hist_group_member_roles.
type FansubHistGroupMemberRolesHandler struct {
	rolesRepo       *repository.HistGroupMemberRolesRepository
	badgeService    *services.BadgeService
	permissionSvc   *permissions.Service
	auditLogRepo    *repository.AuditLogRepository
	histMembersRepo *repository.HistGroupMembersRepository
}

// NewFansubHistGroupMemberRolesHandler erstellt einen neuen FansubHistGroupMemberRolesHandler.
// badgeService darf nil sein; in dem Fall wird die Badge-Neuberechnung übersprungen.
func NewFansubHistGroupMemberRolesHandler(
	repo *repository.HistGroupMemberRolesRepository,
	badgeService *services.BadgeService,
	permissionSvc *permissions.Service,
	auditLogRepo *repository.AuditLogRepository,
	histMembersRepo *repository.HistGroupMembersRepository,
) *FansubHistGroupMemberRolesHandler {
	return &FansubHistGroupMemberRolesHandler{
		rolesRepo:       repo,
		badgeService:    badgeService,
		permissionSvc:   permissionSvc,
		auditLogRepo:    auditLogRepo,
		histMembersRepo: histMembersRepo,
	}
}

// recomputeBadges löst die Badge-Neuberechnung für den Member hinter der gegebenen
// Mitgliedschafts-ID aus. Fehler werden im Service geloggt und nicht propagiert —
// eine fehlgeschlagene Badge-Berechnung darf die Rollen-Mutation nicht scheitern lassen.
func (h *FansubHistGroupMemberRolesHandler) recomputeBadges(c *gin.Context, histMembershipID int64) {
	if h.badgeService == nil || histMembershipID <= 0 {
		return
	}
	_ = h.badgeService.ComputeAndStoreBadgesByMembership(c.Request.Context(), histMembershipID)
}

type histGroupMemberRoleCreateRequest struct {
	HistFansubGroupMemberID int64   `json:"hist_fansub_group_member_id"`
	RoleCode                string  `json:"role_code"`
	StartedDate             *string `json:"started_date"`
	EndedDate               *string `json:"ended_date"`
	Status                  string  `json:"status"`
	Visibility              string  `json:"visibility"`
	SourceNote              *string `json:"source_note"`
}

type histGroupMemberRolePatchRequest struct {
	StartedDate **string `json:"started_date"`
	EndedDate   **string `json:"ended_date"`
	Status      *string  `json:"status"`
	Visibility  *string  `json:"visibility"`
	SourceNote  **string `json:"source_note"`
}

type histGroupMemberRoleResponse struct {
	ID                  int64     `json:"id"`
	FansubGroupMemberID int64     `json:"fansub_group_member_id"`
	MemberDisplayName   string    `json:"member_display_name"`
	RoleCode            string    `json:"role_code"`
	RoleLabel           *string   `json:"role_label"`
	StartedDate         *string   `json:"started_date"`
	EndedDate           *string   `json:"ended_date"`
	Note                *string   `json:"note"`
	Status              string    `json:"status"`
	CreatedAt           time.Time `json:"created_at"`
}

func dateOnlyStringPtr(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format("2006-01-02")
	return &formatted
}

func histGroupMemberRoleResponseFromRow(row repository.HistGroupMemberRoleRow, memberDisplayName string) histGroupMemberRoleResponse {
	return histGroupMemberRoleResponse{
		ID:                  row.ID,
		FansubGroupMemberID: row.HistFansubGroupMemberID,
		MemberDisplayName:   memberDisplayName,
		RoleCode:            row.RoleCode,
		RoleLabel:           nil,
		StartedDate:         dateOnlyStringPtr(row.StartedDate),
		EndedDate:           dateOnlyStringPtr(row.EndedDate),
		Note:                row.SourceNote,
		Status:              row.Status,
		CreatedAt:           row.CreatedAt,
	}
}

// ListGroupHistoryRoleDefinitions gibt kuratierte Rollendefinitionen für einen Fansub zurück.
// GET /admin/fansubs/:id/role-definitions[?context=group_history|fansub_group]
// - context=group_history (Default): historische Gruppenrollen für den hist-Dialog.
// - context=fansub_group: zuweisbare Gruppenrollen für den App-Mitglied-Add-Flow (Gap G1, D-12).
// Autorisierung: CanForFansubGroup(ActionFansubGroupMembersView) — member-scoped, für
// Fansub-Leitungen erreichbar (anders als der platform-admin-only Catalog).
func (h *FansubHistGroupMemberRolesHandler) ListGroupHistoryRoleDefinitions(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige Fansub-ID")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "role_definitions.list.denied", &fansubID, "role_definition", nil, permissions.ActionFansubGroupMembersView, result)
		writePermissionDenied(c, result)
		return
	}

	var items []repository.RoleDefinitionOption
	if c.Query("context") == "fansub_group" {
		items, err = h.rolesRepo.ListFansubGroupRoleDefinitions(c.Request.Context())
	} else {
		items, err = h.rolesRepo.ListGroupHistoryRoleDefinitions(c.Request.Context())
	}
	if err != nil {
		log.Printf("role definitions list: repo error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner Serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// ListHistGroupMemberRoles gibt alle Rollen eines Mitglieds zurück.
// GET /admin/fansubs/:id/member-roles?member_id=N
func (h *FansubHistGroupMemberRolesHandler) ListHistGroupMemberRoles(c *gin.Context) {
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
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member_role.list.denied", &fansubID, "hist_fansub_group_member_role", nil, permissions.ActionFansubGroupMembersView, result)
		writePermissionDenied(c, result)
		return
	}

	memberIDStr := c.Query("member_id")
	if memberIDStr == "" {
		badRequest(c, "member_id ist erforderlich")
		return
	}
	memberID, err := strconv.ParseInt(memberIDStr, 10, 64)
	if err != nil || memberID <= 0 {
		badRequest(c, "ungültige member_id")
		return
	}

	// WR-02 (D-14): Cross-Group-Guard — prüft ob die member_id zur angegebenen
	// Fansub-Gruppe gehört, bevor Rollen-Daten zurückgegeben werden.
	// Ohne diesen Check könnten Admins Rollen-Daten fremder Gruppen lesen.
	memberRow, err := h.histMembersRepo.GetByID(c.Request.Context(), memberID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitgliedschaftseintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("hist group member roles list: member lookup error (member_id=%d): %v", memberID, err)
		internalError(c, "interner serverfehler")
		return
	}
	if memberRow.FansubGroupID != fansubID {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "mitglied gehört nicht zu dieser fansubgruppe",
			},
		})
		return
	}

	items, err := h.rolesRepo.ListByMember(c.Request.Context(), memberID)
	if err != nil {
		log.Printf("hist group member roles list: repo error (member_id=%d): %v", memberID, err)
		internalError(c, "interner serverfehler")
		return
	}
	responseItems := make([]histGroupMemberRoleResponse, 0, len(items))
	for _, item := range items {
		responseItems = append(responseItems, histGroupMemberRoleResponseFromRow(item, ""))
	}

	c.JSON(http.StatusOK, gin.H{"data": responseItems})
}

// CreateHistGroupMemberRole legt einen neuen Rolleneintrag für ein historisches Mitglied an.
// POST /admin/fansubs/:id/member-roles
func (h *FansubHistGroupMemberRolesHandler) CreateHistGroupMemberRole(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member_role.create.denied", &fansubID, "hist_fansub_group_member_role", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	var req histGroupMemberRoleCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.HistFansubGroupMemberID <= 0 {
		badRequest(c, "hist_fansub_group_member_id ist erforderlich")
		return
	}
	if req.RoleCode == "" {
		badRequest(c, "role_code ist erforderlich")
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

	// Cross-Group-Guard: prüfen ob das Mitglied zur angegebenen Fansub-Gruppe gehört.
	startedDate, err := parseOptionalDate(req.StartedDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}
	endedDate, err := parseOptionalDate(req.EndedDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}

	memberRow, err := h.histMembersRepo.GetByID(c.Request.Context(), req.HistFansubGroupMemberID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitgliedschaftseintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("hist group member roles create: member lookup error (member_id=%d): %v", req.HistFansubGroupMemberID, err)
		internalError(c, "interner serverfehler")
		return
	}
	if memberRow.FansubGroupID != fansubID {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "mitglied gehört nicht zu dieser fansubgruppe",
			},
		})
		return
	}

	// CR-01 (D-13): Whitelist-Check ersetzt breiten DB-Context-Check.
	// IsGroupHistoryWhitelistRole prüft nur die sechs kanonischen Gruppenrollen-Codes.
	// App-Rollen-Codes wie 'translator' liefern false → 422.
	if !h.rolesRepo.IsGroupHistoryWhitelistRole(req.RoleCode) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"message": "ungültiger role_code für group_history-Kontext",
			},
		})
		return
	}

	input := repository.HistGroupMemberRoleInput{
		HistFansubGroupMemberID: req.HistFansubGroupMemberID,
		RoleCode:                req.RoleCode,
		StartedDate:             startedDate,
		EndedDate:               endedDate,
		Status:                  status,
		Visibility:              visibility,
		SourceNote:              req.SourceNote,
	}

	item, err := h.rolesRepo.Create(c.Request.Context(), input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "mitgliedschaftseintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("hist group member roles create: repo error (member_id=%d, role_code=%s): %v", req.HistFansubGroupMemberID, req.RoleCode, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "hist_group_member_role.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "hist_fansub_group_member_role",
		TargetID:       &item.ID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"role_code": req.RoleCode},
	})

	h.recomputeBadges(c, item.HistFansubGroupMemberID)

	c.JSON(http.StatusCreated, gin.H{"data": histGroupMemberRoleResponseFromRow(*item, "")})
}

// UpdateHistGroupMemberRole aktualisiert einen Rolleneintrag.
// PATCH /admin/fansubs/:id/member-roles/:roleId
func (h *FansubHistGroupMemberRolesHandler) UpdateHistGroupMemberRole(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member_role.update.denied", &fansubID, "hist_fansub_group_member_role", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	roleID, err := strconv.ParseInt(c.Param("roleId"), 10, 64)
	if err != nil || roleID <= 0 {
		badRequest(c, "ungültige role id")
		return
	}

	var req histGroupMemberRolePatchRequest
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

	startedDate, err := parseOptionalPatchDate(req.StartedDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}
	endedDate, err := parseOptionalPatchDate(req.EndedDate)
	if err != nil {
		badRequest(c, "Ungültiges Datum - Format JJJJ-MM-TT erwartet.")
		return
	}

	input := repository.HistGroupMemberRolePatchInput{
		StartedDate: startedDate,
		EndedDate:   endedDate,
		Status:      req.Status,
		Visibility:  req.Visibility,
		SourceNote:  req.SourceNote,
	}

	item, err := h.rolesRepo.Update(c.Request.Context(), fansubID, roleID, input)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "rolleneintrag nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("hist group member roles update: repo error (role_id=%d): %v", roleID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "hist_group_member_role.updated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "hist_fansub_group_member_role",
		TargetID:       &roleID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{},
	})

	h.recomputeBadges(c, item.HistFansubGroupMemberID)

	c.JSON(http.StatusOK, gin.H{"data": histGroupMemberRoleResponseFromRow(*item, "")})
}

// DeleteHistGroupMemberRole entfernt einen Rolleneintrag.
// DELETE /admin/fansubs/:id/member-roles/:roleId
func (h *FansubHistGroupMemberRolesHandler) DeleteHistGroupMemberRole(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "hist_group_member_role.delete.denied", &fansubID, "hist_fansub_group_member_role", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	roleID, err := strconv.ParseInt(c.Param("roleId"), 10, 64)
	if err != nil || roleID <= 0 {
		badRequest(c, "ungültige role id")
		return
	}

	if err := h.rolesRepo.Delete(c.Request.Context(), fansubID, roleID); errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"message": "rolleneintrag nicht gefunden",
			},
		})
		return
	} else if err != nil {
		log.Printf("hist group member roles delete: repo error (role_id=%d): %v", roleID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "hist_group_member_role.deleted",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "hist_fansub_group_member_role",
		TargetID:       &roleID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{},
	})

	c.Status(http.StatusNoContent)
}
