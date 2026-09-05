package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Interfaces ---

// AdminUsersRepository definiert alle Datenbankoperationen für den AdminUsersHandler.
type AdminUsersRepository interface {
	ListAdminUsersPage(ctx context.Context, params models.AdminUserListParams) (*models.AdminUserListResult, error)
	GetUserOverview(ctx context.Context, appUserID int64) (*models.AdminUserOverview, error)
	GetUserGlobalRoles(ctx context.Context, appUserID int64) (*models.AdminUserGlobalRolesResult, error)
	GetUserMemberClaims(ctx context.Context, appUserID int64) (*models.AdminUserMemberClaimsResult, error)
	GetUserGroupMemberships(ctx context.Context, appUserID int64, limit int, offset int) (*models.AdminUserGroupMembershipsResult, error)
	GetUserGroupRights(ctx context.Context, appUserID int64) (*models.AdminUserGroupRightsResult, error)
	ListUserContributions(ctx context.Context, filter repository.AdminUserContributionsFilter) (*models.AdminUserContributionsPage, error)
	GetUserMedia(ctx context.Context, filter repository.AdminUserMediaFilter) (*models.AdminUserMediaPage, error)
	GetUserAudit(ctx context.Context, appUserID int64) (*models.AdminUserAuditResult, error)
	UpdateAppUserStatus(ctx context.Context, appUserID int64, status string) error
	// GetUserRightsSummary answers F-01/UADM-06's batched rights summary (Plan 139-05):
	// every (bounded) group membership's compact rights summary in one call, never one
	// ResolveGroupRights call looped per group.
	GetUserRightsSummary(
		ctx context.Context, appUserID int64, limit int, offset int, resolver repository.AdminUsersRightsBatchResolver,
	) (*models.AdminUserRightsSummaryPage, error)
}

// adminUsersRightsResolver is the minimal batched-rights-resolution surface the
// GetUserRightsSummary handler needs from *permissions.Service's façade (Plan 139-05 Task 1)
// -- declared as a narrow interface (not the concrete *permissions.Service type) purely so
// handler tests can substitute a fake, mirroring admin_effective_rights_handler.go's existing
// effectiveRightsPermissionService narrow-interface convention.
type adminUsersRightsResolver interface {
	ResolveGroupRightsBatch(
		ctx context.Context, actor permissions.Actor, fansubGroupIDs []int64, rolesByGroup map[int64][]string,
	) (map[int64]*permissions.GroupRightsResolution, error)
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
	repo           AdminUsersRepository
	authzRepo      adminUsersAuthzRepo
	auditLogRepo   auditLogWriter
	rightsResolver adminUsersRightsResolver
}

// NewAdminUsersHandler erstellt einen AdminUsersHandler mit allen erforderlichen Abhängigkeiten.
// rightsResolver ist Plan 139-05's neue vierte Abhängigkeit (F-01/UADM-06's gebündelter
// Rechte-Übersicht-Endpunkt) -- BEIDE bestehenden Aufrufstellen (main.go, buildAdminUsersHandler
// in admin_users_handler_test.go) müssen sie mitliefern.
func NewAdminUsersHandler(
	repo AdminUsersRepository,
	authzRepo adminUsersAuthzRepo,
	auditLogRepo auditLogWriter,
	rightsResolver adminUsersRightsResolver,
) *AdminUsersHandler {
	return &AdminUsersHandler{
		repo:           repo,
		authzRepo:      authzRepo,
		auditLogRepo:   auditLogRepo,
		rightsResolver: rightsResolver,
	}
}

// validGlobalRoles enthält die erlaubten globalen Rollenwerte, abgeleitet aus
// models.AppGlobalRoles (Phase 147 / HC-03).
var validGlobalRoles = buildRoleSet(models.AppGlobalRoles)

// buildRoleSet baut aus einer geordneten Rollenliste eine Lookup-Menge auf.
func buildRoleSet(roles []string) map[string]struct{} {
	set := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		set[r] = struct{}{}
	}
	return set
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

// GetUserGroupMemberships gibt die serverseitig paginierten Gruppenmitgliedschaften eines
// Users zurück (Plan 139-05, F-01 finding #1: zuvor vollständig unbegrenzt). Limit/Offset
// folgen exakt dem ListUsers-Muster (c.Query + strconv, nie String-Konkatenation in SQL).
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

	limit := parseOptionalInt(c.Query("limit"))
	offset := parseOptionalInt(c.Query("offset"))

	result, err := h.repo.GetUserGroupMemberships(c.Request.Context(), userID, limit, offset)
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

