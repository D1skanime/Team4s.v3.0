package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"sync"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Plan 116-02, Task 3: Handler-Tests fuer GET /api/v1/me/dashboard (D-08/D-09).
// Die Ownership-Gate-Aufloesung (resolveVerifiedMemberIDForAppUser) haengt an einem
// echten *pgxpool.Pool. Plan 146-09 (CLAUDE.md Teststil-Regel) ersetzt die vier
// zuvor Source-Inspection-basierten Funktionen unten durch echte Aufrufe gegen eine
// schema-isolierte Postgres-Fixture (testsupport.OpenPhase107Postgres, dieselbe
// members/app_users/member_claims-Struktur, die dieses Paket bereits fuer die
// attachPendingXxxAttention-Tests nutzt):
//  1. 401 ohne Authorization-Header: reiner Gin-Test, keine DB noetig.
//  2. IDOR-Resistenz (D-08): ein echter GET-Request mit angreifer-gesteuertem
//     ?member_id= wird real ausgefuehrt; die vom Stub-Loader tatsaechlich empfangene
//     memberID wird geprueft, nicht der Quelltext.
//  3. Graceful-Leerzustand (D-09): ein echter GET-Request ohne verifizierten Claim
//     wird real ausgefuehrt; Statuscode und has_member_profile werden geprueft.

// stubDashboardLoader implementiert ownDashboardLoader fuer den (hier nicht erreichten)
// Erfolgspfad -- wird nur benoetigt, damit NewDashboardMeHandler in Tests konstruierbar
// bleibt, ohne einen echten Repository-Typ zu instanziieren.
type stubDashboardLoader struct {
	data *repository.OwnDashboardData
	err  error
}

func (s *stubDashboardLoader) GetOwnDashboard(ctx context.Context, memberID int64) (*repository.OwnDashboardData, error) {
	return s.data, s.err
}

// TestGetOwnDashboardRequiresAuth prueft, dass GET /me/dashboard ohne gesetzte
// Auth-Identitaet 401 zurueckgibt (kein DB-Zugriff noetig, requireMeIdentity greift
// vor jeder Ownership-Gate-Aufloesung).
func TestGetOwnDashboardRequiresAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := NewDashboardMeHandler(&stubDashboardLoader{}, nil)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard", nil)

	h.GetOwnDashboard(c)

	assert.Equal(t, http.StatusUnauthorized, recorder.Code,
		"GET /me/dashboard ohne Authorization-Header muss 401 zurueckgeben")
}

// capturingDashboardLoader implements ownDashboardLoader and records the memberID
// argument GetOwnDashboard actually received, so D-08's IDOR-resistance claim can be
// proven against the real value the handler resolved -- never grepped from source.
type capturingDashboardLoader struct {
	capturedMemberID int64
	data             *repository.OwnDashboardData
}

func (c *capturingDashboardLoader) GetOwnDashboard(ctx context.Context, memberID int64) (*repository.OwnDashboardData, error) {
	c.capturedMemberID = memberID
	return c.data, nil
}

