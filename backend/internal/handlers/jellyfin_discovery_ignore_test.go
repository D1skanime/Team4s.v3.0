package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeAuditLogWriter is an in-memory auditLogWriter fake, proving D-21 audit writes without a
// live Postgres instance and letting Test 4 simulate a failing (but swallowed) audit write.
type fakeAuditLogWriter struct {
	calls   int
	entries []repository.AuditLogEntry
	err     error
}

func (f *fakeAuditLogWriter) Write(_ context.Context, entry repository.AuditLogEntry) error {
	f.calls++
	f.entries = append(f.entries, entry)
	return f.err
}

func withTestAdminIdentityAppUser(appUserID, legacyUserID int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{UserID: legacyUserID, AppUserID: appUserID, DisplayName: "Admin"})
		c.Next()
	}
}

func newDiscoveryIgnoreTestHandler(ignoreRepo libraryDiscoveryIgnoreRepository, auditRepo auditLogWriter) *AdminContentHandler {
	return &AdminContentHandler{
		authzRepo:                  stubAdminRoleChecker{allowed: true},
		adminRoleName:              "admin",
		libraryDiscoveryIgnoreRepo: ignoreRepo,
		auditLogRepo:               auditRepo,
	}
}

func newDiscoveryIgnoreTestRouter(handler *AdminContentHandler) *gin.Engine {
	return newDiscoveryIgnoreTestRouterWithIdentity(handler, withTestAdminIdentityAppUser(7, 7))
}

func newDiscoveryIgnoreTestRouterWithIdentity(handler *AdminContentHandler, identity gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/v1/admin/jellyfin/discovery/ignore", identity, handler.IgnoreJellyfinDiscoveryItem)
	router.DELETE("/api/v1/admin/jellyfin/discovery/ignore/:itemID", identity, handler.UnignoreJellyfinDiscoveryItem)
	return router
}

func performDiscoveryIgnoreRequest(t *testing.T, router *gin.Engine, method, target string, body any) (int, map[string]any) {
	t.Helper()

	var reader *bytes.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, target, reader)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	var decoded map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &decoded)
	return rec.Code, decoded
}

// --- Test 1: ignore writes correct audit entry ---------------------------------------------

func TestJellyfinDiscoveryIgnore_Ignore_WritesAuditEntry(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	auditRepo := &fakeAuditLogWriter{}
	router := newDiscoveryIgnoreTestRouter(newDiscoveryIgnoreTestHandler(ignoreRepo, auditRepo))

	code, _ := performDiscoveryIgnoreRequest(t, router, http.MethodPost, "/api/v1/admin/jellyfin/discovery/ignore", jellyfinDiscoveryIgnoreRequest{JellyfinItemID: "abc"})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if ignoreRepo.insertCalls != 1 {
		t.Fatalf("expected exactly 1 InsertLibraryDiscoveryIgnore call, got %d", ignoreRepo.insertCalls)
	}
	if !ignoreRepo.ignoredIDs["abc"] {
		t.Fatalf("expected item %q to be marked ignored", "abc")
	}
	if auditRepo.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", auditRepo.calls)
	}
	entry := auditRepo.entries[0]
	if entry.EventType != "jellyfin_discovery.ignored" {
		t.Fatalf("expected event_type jellyfin_discovery.ignored, got %q", entry.EventType)
	}
	if entry.TargetType != "jellyfin_item" {
		t.Fatalf("expected target_type jellyfin_item, got %q", entry.TargetType)
	}
	if entry.ActorAppUserID == nil || *entry.ActorAppUserID != 7 {
		t.Fatalf("expected actor_app_user_id 7, got %+v", entry.ActorAppUserID)
	}
	if entry.Payload["jellyfin_item_id"] != "abc" {
		t.Fatalf("expected payload jellyfin_item_id=abc, got %+v", entry.Payload)
	}
}

// --- Test 2: unignore writes correct audit entry --------------------------------------------

func TestJellyfinDiscoveryIgnore_Unignore_WritesAuditEntry(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{ignoredIDs: map[string]bool{"abc": true}}
	auditRepo := &fakeAuditLogWriter{}
	router := newDiscoveryIgnoreTestRouter(newDiscoveryIgnoreTestHandler(ignoreRepo, auditRepo))

	code, _ := performDiscoveryIgnoreRequest(t, router, http.MethodDelete, "/api/v1/admin/jellyfin/discovery/ignore/abc", nil)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if ignoreRepo.removeCalls != 1 {
		t.Fatalf("expected exactly 1 RemoveLibraryDiscoveryIgnore call, got %d", ignoreRepo.removeCalls)
	}
	if auditRepo.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", auditRepo.calls)
	}
	if auditRepo.entries[0].EventType != "jellyfin_discovery.unignored" {
		t.Fatalf("expected event_type jellyfin_discovery.unignored, got %q", auditRepo.entries[0].EventType)
	}
}

// --- Test 3: idempotent double ignore --------------------------------------------------------

func TestJellyfinDiscoveryIgnore_Ignore_IsIdempotent(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	auditRepo := &fakeAuditLogWriter{}
	router := newDiscoveryIgnoreTestRouter(newDiscoveryIgnoreTestHandler(ignoreRepo, auditRepo))

	req := jellyfinDiscoveryIgnoreRequest{JellyfinItemID: "abc"}

	code1, _ := performDiscoveryIgnoreRequest(t, router, http.MethodPost, "/api/v1/admin/jellyfin/discovery/ignore", req)
	if code1 != http.StatusOK {
		t.Fatalf("expected 200 on first ignore, got %d", code1)
	}
	code2, _ := performDiscoveryIgnoreRequest(t, router, http.MethodPost, "/api/v1/admin/jellyfin/discovery/ignore", req)
	if code2 != http.StatusOK {
		t.Fatalf("expected 200 on second (idempotent) ignore, got %d", code2)
	}
	if ignoreRepo.insertCalls != 2 {
		t.Fatalf("expected 2 insert calls (both succeeding, no error), got %d", ignoreRepo.insertCalls)
	}
	if auditRepo.calls != 2 {
		t.Fatalf("expected 2 audit writes (one per call), got %d", auditRepo.calls)
	}
}

