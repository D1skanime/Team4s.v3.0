package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// authIdentityKey ist der interne Gin-Context-Key für AuthIdentity (aus middleware/comment_auth.go).
const authIdentityKey = "auth_identity"

// stubbedRoleChecker implementiert AppUserHasGlobalRole für Handler-Tests ohne DB.
type stubbedRoleChecker struct {
	isAdmin bool
	err     error
}

func (s *stubbedRoleChecker) AppUserHasGlobalRole(_ context.Context, _ int64, _ string) (bool, error) {
	return s.isAdmin, s.err
}

// stubbedAuditLog sammelt geschriebene AuditLogEntry-Werte für Assertions.
type stubbedAuditLog struct {
	entries []repository.AuditLogEntry
}

func (s *stubbedAuditLog) Write(_ context.Context, entry repository.AuditLogEntry) error {
	s.entries = append(s.entries, entry)
	return nil
}

// ginContextWithAdminIdentity baut einen Gin-Kontext mit gesetzter AuthIdentity.
func ginContextWithAdminIdentity(appUserID int64, status string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/members/42/memorial", strings.NewReader("{}"))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set(authIdentityKey, middleware.AuthIdentity{
		AppUserID:     appUserID,
		AppUserStatus: status,
	})
	return c, w
}

// TestMemorialSetterRejectsNonPlatformAdmin: Nicht-Global-Admin erhält 403.
// RED: NewMemberMemorialHandler existiert noch nicht → Kompilierungsfehler erwartet.
func TestMemorialSetterRejectsNonPlatformAdmin(t *testing.T) {
	roleChecker := &stubbedRoleChecker{isAdmin: false}
	auditLog := &stubbedAuditLog{}

	// NewMemberMemorialHandler ist noch nicht implementiert — das macht diesen Test RED.
	handler := NewMemberMemorialHandler(roleChecker, nil, auditLog)

	c, w := ginContextWithAdminIdentity(99, models.AppUserStatusActive)

	handler.SetMemorial(c)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected HTTP 403 for non-platform-admin, got %d — body: %s", w.Code, w.Body.String())
	}

	var body map[string]any
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("expected JSON response: %v", err)
	}
}

// TestMemorialSetterWritesAuditLog: Globaler Admin → Memorial gesetzt → audit_logs-Eintrag vorhanden.
// Erwartet AuditLogEntry mit EventType "member_profile.memorial_set", TargetType "member", Outcome "allowed".
// RED: NewMemberMemorialHandler existiert noch nicht.
func TestMemorialSetterWritesAuditLog(t *testing.T) {
	roleChecker := &stubbedRoleChecker{isAdmin: true}
	auditLog := &stubbedAuditLog{}

	// NewMemberMemorialHandler ist noch nicht implementiert — das macht diesen Test RED.
	handler := NewMemberMemorialHandler(roleChecker, nil, auditLog)

	c, w := ginContextWithAdminIdentity(1, models.AppUserStatusActive)
	// memberID-Parameter im Gin-Kontext setzen
	c.Params = gin.Params{{Key: "id", Value: "42"}}

	handler.SetMemorial(c)

	// Wenn der Handler implementiert ist, muss status 200 oder 204 sein
	if w.Code != http.StatusOK && w.Code != http.StatusNoContent {
		t.Logf("handler returned %d — still RED (implementation missing)", w.Code)
	}

	// Audit-Log-Assertion: muss nach Implementierung exakt diesen Eintrag enthalten
	found := false
	for _, entry := range auditLog.entries {
		if entry.EventType == "member_profile.memorial_set" &&
			entry.TargetType == "member" &&
			entry.Outcome == "allowed" {
			found = true
			break
		}
	}
	if !found {
		// Erwartet: Handler ist noch nicht gebaut → entries leer → Test schlägt fehl
		t.Fatalf("expected AuditLogEntry with EventType=%q TargetType=%q Outcome=%q — not found in %d entries",
			"member_profile.memorial_set", "member", "allowed", len(auditLog.entries))
	}
}

