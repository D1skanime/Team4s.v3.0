package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	backendauth "team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type fansubGroupCapabilitiesResponse struct {
	CanEditGroup        bool `json:"can_edit_group"`
	CanManageLinks      bool `json:"can_manage_links"`
	CanViewMembers      bool `json:"can_view_members"`
	CanManageMembers    bool `json:"can_manage_members"`
	CanEditNotes        bool `json:"can_edit_notes"`
	CanViewInvitations  bool `json:"can_view_invitations"`
	CanCreateInvitation bool `json:"can_create_invitation"`
	CanCancelInvitation bool `json:"can_cancel_invitation"`
}

type fansubGroupAppMemberStore interface {
	ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]models.FansubGroupAppMember, error)
	SearchCandidates(ctx context.Context, fansubGroupID int64, query string, limit int) ([]models.AppUserListItem, error)
	Create(ctx context.Context, fansubGroupID int64, input models.FansubGroupMemberCreateInput) (*models.FansubGroupAppMember, error)
	SetRole(ctx context.Context, fansubGroupID int64, appUserID int64, input models.FansubGroupMemberRoleUpdateInput) (*models.FansubGroupAppMember, error)
	UpdateStatus(ctx context.Context, fansubGroupID int64, appUserID int64, input models.FansubGroupMemberStatusUpdateInput) (*models.FansubGroupAppMember, error)
}

type fansubGroupInvitationStore interface {
	ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]models.FansubGroupInvitation, error)
	Create(ctx context.Context, fansubGroupID int64, input models.FansubGroupInvitationCreateInput) (*models.FansubGroupInvitationCreateResult, error)
	Cancel(ctx context.Context, fansubGroupID int64, invitationID int64, input models.FansubGroupInvitationCancelInput) (*models.FansubGroupInvitation, error)
	Accept(ctx context.Context, input models.AcceptFansubInvitationInput) (*models.FansubGroupInvitation, *models.FansubGroupAppMember, error)
}

type contributorDashboardStore interface {
	ListContributorGroups(ctx context.Context, input models.ContributorGroupQueryInput) ([]models.ContributorGroupOverview, error)
	GetContributorGroupDetail(ctx context.Context, input models.ContributorGroupQueryInput, fansubGroupID int64) (*models.ContributorGroupDetail, error)
}

type auditLogWriter interface {
	Write(ctx context.Context, entry repository.AuditLogEntry) error
}

type AppAuthHandler struct {
	appAuthRepo        *repository.AppAuthRepository
	authzRepo          *repository.AuthzRepository
	stateRepo          *repository.AuthRepository
	memberRepo         fansubGroupAppMemberStore
	invitationRepo     fansubGroupInvitationStore
	profileRepo        memberProfileStore
	contributorRepo    contributorDashboardStore
	keycloakVerifier   *backendauth.KeycloakVerifier
	permissionSvc      *permissions.Service
	auditLogRepo       auditLogWriter
	mediaStorageDir    string
	mediaBaseURL       string
	keycloakAccountURL string
}

func NewAppAuthHandler(
	appAuthRepo *repository.AppAuthRepository,
	authzRepo *repository.AuthzRepository,
	stateRepo *repository.AuthRepository,
	memberRepo *repository.FansubGroupAppMemberRepository,
	invitationRepo *repository.FansubGroupInvitationRepository,
	profileRepo *repository.MemberProfileRepository,
	contributorRepo *repository.ContributorDashboardRepository,
	keycloakVerifier *backendauth.KeycloakVerifier,
	permissionSvc *permissions.Service,
	auditLogRepo *repository.AuditLogRepository,
	mediaStorageDir string,
	mediaBaseURL string,
	keycloakAccountURL string,
) *AppAuthHandler {
	return &AppAuthHandler{
		appAuthRepo:        appAuthRepo,
		authzRepo:          authzRepo,
		stateRepo:          stateRepo,
		memberRepo:         memberRepo,
		invitationRepo:     invitationRepo,
		profileRepo:        profileRepo,
		contributorRepo:    contributorRepo,
		keycloakVerifier:   keycloakVerifier,
		permissionSvc:      permissionSvc,
		auditLogRepo:       auditLogRepo,
		mediaStorageDir:    strings.TrimSpace(mediaStorageDir),
		mediaBaseURL:       strings.TrimSpace(mediaBaseURL),
		keycloakAccountURL: strings.TrimSpace(keycloakAccountURL),
	}
}

