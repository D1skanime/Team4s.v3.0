package handlers

// Wave-0 RED-Tests: admin_users_handler.go und AdminUsersHandler existieren noch nicht.
// Compile-Fehler auf NewAdminUsersHandler / AdminUsersHandler.ListUsers /
// AdminUsersHandler.AssignGlobalRole etc. sind das erwartete RED-Signal.
// Diese Tests werden grün, wenn Plan 80-03 den Handler implementiert.

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Stubs für AdminUsersHandler-Tests ---

// adminUsersRepoStub implementiert das (noch nicht existierende) AdminUsersRepository-Interface.
// Die Stub-Methoden entsprechen den erwarteten Methoden des echten Repositorys.
type adminUsersRepoStub struct {
	listResult          *models.AdminUserListResult
	listErr             error
	overviewResult      *models.AdminUserOverview
	overviewErr         error
	rolesResult         *models.AdminUserGlobalRolesResult
	rolesErr            error
	claimsResult        *models.AdminUserMemberClaimsResult
	claimsErr           error
	membershipsResult   *models.AdminUserGroupMembershipsResult
	membershipsErr      error
	groupRightsResult   *models.AdminUserGroupRightsResult
	groupRightsErr      error
	contributionsResult *models.AdminUserContributionsPage
	contributionsErr    error
	mediaResult         *models.AdminUserMediaPage
	mediaErr            error
	auditResult         *models.AdminUserAuditResult
	auditErr            error
	updateStatusErr     error
	rightsSummaryResult *models.AdminUserRightsSummaryPage
	rightsSummaryErr    error

	// WR-02: capture the filter/params the handler actually built from the query string, so
	// tests can assert on the exact HTTP-query -> typed-filter translation (this is also the
	// regression test that proves CR-01 stays fixed -- a from/to value in the exact RFC3339
	// wire format api.ts now sends must turn into non-nil *time.Time fields here).
	receivedContributionsFilter repository.AdminUserContributionsFilter
	receivedMediaFilter         repository.AdminUserMediaFilter
	receivedRightsSummaryLimit  int
	receivedRightsSummaryOffset int
}

// Die folgenden Methoden entsprechen dem noch-nicht-existierenden AdminUsersRepository-Interface.
// Compile-Fehler: AdminUsersRepository in admin_users_handler.go ist noch nicht definiert.
// Die Stub-Typen hier KOMPILIEREN unabhängig davon, da sie an kein Interface gebunden sind.

func (s *adminUsersRepoStub) ListAdminUsersPage(ctx context.Context, params models.AdminUserListParams) (*models.AdminUserListResult, error) {
	return s.listResult, s.listErr
}

func (s *adminUsersRepoStub) GetUserOverview(ctx context.Context, appUserID int64) (*models.AdminUserOverview, error) {
	return s.overviewResult, s.overviewErr
}

func (s *adminUsersRepoStub) GetUserGlobalRoles(ctx context.Context, appUserID int64) (*models.AdminUserGlobalRolesResult, error) {
	return s.rolesResult, s.rolesErr
}

func (s *adminUsersRepoStub) GetUserMemberClaims(ctx context.Context, appUserID int64) (*models.AdminUserMemberClaimsResult, error) {
	return s.claimsResult, s.claimsErr
}

func (s *adminUsersRepoStub) GetUserGroupMemberships(ctx context.Context, appUserID int64, limit int, offset int) (*models.AdminUserGroupMembershipsResult, error) {
	return s.membershipsResult, s.membershipsErr
}

func (s *adminUsersRepoStub) GetUserRightsSummary(
	ctx context.Context, appUserID int64, limit int, offset int, resolver repository.AdminUsersRightsBatchResolver,
) (*models.AdminUserRightsSummaryPage, error) {
	s.receivedRightsSummaryLimit = limit
	s.receivedRightsSummaryOffset = offset
	return s.rightsSummaryResult, s.rightsSummaryErr
}

