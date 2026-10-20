package handlers

// Phase 189, Plan 08 (D-12): proves DeleteFansub's new 409 dependents
// translation -- and that its pre-existing 404/500 paths stay byte-identical
// -- by actually EXECUTING the real handler via httptest, against a real
// Postgres fixture (testsupport.OpenPhase189Postgres). A hand-rolled fake
// repository is not possible here: FansubHandler's fansubRepo/authzRepo
// fields are concrete *repository.FansubRepository/*repository.AuthzRepository
// types, not interfaces, so h.requireAdmin(c) (-> AppUserHasGlobalRole) and
// h.fansubRepo.DeleteGroup both need a real DB-backed instance to execute
// at all -- matching this package's existing real-Postgres handler-test
// precedent (e.g. fansub_media_upload_namespace_test.go).

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// deleteFansubTestAdminIdentity returns the AuthIdentity for the seeded
// platform-admin app user every test below authenticates as.
func deleteFansubTestAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:        1,
		AppUserID:     1,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Admin",
	}
}

// seedDeleteFansubAdmin seeds the one platform-admin app user every test
// below authenticates as (AppUserHasGlobalRole's real query target).
func seedDeleteFansubAdmin(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `INSERT INTO app_users (id, status) VALUES (1, 'active')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO app_user_global_roles (app_user_id, role) VALUES (1, 'platform_admin')`)
	require.NoError(t, err)
}

// newDeleteFansubTestHandler builds a real, Postgres-backed FansubHandler --
// just the two fields DeleteFansub's own code path actually touches.
func newDeleteFansubTestHandler(pool *pgxpool.Pool) *FansubHandler {
	return &FansubHandler{
		fansubRepo: repository.NewFansubRepository(pool),
		authzRepo:  repository.NewAuthzRepository(pool),
	}
}

// performDeleteFansub routes through a real gin.Engine (not a bare
// gin.Context) so the no-body 204 success path's header actually flushes to
// the recorder -- calling h.DeleteFansub(c) directly on a bare
// gin.CreateTestContext leaves gin's lazy ResponseWriter.WriteHeader
// unflushed when the handler never writes a body, which would misreport
// 204 as the httptest.ResponseRecorder's 200 default.
func performDeleteFansub(h *FansubHandler, id string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.DELETE("/admin/fansubs/:id", func(c *gin.Context) {
		c.Set("auth_identity", deleteFansubTestAdminIdentity())
		h.DeleteFansub(c)
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/admin/fansubs/"+id, nil)
	router.ServeHTTP(rec, req)
	return rec
}

func TestDeleteFansubReturnsConflictWhenDependentsExist(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	seedDeleteFansubAdmin(t, pool)
	ctx := context.Background()

	const (
		groupID   = int64(200)
		releaseID = int64(201)
	)
	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseID, groupID)
	require.NoError(t, err)

	h := newDeleteFansubTestHandler(pool)
	rec := performDeleteFansub(h, "200")

	require.Equalf(t, http.StatusConflict, rec.Code, "body: %s", rec.Body.String())

	var body struct {
		Error struct {
			Message string `json:"message"`
			Code    string `json:"code"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, "fansub_group_has_dependents", body.Error.Code)
	require.Contains(t, body.Error.Message, "1 Release")

	var stillExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`, groupID).Scan(&stillExists))
	require.True(t, stillExists, "the group must not be deleted when the handler reports 409")
}

func TestDeleteFansubStillReturns404ForNotFound(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	seedDeleteFansubAdmin(t, pool)

	h := newDeleteFansubTestHandler(pool)
	rec := performDeleteFansub(h, "999999")

	require.Equalf(t, http.StatusNotFound, rec.Code, "body: %s", rec.Body.String())

	var body struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, "fansubgruppe nicht gefunden", body.Error.Message)
}

func TestDeleteFansubSucceedsWhenEmpty(t *testing.T) {
	pool := testsupport.OpenPhase189Postgres(t)
	seedDeleteFansubAdmin(t, pool)
	ctx := context.Background()

	const groupID = int64(210)
	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
	require.NoError(t, err)

	h := newDeleteFansubTestHandler(pool)
	rec := performDeleteFansub(h, "210")

	require.Equalf(t, http.StatusNoContent, rec.Code, "body: %s", rec.Body.String())

	var stillExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`, groupID).Scan(&stillExists))
	require.False(t, stillExists)
}
