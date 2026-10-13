package handlers

// contributions_me_project_handler_test.go: first-ever tests for GET
// /api/v1/me/projects/:animeId?fansub_group_id=:id (D-05, 181-RESEARCH.md
// Pattern 4). TestGetMyProjectDetailRequiresAuth proves the pre-existing
// 401-no-auth gate (pattern from TestGetOwnDashboardRequiresAuth).
// TestGetMyProjectDetailGracefulWithoutMemberProfile is the D-05 regression:
// a platform admin without a verified member_claims row must get 200 with real
// data, not 404 -- a real httptest GET against a real Postgres fixture (schema
// duplicated inline from anime_contributions_member_project_repository_has_own_notes_test.go,
// since package handlers cannot import package repository's unexported test
// helpers), proving both the handler sentinel AND the repository's LEFT JOIN
// fix together, end to end.

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetMyProjectDetailRequiresAuth prueft, dass GET /me/projects/:animeId ohne
// gesetzte Auth-Identitaet 401 zurueckgibt (kein DB-Zugriff noetig,
// requireMeIdentity greift vor jeder Ownership-Gate-Aufloesung) -- Muster aus
// TestGetOwnDashboardRequiresAuth.
func TestGetMyProjectDetailRequiresAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := NewContributionsMeHandler(nil, nil, nil)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/projects/1?fansub_group_id=1", nil)
	c.Params = gin.Params{{Key: "animeId", Value: "1"}}

	h.GetMyProjectDetail(c)

	assert.Equal(t, http.StatusUnauthorized, recorder.Code,
		"GET /me/projects/:animeId ohne Authorization-Header muss 401 zurueckgeben")
}