func (s *adminUsersRepoStub) GetUserGroupRights(ctx context.Context, appUserID int64) (*models.AdminUserGroupRightsResult, error) {
	return s.groupRightsResult, s.groupRightsErr
}

func (s *adminUsersRepoStub) ListUserContributions(ctx context.Context, filter repository.AdminUserContributionsFilter) (*models.AdminUserContributionsPage, error) {
	s.receivedContributionsFilter = filter
	return s.contributionsResult, s.contributionsErr
}

func (s *adminUsersRepoStub) GetUserMedia(ctx context.Context, filter repository.AdminUserMediaFilter) (*models.AdminUserMediaPage, error) {
	s.receivedMediaFilter = filter
	return s.mediaResult, s.mediaErr
}

func (s *adminUsersRepoStub) GetUserAudit(ctx context.Context, appUserID int64) (*models.AdminUserAuditResult, error) {
	return s.auditResult, s.auditErr
}

func (s *adminUsersRepoStub) UpdateAppUserStatus(ctx context.Context, appUserID int64, status string) error {
	return s.updateStatusErr
}

// adminAuthzRepoStub implementiert die authzRoleChecker-Funktionen für Platform-Admin-Gate-Tests.
// Die Methoden AppUserHasGlobalRole und CountActivePlatformAdmins sind bereits in authz.go vorhanden.
type adminAuthzRepoStub struct {
	isAdmin            bool
	authzErr           error
	activePlatformAdmins int
	countErr           error
}

func (s *adminAuthzRepoStub) AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error) {
	return s.isAdmin, s.authzErr
}

func (s *adminAuthzRepoStub) UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	return s.isAdmin, s.authzErr
}

func (s *adminAuthzRepoStub) CountActivePlatformAdmins(ctx context.Context) (int, error) {
	return s.activePlatformAdmins, s.countErr
}

func (s *adminAuthzRepoStub) AssignAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error {
	return nil
}

func (s *adminAuthzRepoStub) RevokeAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error {
	return nil
}

// adminAuditStub fängt Write-Aufrufe ab, ohne etwas zu persistieren.
type adminAuditStub struct {
	entries []repository.AuditLogEntry
}

func (s *adminAuditStub) Write(ctx context.Context, entry repository.AuditLogEntry) error {
	s.entries = append(s.entries, entry)
	return nil
}

func (s *adminAuditStub) writeCount() int { return len(s.entries) }
func (s *adminAuditStub) lastEventType() string {
	if len(s.entries) == 0 {
		return ""
	}
	return s.entries[len(s.entries)-1].EventType
}
func (s *adminAuditStub) lastOutcome() string {
	if len(s.entries) == 0 {
		return ""
	}
	return s.entries[len(s.entries)-1].Outcome
}

// adminUsersRightsResolverStub ist eine minimale, nil-sichere Fake-Implementierung von
// adminUsersRightsResolver (Plan 139-05) -- keiner der bestehenden Tests in dieser Datei
// übt GetUserRightsSummary tatsächlich aus, daher genügt ein leerer Stub.
type adminUsersRightsResolverStub struct{}

func (s *adminUsersRightsResolverStub) ResolveGroupRightsBatch(
	ctx context.Context, actor permissions.Actor, fansubGroupIDs []int64, rolesByGroup map[int64][]string,
) (map[int64]*permissions.GroupRightsResolution, error) {
	return map[int64]*permissions.GroupRightsResolution{}, nil
}

// setAdminTestAuth setzt eine gültige AuthIdentity im Gin-Kontext (AppUserID > 0, Status active).
func setAdminTestAuth(c *gin.Context, appUserID int64) {
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:        appUserID,
		AppUserID:     appUserID,
		DisplayName:   "Testadmin",
		AppUserStatus: models.AppUserStatusActive,
	})
}

