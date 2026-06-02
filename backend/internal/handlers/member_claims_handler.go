package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type MemberClaimsHandler struct {
	claimsRepo    *repository.MemberClaimsRepository
	permissionSvc *permissions.Service
	auditLogRepo  auditLogWriter
}

func NewMemberClaimsHandler(
	claimsRepo *repository.MemberClaimsRepository,
	permissionSvc *permissions.Service,
	auditLogRepo auditLogWriter,
) *MemberClaimsHandler {
	return &MemberClaimsHandler{
		claimsRepo:    claimsRepo,
		permissionSvc: permissionSvc,
		auditLogRepo:  auditLogRepo,
	}
}

type submitMemberClaimRequest struct {
	MemberID int64  `json:"member_id"`
	Note     string `json:"note"`
}

func (h *MemberClaimsHandler) SearchMembers(c *gin.Context) {
	if _, ok := requireMeIdentity(c); !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		badRequest(c, "Suchbegriff fehlt.")
		return
	}

	results, err := h.claimsRepo.SearchHistoricalMembers(c.Request.Context(), query)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

func (h *MemberClaimsHandler) SubmitClaim(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	var req submitMemberClaimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "Ungültiger Request-Body.")
		return
	}
	if req.MemberID <= 0 {
		badRequest(c, "member_id ist erforderlich.")
		return
	}

	claim, err := h.claimsRepo.SubmitClaim(c.Request.Context(), repository.SubmitClaimInput{
		MemberID:  req.MemberID,
		AppUserID: identity.AppUserID,
		Note:      req.Note,
	})
	if h.writeClaimError(c, err, "Member-Eintrag nicht gefunden.") {
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": claim})
}

func (h *MemberClaimsHandler) GetMyClaim(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	claim, err := h.claimsRepo.GetMyClaim(c.Request.Context(), identity.AppUserID)
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"data": nil})
		return
	}
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": claim})
}

func (h *MemberClaimsHandler) ListPendingClaimsForGroup(c *gin.Context) {
	fansubID, ok := h.requireFansubPermission(c, permissions.ActionFansubGroupInvitationsCreate, "member_claim.list.denied", nil)
	if !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	claims, err := h.claimsRepo.ListPendingClaimsForGroup(c.Request.Context(), fansubID)
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": claims})
}

func (h *MemberClaimsHandler) VerifyClaim(c *gin.Context) {
	claimID, err := parsePositiveID(c.Param("claimId"))
	if err != nil {
		badRequest(c, "Ungültige claim-id.")
		return
	}
	fansubID, ok := h.requireFansubPermission(c, permissions.ActionFansubGroupInvitationsCreate, "member_claim.verify.denied", &claimID)
	if !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	identity, _, _ := permissionActorFromContext(c)
	err = h.claimsRepo.VerifyClaim(c.Request.Context(), fansubID, claimID, identity.AppUserID)
	if h.writeClaimError(c, err, "Claim nicht gefunden.") {
		return
	}

	h.writeAudit(c, identity.AppUserID, "member_claim.verified", fansubID, "member_claim", claimID, "verify", nil)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "Claim erfolgreich bestätigt."}})
}

func (h *MemberClaimsHandler) RejectClaim(c *gin.Context) {
	claimID, err := parsePositiveID(c.Param("claimId"))
	if err != nil {
		badRequest(c, "Ungültige claim-id.")
		return
	}
	fansubID, ok := h.requireFansubPermission(c, permissions.ActionFansubGroupInvitationsCreate, "member_claim.reject.denied", &claimID)
	if !ok {
		return
	}
	if h.claimsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	identity, _, _ := permissionActorFromContext(c)
	err = h.claimsRepo.RejectClaim(c.Request.Context(), fansubID, claimID, identity.AppUserID)
	if h.writeClaimError(c, err, "Claim nicht gefunden.") {
		return
	}

	h.writeAudit(c, identity.AppUserID, "member_claim.rejected", fansubID, "member_claim", claimID, "reject", nil)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "Claim abgelehnt."}})
}

func (h *MemberClaimsHandler) requireFansubPermission(c *gin.Context, action permissions.Action, deniedEvent string, targetID *int64) (int64, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return 0, false
	}
	if h.permissionSvc == nil {
		internalError(c, "interner serverfehler")
		return 0, false
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "Ungültige fansub-id.")
		return 0, false
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, action, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
		return 0, false
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, deniedEvent, &fansubID, "member_claim", targetID, action, result)
		writePermissionDenied(c, result)
		return 0, false
	}
	return fansubID, true
}

func (h *MemberClaimsHandler) writeClaimError(c *gin.Context, err error, notFoundMessage string) bool {
	if err == nil {
		return false
	}
	if mutationErr, ok := repository.AsClaimMutationError(err); ok {
		c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": mutationErr.Message, "reason_code": mutationErr.Code}})
		return true
	}
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, notFoundMessage)
		return true
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "Dieser Claim steht im Konflikt mit einem bestehenden Eintrag.", "reason_code": "claim_conflict"}})
		return true
	}
	internalError(c, "interner serverfehler")
	return true
}

func (h *MemberClaimsHandler) writeAudit(c *gin.Context, actorAppUserID int64, eventType string, fansubID int64, targetType string, targetID int64, action string, payload map[string]any) {
	if h.auditLogRepo == nil {
		return
	}
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &actorAppUserID,
		EventType:      eventType,
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     targetType,
		TargetID:       &targetID,
		Action:         action,
		Outcome:        "allowed",
		Payload:        payload,
	})
}

func parsePositiveID(raw string) (int64, error) {
	value, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil || value <= 0 {
		if err != nil {
			return 0, err
		}
		return 0, errors.New("id must be positive")
	}
	return value, nil
}