// openProjectDetailHandlerFixture ist eine duplizierte Minimal-Schema-Fixture --
// Spiegel von anime_contributions_member_project_repository_has_own_notes_test.go's
// openMemberProjectHasOwnNotesFixture (package repository), hier in package
// handlers neu angelegt, weil unexportierte Test-Helfer paketuebergreifend nicht
// importierbar sind.
func openProjectDetailHandlerFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE anime (
			id BIGINT PRIMARY KEY, title TEXT, title_de TEXT, title_en TEXT
		);
		ALTER TABLE fansub_groups ADD COLUMN name TEXT;
		CREATE TABLE episodes (
			id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id),
			episode_number TEXT NOT NULL, title TEXT, sort_index INT
		);
		CREATE TABLE fansub_releases (
			id BIGINT PRIMARY KEY, episode_id BIGINT NOT NULL REFERENCES episodes(id)
		);
		ALTER TABLE release_versions
			ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
			ADD COLUMN version TEXT NOT NULL DEFAULT 'v1',
			ADD COLUMN title TEXT;
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		CREATE TABLE hist_fansub_group_members (
			id BIGINT PRIMARY KEY, member_id BIGINT REFERENCES members(id)
		);
		CREATE TABLE anime_contributions (
			id BIGINT PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			anime_id BIGINT NOT NULL REFERENCES anime(id),
			member_id BIGINT NULL REFERENCES members(id),
			fansub_group_member_id BIGINT NULL REFERENCES hist_fansub_group_members(id),
			release_version_id BIGINT NULL REFERENCES release_versions(id),
			status TEXT NOT NULL DEFAULT 'draft'
		);
		CREATE TABLE anime_contribution_roles (
			anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id),
			role_code TEXT NOT NULL,
			PRIMARY KEY (anime_contribution_id, role_code)
		);
		CREATE TABLE contributor_roles (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			member_id BIGINT NOT NULL REFERENCES members(id),
			role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
			title TEXT, body_markdown TEXT NOT NULL DEFAULT '', body_html TEXT NOT NULL DEFAULT '',
			deleted_at TIMESTAMPTZ
		);
		CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE media_assets (
			id BIGINT PRIMARY KEY, media_type_id BIGINT REFERENCES media_types(id), file_path TEXT
		);
		CREATE TABLE media_files (
			id BIGINT PRIMARY KEY, media_id BIGINT NOT NULL REFERENCES media_assets(id),
			variant TEXT NOT NULL, path TEXT NOT NULL
		);
		CREATE TABLE anime_media (
			id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id),
			media_id BIGINT NOT NULL REFERENCES media_assets(id), sort_order INT NOT NULL DEFAULT 0
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			uploaded_by_user_id BIGINT REFERENCES app_users(id),
			deleted_at TIMESTAMPTZ
		);
	`)
	require.NoError(t, err)

	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations")
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0135_release_review_lifecycle.up.sql"))

	return pool
}

// TestGetMyProjectDetailGracefulWithoutMemberProfile ist die verbindliche D-05-
// Regression: ein eingeloggter App-User OHNE verifizierten member_claims-Eintrag
// (z. B. ein Plattform-Admin ohne Mitgliederprofil) muss 200 mit echten
// Projektdaten bekommen, NICHT 404 "kein verifizierter Member-Account
// verknuepft". Echter GET-Request gegen eine schema-isolierte Postgres-Fixture.
func TestGetMyProjectDetailGracefulWithoutMemberProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	pool := openProjectDetailHandlerFixture(t)
	ctx := context.Background()

	const appUserID = int64(181201)
	const animeID, groupID = int64(181210), int64(181220)
	const animeTitle, groupName = "Phase181 Handler Anime", "Phase181 Handler Group"
	const episodeID, releaseID, versionID = int64(181240), int64(181241), int64(181242)

	// Bewusst KEIN member_claims-Eintrag fuer diesen AppUser.
	_, err := pool.Exec(ctx, `INSERT INTO app_users(id, status) VALUES ($1, 'active')`, appUserID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO anime(id, title) VALUES ($1, $2)`, animeID, animeTitle)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups(id, name) VALUES ($1, $2)`, groupID, groupName)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes(id, anime_id, episode_number, sort_index) VALUES ($1, $2, '01', 1)`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases(id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions(id, release_id, version) VALUES ($1, $2, 'v1')`, versionID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES ($1, $2)`, versionID, groupID)
	require.NoError(t, err)

	groupRolesRepo := repository.NewHistGroupMemberRolesRepository(pool)
	h := NewContributionsMeHandler(repository.NewAnimeContributionsRepository(pool), groupRolesRepo, pool)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/projects/181210?fansub_group_id=181220", nil)
	c.Params = gin.Params{{Key: "animeId", Value: "181210"}}
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID: appUserID, AppUserID: appUserID, AppUserStatus: models.AppUserStatusActive, DisplayName: "Platform Admin",
	})

	h.GetMyProjectDetail(c)

	require.Equal(t, http.StatusOK, recorder.Code,
		"D-05: ein eingeloggter User ohne verifizierten member_claims-Eintrag muss 200 (graceful) statt 404 bekommen, body: %s", recorder.Body.String())

	var body struct {
		Data struct {
			AnimeTitle      string   `json:"anime_title"`
			FansubGroupName string   `json:"fansub_group_name"`
			RoleCodes       []string `json:"role_codes"`
			ReleaseVersions []struct {
				ReleaseVersionID int64 `json:"release_version_id"`
			} `json:"release_versions"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &body))

	assert.Equal(t, animeTitle, body.Data.AnimeTitle, "echte anime_title muss trotz fehlendem Member-Profil geliefert werden")
	assert.Equal(t, groupName, body.Data.FansubGroupName, "echter fansub_group_name muss trotz fehlendem Member-Profil geliefert werden")
	assert.NotNil(t, body.Data.RoleCodes, "role_codes muss ein nicht-nil leeres Array sein (JSON [], nicht null)")
	assert.Empty(t, body.Data.RoleCodes)
	require.Len(t, body.Data.ReleaseVersions, 1, "data.release_versions muss ein echtes, nicht-null Array mit der gesaeten Release-Version sein")
	assert.EqualValues(t, versionID, body.Data.ReleaseVersions[0].ReleaseVersionID)
}