// TestDashboardMeHandlerUsesSharedOwnershipGateHelper ist die verbindliche D-08-
// Regression: der Handler MUSS memberID ausschliesslich ueber
// resolveVerifiedMemberIDForAppUser(ctx, h.db, identity.AppUserID) aufloesen und darf
// einen angreifer-gesteuerten ?member_id=-Query-Parameter niemals uebernehmen. Echter
// GET-Request gegen eine schema-isolierte Postgres-Fixture -- kein Quelltext-Grep.
func TestDashboardMeHandlerUsesSharedOwnershipGateHelper(t *testing.T) {
	gin.SetMode(gin.TestMode)

	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO members(id) VALUES (501);
		INSERT INTO app_users(id, status) VALUES (55, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES (1, 501, 55, 'verified', now());
	`)
	require.NoError(t, err)

	loader := &capturingDashboardLoader{data: &repository.OwnDashboardData{HasMemberProfile: true}}
	h := NewDashboardMeHandler(loader, pool)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	// Angreifer-Query-Param member_id=999999 zeigt auf ein fremdes, unbeteiligtes Member --
	// muss vom Handler vollstaendig ignoriert werden.
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard?member_id=999999", nil)
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 55, AppUserID: 55, AppUserStatus: models.AppUserStatusActive, DisplayName: "Testuser"})

	h.GetOwnDashboard(c)

	require.Equal(t, http.StatusOK, recorder.Code, "body: %s", recorder.Body.String())
	assert.EqualValues(t, 501, loader.capturedMemberID,
		"D-08: memberID muss ausschliesslich ueber resolveVerifiedMemberIDForAppUser (verifizierter member_claims-Eintrag) aufgeloest werden")
	assert.NotEqual(t, int64(999999), loader.capturedMemberID,
		"D-08: ein angreifer-gesteuerter ?member_id=-Query-Parameter darf die Ownership-Gate-Aufloesung nie ueberschreiben")
}

// TestDashboardMeHandlerGracefulEmptyStateInsteadOf403 ist die verbindliche D-09-
// Regression: fehlt ein verifizierter member_claims-Eintrag, MUSS der Handler mit
// dem Leerzustand (200 + has_member_profile=false) antworten, NICHT mit
// respondMemberProfileRequired (403) wie ListMyAnimeContributions. Echter GET-Request
// gegen eine schema-isolierte Postgres-Fixture ohne verifizierten Claim -- die 200-vs-403-
// Verhaltensdifferenz beweist den Kontrakt strukturell, ohne source-basierte Abwesenheits-
// Pruefung von respondMemberProfileRequired.
func TestDashboardMeHandlerGracefulEmptyStateInsteadOf403(t *testing.T) {
	gin.SetMode(gin.TestMode)

	pool := testsupport.OpenPhase107Postgres(t)
	// Bewusst kein member_claims-Eintrag fuer diesen AppUser -- resolveVerifiedMemberIDForAppUser
	// muss repository.ErrNotFound liefern und der Handler in den D-09-Leerzustand verzweigen.

	h := NewDashboardMeHandler(&stubDashboardLoader{}, pool)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard", nil)
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 909, AppUserID: 909, AppUserStatus: models.AppUserStatusActive, DisplayName: "Testuser"})

	h.GetOwnDashboard(c)

	require.Equal(t, http.StatusOK, recorder.Code,
		"D-09: fehlt ein verifizierter member_claims-Eintrag, muss der Handler 200 (graceful Leerzustand) statt 403 zurueckgeben, body: %s", recorder.Body.String())

	var body struct {
		Data struct {
			HasMemberProfile bool `json:"has_member_profile"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &body))
	assert.False(t, body.Data.HasMemberProfile,
		"D-09: der no-verified-claim-Pfad muss has_member_profile=false liefern (emptyOwnDashboardData()-Kontrakt)")
}

// TestEmptyOwnDashboardDataMatchesD09Contract prueft den konkreten Leerzustand direkt
// (kein Source-Grep): has_member_profile=false, alle Zahlen 0, Arrays leer (nicht nil,
// damit die JSON-Serialisierung [] statt null liefert).
func TestEmptyOwnDashboardDataMatchesD09Contract(t *testing.T) {
	data := emptyOwnDashboardData()

	assert.False(t, data.HasMemberProfile)
	assert.Equal(t, int64(0), data.TotalPoints)
	assert.Equal(t, 0, data.BadgesCount)
	assert.Equal(t, int64(0), data.ProjectsCount)
	assert.Equal(t, int64(0), data.ImagesCount)
	assert.Equal(t, int64(0), data.ContributionsCount)
	assert.NotNil(t, data.RoleVolume)
	assert.Empty(t, data.RoleVolume)
	assert.NotNil(t, data.CategoryProgress)
	assert.Empty(t, data.CategoryProgress)

	encoded, err := json.Marshal(data)
	require.NoError(t, err)
	assert.Contains(t, string(encoded), `"role_volume":[]`)
	assert.Contains(t, string(encoded), `"category_progress":[]`)
}

// TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper stellt sicher, dass
// die Extraktion in me_identity_helpers.go den bestehenden ContributionsMeHandler
// nicht anders verhalten laesst -- resolveVerifiedMemberID bleibt ein Delegat mit
// unveraendertem Signatur-Vertrag. Ruft beide Pfade real gegen dieselbe Postgres-Fixture
// auf und vergleicht die tatsaechlich aufgeloesten memberIDs, statt den Delegations-
// Aufruf im Quelltext zu grep-en.
func TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper(t *testing.T) {
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO members(id) VALUES (601);
		INSERT INTO app_users(id, status) VALUES (66, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES (2, 601, 66, 'verified', now());
	`)
	require.NoError(t, err)

	h := NewContributionsMeHandler(nil, nil, pool)

	viaHandler, err := h.resolveVerifiedMemberID(ctx, 66)
	require.NoError(t, err)

	viaSharedHelper, err := resolveVerifiedMemberIDForAppUser(ctx, pool, 66)
	require.NoError(t, err)

	assert.EqualValues(t, 601, viaHandler)
	assert.Equal(t, viaSharedHelper, viaHandler,
		"ContributionsMeHandler.resolveVerifiedMemberID muss denselben memberID liefern wie der geteilte Ownership-Gate-Seam (Beweis der Delegation durch Ausfuehrung, nicht durch Quelltext-Grep)")
}

// TestMeIdentityHelpersDefinesSharedOwnershipGate prueft die claim_status='verified'-
// Eingrenzung von resolveVerifiedMemberIDForAppUser durch echte Postgres-Aufrufe: ein
// 'pending'-Claim darf memberID nie aufloesen, ein 'verified'-Claim muss die korrekte
// member_id liefern.
func TestMeIdentityHelpersDefinesSharedOwnershipGate(t *testing.T) {
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO members(id) VALUES (701), (702);
		INSERT INTO app_users(id, status) VALUES (81, 'active'), (82, 'active');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
		VALUES
			(3, 701, 81, 'pending', NULL),
			(4, 702, 82, 'verified', now());
	`)
	require.NoError(t, err)

	_, err = resolveVerifiedMemberIDForAppUser(ctx, pool, 81)
	assert.True(t, errors.Is(err, repository.ErrNotFound),
		"claim_status='pending' darf memberID nicht aufloesen -- nur 'verified' zaehlt")

	memberID, err := resolveVerifiedMemberIDForAppUser(ctx, pool, 82)
	require.NoError(t, err)
	assert.EqualValues(t, 702, memberID,
		"claim_status='verified' muss die korrekte member_id liefern")
}

// Plan 143-09, Task 2: first-ever tests for attachPendingGroupMediaReviewAttention and
// attachPendingReleaseReviewAttention now that both delegate to reviewQueryRepo instead of
// running their own raw SQL (Criterion 3). Both attach* methods need a real reviewQueryRepo
// backed by Postgres (its query logic is exercised by release_review_query_repository_test.go
// already; these tests exist to prove the HANDLER's own permission-filtering behavior: the
// corrected review action, and per-group memoization).

// dashboardAttentionResolverStub is a minimal permissions.Resolver + permissions.ReviewContextResolver
// double, call-counting ListActorGroupRoles per fansub group so tests can assert memoization
// (one resolution per distinct group, never once per candidate row).
type dashboardAttentionResolverStub struct {
	roles        map[int64][]string
	membershipID int64
	memberID     int64

	mu              sync.Mutex
	groupRolesCalls map[int64]int
	reviewCtxCalls  map[int64]int
}

func (s *dashboardAttentionResolverStub) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}

func (s *dashboardAttentionResolverStub) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s *dashboardAttentionResolverStub) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s *dashboardAttentionResolverStub) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s *dashboardAttentionResolverStub) ListActorGroupRoles(_ context.Context, _ int64, fansubGroupID int64) ([]string, error) {
	s.mu.Lock()
	if s.groupRolesCalls == nil {
		s.groupRolesCalls = map[int64]int{}
	}
	s.groupRolesCalls[fansubGroupID]++
	s.mu.Unlock()
	return s.roles[fansubGroupID], nil
}

func (s *dashboardAttentionResolverStub) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

