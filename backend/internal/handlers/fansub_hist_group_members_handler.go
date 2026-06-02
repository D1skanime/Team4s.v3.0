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

// FansubHistGroupMembersHandler verwaltet Admin-Endpunkte für hist_fansub_group_members.
type FansubHistGroupMembersHandler struct {
	histMembersRepo *repository.HistGroupMembersRepository
	badgeService    *services.BadgeService
}

// NewFansubHistGroupMembersHandler erstellt einen neuen FansubHistGroupMembersHandler.
// badgeService darf nil sein; in dem Fall wird die Badge-Neuberechnung übersprungen.
func NewFansubHistGroupMembersHandler(repo *repository.HistGroupMembersRepository, badgeService *services.BadgeService) *FansubHistGroupMembersHandler {
	return &FansubHistGroupMembersHandler{histMembersRepo: repo, badgeService: badgeService}
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
	MemberID   int64   `json:"member_id"`
	JoinedYear *int    `json:"joined_year"`
	LeftYear   *int    `json:"left_year"`
	Status     string  `json:"status"`
	Visibility string  `json:"visibility"`
}

type histGroupMemberPatchRequest struct {
	JoinedYear **int   `json:"joined_year"`
	LeftYear   **int   `json:"left_year"`
	Status     *string `json:"status"`
	Visibility *string `json:"visibility"`
}

// ListHistGroupMembers gibt alle historischen Mitgliedschaften einer Fansub-Gruppe zurück.
// GET /admin/fansubs/:id/group-members
func (h *FansubHistGroupMembersHandler) ListHistGroupMembers(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	items, err := h.histMembersRepo.ListByFansubGroup(c.Request.Context(), fansubID)
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
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	var req histGroupMemberCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	if req.MemberID <= 0 {
		badRequest(c, "member_id ist erforderlich")
		return
	}

	input := repository.HistGroupMemberInput{
		FansubGroupID: fansubID,
		MemberID:      req.MemberID,
		JoinedYear:    req.JoinedYear,
		LeftYear:      req.LeftYear,
		Status:        req.Status,
		Visibility:    req.Visibility,
	}

	item, err := h.histMembersRepo.Create(c.Request.Context(), input)
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
				"message": "fansubgruppe oder mitglied nicht gefunden",
			},
		})
		return
	}
	if err != nil {
		log.Printf("hist group members create: repo error (fansub_id=%d, member_id=%d): %v", fansubID, req.MemberID, err)
		internalError(c, "interner serverfehler")
		return
	}

	h.recomputeBadges(c, item.MemberID)

	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// UpdateHistGroupMember aktualisiert einen historischen Mitgliedschaftseintrag.
// PATCH /admin/fansubs/:id/group-members/:memberId
func (h *FansubHistGroupMembersHandler) UpdateHistGroupMember(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
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

	input := repository.HistGroupMemberPatchInput{
		JoinedYear: req.JoinedYear,
		LeftYear:   req.LeftYear,
		Status:     req.Status,
		Visibility: req.Visibility,
	}

	item, err := h.histMembersRepo.Update(c.Request.Context(), memberID, input)
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

	h.recomputeBadges(c, item.MemberID)

	c.JSON(http.StatusOK, gin.H{"data": item})
}

// DeleteHistGroupMember entfernt einen historischen Mitgliedschaftseintrag.
// DELETE /admin/fansubs/:id/group-members/:memberId
func (h *FansubHistGroupMembersHandler) DeleteHistGroupMember(c *gin.Context) {
	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	memberID, err := strconv.ParseInt(c.Param("memberId"), 10, 64)
	if err != nil || memberID <= 0 {
		badRequest(c, "ungültige member id")
		return
	}

	if err := h.histMembersRepo.Delete(c.Request.Context(), memberID); errors.Is(err, repository.ErrNotFound) {
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

	c.Status(http.StatusNoContent)
}
