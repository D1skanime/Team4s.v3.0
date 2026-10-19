package handlers

import (
	"context"
	"net/http"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// openAnimeProjectTimelineHandlerFixture provisions a real, schema-isolated Postgres
// fixture with the exact release-chain schema UpdateAnimeFansubProjectTimeline's
// latestReleaseCompletion query needs (release_version_groups/release_versions/
// fansub_releases/episodes/anime/anime_fansub_groups), mirroring
// anime_fansub_project_timeline_repository_test.go's openProjectTimelinePool --
// AdminContentHandler.fansubNotesRepo is a concrete *repository.FansubNotesRepository
// (not an interface), so Handler-Test A (188-05-PLAN.md) genuinely executes the real
// write path instead of stopping at the permission gate.
func openAnimeProjectTimelineHandlerFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
    id BIGINT PRIMARY KEY
);
CREATE TABLE anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    production_started_on DATE,
    production_completed_on DATE,
    PRIMARY KEY (anime_id, fansub_group_id)
);
CREATE TABLE episodes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id)
);
CREATE TABLE fansub_releases (
    id BIGINT PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id),
    release_date TIMESTAMPTZ
);
ALTER TABLE release_versions
    ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
    ADD COLUMN release_date TIMESTAMPTZ;
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (release_version_id, fansub_group_id)
);`)
	if err != nil {
		t.Fatalf("create anime project timeline handler fixture: %v", err)
	}
	return pool
}

// TestUpdateAnimeFansubProjectTimelineAllowsConfirmedProjectLeadWithoutGroupRole is Plan
// 188-05's Handler-Test A (D-12 Kernfall): a member with NO granting group role but a
// confirmed project-specific project_lead contribution role for exactly this (fansubID,
// animeID) pair must be allowed -- the real Strawhat-Subs/Anime-3/app_user-6 bug. Uses a
// real Postgres-backed fansubNotesRepo (openFansubNotesHandlerFixture, same rationale as
// admin_content_fansub_notes_test.go: AdminContentHandler.fansubNotesRepo is a concrete
// *repository.FansubNotesRepository, not an interface, so this genuinely executes the
// repository's UpdateAnimeFansubProjectTimeline write path, not just the permission gate.
func TestUpdateAnimeFansubProjectTimelineAllowsConfirmedProjectLeadWithoutGroupRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	loadAppAuthCapabilityTestCache(t)
	pool := openAnimeProjectTimelineHandlerFixture(t)

	if _, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_groups(id) VALUES (88);
		INSERT INTO anime(id) VALUES (9);
		INSERT INTO anime_fansub_groups(anime_id, fansub_group_id) VALUES (9, 88);
	`); err != nil {
		t.Fatalf("seed anime/fansub context: %v", err)
	}

	handler := &AdminContentHandler{
		permissionSvc: permissions.NewService(permissionResolverStub{
			context:                  &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:                    map[int64][]string{88: {}},
			projectContributionRoles: map[int64]map[int64][]string{88: {9: {permissions.RoleProjectLead}}},
		}),
		fansubNotesRepo: repository.NewFansubNotesRepository(pool),
	}
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/admin/fansubs/88/anime/9/timeline", []byte(`{}`), middleware.AuthIdentity{
		UserID: 6, AppUserID: 6, DisplayName: "Strawhat Leader", AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"}, gin.Param{Key: "animeId", Value: "9"})

	handler.UpdateAnimeFansubProjectTimeline(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200 for confirmed project_lead without group role, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}

func TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker(t *testing.T) {
	gin.SetMode(gin.TestMode)
	loadAppAuthCapabilityTestCache(t)

	handler := &AdminContentHandler{
		permissionSvc: permissions.NewService(permissionResolverStub{
			context: &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {permissions.RoleQualityChecker}},
		}),
	}
	c, recorder := makeAppAuthTestContext(http.MethodPut, "/api/v1/admin/fansubs/88/anime/9/timeline", []byte(`{}`), middleware.AuthIdentity{
		UserID: 112, AppUserID: 55, DisplayName: "Quality Checker", AppUserStatus: models.AppUserStatusActive,
	}, gin.Param{Key: "id", Value: "88"}, gin.Param{Key: "animeId", Value: "9"})

	handler.UpdateAnimeFansubProjectTimeline(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for quality checker, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}
