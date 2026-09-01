package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
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
// echten *pgxpool.Pool und kann ohne Postgres-Fixture nicht sinnvoll gemockt werden
// (identisches Muster zu contributions_me_member_anchor_test.go / Phase-37-Konvention:
// Source-Inspection statt Interface-Mock fuer DB-gebundene Methoden). Die vier
// Verhaltens-Bullets werden daher so abgedeckt:
//  1. 401 ohne Authorization-Header: reiner Gin-Test, keine DB noetig.
//  2/3. 200 mit vollem Envelope / 200 mit has_member_profile=false: Source-Inspection
//     bestaetigt den D-08/D-09-Kontrakt im Handler-Code (siehe unten).
//  4. member_id NIE aus Query/Body/Param: Source-Inspection.

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

// TestDashboardMeHandlerUsesSharedOwnershipGateHelper ist die verbindliche D-08-
// Regression: der Handler MUSS resolveVerifiedMemberIDForAppUser(ctx, db,
// identity.AppUserID) verwenden und darf memberID an keiner Stelle aus
// c.Query/c.Param/dem Request-Body lesen.
func TestDashboardMeHandlerUsesSharedOwnershipGateHelper(t *testing.T) {
	srcBytes, err := os.ReadFile("dashboard_me_handler.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.Contains(t, src, "resolveVerifiedMemberIDForAppUser(c.Request.Context(), h.db, identity.AppUserID)",
		"D-08: die member_id muss ausschliesslich ueber den gemeinsamen Ownership-Gate-Seam aufgeloest werden")
	require.NotContains(t, src, `c.Query("member_id")`)
	require.NotContains(t, src, `c.Param("member_id")`)
	require.NotContains(t, src, `c.PostForm("member_id")`)
	require.NotContains(t, src, "ShouldBindJSON",
		"GET /me/dashboard definiert keinen Request-Body -- keine member_id darf aus einem Body gebunden werden")
}

// TestDashboardMeHandlerGracefulEmptyStateInsteadOf403 ist die verbindliche D-09-
// Regression: fehlt ein verifizierter member_claims-Eintrag, MUSS der Handler mit
// dem Leerzustand (200 + has_member_profile=false) antworten, NICHT mit
// respondMemberProfileRequired (403) wie ListMyAnimeContributions.
func TestDashboardMeHandlerGracefulEmptyStateInsteadOf403(t *testing.T) {
	srcBytes, err := os.ReadFile("dashboard_me_handler.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.NotContains(t, src, "respondMemberProfileRequired(c)",
		"D-09: der Dashboard-Handler darf den 403-Pfad der Contribution-Handler nicht aufrufen")
	require.Contains(t, src, "emptyOwnDashboardData()")
	require.Contains(t, src, "http.StatusOK",
		"der no-verified-claim-Zweig muss 200 zurueckgeben, nie 403")
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
// unveraendertem Signatur-Vertrag (Regression fuer Task 3, keine anderen Zeilen in
// contributions_me_handler.go duerfen sich veraendert haben).
func TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper(t *testing.T) {
	srcBytes, err := os.ReadFile("contributions_me_handler.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.Contains(t, src, "return resolveVerifiedMemberIDForAppUser(ctx, h.db, appUserID)",
		"ContributionsMeHandler.resolveVerifiedMemberID muss an den paket-weiten Ownership-Gate-Seam delegieren")
}

// TestMeIdentityHelpersDefinesSharedOwnershipGate stellt sicher, dass
// resolveVerifiedMemberIDForAppUser tatsaechlich in me_identity_helpers.go definiert
// ist (nicht versehentlich an anderer Stelle dupliziert).
func TestMeIdentityHelpersDefinesSharedOwnershipGate(t *testing.T) {
	srcBytes, err := os.ReadFile("me_identity_helpers.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.True(t, strings.Contains(src, "func resolveVerifiedMemberIDForAppUser(ctx context.Context, db *pgxpool.Pool, appUserID int64) (int64, error)"))
	require.Contains(t, src, "claim_status = 'verified'")
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