func (h *AppAuthHandler) GetCurrentUser(c *gin.Context) {
	identity, ok := middleware.CommentAuthIdentityFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
		return
	}

	globalRoles := append([]string{}, identity.GlobalRoles...)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"app_user_id":       identity.AppUserID,
			"legacy_user_id":    identity.UserID,
			"display_name":      identity.DisplayName,
			"email":             identity.Email,
			"keycloak_subject":  identity.KeycloakSubject,
			"status":            identity.AppUserStatus,
			"global_roles":      globalRoles,
			"is_platform_admin": identity.IsPlatformAdmin,
			"session_id":        identity.SessionID,
		},
	})
}

func (h *AppAuthHandler) ListAppUsers(c *gin.Context) {
	if _, ok := requirePlatformAdminIdentity(c, h.authzRepo, ""); !ok {
		return
	}

	users, err := h.appAuthRepo.ListAppUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": users})
}

func (h *AppAuthHandler) HandleKeycloakBackchannelLogout(c *gin.Context) {
	if h.keycloakVerifier == nil || h.stateRepo == nil {
		c.JSON(http.StatusNotImplemented, gin.H{"error": gin.H{"message": "keycloak logout ist nicht aktiviert"}})
		return
	}

	rawToken := strings.TrimSpace(c.PostForm("logout_token"))
	if rawToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "logout_token ist erforderlich"}})
		return
	}

	claims, expiresAt, err := h.keycloakVerifier.VerifyLogoutToken(c.Request.Context(), rawToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "ungueltiges logout-token"}})
		return
	}

	if _, ok := claims.Events["http://schemas.openid.net/event/backchannel-logout"]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "logout-token ohne backchannel-event"}})
		return
	}

	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		ttl = time.Minute
	}
	issuer := h.keycloakVerifier.IssuerURL()

	if err := h.stateRepo.RevokeOIDCSession(c.Request.Context(), issuer, claims.Session, ttl); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "logout-status voruebergehend nicht verfuegbar"}})
		return
	}
	if err := h.stateRepo.RevokeOIDCSubject(c.Request.Context(), issuer, claims.Subject, ttl); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": gin.H{"message": "logout-status voruebergehend nicht verfuegbar"}})
		return
	}
	if h.appAuthRepo != nil && strings.TrimSpace(claims.Subject) != "" {
		_ = h.appAuthRepo.MarkLoggedOutBySubject(c.Request.Context(), claims.Subject, time.Now().UTC())
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "logged_out"}})
}

type createFansubGroupAppMemberRequest struct {
	AppUserID int64    `json:"app_user_id"`
	Roles     []string `json:"roles"`
}

type setFansubGroupMemberRoleRequest struct {
	Role    string `json:"role"`
	Enabled bool   `json:"enabled"`
}

type setFansubGroupMemberStatusRequest struct {
	Status string `json:"status"`
}

type createFansubGroupInvitationRequest struct {
	Email            string   `json:"email"`
	InvitedRoleCodes []string `json:"invited_role_codes"`
}

type acceptFansubGroupInvitationRequest struct {
	Token string `json:"token"`
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
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
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
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
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

func (h *AppAuthHandler) ListFansubGroupInvitations(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_invitations.view.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupInvitationsView, result)
		writePermissionDenied(c, result)
		return
	}

	invitations, err := h.invitationRepo.ListByFansubGroup(c.Request.Context(), fansubID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": invitations})
}

func (h *AppAuthHandler) CreateFansubGroupInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCreate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_invitations.create.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupInvitationsCreate, result)
		writePermissionDenied(c, result)
		return
	}

	var req createFansubGroupInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige anfrage"}})
		return
	}

	created, err := h.invitationRepo.Create(c.Request.Context(), fansubID, models.FansubGroupInvitationCreateInput{
		Email:              req.Email,
		InvitedRoleCodes:   req.InvitedRoleCodes,
		CreatedByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
			return
		}
		if mutationErr, ok := repository.AsInvitationMutationError(err); ok {
			c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": mutationErr.Message, "reason_code": mutationErr.Code}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_invitation.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_invitation",
		TargetID:       &created.Invitation.ID,
		Action:         string(permissions.ActionFansubGroupInvitationsCreate),
		Outcome:        "allowed",
		Payload: map[string]any{
			"email":              created.Invitation.Email,
			"invited_role_codes": created.Invitation.InvitedRoleCodes,
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"id":                 created.Invitation.ID,
			"email":              created.Invitation.Email,
			"invited_role_codes": created.Invitation.InvitedRoleCodes,
			"status":             created.Invitation.Status,
			"expires_at":         created.Invitation.ExpiresAt,
			"invite_link":        created.InviteLink,
		},
	})
}

