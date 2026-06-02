package handlers

import (
	"errors"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type MemberClaimInvitationsHandler struct {
	invitationsRepo *repository.MemberClaimInvitationRepository
	permissionSvc   *permissions.Service
	auditLogRepo    auditLogWriter
	appPublicURL    string
}

func NewMemberClaimInvitationsHandler(
	invitationsRepo *repository.MemberClaimInvitationRepository,
	permissionSvc *permissions.Service,
	auditLogRepo auditLogWriter,
	appPublicURL string,
) *MemberClaimInvitationsHandler {
	return &MemberClaimInvitationsHandler{
		invitationsRepo: invitationsRepo,
		permissionSvc:   permissionSvc,
		auditLogRepo:    auditLogRepo,
		appPublicURL:    strings.TrimRight(strings.TrimSpace(appPublicURL), "/"),
	}
}

type acceptMemberClaimInvitationRequest struct {
	Token string `json:"token"`
}

func (h *MemberClaimInvitationsHandler) CreateClaimInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationsRepo == nil || h.permissionSvc == nil {
		internalError(c, "interner serverfehler")
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "Ungültige fansub-id.")
		return
	}
	memberID, err := parsePositiveID(c.Param("memberId"))
	if err != nil {
		badRequest(c, "Ungültige member-id.")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCreate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "member_claim_invitation.create.denied", &fansubID, "member", &memberID, permissions.ActionFansubGroupInvitationsCreate, result)
		writePermissionDenied(c, result)
		return
	}

	created, err := h.invitationsRepo.CreateInvitation(c.Request.Context(), memberID, fansubID, identity.AppUserID)
	if h.writeInvitationError(c, err, "Member nicht in dieser Fansub-Gruppe gefunden.") {
		return
	}

	h.writeAudit(c, identity.AppUserID, "member_claim_invitation.created", fansubID, "member_claim_invitation", created.Invitation.ID, string(permissions.ActionFansubGroupInvitationsCreate), map[string]any{
		"member_id":       memberID,
		"fansub_group_id": fansubID,
	})

	c.JSON(http.StatusCreated, gin.H{"data": gin.H{
		"id":              created.Invitation.ID,
		"member_id":       created.Invitation.MemberID,
		"fansub_group_id": created.Invitation.FansubGroupID,
		"status":          created.Invitation.Status,
		"expires_at":      created.Invitation.ExpiresAt,
		"invite_link":     h.absoluteInviteLink(created.InviteLink),
	}})
}

func (h *MemberClaimInvitationsHandler) AcceptClaimInvitation(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}
	if h.invitationsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	var req acceptMemberClaimInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "Ungültiger Request-Body.")
		return
	}
	if strings.TrimSpace(req.Token) == "" {
		badRequest(c, "Token fehlt.")
		return
	}

	err := h.invitationsRepo.AcceptInvitation(c.Request.Context(), req.Token, identity.AppUserID)
	if h.writeInvitationError(c, err, "Ungültiger Einladungslink. Bitte überprüfe den Link oder wende dich an deinen Leader.") {
		return
	}

	h.writeAudit(c, identity.AppUserID, "member_claim_invitation.accepted", 0, "app_user", identity.AppUserID, "accept", nil)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "Dein Account ist jetzt verifiziert."}})
}

func (h *MemberClaimInvitationsHandler) CancelClaimInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationsRepo == nil || h.permissionSvc == nil {
		internalError(c, "interner serverfehler")
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "Ungültige fansub-id.")
		return
	}
	memberID, err := parsePositiveID(c.Param("memberId"))
	if err != nil {
		badRequest(c, "Ungültige member-id.")
		return
	}
	invitationID, err := parsePositiveID(c.Param("invitationId"))
	if err != nil {
		badRequest(c, "Ungültige invitation-id.")
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCancel, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "member_claim_invitation.cancel.denied", &fansubID, "member_claim_invitation", &invitationID, permissions.ActionFansubGroupInvitationsCancel, result)
		writePermissionDenied(c, result)
		return
	}

	err = h.invitationsRepo.CancelInvitation(c.Request.Context(), invitationID, memberID, fansubID, identity.AppUserID)
	if h.writeInvitationError(c, err, "Einladung nicht gefunden.") {
		return
	}

	h.writeAudit(c, identity.AppUserID, "member_claim_invitation.cancelled", fansubID, "member_claim_invitation", invitationID, string(permissions.ActionFansubGroupInvitationsCancel), map[string]any{
		"member_id":       memberID,
		"fansub_group_id": fansubID,
	})
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "Einladung storniert."}})
}

func (h *MemberClaimInvitationsHandler) absoluteInviteLink(link string) string {
	trimmed := strings.TrimSpace(link)
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") || h.appPublicURL == "" {
		return trimmed
	}
	if strings.HasPrefix(trimmed, "/") {
		return h.appPublicURL + trimmed
	}
	return h.appPublicURL + "/" + trimmed
}

func (h *MemberClaimInvitationsHandler) writeInvitationError(c *gin.Context, err error, notFoundMessage string) bool {
	if err == nil {
		return false
	}
	if mutationErr, ok := repository.AsClaimMutationError(err); ok {
		c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": memberClaimInvitationMessage(mutationErr.Code, mutationErr.Message), "reason_code": mutationErr.Code}})
		return true
	}
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, notFoundMessage)
		return true
	}
	internalError(c, "interner serverfehler")
	return true
}

func (h *MemberClaimInvitationsHandler) writeAudit(c *gin.Context, actorAppUserID int64, eventType string, fansubID int64, targetType string, targetID int64, action string, payload map[string]any) {
	if h.auditLogRepo == nil {
		return
	}
	var scopeID *int64
	if fansubID > 0 {
		scopeID = &fansubID
	}
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &actorAppUserID,
		EventType:      eventType,
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        scopeID,
		TargetType:     targetType,
		TargetID:       &targetID,
		Action:         action,
		Outcome:        "allowed",
		Payload:        payload,
	})
}

func memberClaimInvitationMessage(code string, fallback string) string {
	switch strings.TrimSpace(code) {
	case "invitation_expired":
		return "Dieser Einladungslink ist abgelaufen. Bitte deinen Leader, einen neuen Link zu erstellen."
	case "invitation_used":
		return "Diese Einladung wurde bereits verwendet."
	case "invitation_cancelled":
		return "Diese Einladung wurde bereits zurückgezogen."
	case "already_verified":
		return "Du bist bereits einem historischen Eintrag zugeordnet."
	default:
		return fallback
	}
}
