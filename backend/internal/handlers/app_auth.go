package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	backendauth "team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type fansubGroupAppMemberStore interface {
	ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]models.FansubGroupAppMember, error)
	SearchCandidates(ctx context.Context, fansubGroupID int64, query string, limit int) ([]models.FansubGroupMemberCandidate, error)
	Create(ctx context.Context, fansubGroupID int64, input models.FansubGroupMemberCreateInput) (*models.FansubGroupAppMember, error)
	SetRole(ctx context.Context, fansubGroupID int64, appUserID int64, input models.FansubGroupMemberRoleUpdateInput) (*models.FansubGroupAppMember, error)
	UpdateStatus(ctx context.Context, fansubGroupID int64, appUserID int64, input models.FansubGroupMemberStatusUpdateInput) (*models.FansubGroupAppMember, error)
	SetMediaPermissions(ctx context.Context, fansubGroupID int64, appUserID int64, input models.FansubGroupMemberMediaPermissionsUpdateInput) (*models.FansubGroupAppMember, error)
	GetMediaPermissionsForAppUser(ctx context.Context, fansubGroupID int64, appUserID int64) (models.FansubGroupMediaPermissions, error)
}

type fansubGroupInvitationStore interface {
	ListByFansubGroup(ctx context.Context, fansubGroupID int64) ([]models.FansubGroupInvitation, error)
	Create(ctx context.Context, fansubGroupID int64, input models.FansubGroupInvitationCreateInput) (*models.FansubGroupInvitationCreateResult, error)
	Cancel(ctx context.Context, fansubGroupID int64, invitationID int64, input models.FansubGroupInvitationCancelInput) (*models.FansubGroupInvitation, error)
	Accept(ctx context.Context, input models.AcceptFansubInvitationInput) (*models.FansubGroupInvitation, *models.FansubGroupAppMember, error)
}

// fansubGroupNameStore ist eine schmale Lookup-Schnittstelle fuer die Gruppen-Namensanreicherung
// der Einladungsmail (D-03). *repository.FansubRepository erfuellt diese Signatur bereits.
type fansubGroupNameStore interface {
	GetGroupByID(ctx context.Context, id int64) (*models.FansubGroup, error)
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
	keycloakVerifier   *backendauth.KeycloakVerifier
	permissionSvc      *permissions.Service
	auditLogRepo       auditLogWriter
	tiptapSvc          *services.TipTapService
	mailer             services.Mailer
	mediaStorageDir    string
	mediaBaseURL       string
	keycloakAccountURL string
	appPublicURL       string
	fansubRepo         fansubGroupNameStore
}

func NewAppAuthHandler(
	appAuthRepo *repository.AppAuthRepository,
	authzRepo *repository.AuthzRepository,
	stateRepo *repository.AuthRepository,
	memberRepo *repository.FansubGroupAppMemberRepository,
	invitationRepo *repository.FansubGroupInvitationRepository,
	profileRepo *repository.MemberProfileRepository,
	keycloakVerifier *backendauth.KeycloakVerifier,
	permissionSvc *permissions.Service,
	auditLogRepo *repository.AuditLogRepository,
	tiptapSvc *services.TipTapService,
	mailer services.Mailer,
	mediaStorageDir string,
	mediaBaseURL string,
	keycloakAccountURL string,
	appPublicURL string,
	fansubRepo *repository.FansubRepository,
) *AppAuthHandler {
	return &AppAuthHandler{
		appAuthRepo:        appAuthRepo,
		authzRepo:          authzRepo,
		stateRepo:          stateRepo,
		memberRepo:         memberRepo,
		invitationRepo:     invitationRepo,
		profileRepo:        profileRepo,
		keycloakVerifier:   keycloakVerifier,
		permissionSvc:      permissionSvc,
		auditLogRepo:       auditLogRepo,
		tiptapSvc:          tiptapSvc,
		mailer:             mailer,
		mediaStorageDir:    strings.TrimSpace(mediaStorageDir),
		mediaBaseURL:       strings.TrimSpace(mediaBaseURL),
		keycloakAccountURL: strings.TrimSpace(keycloakAccountURL),
		appPublicURL:       strings.TrimSpace(appPublicURL),
		fansubRepo:         fansubRepo,
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
