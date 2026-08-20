package handlers

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type phase136LinkResolver struct{ found bool }

func (r phase136LinkResolver) ResolveFansubGroup(context.Context, int64) (*permissions.Context, error) {
	if !r.found {
		return nil, nil
	}
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{41}}, nil
}
func (phase136LinkResolver) ResolveRelease(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}
func (phase136LinkResolver) ResolveReleaseVersion(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}
func (phase136LinkResolver) ResolveReleaseVersionMedia(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}
func (phase136LinkResolver) ListActorGroupRoles(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}
func (phase136LinkResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

type phase136LinkAuditSpy struct {
	events []string
	entry  repository.AuditLogEntry
}

type phase136DeniedAuditDB struct{ writes int }

func (db *phase136DeniedAuditDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	db.writes++
	return pgconn.NewCommandTag("INSERT 1"), nil
}
func (*phase136DeniedAuditDB) QueryRow(context.Context, string, ...any) pgx.Row { return nil }

func phase136LinkContext(body string, platformAdmin bool) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/fansubs/41/links/7", bytes.NewBufferString(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "41"}, {Key: "linkId", Value: "7"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 3, AppUserID: 5, DisplayName: "Link Tester", AppUserStatus: "active", IsPlatformAdmin: platformAdmin})
	if _, ok := middleware.CommentAuthIdentityFromContext(c); !ok {
		panic("test auth identity was not stored")
	}
	return c, recorder
}

func phase136LinkHandler(update func(context.Context, int64, int64, models.FansubGroupLinkPatchInput) (*models.FansubGroupLink, bool, error), spy *phase136LinkAuditSpy) *FansubHandler {
	h := &FansubHandler{permissionSvc: permissions.NewService(phase136LinkResolver{found: true})}
	h.updateGroupLink = func(ctx context.Context, groupID, linkID int64, input models.FansubGroupLinkPatchInput) (*models.FansubGroupLink, bool, error) {
		spy.events = append(spy.events, "mutation")
		return update(ctx, groupID, linkID, input)
	}
	h.writeAuditLog = func(_ context.Context, entry repository.AuditLogEntry) error {
		spy.events = append(spy.events, "audit")
		spy.entry = entry
		return nil
	}
	return h
}

func TestPhase136GroupLinkAuditValidationFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	spy := &phase136LinkAuditSpy{}
	h := phase136LinkHandler(func(context.Context, int64, int64, models.FansubGroupLinkPatchInput) (*models.FansubGroupLink, bool, error) {
		t.Fatal("mutation must not run")
		return nil, false, nil
	}, spy)
	c, recorder := phase136LinkContext(`{"url":" "}`, true)
	h.UpdateFansubLink(c)
	if recorder.Code != http.StatusBadRequest || len(spy.events) != 0 {
		t.Fatalf("status=%d body=%s events=%v", recorder.Code, recorder.Body.String(), spy.events)
	}
}

func TestPhase136GroupLinkAuditPermissionDenied(t *testing.T) {
	gin.SetMode(gin.TestMode)
	spy := &phase136LinkAuditSpy{}
	h := phase136LinkHandler(func(context.Context, int64, int64, models.FansubGroupLinkPatchInput) (*models.FansubGroupLink, bool, error) {
		t.Fatal("mutation must not run")
		return nil, false, nil
	}, spy)
	h.permissionSvc = permissions.NewService(phase136LinkResolver{})
	deniedAudit := &phase136DeniedAuditDB{}
	h.auditLogRepo = repository.NewAuditLogRepository(deniedAudit)
	c, recorder := phase136LinkContext(`{"url":"https://example.test"}`, false)
	h.UpdateFansubLink(c)
	if recorder.Code != http.StatusNotFound || len(spy.events) != 0 || deniedAudit.writes != 1 {
		t.Fatalf("status=%d events=%v denied_audits=%d", recorder.Code, spy.events, deniedAudit.writes)
	}
}

func TestPhase136GroupLinkAuditRepositoryNotFound(t *testing.T) {
	phase136AssertLinkFailure(t, repository.ErrNotFound, http.StatusNotFound)
}
func TestPhase136GroupLinkAuditRepositoryConflict(t *testing.T) {
	phase136AssertLinkFailure(t, repository.ErrConflict, http.StatusConflict)
}
func TestPhase136GroupLinkAuditRepositoryFailure(t *testing.T) {
	phase136AssertLinkFailure(t, errors.New("database unavailable"), http.StatusInternalServerError)
}

func phase136AssertLinkFailure(t *testing.T, repoErr error, expectedStatus int) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	spy := &phase136LinkAuditSpy{}
	h := phase136LinkHandler(func(context.Context, int64, int64, models.FansubGroupLinkPatchInput) (*models.FansubGroupLink, bool, error) {
		return nil, false, repoErr
	}, spy)
	c, recorder := phase136LinkContext(`{"url":"https://example.test"}`, true)
	h.UpdateFansubLink(c)
	if recorder.Code != expectedStatus || len(spy.events) != 1 || spy.events[0] != "mutation" {
		t.Fatalf("status=%d events=%v", recorder.Code, spy.events)
	}
}

func TestPhase136GroupLinkAuditExactNoOp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	spy := &phase136LinkAuditSpy{}
	item := &models.FansubGroupLink{ID: 7, GroupID: 41, LinkType: models.FansubGroupLinkTypeWebsite, URL: "https://example.test", CreatedAt: time.Now()}
	h := phase136LinkHandler(func(context.Context, int64, int64, models.FansubGroupLinkPatchInput) (*models.FansubGroupLink, bool, error) {
		return item, false, nil
	}, spy)
	c, recorder := phase136LinkContext(`{"url":"https://example.test"}`, true)
	h.UpdateFansubLink(c)
	if recorder.Code != http.StatusOK || len(spy.events) != 1 {
		t.Fatalf("status=%d events=%v", recorder.Code, spy.events)
	}
}

func TestPhase136GroupLinkAuditSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	spy := &phase136LinkAuditSpy{}
	item := &models.FansubGroupLink{ID: 7, GroupID: 41, LinkType: models.FansubGroupLinkTypeWebsite, URL: "https://new.example", CreatedAt: time.Now()}
	h := phase136LinkHandler(func(_ context.Context, groupID, linkID int64, _ models.FansubGroupLinkPatchInput) (*models.FansubGroupLink, bool, error) {
		if groupID != 41 || linkID != 7 {
			t.Fatalf("wrong scope %d/%d", groupID, linkID)
		}
		return item, true, nil
	}, spy)
	c, recorder := phase136LinkContext(`{"url":"https://new.example"}`, true)
	h.UpdateFansubLink(c)
	if recorder.Code != http.StatusOK || len(spy.events) != 2 || spy.events[0] != "mutation" || spy.events[1] != "audit" {
		t.Fatalf("status=%d events=%v", recorder.Code, spy.events)
	}
	if spy.entry.EventType != "fansub_group_link.updated" || spy.entry.TargetID == nil || *spy.entry.TargetID != 7 || spy.entry.ScopeID == nil || *spy.entry.ScopeID != 41 {
		t.Fatalf("unexpected audit entry: %#v", spy.entry)
	}
}