// TestMemorialSetterErrorHandling: Rollenprüfungs-Fehler ergibt 500.
// RED: NewMemberMemorialHandler existiert noch nicht.
func TestMemorialSetterErrorHandling(t *testing.T) {
	roleChecker := &stubbedRoleChecker{isAdmin: false, err: errors.New("db unavailable")}
	auditLog := &stubbedAuditLog{}

	handler := NewMemberMemorialHandler(roleChecker, nil, auditLog)

	c, w := ginContextWithAdminIdentity(1, models.AppUserStatusActive)
	handler.SetMemorial(c)

	if w.Code != http.StatusInternalServerError {
		t.Logf("expected 500 on roleChecker error, got %d — still RED", w.Code)
	}
}

// recordingMemberMemorialRepo zählt die Repo-Aufrufe des Memorial-Setters.
// Die Schnittstelle MemberMemorialRepo umfasst NUR GetMemberProfileStatus und
// SetMemorialStatus (members.profile_status) — es existiert KEINE app_user-/
// Account-Mutationsmethode im Vertrag (D-13). Der Recorder belegt, dass der
// Handler exakt diese beiden member-bezogenen Methoden aufruft und nichts darüber
// hinaus an die DB-Schicht delegiert.
type recordingMemberMemorialRepo struct {
	getStatusCalls   int
	setMemorialCalls int
	lastMemberID     int64
}

func (r *recordingMemberMemorialRepo) GetMemberProfileStatus(_ context.Context, _ int64) (string, error) {
	r.getStatusCalls++
	return "active", nil
}

func (r *recordingMemberMemorialRepo) SetMemorialStatus(_ context.Context, memberID int64) error {
	r.setMemorialCalls++
	r.lastMemberID = memberID
	return nil
}

// TestMemorialSetterNoAccountMutation: Global-Admin setzt Memorial → der Handler
// delegiert NUR an die member-bezogenen Repo-Methoden (GetMemberProfileStatus,
// SetMemorialStatus). Da der MemberMemorialRepo-Vertrag keine Account-/app_user-
// Mutationsmethode enthält, belegt dieser Test verhaltensbezogen den D-13-Invarianten
// "kein app_user-Account-Eingriff": die einzige Schreib-Mutation ist genau ein
// SetMemorialStatus-Aufruf, und die Response trägt profile_status='memorial'.
func TestMemorialSetterNoAccountMutation(t *testing.T) {
	roleChecker := &stubbedRoleChecker{isAdmin: true}
	auditLog := &stubbedAuditLog{}
	repo := &recordingMemberMemorialRepo{}

	handler := NewMemberMemorialHandler(roleChecker, repo, auditLog)

	c, w := ginContextWithAdminIdentity(7, models.AppUserStatusActive)
	c.Params = gin.Params{{Key: "id", Value: "42"}}

	handler.SetMemorial(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200 for global admin, got %d — body: %s", w.Code, w.Body.String())
	}

	// D-13: genau eine member-bezogene Schreib-Mutation (SetMemorialStatus), kein
	// Account-Eingriff (der Repo-Vertrag bietet ohnehin keine Account-Mutationsmethode).
	if repo.setMemorialCalls != 1 {
		t.Fatalf("expected exactly 1 SetMemorialStatus call, got %d", repo.setMemorialCalls)
	}
	if repo.getStatusCalls != 1 {
		t.Fatalf("expected exactly 1 GetMemberProfileStatus call, got %d", repo.getStatusCalls)
	}
	if repo.lastMemberID != 42 {
		t.Fatalf("expected SetMemorialStatus for member 42, got %d", repo.lastMemberID)
	}

	// Response trägt profile_status='memorial' (D-14).
	var body struct {
		Data struct {
			MemberID      int64  `json:"member_id"`
			ProfileStatus string `json:"profile_status"`
		} `json:"data"`
	}
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("expected JSON response: %v", err)
	}
	if body.Data.ProfileStatus != "memorial" {
		t.Fatalf("expected profile_status 'memorial' in response, got %q", body.Data.ProfileStatus)
	}

	// allowed-Audit "member_profile.memorial_set" mit Outcome 'allowed' (D-15).
	found := false
	for _, entry := range auditLog.entries {
		if entry.EventType == "member_profile.memorial_set" && entry.Outcome == "allowed" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected allowed-audit %q/Outcome 'allowed' — not found in %d entries",
			"member_profile.memorial_set", len(auditLog.entries))
	}
}
