package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// fakeMemorialGuardDBTX ist ein echtes In-Memory-Fake für DBTX (CLAUDE.md Teststil --
// kein Source-Fragment-Test). Nur Exec wird von AuditLogRepository.Write tatsächlich
// aufgerufen; QueryRow wird vom Guard nicht benötigt und muss hier nicht funktionieren.
type fakeMemorialGuardDBTX struct {
	execCalls int
	lastArgs  []any
}

func (f *fakeMemorialGuardDBTX) Exec(_ context.Context, _ string, args ...any) (pgconn.CommandTag, error) {
	f.execCalls++
	f.lastArgs = args
	return pgconn.CommandTag{}, nil
}

func (f *fakeMemorialGuardDBTX) QueryRow(_ context.Context, _ string, _ ...any) pgx.Row {
	return nil
}

// TestCheckMemorialNotClaimableBlocksMemorialProfile (D-21): die gemeinsame Guard-Funktion
// liefert für ein Gedenkprofil den ClaimMutationError mit Code/HTTPStatus und schreibt
// genau einen Audit-Eintrag mit dem vom Aufrufer übergebenen Action-String -- real
// ausgeführt über ein In-Memory-Fake-DBTX statt per Quelltext-Fragment-Prüfung.
func TestCheckMemorialNotClaimableBlocksMemorialProfile(t *testing.T) {
	fakeDB := &fakeMemorialGuardDBTX{}
	auditLogRepo := NewAuditLogRepository(fakeDB)

	actorAppUserID := int64(11)
	err := checkMemorialNotClaimable(context.Background(), auditLogRepo, 42, &actorAppUserID, "submit_claim", "memorial")

	if err == nil {
		t.Fatal("expected ClaimMutationError for memorial profile, got nil")
	}
	if err.Code != "memorial_not_claimable" {
		t.Fatalf("expected Code memorial_not_claimable, got %q", err.Code)
	}
	if err.HTTPStatus != 409 {
		t.Fatalf("expected HTTPStatus 409, got %d", err.HTTPStatus)
	}
	if fakeDB.execCalls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", fakeDB.execCalls)
	}
	// args order matches audit_logs.go's Write(): actor, legacy_actor, event_type, scope_type,
	// scope_id, target_type, target_id, action_name, outcome, reason_code, payload.
	if got := fakeDB.lastArgs[2]; got != "member_claim.memorial_blocked" {
		t.Fatalf("expected event_type member_claim.memorial_blocked, got %v", got)
	}
	if got := fakeDB.lastArgs[7]; got != "submit_claim" {
		t.Fatalf("expected action submit_claim (caller-supplied), got %v", got)
	}
	if got := fakeDB.lastArgs[8]; got != "denied" {
		t.Fatalf("expected outcome denied, got %v", got)
	}
}

// TestCheckMemorialNotClaimableAllowsNonMemorialProfile (D-21): für ein nicht-memorial
// Profil liefert die Guard-Funktion nil und schreibt keinen Audit-Eintrag.
func TestCheckMemorialNotClaimableAllowsNonMemorialProfile(t *testing.T) {
	fakeDB := &fakeMemorialGuardDBTX{}
	auditLogRepo := NewAuditLogRepository(fakeDB)

	err := checkMemorialNotClaimable(context.Background(), auditLogRepo, 42, nil, "accept_invitation", "active")

	if err != nil {
		t.Fatalf("expected nil for non-memorial profile, got %+v", err)
	}
	if fakeDB.execCalls != 0 {
		t.Fatalf("expected 0 audit writes for non-memorial profile, got %d", fakeDB.execCalls)
	}
}

// TestCheckMemorialNotClaimablePreservesActionPerCallSite (D-21): beide Call-Sites
// (SubmitClaim via "submit_claim", AcceptInvitation via "accept_invitation") behalten
// ihren eigenen Action-String, obwohl beide denselben gemeinsamen Guard aufrufen.
func TestCheckMemorialNotClaimablePreservesActionPerCallSite(t *testing.T) {
	cases := []struct {
		name           string
		action         string
		actorAppUserID *int64
	}{
		{name: "submit_claim path", action: "submit_claim", actorAppUserID: int64Ptr(7)},
		{name: "accept_invitation path", action: "accept_invitation", actorAppUserID: nil},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fakeDB := &fakeMemorialGuardDBTX{}
			auditLogRepo := NewAuditLogRepository(fakeDB)

			err := checkMemorialNotClaimable(context.Background(), auditLogRepo, 99, tc.actorAppUserID, tc.action, "memorial")
			if err == nil {
				t.Fatal("expected ClaimMutationError, got nil")
			}
			if got := fakeDB.lastArgs[7]; got != tc.action {
				t.Fatalf("expected action %q, got %v", tc.action, got)
			}
			if got := fakeDB.lastArgs[0]; got != tc.actorAppUserID {
				t.Fatalf("expected actor %v, got %v", tc.actorAppUserID, got)
			}
		})
	}
}