// --- Test 4: failing audit write does not fail the HTTP response ----------------------------

func TestJellyfinDiscoveryIgnore_FailingAuditWriteDoesNotFailResponse(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	auditRepo := &fakeAuditLogWriter{err: errors.New("audit db unavailable")}
	router := newDiscoveryIgnoreTestRouter(newDiscoveryIgnoreTestHandler(ignoreRepo, auditRepo))

	code, _ := performDiscoveryIgnoreRequest(t, router, http.MethodPost, "/api/v1/admin/jellyfin/discovery/ignore", jellyfinDiscoveryIgnoreRequest{JellyfinItemID: "abc"})
	if code != http.StatusOK {
		t.Fatalf("expected 200 even though the audit write failed, got %d", code)
	}
	if ignoreRepo.insertCalls != 1 {
		t.Fatalf("expected the primary mutation to still succeed, got %d insert calls", ignoreRepo.insertCalls)
	}
	if auditRepo.calls != 1 {
		t.Fatalf("expected the audit write to have been attempted exactly once, got %d", auditRepo.calls)
	}
}

// --- Test 5: nil auditLogRepo must not panic (bug A) -----------------------------------------

func TestJellyfinDiscoveryIgnore_NilAuditLogRepoDoesNotPanic(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	router := newDiscoveryIgnoreTestRouter(newDiscoveryIgnoreTestHandler(ignoreRepo, nil))

	code, _ := performDiscoveryIgnoreRequest(t, router, http.MethodPost, "/api/v1/admin/jellyfin/discovery/ignore", jellyfinDiscoveryIgnoreRequest{JellyfinItemID: "abc"})
	if code != http.StatusOK {
		t.Fatalf("expected 200 with a nil auditLogRepo (no panic), got %d", code)
	}
	if ignoreRepo.insertCalls != 1 {
		t.Fatalf("expected the primary mutation to still succeed, got %d insert calls", ignoreRepo.insertCalls)
	}
}

func TestJellyfinDiscoveryUnignore_NilAuditLogRepoDoesNotPanic(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{ignoredIDs: map[string]bool{"abc": true}}
	router := newDiscoveryIgnoreTestRouter(newDiscoveryIgnoreTestHandler(ignoreRepo, nil))

	code, _ := performDiscoveryIgnoreRequest(t, router, http.MethodDelete, "/api/v1/admin/jellyfin/discovery/ignore/abc", nil)
	if code != http.StatusOK {
		t.Fatalf("expected 200 with a nil auditLogRepo (no panic), got %d", code)
	}
	if ignoreRepo.removeCalls != 1 {
		t.Fatalf("expected the primary mutation to still succeed, got %d remove calls", ignoreRepo.removeCalls)
	}
}

// --- Test 6: zero-valued AppUserID must not produce an FK-violating audit write (bug B) -------
//
// audit_logs.actor_app_user_id has a FK to app_users(id); 0 is never a valid id. A legacy-only
// identity not yet linked to app_users (middleware.AuthIdentity.LegacyUserLinked) can have
// AppUserID == 0. actorPointersFromIdentity nils out a zero AppUserID instead of writing a
// literal 0, so the audit write can succeed instead of silently failing the FK constraint.

func TestJellyfinDiscoveryIgnore_ZeroAppUserIDNilsActorPointer(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{}
	auditRepo := &fakeAuditLogWriter{}
	router := newDiscoveryIgnoreTestRouterWithIdentity(
		newDiscoveryIgnoreTestHandler(ignoreRepo, auditRepo),
		withTestAdminIdentityAppUser(0, 7),
	)

	code, _ := performDiscoveryIgnoreRequest(t, router, http.MethodPost, "/api/v1/admin/jellyfin/discovery/ignore", jellyfinDiscoveryIgnoreRequest{JellyfinItemID: "abc"})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if auditRepo.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", auditRepo.calls)
	}
	entry := auditRepo.entries[0]
	if entry.ActorAppUserID != nil {
		t.Fatalf("expected ActorAppUserID to be nil for a zero-valued AppUserID, got %+v", *entry.ActorAppUserID)
	}
	if entry.ActorLegacyUserID == nil || *entry.ActorLegacyUserID != 7 {
		t.Fatalf("expected ActorLegacyUserID 7, got %+v", entry.ActorLegacyUserID)
	}
}

func TestJellyfinDiscoveryUnignore_ZeroAppUserIDNilsActorPointer(t *testing.T) {
	ignoreRepo := &fakeLibraryDiscoveryIgnoreRepo{ignoredIDs: map[string]bool{"abc": true}}
	auditRepo := &fakeAuditLogWriter{}
	router := newDiscoveryIgnoreTestRouterWithIdentity(
		newDiscoveryIgnoreTestHandler(ignoreRepo, auditRepo),
		withTestAdminIdentityAppUser(0, 7),
	)

	code, _ := performDiscoveryIgnoreRequest(t, router, http.MethodDelete, "/api/v1/admin/jellyfin/discovery/ignore/abc", nil)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if auditRepo.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", auditRepo.calls)
	}
	entry := auditRepo.entries[0]
	if entry.ActorAppUserID != nil {
		t.Fatalf("expected ActorAppUserID to be nil for a zero-valued AppUserID, got %+v", *entry.ActorAppUserID)
	}
}
