package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// FansubHistGroupMemberRolesHandler verwaltet Admin-Endpunkte für hist_group_member_roles.
type FansubHistGroupMemberRolesHandler struct {
	rolesRepo    *repository.HistGroupMemberRolesRepository
	badgeService *services.BadgeService
}

// NewFansubHistGroupMemberRolesHandler erstellt einen neuen FansubHistGroupMemberRolesHandler.
// badgeService darf nil sein; in dem Fall wird die Badge-Neuberechnung übersprungen.
func NewFansubHistGroupMemberRolesHandler(repo *repository.HistGroupMemberRolesRepository, badgeService *services.BadgeService) *FansubHistGroupMemberRolesHandler {
	return &FansubHistGroupMemberRolesHandler{rolesRepo: repo, badgeService: badgeService}
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
	StartedYear             *int    `json:"started_year"`
	EndedYear               *int    `json:"ended_year"`
	Status                  string  `json:"status"`
	Visibility              string  `json:"visibility"`
	SourceNote              *string `json:"source_note"`
}

type histGroupMemberRolePatchRequest struct {
	StartedYear **int    `json:"started_year"`
	EndedYear   **int    `json:"ended_year"`
	Status      *string  `json:"status"`
	Visibility  *string  `json:"visibility"`
	SourceNote  **string `json:"source_note"`
}

// ListHistGroupMemberRoles gibt alle Rollen eines Mitglieds zurück.
// GET /admin/fansubs/:id/member-roles?member_id=N
func (h *FansubHistGroupMemberRolesHandler) ListHistGroupMemberRoles(c *gin.Context) {
	_, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
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

	items, err := h.rolesRepo.ListByMember(c.Request.Context(), memberID)
	if err != nil {
		log.Printf("hist group member roles list: repo error (member_id=%d): %v", memberID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// CreateHistGroupMemberRole legt einen neuen Rolleneintrag für ein historisches Mitglied an.
// POST /admin/fansubs/:id/member-roles
func (h *FansubHistGroupMemberRolesHandler) CreateHistGroupMemberRole(c *gin.Context) {
	_, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
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

	valid, err := h.rolesRepo.RoleCodeExistsForContext(c.Request.Context(), req.RoleCode, "group_history")
	if err != nil {
		log.Printf("hist group member roles create: role validation error (role_code=%s): %v", req.RoleCode, err)
		internalError(c, "interner serverfehler")
		return
	}
	if !valid {
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
		StartedYear:             req.StartedYear,
		EndedYear:               req.EndedYear,
		Status:                  req.Status,
		Visibility:              req.Visibility,
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

	h.recomputeBadges(c, item.HistFansubGroupMemberID)

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// UpdateHistGroupMemberRole aktualisiert einen Rolleneintrag.
// PATCH /admin/fansubs/:id/member-roles/:roleId
func (h *FansubHistGroupMemberRolesHandler) UpdateHistGroupMemberRole(c *gin.Context) {
	_, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
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

	input := repository.HistGroupMemberRolePatchInput{
		StartedYear: req.StartedYear,
		EndedYear:   req.EndedYear,
		Status:      req.Status,
		Visibility:  req.Visibility,
		SourceNote:  req.SourceNote,
	}

	item, err := h.rolesRepo.Update(c.Request.Context(), roleID, input)
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

	h.recomputeBadges(c, item.HistFansubGroupMemberID)

	c.JSON(http.StatusOK, gin.H{"data": item})
}

// DeleteHistGroupMemberRole entfernt einen Rolleneintrag.
// DELETE /admin/fansubs/:id/member-roles/:roleId
func (h *FansubHistGroupMemberRolesHandler) DeleteHistGroupMemberRole(c *gin.Context) {
	_, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	roleID, err := strconv.ParseInt(c.Param("roleId"), 10, 64)
	if err != nil || roleID <= 0 {
		badRequest(c, "ungültige role id")
		return
	}

	if err := h.rolesRepo.Delete(c.Request.Context(), roleID); errors.Is(err, repository.ErrNotFound) {
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

	c.Status(http.StatusNoContent)
}