func (s *dashboardAttentionResolverStub) ResolveActorReviewGrantContext(
	_ context.Context, appUserID int64, fansubGroupID int64,
) (*permissions.ReviewGrantContext, error) {
	s.mu.Lock()
	if s.reviewCtxCalls == nil {
		s.reviewCtxCalls = map[int64]int{}
	}
	s.reviewCtxCalls[fansubGroupID]++
	s.mu.Unlock()
	return &permissions.ReviewGrantContext{
		MembershipID: s.membershipID, AppUserID: appUserID, MemberID: s.memberID, FansubGroupID: fansubGroupID,
	}, nil
}

// dashboardAttentionCacheLoader grants "quality_checker" ONLY the two review-decide
// actions (never permissions.ActionFansubGroupEdit) while covering every other known
// action via "fansub_lead", satisfying LoadCache's D-10 completeness check.
type dashboardAttentionCacheLoader struct{}

func (dashboardAttentionCacheLoader) LoadRoleCapabilities(_ context.Context) (map[string][]permissions.Action, error) {
	return map[string][]permissions.Action{
		permissions.RoleFansubLead: {
			permissions.ActionFansubGroupEdit, permissions.ActionFansubGroupLinksManage,
			permissions.ActionFansubGroupMembersView, permissions.ActionFansubGroupMembersManage,
			permissions.ActionFansubGroupHistoricalMembersManage, permissions.ActionFansubGroupHistoricalRolesManage,
			permissions.ActionFansubGroupHistoricalMembersLink, permissions.ActionFansubGroupInvitationsView,
			permissions.ActionFansubGroupInvitationsCreate, permissions.ActionFansubGroupInvitationsCancel,
			permissions.ActionFansubGroupNotesWrite, permissions.ActionFansubGroupMediaView,
			permissions.ActionFansubGroupMediaUpload, permissions.ActionFansubGroupMediaUpdate,
			permissions.ActionFansubGroupMediaUpdateOwn,
			permissions.ActionFansubGroupMediaReorder, permissions.ActionFansubGroupMediaDelete,
			permissions.ActionFansubGroupPageGeneralEdit, permissions.ActionFansubGroupPageTechnicalLinksEdit,
			permissions.ActionFansubGroupPageFoundingHistoryEdit, permissions.ActionFansubGroupLinksUpdate,
			permissions.ActionAnimeFansubProjectNotesWrite, permissions.ActionAnimeFansubProjectTimelineUpdate,
			permissions.ActionReleaseVersionMetadataUpdate, permissions.ActionReleaseView,
			permissions.ActionReleaseVersionView, permissions.ActionReleaseVersionMediaView,
			permissions.ActionReleaseVersionMediaUpload, permissions.ActionReleaseVersionMediaUpdate,
			permissions.ActionReleaseVersionMediaDelete, permissions.ActionReleaseVersionMediaDeleteOwn,
			permissions.ActionReleaseVersionNotesWrite, permissions.ActionReleaseVersionSegmentsManage,
			permissions.ActionReviewTextDecide, permissions.ActionReviewImageDecide, permissions.ActionReviewContributionDecide,
			permissions.ActionUserGroupCapabilityOverrideManage,
		},
		"quality_checker": {permissions.ActionReviewTextDecide, permissions.ActionReviewImageDecide},
		// Phase 145: permissions.validateMembershipBaselineRegistryPresence fail-closed-rejects
		// any LoadCache call missing the reserved RoleMembershipBaseline (group_member) entry's
		// 3 baseline actions -- mirrors the same fixture fix applied to appAuthCapabilityCacheLoader.
		permissions.RoleMembershipBaseline: {
			permissions.ActionFansubGroupMembersView,
			permissions.ActionFansubGroupMediaView,
			permissions.ActionFansubGroupMediaUpload,
		},
	}, nil
}

func loadDashboardAttentionTestCache(t *testing.T) {
	t.Helper()
	if err := permissions.NewService(nil).LoadCache(context.Background(), dashboardAttentionCacheLoader{}); err != nil {
		t.Fatalf("load dashboard attention test cache: %v", err)
	}
}