// buildAdminUsersHandler baut einen AdminUsersHandler mit Stubs.
// RED: NewAdminUsersHandler existiert noch nicht → Compile-Fehler erwartet.
func buildAdminUsersHandler(
	repo *adminUsersRepoStub,
	authz *adminAuthzRepoStub,
	audit *adminAuditStub,
) *AdminUsersHandler { // AdminUsersHandler ist noch nicht definiert → RED
	return NewAdminUsersHandler(repo, authz, audit, &adminUsersRightsResolverStub{}) // NewAdminUsersHandler → RED
}

// --- RED: TestAdminUsersHandler_ListUsers_NonPlatformAdmin_Returns403 ---
//
// Prüft, dass ListUsers HTTP 403 zurückgibt, wenn der anfragende App-User
// keine platform_admin-Rolle hat.
// Sicherheitsanforderung: T-80-02-01 (Elevation of Privilege).
func TestAdminUsersHandler_ListUsers_NonPlatformAdmin_Returns403(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: false}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
	setAdminTestAuth(c, 99)

	handler.ListUsers(c) // ListUsers ist noch nicht definiert → RED

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet HTTP 403, erhalten %d", rec.Code)
	}
}

// --- RED: TestAdminUsersHandler_AssignGlobalRole_AuditsAllowed ---
//
// Prüft, dass AssignGlobalRole bei einem berechtigten Platform-Admin
// einen AuditLogEntry mit EventType="app_user_global_role.assigned" und Outcome="allowed" schreibt.
func TestAdminUsersHandler_AssignGlobalRole_AuditsAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 2}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	body, _ := json.Marshal(map[string]string{"role": "content_admin"})
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/5/global-roles/content_admin", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "userId", Value: "5"}, {Key: "role", Value: "content_admin"}}
	setAdminTestAuth(c, 1)

	handler.AssignGlobalRole(c) // AssignGlobalRole ist noch nicht definiert → RED

	if rec.Code != http.StatusOK && rec.Code != http.StatusNoContent {
		t.Fatalf("erwartet HTTP 200 oder 204, erhalten %d", rec.Code)
	}
	if audit.writeCount() == 0 {
		t.Fatal("erwartet mindestens einen Audit-Eintrag, keiner vorhanden")
	}
	if audit.lastEventType() != "app_user_global_role.assigned" {
		t.Fatalf("erwartet EventType %q, erhalten %q", "app_user_global_role.assigned", audit.lastEventType())
	}
	if audit.lastOutcome() != "allowed" {
		t.Fatalf("erwartet Outcome %q, erhalten %q", "allowed", audit.lastOutcome())
	}
}

// --- RED: TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409 ---
//
// Prüft, dass RevokeGlobalRole HTTP 409 zurückgibt, wenn CountActivePlatformAdmins = 1
// und damit die letzte Plattform-Admin-Rolle entzogen würde.
// Sicherheitsanforderung: T-80-02-02 (Denial of Service — Lockout).
// Kein Audit-Write bei Ablehnung.
func TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 1}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/users/1/global-roles/platform_admin", nil)
	c.Params = gin.Params{{Key: "userId", Value: "1"}, {Key: "role", Value: "platform_admin"}}
	setAdminTestAuth(c, 2)

	handler.RevokeGlobalRole(c) // RevokeGlobalRole ist noch nicht definiert → RED

	if rec.Code != http.StatusConflict {
		t.Fatalf("erwartet HTTP 409, erhalten %d (Last-Admin-Guard hat nicht gegriffen)", rec.Code)
	}
	if audit.writeCount() != 0 {
		t.Fatalf("erwartet keinen Audit-Eintrag bei Ablehnung, aber %d Einträge vorhanden", audit.writeCount())
	}
}

