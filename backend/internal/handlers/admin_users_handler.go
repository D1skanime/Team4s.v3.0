package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// --- Interfaces ---

// AdminUsersRepository definiert alle Datenbankoperationen für den AdminUsersHandler.
type AdminUsersRepository interface {
	ListAdminUsersPage(ctx context.Context, params models.AdminUserListParams) (*models.AdminUserListResult, error)
	GetUserOverview(ctx context.Context, appUserID int64) (*models.AdminUserOverview, error)
	GetUserGlobalRoles(ctx context.Context, appUserID int64) (*models.AdminUserGlobalRolesResult, error)
	GetUserMemberClaims(ctx context.Context, appUserID int64) (*models.AdminUserMemberClaimsResult, error)
	GetUserGroupMemberships(ctx context.Context, appUserID int64) (*models.AdminUserGroupMembershipsResult, error)
	GetUserGroupRights(ctx context.Context, appUserID int64) (*models.AdminUserGroupRightsResult, error)
	ListUserContributions(ctx context.Context, appUserID int64) (*models.AdminUserContributionsResult, error)
	GetUserMedia(ctx context.Context, appUserID int64) (*models.AdminUserMediaResult, error)
	GetUserAudit(ctx context.Context, appUserID int64) (*models.AdminUserAuditResult, error)
	UpdateAppUserStatus(ctx context.Context, appUserID int64, status string) error
}

// adminUsersAuthzRepo abstrahiert die Rollen-Checker- und Mutations-Operationen für den Handler.
type adminUsersAuthzRepo interface {
	AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error)
	UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error)
	CountActivePlatformAdmins(ctx context.Context) (int, error)
	AssignAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error
	RevokeAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error
}

// --- Handler-Struct ---

// AdminUsersHandler liefert alle /admin/users-Endpunkte.
// Jeder Handler-Einstieg erzwingt requirePlatformAdminIdentity (T-80-03-01).
// Mutations (AssignGlobalRole, RevokeGlobalRole, UpdateUserStatus) sind in
// admin_users_mutations_handler.go ausgelagert (Datei-Limit <= 450 Zeilen).
type AdminUsersHandler struct {
	repo         AdminUsersRepository
	authzRepo    adminUsersAuthzRepo
	auditLogRepo auditLogWriter
}

// NewAdminUsersHandler erstellt einen AdminUsersHandler mit allen erforderlichen Abhängigkeiten.
func NewAdminUsersHandler(
	repo AdminUsersRepository,
	authzRepo adminUsersAuthzRepo,
	auditLogRepo auditLogWriter,
) *AdminUsersHandler {
	return &AdminUsersHandler{
		repo:         repo,
		authzRepo:    authzRepo,
		auditLogRepo: auditLogRepo,
	}
}

// validGlobalRoles enthält die erlaubten globalen Rollenwerte.
var validGlobalRoles = map[string]struct{}{
	"platform_admin": {},
	"content_admin":  {},
	"user":           {},
}

// validAdminUserStatusValues enthält die per Handler erlaubten Status-Werte (pending ist read-only).
var validAdminUserStatusValues = map[string]struct{}{
	"active":   {},
	"disabled": {},
}

// --- GET /admin/users ---

// ListUsers gibt die paginierte User-Liste zurück (Platform-Admin-Gate, D-05/D-06/D-07).
func (h *AdminUsersHandler) ListUsers(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	params := models.AdminUserListParams{
		Q:          c.Query("q"),
		Status:     c.Query("status"),
		GlobalRole: c.Query("global_role"),
		Sort:       c.Query("sort"),
	}
	if v := c.Query("has_conflicts"); v == "true" {
		params.HasConflicts = true
	}
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.Limit = n
		}
	}
	if v := c.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			params.Offset = n
		}
	}

	result, err := h.repo.ListAdminUsersPage(c.Request.Context(), params)
	if err != nil {
		log.Printf("admin users: ListUsers error: %v", err)
		internalError(c, "Benutzerliste konnte nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/overview ---

// GetUserOverview gibt den Übersicht-Tab eines Users zurück.
func (h *AdminUsersHandler) GetUserOverview(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.GetUserOverview(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserOverview error: %v", err)
		internalError(c, "Übersichtsdaten konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/global-roles ---

// GetUserGlobalRoles gibt die globalen Rollen eines Users zurück.
func (h *AdminUsersHandler) GetUserGlobalRoles(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.GetUserGlobalRoles(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserGlobalRoles error: %v", err)
		internalError(c, "Rollendaten konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/member-claims ---

// GetUserMemberClaims gibt die Claims und das Member-Profil eines Users zurück.
func (h *AdminUsersHandler) GetUserMemberClaims(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.GetUserMemberClaims(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserMemberClaims error: %v", err)
		internalError(c, "Claims konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/group-memberships ---

// GetUserGroupMemberships gibt die Gruppenmitgliedschaften eines Users zurück.
func (h *AdminUsersHandler) GetUserGroupMemberships(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.GetUserGroupMemberships(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserGroupMemberships error: %v", err)
		internalError(c, "Gruppenmitgliedschaften konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/group-rights ---

// GetUserGroupRights gibt die scoped Gruppenrechte eines Users zurück (read-only, D-03).
func (h *AdminUsersHandler) GetUserGroupRights(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.GetUserGroupRights(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserGroupRights error: %v", err)
		internalError(c, "Gruppenrechte konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/contributions ---

// GetUserContributions gibt die Contributions eines Users zurück (D-12/D-13, member_id-Anker).
func (h *AdminUsersHandler) GetUserContributions(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.ListUserContributions(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserContributions error: %v", err)
		internalError(c, "Beiträge konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/media ---

// GetUserMedia gibt die Medien-Uploads eines Users zurück.
func (h *AdminUsersHandler) GetUserMedia(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.GetUserMedia(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserMedia error: %v", err)
		internalError(c, "Mediendaten konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/audit ---

// GetUserAudit gibt die Audit-Einträge für einen User zurück.
func (h *AdminUsersHandler) GetUserAudit(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	result, err := h.repo.GetUserAudit(c.Request.Context(), userID)
	if err != nil {
		log.Printf("admin users: GetUserAudit error: %v", err)
		internalError(c, "Audit-Daten konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Hilfsfunktionen ---

// parseUserID liest den :userId-Pfadparameter und gibt einen Fehler bei ungültiger ID zurück.
func parseUserID(c *gin.Context) (int64, bool) {
	raw := c.Param("userId")
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		badRequest(c, "Ungültige Benutzer-ID.")
		return 0, false
	}
	return id, true
}


