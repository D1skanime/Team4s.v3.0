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

	"github.com/gin-gonic/gin"
)

// fakeMemberClaimInvitationStore ist ein echtes In-Memory-Fake für
// memberClaimInvitationStore (CLAUDE.md Teststil -- kein Source-Fragment-Test).
type fakeMemberClaimInvitationStore struct {
	acceptCalls int
	acceptErr   error
}

func (f *fakeMemberClaimInvitationStore) ListInvitationsForMember(_ context.Context, _ int64) ([]repository.MemberClaimInvitationRow, error) {
	return nil, nil
}

func (f *fakeMemberClaimInvitationStore) CreateInvitation(_ context.Context, _ int64, _ int64, _ int64) (*repository.CreateInvitationResult, error) {
	return nil, nil
}

func (f *fakeMemberClaimInvitationStore) AcceptInvitation(_ context.Context, _ string, _ int64) error {
	f.acceptCalls++
	return f.acceptErr
}

func (f *fakeMemberClaimInvitationStore) CancelInvitation(_ context.Context, _ int64, _ int64, _ int64, _ int64) error {
	return nil
}

func makeMemberClaimInvitationTestContext(body []byte, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/me/claim-invitations/accept", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("auth_identity", identity)
	return c, recorder
}

// TestAcceptClaimInvitationRejectsDisabledUser prüft D-17: ein deaktivierter app-user
// darf eine Claim-Einladung nicht annehmen -- derselbe Check, den AcceptFansubInvitation
// bereits erzwingt. Die Behauptung wird durch echte Ausführung über httptest + ein
// In-Memory-Fake-Repo bewiesen (CLAUDE.md Teststil), nicht durch Lesen des Quelltexts.
func TestAcceptClaimInvitationRejectsDisabledUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	store := &fakeMemberClaimInvitationStore{}
	handler := &MemberClaimInvitationsHandler{
		invitationsRepo: store,
		permissionSvc:   permissions.NewService(nil),
	}

	body := []byte(`{"token":"sometoken"}`)
	c, recorder := makeMemberClaimInvitationTestContext(body, middleware.AuthIdentity{
		UserID:        201,
		DisplayName:   "Disabled Actor",
		AppUserID:     21,
		AppUserStatus: models.AppUserStatusDisabled,
	})

	handler.AcceptClaimInvitation(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for disabled actor, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if store.acceptCalls != 0 {
		t.Fatalf("expected 0 AcceptInvitation calls for disabled actor, got %d", store.acceptCalls)
	}
}

// TestAcceptClaimInvitationAllowsNonDisabledUser prüft, dass ein nicht-deaktivierter
// Actor weiterhin erfolgreich eine Claim-Einladung annehmen kann (keine Regression
// durch den D-17-Fix).
func TestAcceptClaimInvitationAllowsNonDisabledUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	store := &fakeMemberClaimInvitationStore{}
	handler := &MemberClaimInvitationsHandler{
		invitationsRepo: store,
		permissionSvc:   permissions.NewService(nil),
	}

	body := []byte(`{"token":"sometoken"}`)
	c, recorder := makeMemberClaimInvitationTestContext(body, middleware.AuthIdentity{
		UserID:        202,
		DisplayName:   "Active Actor",
		AppUserID:     22,
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.AcceptClaimInvitation(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200 for active actor, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if store.acceptCalls != 1 {
		t.Fatalf("expected exactly 1 AcceptInvitation call for active actor, got %d", store.acceptCalls)
	}
}