// --- RED: TestAdminUsersHandler_UpdateUserStatus_Disable_AuditsAllowed ---
//
// Prüft, dass UpdateUserStatus bei Status "disabled" einen AuditLogEntry
// mit EventType="app_user_status.disabled" schreibt.
func TestAdminUsersHandler_UpdateUserStatus_Disable_AuditsAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Ziel-User hat keine platform_admin-Rolle → kein Last-Admin-Guard
	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 2}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	body, _ := json.Marshal(map[string]string{"status": "disabled"})
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/7/status", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "userId", Value: "7"}}
	setAdminTestAuth(c, 1)

	handler.UpdateUserStatus(c) // UpdateUserStatus ist noch nicht definiert → RED

	if rec.Code != http.StatusOK && rec.Code != http.StatusNoContent {
		t.Fatalf("erwartet HTTP 200 oder 204, erhalten %d", rec.Code)
	}
	if audit.writeCount() == 0 {
		t.Fatal("erwartet mindestens einen Audit-Eintrag, keiner vorhanden")
	}
	if audit.lastEventType() != "app_user_status.disabled" {
		t.Fatalf("erwartet EventType %q, erhalten %q", "app_user_status.disabled", audit.lastEventType())
	}
	if audit.lastOutcome() != "allowed" {
		t.Fatalf("erwartet Outcome %q, erhalten %q", "allowed", audit.lastOutcome())
	}
}

// --- RED: TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409 ---
//
// Prüft, dass UpdateUserStatus mit status="disabled" HTTP 409 zurückgibt, wenn
// CountActivePlatformAdmins = 1 und der Ziel-User die platform_admin-Rolle hat.
// Lockout-Schutz: Der letzte aktive Platform-Admin darf nicht deaktiviert werden.
// Sicherheitsanforderung: T-80-02-03 (Denial of Service — Disable-Lockout).
// Kein Audit-Write bei Ablehnung (analog zu RevokeGlobalRole-LastAdminGuard).
func TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// CountActivePlatformAdmins = 1: genau ein aktiver Platform-Admin
	// AppUserHasGlobalRole für Ziel-User (userId=1) gibt true zurück
	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 1}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	// Request: Ziel-User ist der letzte aktive Platform-Admin
	body, _ := json.Marshal(map[string]string{"status": "disabled"})
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/1/status", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	// userId=1 ist Ziel-User; Actor (Aufrufer) kann ein anderer Admin sein
	c.Params = gin.Params{{Key: "userId", Value: "1"}}
	setAdminTestAuth(c, 2)

	handler.UpdateUserStatus(c) // UpdateUserStatus ist noch nicht definiert → RED

	if rec.Code != http.StatusConflict {
		t.Fatalf("erwartet HTTP 409 (Last-Admin-Guard), erhalten %d", rec.Code)
	}
	if audit.writeCount() != 0 {
		t.Fatalf("erwartet keinen Audit-Eintrag bei Ablehnung, aber %d Einträge vorhanden", audit.writeCount())
	}
}

// --- WR-02: GetUserContributions/GetUserMedia/GetUserRightsSummary query-param parsing ---
//
// Code-Review 139-REVIEW.md WR-02: keiner der bisherigen Tests in dieser Datei ruft
// handler.GetUserContributions/.GetUserMedia/.GetUserRightsSummary tatsächlich auf -- die
// Query-String -> typed-Filter-Übersetzung dieser drei Endpunkte (parseOptionalPositiveID,
// parseOptionalRFC3339, only_deviations == "true", limit/offset) war strukturell ungetestet.
// Dieser Test ist zugleich der Regressionstest für CR-01: ein from/to-Wert im exakten
// RFC3339-Format, das api.ts nach der CR-01-Korrektur an das Backend sendet, muss hier als
// nicht-nil *time.Time in der Filter-Struktur ankommen.

