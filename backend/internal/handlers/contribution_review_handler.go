package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ReviewRepository definiert die Datenbankoperationen, die der ContributionReviewHandler benötigt.
// Das Interface ermöglicht Stub-Tests ohne Datenbankverbindung.
type ReviewRepository interface {
	ListProposedByGroup(ctx context.Context, fansubGroupID int64) ([]repository.GroupProposalRow, error)
	Confirm(ctx context.Context, contributionID, actorAppUserID int64) error
	Reject(ctx context.Context, contributionID, actorAppUserID int64, reviewNote *string) error
}

// reviewPermissionChecker abstrahiert den Permission-Service für Stub-Tests.
type reviewPermissionChecker interface {
	CanForFansubGroup(ctx context.Context, actor permissions.Actor, action permissions.Action, fansubID int64) (permissions.Result, error)
}

// ContributionReviewHandler liefert die Leader/Admin-Review-Endpunkte für Vorschläge.
type ContributionReviewHandler struct {
	reviewRepo    ReviewRepository
	permissionSvc reviewPermissionChecker
	auditLogRepo  auditLogWriter
}

// NewContributionReviewHandler erstellt einen neuen ContributionReviewHandler.
func NewContributionReviewHandler(
	reviewRepo ReviewRepository,
	permissionSvc reviewPermissionChecker,
	auditLogRepo auditLogWriter,
) *ContributionReviewHandler {
	return &ContributionReviewHandler{
		reviewRepo:    reviewRepo,
		permissionSvc: permissionSvc,
		auditLogRepo:  auditLogRepo,
	}
}

// rejectRequest enthält den optionalen Ablehnungsgrund.
type rejectRequest struct {
	ReviewNote *string `json:"review_note"`
}

// ListProposals gibt alle offenen Vorschläge (status='proposed') einer Fansub-Gruppe zurück.
// GET /api/v1/admin/fansubs/:id/contribution-proposals
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupMembersManage
// (deckt Fansub-Lead und Plattform-Admin ab — D-09).
func (h *ContributionReviewHandler) ListProposals(c *gin.Context) {
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
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.list_proposals.denied", &fansubID, "anime_contribution", nil, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	rows, err := h.reviewRepo.ListProposedByGroup(c.Request.Context(), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "gruppe nicht gefunden"}})
		return
	}
	if err != nil {
		log.Printf("contribution review: ListProposedByGroup error (fansub_id=%d): %v", fansubID, err)
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": rows})
}

// ConfirmProposal bestätigt einen Vorschlag: status='confirmed', Sichtbarkeitsflags=true,
// confirmed_by/at gesetzt. Schreibt Audit-Log-Eintrag 'anime_contribution.confirmed' (D-14).
// POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/confirm
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupMembersManage (D-09).
func (h *ContributionReviewHandler) ConfirmProposal(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	contributionID, err := strconv.ParseInt(c.Param("cid"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige vorschlags-id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.confirm.denied", &fansubID, "anime_contribution", &contributionID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	if err := h.reviewRepo.Confirm(c.Request.Context(), contributionID, identity.AppUserID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "vorschlag nicht gefunden oder bereits bearbeitet"}})
			return
		}
		log.Printf("contribution review: Confirm error (fansub_id=%d, contribution_id=%d): %v", fansubID, contributionID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "anime_contribution.confirmed",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "anime_contribution",
		TargetID:       &contributionID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Vorschlag wurde bestätigt."})
}

// RejectProposal lehnt einen Vorschlag ab: status='disputed', optionaler review_note,
// kein Hard-Delete (D-07, D-08). Schreibt Audit-Log-Eintrag 'anime_contribution.rejected' (D-14).
// POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/reject
//
// Autorisierung: CanForFansubGroup mit ActionFansubGroupMembersManage (D-09).
func (h *ContributionReviewHandler) RejectProposal(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return
	}

	contributionID, err := strconv.ParseInt(c.Param("cid"), 10, 64)
	if err != nil || contributionID <= 0 {
		badRequest(c, "ungültige vorschlags-id")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "anime_contribution.reject.denied", &fansubID, "anime_contribution", &contributionID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	var req rejectRequest
	body, err := c.GetRawData()
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}
	if len(strings.TrimSpace(string(body))) > 0 {
		if err := json.Unmarshal(body, &req); err != nil {
			badRequest(c, "ungültiger Request-Body")
			return
		}
	}

	if err := h.reviewRepo.Reject(c.Request.Context(), contributionID, identity.AppUserID, req.ReviewNote); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "vorschlag nicht gefunden oder bereits bearbeitet"}})
			return
		}
		log.Printf("contribution review: Reject error (fansub_id=%d, contribution_id=%d): %v", fansubID, contributionID, err)
		internalError(c, "interner serverfehler")
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "anime_contribution.rejected",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "anime_contribution",
		TargetID:       &contributionID,
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"has_note": req.ReviewNote != nil},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Vorschlag wurde abgelehnt."})
}