// openDashboardGroupMediaAttentionHandlerFixture mirrors
// release_review_query_repository_test.go's openDashboardGroupMediaAttentionFixture
// (same schema; duplicated here since it lives in a different package).
func openDashboardGroupMediaAttentionHandlerFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE review_statuses (
			id BIGINT PRIMARY KEY, code TEXT NOT NULL
		);
		CREATE TABLE media_assets (
			id BIGINT PRIMARY KEY,
			review_status_id BIGINT REFERENCES review_statuses(id)
		);
		ALTER TABLE fansub_groups
			ADD COLUMN name TEXT NOT NULL DEFAULT '',
			ADD COLUMN logo_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
			ADD COLUMN banner_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL;
		CREATE TABLE fansub_group_media (
			id BIGINT PRIMARY KEY,
			group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			media_id BIGINT NOT NULL REFERENCES media_assets(id),
			deleted_at TIMESTAMPTZ
		);
	`)
	require.NoError(t, err)
	return pool
}

// TestAttachPendingGroupMediaReviewAttentionUsesReviewActionNotGroupEdit proves Criterion
// 3's permission-action fix: a user who holds review rights (permissions.ActionReviewImageDecide)
// but NOT permissions.ActionFansubGroupEdit must still see a pending group-media review item.
func TestAttachPendingGroupMediaReviewAttentionUsesReviewActionNotGroupEdit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	loadDashboardAttentionTestCache(t)

	pool := openDashboardGroupMediaAttentionHandlerFixture(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review');
		INSERT INTO fansub_groups(id, name) VALUES (21, 'Alpha');
		INSERT INTO media_assets(id, review_status_id) VALUES (701, 1);
		INSERT INTO fansub_group_media(id, group_id, media_id, deleted_at) VALUES (1, 21, 701, NULL);
	`)
	require.NoError(t, err)

	resolver := &dashboardAttentionResolverStub{
		roles:        map[int64][]string{21: {"quality_checker"}}, // review rights only, no fansub_lead/edit
		membershipID: 901, memberID: 101,
	}
	h := &DashboardMeHandler{
		permissionSvc:   permissions.NewService(resolver),
		reviewQueryRepo: repository.NewReleaseReviewQueryRepository(pool),
	}
	data := &repository.OwnDashboardData{}
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard", nil)
	identity := middleware.AuthIdentity{AppUserID: 55, AppUserStatus: models.AppUserStatusActive}

	require.NoError(t, h.attachPendingGroupMediaReviewAttention(c, identity, data))
	require.Len(t, data.PendingGroupMediaReviews, 1,
		"a reviewer without fansub_group.edit must still see the item once the permission check is corrected to the review action")
	assert.EqualValues(t, 21, data.PendingGroupMediaReviews[0].FansubGroupID)
}