func TestAdminUsersHandler_GetUserContributions_ParsesQueryParams(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: true}
	audit := &adminAuditStub{}
	repoStub := &adminUsersRepoStub{
		contributionsResult: &models.AdminUserContributionsPage{
			Data:          []models.AdminContributionProjectBlock{},
			FilterOptions: models.AdminContributionFilterOptions{Animes: []models.AdminFilterOption{}, Groups: []models.AdminFilterOption{}},
		},
	}
	handler := buildAdminUsersHandler(repoStub, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	// "from"/"to" sind exakt das Format, das getAdminUserContributions (frontend/src/lib/api.ts)
	// nach der CR-01/WR-04-Korrektur sendet: volle RFC3339-Tagesgrenzen, "to" end-of-day-inklusiv.
	c.Request = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/admin/users/42/contributions?anime_id=7&fansub_group_id=3&role_code=encoder&only_deviations=true&from=2026-08-01T00:00:00Z&to=2026-08-24T23:59:59.999Z",
		nil,
	)
	c.Params = gin.Params{{Key: "userId", Value: "42"}}
	setAdminTestAuth(c, 1)

	handler.GetUserContributions(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet HTTP 200, erhalten %d (body=%s)", rec.Code, rec.Body.String())
	}

	filter := repoStub.receivedContributionsFilter
	if filter.AppUserID != 42 {
		t.Fatalf("erwartet AppUserID=42, erhalten %d", filter.AppUserID)
	}
	if filter.AnimeID == nil || *filter.AnimeID != 7 {
		t.Fatalf("erwartet AnimeID=7, erhalten %v", filter.AnimeID)
	}
	if filter.FansubGroupID == nil || *filter.FansubGroupID != 3 {
		t.Fatalf("erwartet FansubGroupID=3, erhalten %v", filter.FansubGroupID)
	}
	if filter.RoleCode == nil || *filter.RoleCode != "encoder" {
		t.Fatalf("erwartet RoleCode=encoder, erhalten %v", filter.RoleCode)
	}
	if !filter.OnlyDeviations {
		t.Fatal("erwartet OnlyDeviations=true")
	}
	wantFrom := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	if filter.From == nil || !filter.From.Equal(wantFrom) {
		t.Fatalf("erwartet From=%v, erhalten %v (CR-01: RFC3339 'from' muss geparst werden)", wantFrom, filter.From)
	}
	wantTo := time.Date(2026, 8, 24, 23, 59, 59, 999000000, time.UTC)
	if filter.To == nil || !filter.To.Equal(wantTo) {
		t.Fatalf("erwartet To=%v, erhalten %v (CR-01/WR-04: RFC3339 'to' muss end-of-day-inklusiv geparst werden)", wantTo, filter.To)
	}
}

func TestAdminUsersHandler_GetUserMedia_ParsesQueryParams(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: true}
	audit := &adminAuditStub{}
	repoStub := &adminUsersRepoStub{
		mediaResult: &models.AdminUserMediaPage{
			Data: []models.AdminMediaReleaseBlock{},
			FilterOptions: models.AdminMediaFilterOptions{
				Animes:             []models.AdminFilterOption{},
				Groups:             []models.AdminFilterOption{},
				ReleasesOrEpisodes: []models.AdminFilterOption{},
				MediaTypes:         []string{},
			},
		},
	}
	handler := buildAdminUsersHandler(repoStub, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(
		http.MethodGet,
		"/api/v1/admin/users/42/media?anime_id=7&fansub_group_id=3&release_version_id=9&media_type=cover&from=2026-08-01T00:00:00Z&to=2026-08-24T23:59:59.999Z",
		nil,
	)
	c.Params = gin.Params{{Key: "userId", Value: "42"}}
	setAdminTestAuth(c, 1)

	handler.GetUserMedia(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet HTTP 200, erhalten %d (body=%s)", rec.Code, rec.Body.String())
	}

	filter := repoStub.receivedMediaFilter
	if filter.AppUserID != 42 {
		t.Fatalf("erwartet AppUserID=42, erhalten %d", filter.AppUserID)
	}
	if filter.AnimeID == nil || *filter.AnimeID != 7 {
		t.Fatalf("erwartet AnimeID=7, erhalten %v", filter.AnimeID)
	}
	if filter.FansubGroupID == nil || *filter.FansubGroupID != 3 {
		t.Fatalf("erwartet FansubGroupID=3, erhalten %v", filter.FansubGroupID)
	}
	if filter.ReleaseVersionID == nil || *filter.ReleaseVersionID != 9 {
		t.Fatalf("erwartet ReleaseVersionID=9, erhalten %v", filter.ReleaseVersionID)
	}
	if filter.MediaType == nil || *filter.MediaType != "cover" {
		t.Fatalf("erwartet MediaType=cover, erhalten %v", filter.MediaType)
	}
	wantFrom := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	if filter.From == nil || !filter.From.Equal(wantFrom) {
		t.Fatalf("erwartet From=%v, erhalten %v (CR-01: RFC3339 'from' muss geparst werden)", wantFrom, filter.From)
	}
	wantTo := time.Date(2026, 8, 24, 23, 59, 59, 999000000, time.UTC)
	if filter.To == nil || !filter.To.Equal(wantTo) {
		t.Fatalf("erwartet To=%v, erhalten %v (CR-01/WR-04: RFC3339 'to' muss end-of-day-inklusiv geparst werden)", wantTo, filter.To)
	}
}

