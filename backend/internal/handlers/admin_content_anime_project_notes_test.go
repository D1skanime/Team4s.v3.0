package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
)

type projectNoteCreditStub struct {
	upsertCalls, deleteCalls int
	lastActor                int64
	note                     *repository.AnimeFansubProjectNote
	err                      error
}

func (s *projectNoteCreditStub) Upsert(
	_ context.Context,
	_, _ int64,
	actorAppUserID int64,
	_ repository.UpsertAnimeFansubProjectNoteRequest,
) (*repository.AnimeFansubProjectNote, error) {
	s.upsertCalls++
	s.lastActor = actorAppUserID
	return s.note, s.err
}

func (s *projectNoteCreditStub) Delete(_ context.Context, _, _, _ int64, actorAppUserID int64) error {
	s.deleteCalls++
	s.lastActor = actorAppUserID
	return s.err
}

func TestAnimeProjectNoteUpsertDelegatesOnceAndKeepsResponseShape(t *testing.T) {
	gin.SetMode(gin.TestMode)
	created := time.Date(2026, 7, 24, 12, 0, 0, 0, time.UTC)
	stub := &projectNoteCreditStub{note: &repository.AnimeFansubProjectNote{
		ID: 91, AnimeID: 61, FansubGroupID: 41, Title: "Projekt",
		BodyText: "Text", Visibility: "internal", Status: "draft", CreatedAt: created,
	}}
	handler := &AdminContentHandler{
		permissionSvc:        permissions.NewService(contributionsPermissionResolverAllowed{}),
		tiptapSvc:            services.NewTipTapService(),
		projectNoteCreditSvc: stub,
	}
	body := []byte(`{"title":"Projekt","body_json":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Text"}]}]},"visibility":"internal","status":"draft","sort_order":0}`)
	c, recorder := projectNoteHandlerContext(http.MethodPut, "/api/v1/admin/fansubs/41/anime/61/notes", body)

	handler.UpsertAnimeFansubProjectNote(c)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	require.Equal(t, 1, stub.upsertCalls)
	require.Equal(t, int64(71), stub.lastActor)
	require.Contains(t, recorder.Body.String(), `"ID":91`)
	require.Contains(t, recorder.Body.String(), `"AnimeID":61`)
	require.Contains(t, recorder.Body.String(), `"FansubGroupID":41`)
}

func TestAnimeProjectNoteAuthorizationFailsBeforeServiceMutation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	stub := &projectNoteCreditStub{}
	handler := &AdminContentHandler{
		permissionSvc:        permissions.NewService(contributionsPermissionResolverDenied{}),
		tiptapSvc:            services.NewTipTapService(),
		projectNoteCreditSvc: stub,
	}
	body := []byte(`{"title":"Projekt","body_json":{"type":"doc"},"visibility":"internal","status":"draft"}`)
	c, recorder := projectNoteHandlerContext(http.MethodPut, "/api/v1/admin/fansubs/41/anime/61/notes", body)

	handler.UpsertAnimeFansubProjectNote(c)

	require.NotEqual(t, http.StatusOK, recorder.Code)
	require.Zero(t, stub.upsertCalls)
	require.Zero(t, stub.deleteCalls)
}

func TestAnimeProjectNoteContextFailurePrecedesServiceMutation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	stub := &projectNoteCreditStub{}
	handler := &AdminContentHandler{
		permissionSvc:        permissions.NewService(contributionsPermissionResolverAllowed{}),
		tiptapSvc:            services.NewTipTapService(),
		projectNoteCreditSvc: stub,
	}
	body := []byte(`{"title":"Projekt","body_json":{"type":"doc"},"visibility":"internal","status":"draft"}`)
	c, recorder := projectNoteHandlerContext(http.MethodPut, "/api/v1/admin/fansubs/41/anime/invalid/notes", body)
	c.Params[1].Value = "invalid"

	handler.UpsertAnimeFansubProjectNote(c)

	require.Equal(t, http.StatusBadRequest, recorder.Code)
	require.Zero(t, stub.upsertCalls)
}

func TestAnimeProjectNoteDeleteDelegatesOnce(t *testing.T) {
	gin.SetMode(gin.TestMode)
	stub := &projectNoteCreditStub{}
	handler := &AdminContentHandler{
		permissionSvc:        permissions.NewService(contributionsPermissionResolverAllowed{}),
		projectNoteCreditSvc: stub,
	}
	c, recorder := projectNoteHandlerContext(http.MethodDelete, "/api/v1/admin/fansubs/41/anime/61/notes/91", nil)
	c.Params = append(c.Params, gin.Param{Key: "noteId", Value: "91"})

	handler.DeleteAnimeFansubProjectNote(c)

	require.Equal(t, http.StatusNoContent, recorder.Code, recorder.Body.String())
	require.Equal(t, 1, stub.deleteCalls)
	require.Equal(t, int64(71), stub.lastActor)
}

func TestAnimeProjectNoteHandlerOwnsNoLedgerPolicy(t *testing.T) {
	source, err := os.ReadFile("admin_content_anime_project_notes.go")
	require.NoError(t, err)
	for _, forbidden := range []string{"CreditInTx", "ReverseInTx", "point_ledger_entries"} {
		require.False(t, strings.Contains(string(source), forbidden), forbidden)
	}
}

func projectNoteHandlerContext(method, target string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(method, target, bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{
		{Key: "id", Value: "41"},
		{Key: "animeId", Value: "61"},
	}
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID: 7, AppUserID: 71, DisplayName: "Autor",
	})
	return c, recorder
}