// GetUserContributions gibt die serverseitig gruppierten, bereichs-
// kollabierten und override-diff-geprüften Contributions eines Users zurück
// (Plan 139-03, D02-D14, member_id-Anker). Filter-/Paginierungs-Query-Params
// folgen exakt dem ListUsers-Muster (c.Query + strconv, nie String-
// Konkatenation in SQL, T-139-04).
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

	filter := repository.AdminUserContributionsFilter{
		AppUserID: userID,
		Limit:     parseOptionalInt(c.Query("limit")),
		Offset:    parseOptionalInt(c.Query("offset")),
	}
	if animeID, ok := parseOptionalPositiveID(c.Query("anime_id")); ok {
		filter.AnimeID = &animeID
	}
	if groupID, ok := parseOptionalPositiveID(c.Query("fansub_group_id")); ok {
		filter.FansubGroupID = &groupID
	}
	if roleCode := strings.TrimSpace(c.Query("role_code")); roleCode != "" {
		filter.RoleCode = &roleCode
	}
	if v := c.Query("only_deviations"); v == "true" {
		filter.OnlyDeviations = true
	}
	if from, ok := parseOptionalRFC3339(c.Query("from")); ok {
		filter.From = &from
	}
	if to, ok := parseOptionalRFC3339(c.Query("to")); ok {
		filter.To = &to
	}

	result, err := h.repo.ListUserContributions(c.Request.Context(), filter)
	if err != nil {
		log.Printf("admin users: GetUserContributions error: %v", err)
		internalError(c, "Beiträge konnten nicht geladen werden.")
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- GET /admin/users/:userId/media ---

// GetUserMedia gibt die serverseitig gruppierten, bereichs-paginierten
// Medien-Uploads eines Users zurück (Plan 139-04, D11-D19). Filter-/
// Paginierungs-Query-Params folgen exakt dem GetUserContributions-Muster
// (c.Query + strconv, nie String-Konkatenation in SQL, T-139-07).
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

	filter := repository.AdminUserMediaFilter{
		AppUserID: userID,
		Limit:     parseOptionalInt(c.Query("limit")),
		Offset:    parseOptionalInt(c.Query("offset")),
	}
	if animeID, ok := parseOptionalPositiveID(c.Query("anime_id")); ok {
		filter.AnimeID = &animeID
	}
	if groupID, ok := parseOptionalPositiveID(c.Query("fansub_group_id")); ok {
		filter.FansubGroupID = &groupID
	}
	if releaseVersionID, ok := parseOptionalPositiveID(c.Query("release_version_id")); ok {
		filter.ReleaseVersionID = &releaseVersionID
	}
	if mediaType := strings.TrimSpace(c.Query("media_type")); mediaType != "" {
		filter.MediaType = &mediaType
	}
	if from, ok := parseOptionalRFC3339(c.Query("from")); ok {
		filter.From = &from
	}
	if to, ok := parseOptionalRFC3339(c.Query("to")); ok {
		filter.To = &to
	}

	result, err := h.repo.GetUserMedia(c.Request.Context(), filter)
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

// --- GET /admin/users/:userId/rights-summary ---

// GetUserRightsSummary gibt F-01/UADM-06's neue gebündelte Rechte-Übersicht zurück: die
// kompakte Rechte-Zusammenfassung JEDER (paginierten) Gruppenmitgliedschaft eines Users, in
// konstant vielen SQL-Roundtrips -- niemals einen ResolveGroupRights-Aufruf pro Gruppe in
// einer Schleife (das würde den N+1 nur von HTTP nach Postgres verschieben).
func (h *AdminUsersHandler) GetUserRightsSummary(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}
	_ = identity

	userID, ok := parseUserID(c)
	if !ok {
		return
	}

	limit := parseOptionalInt(c.Query("limit"))
	offset := parseOptionalInt(c.Query("offset"))

	result, err := h.repo.GetUserRightsSummary(c.Request.Context(), userID, limit, offset, h.rightsResolver)
	if err != nil {
		log.Printf("admin users: GetUserRightsSummary error: %v", err)
		internalError(c, "Rechteübersicht konnte nicht geladen werden.")
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