// openDashboardReleaseReviewAttentionHandlerFixture is a trimmed duplicate of
// release_review_query_repository_test.go's openReleaseReviewQueryFixture (same schema and
// migrations; duplicated here since it lives in a different package), seeding two anime
// under the SAME fansub group plus one anime under a second group so memoization has
// something real to prove (a naive per-row permission check would call the resolver 3
// times; per-group memoization must call it exactly twice, once per distinct group).
func openDashboardReleaseReviewAttentionHandlerFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (id BIGINT PRIMARY KEY);
		ALTER TABLE app_users ADD COLUMN legacy_user_id BIGINT NULL REFERENCES users(id);
		ALTER TABLE members ADD COLUMN nickname TEXT, ADD COLUMN display_name TEXT;
		CREATE TABLE anime (
			id BIGINT PRIMARY KEY, title TEXT, title_de TEXT, title_en TEXT
		);
		CREATE TABLE episodes (
			id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id),
			episode_number TEXT NOT NULL
		);
		CREATE TABLE fansub_releases (
			id BIGINT PRIMARY KEY, episode_id BIGINT NOT NULL REFERENCES episodes(id)
		);
		ALTER TABLE release_versions
			ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
			ADD COLUMN version TEXT NOT NULL DEFAULT 'v1';
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		CREATE TABLE contributor_roles (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT REFERENCES fansub_groups(id),
			member_id BIGINT NOT NULL REFERENCES members(id),
			role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
			title TEXT, body_html TEXT NOT NULL, deleted_at TIMESTAMPTZ
		);
		CREATE TABLE media_assets (id BIGINT PRIMARY KEY);
		CREATE TABLE media_files (
			id BIGINT PRIMARY KEY, media_id BIGINT NOT NULL REFERENCES media_assets(id),
			variant TEXT NOT NULL, path TEXT NOT NULL, status TEXT NOT NULL
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT REFERENCES fansub_groups(id),
			media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
			category TEXT NOT NULL, caption TEXT, uploaded_by_user_id BIGINT REFERENCES users(id),
			deleted_at TIMESTAMPTZ
		);
	`)
	require.NoError(t, err)

	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations")
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0134_review_foundation.up.sql"))
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0135_release_review_lifecycle.up.sql"))

	_, err = pool.Exec(ctx, `
		INSERT INTO users(id) VALUES (1001);
		INSERT INTO members(id, nickname, display_name) VALUES (101, 'Einreicher', 'Einreicher Eins');
		INSERT INTO app_users(id, status, legacy_user_id) VALUES (11, 'active', 1001);
		INSERT INTO fansub_groups(id) VALUES (21), (22);
		INSERT INTO anime(id, title, title_de) VALUES
			(81, 'Anime One', 'Anime Eins'), (82, 'Anime Two', 'Anime Zwei'), (83, 'Anime Three', 'Anime Drei');
		INSERT INTO episodes(id, anime_id, episode_number) VALUES (31, 81, '01'), (32, 82, '02'), (33, 83, '03');
		INSERT INTO fansub_releases(id, episode_id) VALUES (51, 31), (52, 32), (53, 33);
		INSERT INTO release_versions(id, release_id, version) VALUES (41, 51, 'v1'), (42, 52, 'v1'), (43, 53, 'v1');
		INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (41, 21), (42, 22), (43, 21);
		INSERT INTO media_assets(id) VALUES (701), (702), (703);
		INSERT INTO media_files(id, media_id, variant, path, status) VALUES
			(801, 701, 'original', '/app/media/review/701/original.png', 'ready'),
			(802, 702, 'original', '/app/media/review/702/original.png', 'ready'),
			(803, 703, 'original', '/app/media/review/703/original.png', 'ready');
		INSERT INTO release_version_media(
			id, release_version_id, fansub_group_id, media_asset_id, category, caption, uploaded_by_user_id
		) VALUES
			(601, 41, 21, 701, 'screenshot', 'Bild Eins', 1001),
			(602, 42, 22, 702, 'screenshot', 'Bild Zwei', 1001),
			(603, 43, 21, 703, 'screenshot', 'Bild Drei', 1001);
		INSERT INTO release_version_media_review_lifecycle(
			release_version_media_id, source_revision, review_state, category,
			submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at, decided_at
		) VALUES
			(601, 1, 'pending', 'screenshot', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', NULL),
			(602, 1, 'pending', 'screenshot', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', NULL),
			(603, 1, 'pending', 'screenshot', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', NULL);
	`)
	require.NoError(t, err)
	return pool
}

// TestAttachPendingReleaseReviewAttentionMemoizesPermissionCheckPerGroup proves the
// N+1 fix: three candidate rows span two distinct fansub groups (group 21 twice, via
// anime 81 and anime 83; group 22 once, via anime 82) -- the permission resolution must
// run exactly once per distinct group, never once per row.
func TestAttachPendingReleaseReviewAttentionMemoizesPermissionCheckPerGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	loadDashboardAttentionTestCache(t)

	pool := openDashboardReleaseReviewAttentionHandlerFixture(t)
	resolver := &dashboardAttentionResolverStub{
		roles:        map[int64][]string{21: {"quality_checker"}, 22: {"quality_checker"}},
		membershipID: 901, memberID: 201, // distinct member from submitter (101) -- actor must not self-exclude
	}
	h := &DashboardMeHandler{
		permissionSvc:   permissions.NewService(resolver),
		reviewQueryRepo: repository.NewReleaseReviewQueryRepository(pool),
	}
	data := &repository.OwnDashboardData{}
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard", nil)
	// AppUserID 12 (not 11, the fixture's submitter) so the self-exclusion predicate does
	// not remove every row before the handler's own memoization loop even runs.
	identity := middleware.AuthIdentity{AppUserID: 12, AppUserStatus: models.AppUserStatusActive}

	require.NoError(t, h.attachPendingReleaseReviewAttention(c, identity, data))
	require.Len(t, data.PendingReleaseReviews, 3, "all three anime/group combinations must be present")

	resolver.mu.Lock()
	defer resolver.mu.Unlock()
	assert.Equal(t, 1, resolver.groupRolesCalls[21], "group 21 (2 candidate rows) must be resolved exactly once, not once per row")
	assert.Equal(t, 1, resolver.groupRolesCalls[22], "group 22 (1 candidate row) must be resolved exactly once")
}

// openDashboardOwnNoteRevisionAttentionHandlerFixture is a trimmed duplicate of
// release_review_query_repository_test.go's openDashboardOwnNoteRevisionAttentionFixture
// (same schema and migrations; duplicated here since it lives in a different package).
func openDashboardOwnNoteRevisionAttentionHandlerFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (id BIGINT PRIMARY KEY);
		ALTER TABLE app_users ADD COLUMN legacy_user_id BIGINT NULL REFERENCES users(id);
		ALTER TABLE members ADD COLUMN nickname TEXT, ADD COLUMN display_name TEXT;
		ALTER TABLE fansub_groups ADD COLUMN name TEXT NOT NULL DEFAULT '';
		CREATE TABLE anime (
			id BIGINT PRIMARY KEY, title TEXT, title_de TEXT, title_en TEXT
		);
		CREATE TABLE episodes (
			id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id),
			episode_number TEXT NOT NULL, sort_index INTEGER
		);
		CREATE TABLE fansub_releases (
			id BIGINT PRIMARY KEY, episode_id BIGINT NOT NULL REFERENCES episodes(id)
		);
		ALTER TABLE release_versions
			ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
			ADD COLUMN version TEXT NOT NULL DEFAULT 'v1';
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		CREATE TABLE contributor_roles (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT REFERENCES fansub_groups(id),
			member_id BIGINT NOT NULL REFERENCES members(id),
			role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
			title TEXT, body_html TEXT NOT NULL, deleted_at TIMESTAMPTZ
		);
		CREATE TABLE media_assets (id BIGINT PRIMARY KEY);
		CREATE TABLE media_files (
			id BIGINT PRIMARY KEY, media_id BIGINT NOT NULL REFERENCES media_assets(id),
			variant TEXT NOT NULL, path TEXT NOT NULL, status TEXT NOT NULL
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT REFERENCES fansub_groups(id),
			media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
			category TEXT NOT NULL, caption TEXT, uploaded_by_user_id BIGINT REFERENCES users(id),
			deleted_at TIMESTAMPTZ
		);
	`)
	require.NoError(t, err)

	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations")
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0134_review_foundation.up.sql"))
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0135_release_review_lifecycle.up.sql"))

	_, err = pool.Exec(ctx, `
		INSERT INTO users(id) VALUES (1001);
		INSERT INTO members(id, nickname, display_name) VALUES (101, 'Einreicher', 'Einreicher Eins');
		INSERT INTO app_users(id, status, legacy_user_id) VALUES (11, 'active', 1001);
		INSERT INTO fansub_groups(id, name) VALUES (21, 'Alpha'), (22, 'Beta');
		INSERT INTO anime(id, title, title_de) VALUES (81, 'Anime One', 'Anime Eins'), (82, 'Anime Two', 'Anime Zwei');
		INSERT INTO episodes(id, anime_id, episode_number, sort_index) VALUES
			(31, 81, '01', 1), (32, 81, '02', 2), (33, 82, '01', 1);
		INSERT INTO fansub_releases(id, episode_id) VALUES (51, 31), (52, 32), (53, 33);
		INSERT INTO release_versions(id, release_id, version) VALUES (41, 51, 'v1'), (42, 52, 'v1'), (43, 53, 'v1');
		INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (41, 21), (42, 21), (43, 22);
		INSERT INTO contributor_roles(id, name) VALUES (71, 'translator');
		INSERT INTO release_version_notes(
			id, release_version_id, fansub_group_id, member_id, role_id, title, body_html
		) VALUES
			(501, 41, 21, 101, 71, 'Ueberarbeiten Eins', '<p>Text</p>'),
			(502, 42, 21, 101, 71, 'Ueberarbeiten Zwei', '<p>Text</p>'),
			(503, 43, 22, 101, 71, 'Ueberarbeiten Drei', '<p>Text</p>');
		INSERT INTO release_version_note_review_lifecycle(
			release_version_note_id, source_revision, review_state,
			submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
		) VALUES
			(501, 1, 'rejected', 11, 101, '2026-07-24T09:00:00Z', '2026-07-24T09:00:00Z'),
			(502, 1, 'rejected', 11, 101, '2026-07-24T09:00:00Z', '2026-07-24T09:00:00Z'),
			(503, 1, 'rejected', 11, 101, '2026-07-24T09:00:00Z', '2026-07-24T09:00:00Z');
	`)
	require.NoError(t, err)
	return pool
}

// TestAttachPendingOwnNoteRevisionAttentionGroupsByAnimeAndFansubGroup proves Criterion
// 7's grouping: two rejected notes belonging to the same (anime, fansub group) pair
// collapse into one group with two nested items, while a third rejected note under a
// different anime/group pair produces its own separate group.
func TestAttachPendingOwnNoteRevisionAttentionGroupsByAnimeAndFansubGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)

	pool := openDashboardOwnNoteRevisionAttentionHandlerFixture(t)
	h := &DashboardMeHandler{reviewQueryRepo: repository.NewReleaseReviewQueryRepository(pool)}
	data := &repository.OwnDashboardData{}
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard", nil)
	identity := middleware.AuthIdentity{AppUserID: 11, AppUserStatus: models.AppUserStatusActive}

	require.NoError(t, h.attachPendingOwnNoteRevisionAttention(c, identity, 101, data))
	require.Len(t, data.PendingOwnNoteRevisions, 2, "anime 81/group 21 (2 notes) and anime 82/group 22 (1 note) must each produce exactly one group")

	byAnime := map[int64]repository.OwnDashboardPendingOwnNoteRevisionGroup{}
	for _, group := range data.PendingOwnNoteRevisions {
		byAnime[group.AnimeID] = group
	}
	require.Contains(t, byAnime, int64(81))
	first := byAnime[81]
	assert.EqualValues(t, 21, first.FansubGroupID)
	assert.Equal(t, "Alpha", first.FansubGroupName)
	require.Len(t, first.Items, 2, "both notes under anime 81/group 21 must nest inside the same group")
	assert.Equal(t, "Ueberarbeiten Eins", first.Items[0].NoteTitle)
	assert.Equal(t, "Ueberarbeiten Zwei", first.Items[1].NoteTitle)

	require.Contains(t, byAnime, int64(82))
	second := byAnime[82]
	assert.EqualValues(t, 22, second.FansubGroupID)
	require.Len(t, second.Items, 1)
	assert.Equal(t, "Ueberarbeiten Drei", second.Items[0].NoteTitle)
}

// TestAttachPendingOwnNoteRevisionAttentionSkipsQueryWithoutVerifiedMemberProfile proves
// the D-09 empty-state contract: when GetOwnDashboard's ownership-gate resolution finds
// no verified member profile, this attach method must short-circuit to an empty slice
// without running any query (a user with no verified member profile cannot have
// submitted notes).
func TestAttachPendingOwnNoteRevisionAttentionSkipsQueryWithoutVerifiedMemberProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := &DashboardMeHandler{reviewQueryRepo: repository.NewReleaseReviewQueryRepository(nil)}
	data := &repository.OwnDashboardData{}
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard", nil)
	identity := middleware.AuthIdentity{AppUserID: 11, AppUserStatus: models.AppUserStatusActive}

	require.NoError(t, h.attachPendingOwnNoteRevisionAttention(c, identity, 0, data),
		"memberID<=0 must short-circuit before ever touching h.reviewQueryRepo's nil db")
	require.NotNil(t, data.PendingOwnNoteRevisions)
	assert.Empty(t, data.PendingOwnNoteRevisions)

	encoded, err := json.Marshal(data)
	require.NoError(t, err)
	assert.Contains(t, string(encoded), `"pending_own_note_revisions":[]`)
}
