package handlers

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type fansubMediaPermissionResolver struct {
	roles []string
}

func (s fansubMediaPermissionResolver) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}

func (s fansubMediaPermissionResolver) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s fansubMediaPermissionResolver) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s fansubMediaPermissionResolver) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return nil, nil
}

func (s fansubMediaPermissionResolver) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return s.roles, nil
}

func (s fansubMediaPermissionResolver) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

func TestFansubMediaUploadAllowsFansubLeadPastPermissionGate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Die Capability-Matrix ist paketweiter Zustand (permissions.loadedCache) und
	// ohne Load fail-closed. Ohne eigenes Fixture war dieser Test davon abhaengig,
	// dass ein anderer Test im Paket den Cache vorher geladen hat -- er lief im
	// vollen Paketlauf gruen und bei -run-Teilmengen mit 403 rot.
	loadAppAuthCapabilityTestCache(t)

	handler := &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{roles: []string{permissions.RoleFansubLead}}),
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/88/media", nil)
	c.Params = gin.Params{{Key: "id", Value: "88"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 2, AppUserStatus: "active", DisplayName: "Lead"})

	handler.UploadFansubMedia(c)

	if recorder.Code == http.StatusForbidden {
		t.Fatalf("expected fansub_lead to pass the media permission gate, got 403: %s", recorder.Body.String())
	}
	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected media-service guard after permission gate, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestFansubMediaDeleteRejectsMissingGroupRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}),
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/fansubs/88/media/logo", nil)
	c.Params = gin.Params{{Key: "id", Value: "88"}, {Key: "kind", Value: "logo"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 2, AppUserStatus: "active", DisplayName: "Member"})

	handler.DeleteFansubMedia(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

// TestFansubGroupMediaDeleteRejectsMissingGroupRole prüft, dass der numerische
// Gruppenmedien-Delete-Pfad (DELETE /media/{mediaId}) backendseitig die
// fansub_group_media.delete-Capability erzwingt. Gruppenmitgliedschaft ohne Rolle
// genügt nicht — manipulierte Frontend-Capabilities sind wirkungslos.
func TestFansubGroupMediaDeleteRejectsMissingGroupRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}),
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/fansubs/88/media/123", nil)
	c.Params = gin.Params{{Key: "id", Value: "88"}, {Key: "kind", Value: "123"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 2, AppUserStatus: "active", DisplayName: "Member"})

	handler.DeleteFansubMedia(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for group media delete without role, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestFansubGroupMediaUploadRejectsMissingGroupRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("kind", "image"); err != nil {
		t.Fatalf("write multipart field: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	handler := &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}),
	}
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/88/media", &body)
	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	c.Params = gin.Params{{Key: "id", Value: "88"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: 2, AppUserStatus: "active", DisplayName: "Member"})

	handler.UploadFansubMedia(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for group media upload without role, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}

// fansubMediaUploadFallbackMigrationPath resolves a repository-root-relative migration file,
// mirroring admin_content_release_version_media_replace_test.go's replaceRVMMigrationPath.
func fansubMediaUploadFallbackMigrationPath(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve caller for migration path")
	}
	return filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", name)
}

// openFansubMediaUploadFallbackFixture opens the real, schema-isolated Phase-107 Postgres
// fixture (fansub_groups/app_users/fansub_group_members/member_claims plus the full
// capability-registry migration chain) and additionally applies migration 0110 so
// fansub_group_member_media_permissions exists -- the exact table the removed upload-side
// fallback read from.
func openFansubMediaUploadFallbackFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	testsupport.ApplySQLFile(t, pool, fansubMediaUploadFallbackMigrationPath(t, "0110_fansub_group_member_media_permissions.up.sql"))
	return pool
}

// TestFansubMediaUploadRejectsDespiteCustomUploadPermissionFallback proves (179-03, D-10) that
// a seeded fansub_group_member_media_permissions row with can_upload=true no longer grants
// image-upload access once the second, parallel permission-fallback layer is removed from
// UploadFansubMedia: the actor is denied by the capability-registry check (no group role) AND
// has can_upload=true on the legacy custom-permission table, yet still gets a genuine 403. The
// handler is constructed with a real, non-nil *repository.MediaRepository (via a real Postgres
// pool) -- the exact precondition the removed fallback branch required to ever activate.
func TestFansubMediaUploadRejectsDespiteCustomUploadPermissionFallback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openFansubMediaUploadFallbackFixture(t)

	ctx := context.Background()
	const fansubGroupID = 88
	const appUserID = 2
	const fansubGroupMemberID = 301

	if _, err := pool.Exec(ctx, `INSERT INTO app_users(id, status) VALUES ($1, 'active')`, appUserID); err != nil {
		t.Fatalf("seed app_users: %v", err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO fansub_groups(id) VALUES ($1)`, fansubGroupID); err != nil {
		t.Fatalf("seed fansub_groups: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
		VALUES ($1, $2, $3, NULL, 'active')
	`, fansubGroupMemberID, fansubGroupID, appUserID); err != nil {
		t.Fatalf("seed fansub_group_members: %v", err)
	}
	// The exact row the removed fallback would have read: can_upload=true for this actor's
	// active group membership.
	if _, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_member_media_permissions(fansub_group_member_id, can_upload)
		VALUES ($1, TRUE)
	`, fansubGroupMemberID); err != nil {
		t.Fatalf("seed fansub_group_member_media_permissions: %v", err)
	}

	handler := &FansubHandler{
		// No group role granted -> CanForFansubGroup resolves !result.Allowed, exercising the
		// sole remaining denial path.
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}),
		// Real, non-nil concrete repository -- the removed fallback's own activation condition.
		mediaRepo:    repository.NewMediaRepository(pool, ""),
		auditLogRepo: repository.NewAuditLogRepository(nil),
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("kind", "image"); err != nil {
		t.Fatalf("write multipart field: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/88/media", &body)
	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	c.Params = gin.Params{{Key: "id", Value: "88"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, AppUserID: appUserID, AppUserStatus: "active", DisplayName: "Member"})

	handler.UploadFansubMedia(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 despite seeded can_upload=true custom-permission fallback row, got %d body=%s", recorder.Code, recorder.Body.String())
	}
}