func TestAdminUsersHandler_GetUserContributions_BareDateOnlyIsIgnored(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// CR-01-Regressionsschutz: der VORHERIGE Fehlerzustand -- ein blankes "YYYY-MM-DD" (das,
	// was DatePicker.tsx vor der frontend-seitigen CR-01-Korrektur unverändert weiterreichte)
	// erfüllt time.RFC3339 nicht und muss weiterhin klar als "kein Filter" (nil) ankommen, statt
	// eine Panik oder einen falschen Wert zu erzeugen.
	authz := &adminAuthzRepoStub{isAdmin: true}
	audit := &adminAuditStub{}
	repoStub := &adminUsersRepoStub{
		contributionsResult: &models.AdminUserContributionsPage{
			Data:          []models.AdminContributionProjectBlock{},
			FilterOptions: models.AdminContributionFilterOptions{Animes: []models.AdminFilterOption{}, Groups: []models.AdminFilterOption{}},
		},
	}
	handler := buildAdminUsersHandler(repoStub, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/42/contributions?from=2026-08-24&to=2026-08-24", nil)
	c.Params = gin.Params{{Key: "userId", Value: "42"}}
	setAdminTestAuth(c, 1)

	handler.GetUserContributions(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet HTTP 200, erhalten %d (body=%s)", rec.Code, rec.Body.String())
	}
	filter := repoStub.receivedContributionsFilter
	if filter.From != nil || filter.To != nil {
		t.Fatalf("ein bloßes 'YYYY-MM-DD' darf am Handler weiterhin nicht als RFC3339 geparst werden, erhalten From=%v To=%v", filter.From, filter.To)
	}
}

func TestAdminUsersHandler_GetUserRightsSummary_ParsesLimitAndOffset(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: true}
	audit := &adminAuditStub{}
	repoStub := &adminUsersRepoStub{
		rightsSummaryResult: &models.AdminUserRightsSummaryPage{Data: []models.AdminUserGroupRightsSummaryItem{}},
	}
	handler := buildAdminUsersHandler(repoStub, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/42/rights-summary?limit=10&offset=20", nil)
	c.Params = gin.Params{{Key: "userId", Value: "42"}}
	setAdminTestAuth(c, 1)

	handler.GetUserRightsSummary(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet HTTP 200, erhalten %d (body=%s)", rec.Code, rec.Body.String())
	}
	if repoStub.receivedRightsSummaryLimit != 10 {
		t.Fatalf("erwartet limit=10, erhalten %d", repoStub.receivedRightsSummaryLimit)
	}
	if repoStub.receivedRightsSummaryOffset != 20 {
		t.Fatalf("erwartet offset=20, erhalten %d", repoStub.receivedRightsSummaryOffset)
	}
}
