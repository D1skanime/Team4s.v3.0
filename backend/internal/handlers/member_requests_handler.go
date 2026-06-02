package handlers

import (
	"errors"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type MemberRequestsHandler struct {
	requestsRepo  *repository.MemberRequestsRepository
	permissionSvc *permissions.Service
	auditLogRepo  auditLogWriter
}

func NewMemberRequestsHandler(
	requestsRepo *repository.MemberRequestsRepository,
	permissionSvc *permissions.Service,
	auditLogRepo auditLogWriter,
) *MemberRequestsHandler {
	return &MemberRequestsHandler{
		requestsRepo:  requestsRepo,
		permissionSvc: permissionSvc,
		auditLogRepo:  auditLogRepo,
	}
}

type submitMemberRequestRequest struct {
	Note string `json:"note"`
}

type approveMemberRequestRequest struct {
	Nickname string `json:"nickname"`
}

func (h *MemberRequestsHandler) SubmitRequest(c *gin.Context) {
	identity, ok := requireMeIdentity(c)
	if !ok {
		return
	}
	if h.requestsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	var req submitMemberRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "Ungültiger Request-Body.")
		return
	}

	request, err := h.requestsRepo.SubmitRequest(c.Request.Context(), identity.AppUserID, req.Note)
	if h.writeRequestError(c, err, "Neuanlage-Antrag konnte nicht erstellt werden.") {
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": request})
}

func (h *MemberRequestsHandler) ListRequests(c *gin.Context) {
	if _, ok := h.requirePlatformAdmin(c); !ok {
		return
	}
	if h.requestsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	requests, err := h.requestsRepo.ListPendingRequests(c.Request.Context())
	if err != nil {
		internalError(c, "interner serverfehler")
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": requests})
}

func (h *MemberRequestsHandler) ApproveRequest(c *gin.Context) {
	identity, ok := h.requirePlatformAdmin(c)
	if !ok {
		return
	}
	if h.requestsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	requestID, err := parsePositiveID(c.Param("requestId"))
	if err != nil {
		badRequest(c, "Ungültige request-id.")
		return
	}

	var req approveMemberRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "Ungültiger Request-Body.")
		return
	}
	nickname := strings.TrimSpace(req.Nickname)
	if nickname == "" {
		badRequest(c, "Nickname fehlt.")
		return
	}

	err = h.requestsRepo.ApproveRequest(c.Request.Context(), requestID, identity.AppUserID, nickname)
	if h.writeRequestError(c, err, "Neuanlage-Antrag nicht gefunden.") {
		return
	}

	h.writeAudit(c, identity.AppUserID, "member_request.approved", requestID, "approve", map[string]any{"nickname": nickname})
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "Neuanlage-Antrag bestätigt."}})
}

func (h *MemberRequestsHandler) RejectRequest(c *gin.Context) {
	identity, ok := h.requirePlatformAdmin(c)
	if !ok {
		return
	}
	if h.requestsRepo == nil {
		internalError(c, "interner serverfehler")
		return
	}

	requestID, err := parsePositiveID(c.Param("requestId"))
	if err != nil {
		badRequest(c, "Ungültige request-id.")
		return
	}

	err = h.requestsRepo.RejectRequest(c.Request.Context(), requestID, identity.AppUserID)
	if h.writeRequestError(c, err, "Neuanlage-Antrag nicht gefunden.") {
		return
	}

	h.writeAudit(c, identity.AppUserID, "member_request.rejected", requestID, "reject", nil)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "Neuanlage-Antrag abgelehnt."}})
}

func (h *MemberRequestsHandler) requirePlatformAdmin(c *gin.Context) (adminIdentity, bool) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return adminIdentity{}, false
	}
	if !actor.IsPlatformAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung"}})
		return adminIdentity{}, false
	}
	return adminIdentity{AppUserID: identity.AppUserID}, true
}

func (h *MemberRequestsHandler) writeRequestError(c *gin.Context, err error, notFoundMessage string) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, repository.ErrNotFound) {
		notFound(c, notFoundMessage)
		return true
	}
	if errors.Is(err, repository.ErrConflict) {
		c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "Es gibt bereits einen offenen Neuanlage-Antrag.", "reason_code": "pending_request_exists"}})
		return true
	}
	internalError(c, "interner serverfehler")
	return true
}

func (h *MemberRequestsHandler) writeAudit(c *gin.Context, actorAppUserID int64, eventType string, requestID int64, action string, payload map[string]any) {
	if h.auditLogRepo == nil {
		return
	}
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &actorAppUserID,
		EventType:      eventType,
		TargetType:     "member_request",
		TargetID:       &requestID,
		Action:         action,
		Outcome:        "allowed",
		Payload:        payload,
	})
}

type adminIdentity struct {
	AppUserID int64
}