func (h *AppAuthHandler) CancelFansubGroupInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}
	invitationID, err := parseFansubID(c.Param("invitationId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige invitation-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCancel, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_invitations.cancel.denied", &fansubID, "fansub_group_invitation", &invitationID, permissions.ActionFansubGroupInvitationsCancel, result)
		writePermissionDenied(c, result)
		return
	}

	invitation, err := h.invitationRepo.Cancel(c.Request.Context(), fansubID, invitationID, models.FansubGroupInvitationCancelInput{
		CancelledByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "einladung nicht gefunden"}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_invitation.cancelled",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_invitation",
		TargetID:       &invitation.ID,
		Action:         string(permissions.ActionFansubGroupInvitationsCancel),
		Outcome:        "allowed",
		Payload:        map[string]any{"email": invitation.Email},
	})

	c.JSON(http.StatusOK, gin.H{"data": invitation})
}

func (h *AppAuthHandler) AcceptFansubInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	result := h.permissionSvc.CanAcceptInvitation(actor)
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	var req acceptFansubGroupInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige anfrage"}})
		return
	}

	invitation, member, err := h.invitationRepo.Accept(c.Request.Context(), models.AcceptFansubInvitationInput{
		Token: req.Token,
		ActorAppUser: models.AppUser{
			ID:    identity.AppUserID,
			Email: identity.Email,
		},
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "einladung nicht gefunden"}})
			return
		}
		if mutationErr, ok := repository.AsInvitationMutationError(err); ok {
			var scopeID *int64
			var targetID *int64
			if invitation != nil {
				scopeID = &invitation.FansubGroupID
				targetID = &invitation.ID
			}
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID: &identity.AppUserID,
				EventType:      "fansub_group_invitation.accept.blocked",
				ScopeType:      permissions.ScopeTypeGroup,
				ScopeID:        scopeID,
				TargetType:     "fansub_group_invitation",
				TargetID:       targetID,
				Action:         string(permissions.ActionFansubGroupInvitationsAccept),
				Outcome:        "denied",
				ReasonCode:     &mutationErr.Code,
			})
			c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": mutationErr.Message, "reason_code": mutationErr.Code}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_invitation.accepted",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &invitation.FansubGroupID,
		TargetType:     "fansub_group_invitation",
		TargetID:       &invitation.ID,
		Action:         string(permissions.ActionFansubGroupInvitationsAccept),
		Outcome:        "allowed",
		Payload: map[string]any{
			"member_id":          member.ID,
			"fansub_group_id":    member.FansubGroupID,
			"invited_role_codes": invitation.InvitedRoleCodes,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"accepted":        true,
			"fansub_group_id": invitation.FansubGroupID,
		},
	})
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

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_members.manage.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
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
	if len(roles) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "Mindestens eine Gruppenrolle ist erforderlich."}})
		return
	}

	member, err := h.memberRepo.Create(c.Request.Context(), fansubID, models.FansubGroupMemberCreateInput{
		AppUserID:          req.AppUserID,
		Roles:              roles,
		CreatedByAppUserID: &identity.AppUserID,
	})
	if err != nil {
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
		Action:         string(permissions.ActionFansubGroupMembersManage),
		Outcome:        "allowed",
		Payload:        map[string]any{"app_user_id": req.AppUserID, "roles": roles},
	})

	c.JSON(http.StatusCreated, gin.H{"data": member})
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
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
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
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Mitgliederberechtigung konnte nicht geprüft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_members.status.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupMembersManage, result)
		writePermissionDenied(c, result)
		return
	}

	appUserID, err := parseFansubID(c.Param("appUserId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige app-user-id"}})
		return
	}

	var req setFansubGroupMemberStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungültige anfrage"}})
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

func (h *AppAuthHandler) GetFansubGroupCapabilities(c *gin.Context) {
	_, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	canEditGroup, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewMembers, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageMembers, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canManageLinks, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupLinksManage, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canEditNotes, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupNotesWrite, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canViewInvitations, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canCreateInvitation, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCreate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	canCancelInvitation, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCancel, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}

	if !canEditGroup.Allowed && !canViewMembers.Allowed && !canManageMembers.Allowed && !canManageLinks.Allowed && !canEditNotes.Allowed && !canViewInvitations.Allowed && !canCreateInvitation.Allowed && !canCancelInvitation.Allowed {
		writePermissionDenied(c, canViewMembers)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": fansubGroupCapabilitiesResponse{
		CanEditGroup:        canEditGroup.Allowed,
		CanManageLinks:      canManageLinks.Allowed,
		CanViewMembers:      canViewMembers.Allowed,
		CanManageMembers:    canManageMembers.Allowed,
		CanEditNotes:        canEditNotes.Allowed,
		CanViewInvitations:  canViewInvitations.Allowed,
		CanCreateInvitation: canCreateInvitation.Allowed,
		CanCancelInvitation: canCancelInvitation.Allowed,
	}})
}

