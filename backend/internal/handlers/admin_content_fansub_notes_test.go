package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// openFansubNotesHandlerFixture provisions a real, schema-isolated Postgres fixture
// (testsupport.OpenPhase107Postgres's SKIP-not-FAIL convention) with just enough
// production-shaped schema for fansub_group_notes, member_group_stories, and
// anime_fansub_project_notes/anime_fansub_groups to prove real route-context
// propagation through FansubNotesRepository — CLAUDE.md's Teststil rule forbids
// substituting a fake here because AdminContentHandler.fansubNotesRepo is a
// concrete *repository.FansubNotesRepository (not an interface), unlike
// projectNoteCreditSvc.
func openFansubNotesHandlerFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);
		CREATE TABLE anime_fansub_groups (
			anime_id BIGINT NOT NULL,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			PRIMARY KEY (anime_id, fansub_group_id)
		);
		CREATE TABLE anime_fansub_project_notes (
			id BIGINT PRIMARY KEY,
			anime_id BIGINT NOT NULL,
			fansub_group_id BIGINT NOT NULL,
			title TEXT NOT NULL DEFAULT '',
			body_markdown TEXT NOT NULL DEFAULT '',
			body_html TEXT NOT NULL DEFAULT '',
			body_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			body_text TEXT NOT NULL DEFAULT '',
			editor_type TEXT NOT NULL DEFAULT 'tiptap',
			content_schema_version INT NOT NULL DEFAULT 1,
			visibility TEXT NOT NULL DEFAULT 'internal',
			status TEXT NOT NULL DEFAULT 'draft',
			sort_order INT NOT NULL DEFAULT 0,
			created_by_user_id BIGINT NULL REFERENCES users(id),
			updated_by_user_id BIGINT NULL REFERENCES users(id),
			deleted_by_user_id BIGINT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			deleted_at TIMESTAMPTZ NULL
		);
		CREATE TABLE fansub_group_notes (
			id BIGINT PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			title TEXT NOT NULL DEFAULT '',
			body_markdown TEXT NOT NULL DEFAULT '',
			body_html TEXT NOT NULL DEFAULT '',
			body_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			body_text TEXT NOT NULL DEFAULT '',
			editor_type TEXT NOT NULL DEFAULT 'tiptap',
			content_schema_version INT NOT NULL DEFAULT 1,
			visibility TEXT NOT NULL DEFAULT 'internal',
			status TEXT NOT NULL DEFAULT 'draft',
			sort_order INT NOT NULL DEFAULT 0,
			created_by_user_id BIGINT NULL REFERENCES users(id),
			updated_by_user_id BIGINT NULL REFERENCES users(id),
			deleted_by_user_id BIGINT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			deleted_at TIMESTAMPTZ NULL
		);
		CREATE TABLE member_group_stories (
			id BIGINT PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			member_id BIGINT NOT NULL REFERENCES members(id),
			role_id BIGINT NULL,
			title TEXT NOT NULL DEFAULT '',
			body_markdown TEXT NOT NULL DEFAULT '',
			body_html TEXT NOT NULL DEFAULT '',
			body_json JSONB NOT NULL DEFAULT '{}'::jsonb,
			body_text TEXT NOT NULL DEFAULT '',
			editor_type TEXT NOT NULL DEFAULT 'tiptap',
			content_schema_version INT NOT NULL DEFAULT 1,
			visibility TEXT NOT NULL DEFAULT 'internal',
			status TEXT NOT NULL DEFAULT 'draft',
			sort_order INT NOT NULL DEFAULT 0,
			created_by_user_id BIGINT NULL REFERENCES users(id),
			updated_by_user_id BIGINT NULL REFERENCES users(id),
			deleted_by_user_id BIGINT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			deleted_at TIMESTAMPTZ NULL
		);

		INSERT INTO fansub_groups(id) VALUES (41), (42);
		INSERT INTO members(id) VALUES (501);

		-- Valid anime/fansub pairing for the GET happy-path and invalid-pairing negative case
		-- deliberately omits anime_id 999.
		INSERT INTO anime_fansub_groups(anime_id, fansub_group_id) VALUES (61, 41);
		INSERT INTO anime_fansub_project_notes(id, anime_id, fansub_group_id, title, visibility, status)
			VALUES (81, 61, 41, 'Projekt-Notiz', 'internal', 'draft');

		INSERT INTO fansub_group_notes(id, fansub_group_id, title, visibility, status) VALUES
			(91, 41, 'Alte Notiz', 'internal', 'draft'),
			(92, 41, 'Zu loeschende Notiz', 'internal', 'draft'),
			(93, 42, 'Fremde Notiz', 'internal', 'draft');

		INSERT INTO member_group_stories(id, fansub_group_id, member_id, title, visibility, status) VALUES
			(95, 41, 501, 'Alte Geschichte', 'internal', 'draft'),
			(96, 41, 501, 'Zu loeschende Geschichte', 'internal', 'draft'),
			(97, 42, 501, 'Fremde Geschichte', 'internal', 'draft');
	`)
	require.NoError(t, err)
	return pool
}

// fansubNotesPlatformAdminIdentity is a fully-permitted actor: permissions.Service's
// canForContext short-circuits to Allowed for IsPlatformAdmin BEFORE ever consulting
// the resolver or the role-capability cache (permissions.go's canForContext), so every
// write/read path below genuinely executes the handler's route-parsing and repository
// call instead of stopping at the permission gate.
func fansubNotesPlatformAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          9001,
		AppUserID:       9001,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Admin",
	}
}

func fansubNotesHandlerContext(method, target string, body []byte, params gin.Params, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(method, target, bytes.NewReader(body))
	if len(body) > 0 {
		c.Request.Header.Set("Content-Type", "application/json")
	}
	c.Params = params
	c.Set("auth_identity", identity)
	return c, recorder
}

// projectNoteDeleteArgsCaptureStub implements projectNoteCreditService and records the
// exact (noteID, animeID, fansubID, actorAppUserID) quadruple DeleteAnimeFansubProjectNote
// passes through — proving route-context propagation by execution, not by grepping the
// handler's call-site source for a literal argument list.
type projectNoteDeleteArgsCaptureStub struct {
	deleteCalls int
	noteID      int64
	animeID     int64
	fansubID    int64
	actorID     int64
}

func (s *projectNoteDeleteArgsCaptureStub) Upsert(
	context.Context, int64, int64, int64, repository.UpsertAnimeFansubProjectNoteRequest,
) (*repository.AnimeFansubProjectNote, error) {
	return nil, nil
}

func (s *projectNoteDeleteArgsCaptureStub) Delete(_ context.Context, noteID, animeID, fansubID, actorAppUserID int64) error {
	s.deleteCalls++
	s.noteID = noteID
	s.animeID = animeID
	s.fansubID = fansubID
	s.actorID = actorAppUserID
	return nil
}

// fansubNotesAdminRoleCheckerStub grants every platform-admin/legacy-admin authz check.
// UpdateMemberGroupStory/DeleteMemberGroupStory (unlike the fansub_group_notes handlers)
// gate through requireAdmin -> requirePlatformAdminIdentity, which type-asserts h.authzRepo
// against the richer AppUserHasGlobalRole shape before falling back to UserHasRole; this stub
// implements both so the fansubNotesPlatformAdminIdentity() actor genuinely clears the gate
// instead of hitting requirePlatformAdminIdentity's nil-roleChecker 500 fallback.
type fansubNotesAdminRoleCheckerStub struct{}

func (fansubNotesAdminRoleCheckerStub) UserHasRole(context.Context, int64, string) (bool, error) {
	return true, nil
}

func (fansubNotesAdminRoleCheckerStub) AppUserHasGlobalRole(context.Context, int64, string) (bool, error) {
	return true, nil
}

// TestAdminContentFansubNotes_ProjectNoteSourceInvariants proves, via real httptest calls
// against a real Postgres-backed fansubNotesRepo and a fake projectNoteCreditSvc, that:
//   - GetAnimeFansubProjectNote loads the real row for a valid (anime, fansub) pairing,
//   - GetAnimeFansubProjectNote maps an invalid (anime, fansub) pairing to the exact locked
//     German 404 message ("Anime-Fansub-Zuordnung nicht gefunden"), and
//   - DeleteAnimeFansubProjectNote forwards the exact route noteID/animeID/fansubID plus the
//     authenticated actor's AppUserID into projectNoteCreditSvc.Delete.
func TestAdminContentFansubNotes_ProjectNoteSourceInvariants(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openFansubNotesHandlerFixture(t)
	handler := &AdminContentHandler{
		permissionSvc:        permissions.NewService(releasePermissionResolverStub{}),
		fansubNotesRepo:      repository.NewFansubNotesRepository(pool),
		projectNoteCreditSvc: &projectNoteDeleteArgsCaptureStub{},
	}
	identity := fansubNotesPlatformAdminIdentity()

	t.Run("valid context loads the real note", func(t *testing.T) {
		c, rec := fansubNotesHandlerContext(http.MethodGet, "/api/v1/admin/fansubs/41/anime/61/notes", nil,
			gin.Params{{Key: "id", Value: "41"}, {Key: "animeId", Value: "61"}}, identity)

		handler.GetAnimeFansubProjectNote(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), "Projekt-Notiz")
	})

	t.Run("invalid anime/fansub context maps to the locked German 404", func(t *testing.T) {
		c, rec := fansubNotesHandlerContext(http.MethodGet, "/api/v1/admin/fansubs/41/anime/999/notes", nil,
			gin.Params{{Key: "id", Value: "41"}, {Key: "animeId", Value: "999"}}, identity)

		handler.GetAnimeFansubProjectNote(c)

		require.Equal(t, http.StatusNotFound, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), "Anime-Fansub-Zuordnung nicht gefunden")
	})

	t.Run("delete forwards route context and actor into the credit service", func(t *testing.T) {
		stub := &projectNoteDeleteArgsCaptureStub{}
		deleteHandler := &AdminContentHandler{
			permissionSvc:        permissions.NewService(releasePermissionResolverStub{}),
			projectNoteCreditSvc: stub,
		}
		c, rec := fansubNotesHandlerContext(http.MethodDelete, "/api/v1/admin/fansubs/41/anime/61/notes/81", nil,
			gin.Params{
				{Key: "id", Value: "41"},
				{Key: "animeId", Value: "61"},
				{Key: "noteId", Value: "81"},
			}, identity)

		deleteHandler.DeleteAnimeFansubProjectNote(c)

		require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
		require.Equal(t, 1, stub.deleteCalls)
		require.EqualValues(t, 81, stub.noteID)
		require.EqualValues(t, 61, stub.animeID)
		require.EqualValues(t, 41, stub.fansubID)
		require.EqualValues(t, identity.AppUserID, stub.actorID)
	})
}

// TestAdminContentFansubNotes_ScopedWriteSourceInvariants proves, via real httptest calls
// against a real Postgres-backed fansubNotesRepo, that UpdateFansubGroupNote/
// DeleteFansubGroupNote/UpdateMemberGroupStory/DeleteMemberGroupStory all scope their
// mutation to the fansub group ID taken from the route: a request naming the correct row ID
// but the WRONG fansub group in the route succeeds as a 404 (repository.ErrNotFound), which
// is only possible if the route's fansubID genuinely reaches the repository's WHERE clause —
// executing the handler proves this, grepping the call-site source cannot.
func TestAdminContentFansubNotes_ScopedWriteSourceInvariants(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openFansubNotesHandlerFixture(t)
	handler := &AdminContentHandler{
		permissionSvc:   permissions.NewService(releasePermissionResolverStub{}),
		fansubNotesRepo: repository.NewFansubNotesRepository(pool),
		authzRepo:       fansubNotesAdminRoleCheckerStub{},
		tiptapSvc:       nil,
	}
	identity := fansubNotesPlatformAdminIdentity()

	t.Run("UpdateFansubGroupNote scopes to the route fansub group", func(t *testing.T) {
		body := []byte(`{"title":"Neuer Titel"}`)

		c, rec := fansubNotesHandlerContext(http.MethodPatch, "/api/v1/admin/fansubs/41/notes/91", body,
			gin.Params{{Key: "id", Value: "41"}, {Key: "noteId", Value: "91"}}, identity)
		handler.UpdateFansubGroupNote(c)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), "Neuer Titel")

		wrongGroupC, wrongGroupRec := fansubNotesHandlerContext(http.MethodPatch, "/api/v1/admin/fansubs/42/notes/91", body,
			gin.Params{{Key: "id", Value: "42"}, {Key: "noteId", Value: "91"}}, identity)
		handler.UpdateFansubGroupNote(wrongGroupC)
		require.Equal(t, http.StatusNotFound, wrongGroupRec.Code, wrongGroupRec.Body.String())
	})

	t.Run("DeleteFansubGroupNote scopes to the route fansub group", func(t *testing.T) {
		wrongGroupC, wrongGroupRec := fansubNotesHandlerContext(http.MethodDelete, "/api/v1/admin/fansubs/42/notes/92", nil,
			gin.Params{{Key: "id", Value: "42"}, {Key: "noteId", Value: "92"}}, identity)
		handler.DeleteFansubGroupNote(wrongGroupC)
		require.Equal(t, http.StatusNotFound, wrongGroupRec.Code, wrongGroupRec.Body.String())

		c, rec := fansubNotesHandlerContext(http.MethodDelete, "/api/v1/admin/fansubs/41/notes/92", nil,
			gin.Params{{Key: "id", Value: "41"}, {Key: "noteId", Value: "92"}}, identity)
		handler.DeleteFansubGroupNote(c)
		require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())

		var deletedAt *string
		require.NoError(t, pool.QueryRow(context.Background(),
			`SELECT deleted_at::text FROM fansub_group_notes WHERE id = 92`,
		).Scan(&deletedAt))
		require.NotNil(t, deletedAt)
	})

	t.Run("UpdateMemberGroupStory scopes to the route fansub group", func(t *testing.T) {
		body := []byte(`{"title":"Neue Geschichte"}`)

		c, rec := fansubNotesHandlerContext(http.MethodPatch, "/api/v1/admin/fansubs/41/member-stories/95", body,
			gin.Params{{Key: "id", Value: "41"}, {Key: "storyId", Value: "95"}}, identity)
		handler.UpdateMemberGroupStory(c)
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), "Neue Geschichte")

		wrongGroupC, wrongGroupRec := fansubNotesHandlerContext(http.MethodPatch, "/api/v1/admin/fansubs/42/member-stories/95", body,
			gin.Params{{Key: "id", Value: "42"}, {Key: "storyId", Value: "95"}}, identity)
		handler.UpdateMemberGroupStory(wrongGroupC)
		require.Equal(t, http.StatusNotFound, wrongGroupRec.Code, wrongGroupRec.Body.String())
	})

	t.Run("DeleteMemberGroupStory scopes to the route fansub group", func(t *testing.T) {
		wrongGroupC, wrongGroupRec := fansubNotesHandlerContext(http.MethodDelete, "/api/v1/admin/fansubs/42/member-stories/96", nil,
			gin.Params{{Key: "id", Value: "42"}, {Key: "storyId", Value: "96"}}, identity)
		handler.DeleteMemberGroupStory(wrongGroupC)
		require.Equal(t, http.StatusNotFound, wrongGroupRec.Code, wrongGroupRec.Body.String())

		c, rec := fansubNotesHandlerContext(http.MethodDelete, "/api/v1/admin/fansubs/41/member-stories/96", nil,
			gin.Params{{Key: "id", Value: "41"}, {Key: "storyId", Value: "96"}}, identity)
		handler.DeleteMemberGroupStory(c)
		require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())

		var deletedAt *string
		require.NoError(t, pool.QueryRow(context.Background(),
			`SELECT deleted_at::text FROM member_group_stories WHERE id = 96`,
		).Scan(&deletedAt))
		require.NotNil(t, deletedAt)
	})
}