func (h *AppAuthHandler) ListMyFansubGroups(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.contributorRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "contributor dashboard nicht verfuegbar"}})
		return
	}
	if strings.TrimSpace(identity.AppUserStatus) == models.AppUserStatusDisabled {
		writePermissionDenied(c, permissions.Result{ReasonCode: permissions.ReasonDisabledUser})
		return
	}

	groups, err := h.contributorRepo.ListContributorGroups(c.Request.Context(), contributorQueryInput(identity))
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Meine Gruppen konnten nicht geladen werden.")
		return
	}

	for i := range groups {
		capabilities, err := h.contributorCapabilities(c.Request.Context(), actor, groups[i].ID)
		if err != nil {
			writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
			return
		}
		groups[i].Capabilities = capabilities
	}

	c.JSON(http.StatusOK, gin.H{"data": groups})
}

func (h *AppAuthHandler) GetMyFansubGroupDetail(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.contributorRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "contributor dashboard nicht verfuegbar"}})
		return
	}
	if strings.TrimSpace(identity.AppUserStatus) == models.AppUserStatusDisabled {
		writePermissionDenied(c, permissions.Result{ReasonCode: permissions.ReasonDisabledUser})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	detail, err := h.contributorRepo.GetContributorGroupDetail(c.Request.Context(), contributorQueryInput(identity), fansubID)
	if errors.Is(err, repository.ErrNotFound) {
		writePermissionDenied(c, permissions.Result{ReasonCode: permissions.ReasonNoMembership})
		return
	}
	if err != nil {
		writeInternalErrorResponse(c, "interner serverfehler", err, "Gruppendetail konnte nicht geladen werden.")
		return
	}

	capabilities, err := h.contributorCapabilities(c.Request.Context(), actor, detail.Group.ID)
	if err != nil {
		writePermissionInternalError(c, err, "Capabilities konnten nicht geladen werden.")
		return
	}
	if !capabilities.CanOpenContributorGroup {
		writePermissionDenied(c, permissions.Result{ReasonCode: permissions.ReasonNoMembership})
		return
	}
	detail.Group.Capabilities = capabilities

	c.JSON(http.StatusOK, gin.H{"data": detail})
}

func contributorQueryInput(identity middleware.AuthIdentity) models.ContributorGroupQueryInput {
	var legacyUserID *int64
	if identity.UserID > 0 {
		value := identity.UserID
		legacyUserID = &value
	}

	return models.ContributorGroupQueryInput{
		AppUserID:       identity.AppUserID,
		LegacyUserID:    legacyUserID,
		IsPlatformAdmin: identity.IsPlatformAdmin,
	}
}

func (h *AppAuthHandler) contributorCapabilities(ctx context.Context, actor permissions.Actor, fansubID int64) (models.ContributorGroupCapabilities, error) {
	var caps models.ContributorGroupCapabilities
	if h.permissionSvc == nil || fansubID <= 0 {
		return caps, nil
	}

	canEditGroup, err := h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupEdit, fansubID)
	if err != nil {
		return caps, err
	}
	canManageMembers, err := h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupMembersManage, fansubID)
	if err != nil {
		return caps, err
	}
	canEditNotes, err := h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupNotesWrite, fansubID)
	if err != nil {
		return caps, err
	}
	canViewReleases, err := h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionReleaseView, fansubID)
	if err != nil {
		return caps, err
	}
	canUploadReleaseMedia, err := h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionReleaseVersionMediaUpload, fansubID)
	if err != nil {
		return caps, err
	}

	caps.CanEditGroup = canEditGroup.Allowed
	caps.CanViewGroupMedia = canEditGroup.Allowed || canViewReleases.Allowed
	caps.CanUploadGroupMedia = canEditGroup.Allowed
	caps.CanViewReleases = canViewReleases.Allowed
	caps.CanEditReleaseDescriptions = canEditNotes.Allowed
	caps.CanUploadReleaseMedia = canUploadReleaseMedia.Allowed
	caps.CanManageMembers = canManageMembers.Allowed
	caps.CanOpenContributorGroup = caps.CanEditGroup || caps.CanViewGroupMedia || caps.CanViewReleases || caps.CanManageMembers
	return caps, nil
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
