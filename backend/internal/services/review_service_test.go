package services

import (
	"context"
	"errors"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"
)

func openPhase107ReviewServicePostgres(t *testing.T) *reviewServicePostgresFixture {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve review service test path")
	}
	testsupport.ApplySQLFile(
		t,
		pool,
		filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0134_review_foundation.up.sql"),
	)
	ctx := context.Background()
	if _, err := pool.Exec(ctx, `
		CREATE TABLE fansub_group_member_roles (
			fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			PRIMARY KEY (fansub_group_member_id, role)
		);
		INSERT INTO members(id) VALUES (101), (102), (103), (104), (105);
		INSERT INTO app_users(id, status) VALUES
			(11, 'active'), (12, 'active'), (13, 'active'), (14, 'active'), (15, 'active'),
			(16, 'active');
		INSERT INTO fansub_groups(id) VALUES (21), (22);
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status) VALUES
			(31, 21, 11, 101, 'active'),
			(32, 21, 12, 102, 'active'),
			(33, 22, 13, 103, 'active'),
			(34, 21, 14, 104, 'active'),
			(35, 21, 15, 105, 'disabled');
		INSERT INTO fansub_group_member_roles(fansub_group_member_id, role)
		VALUES (31, 'fansub_lead');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at) VALUES
			(201, 101, 11, 'verified', NOW()),
			(202, 102, 12, 'verified', NOW()),
			(203, 103, 13, 'verified', NOW()),
			(204, 104, 14, 'verified', NOW()),
			(205, 105, 15, 'verified', NOW());
	`); err != nil {
		t.Fatal(err)
	}
	return &reviewServicePostgresFixture{pool: pool}
}

type reviewServicePostgresFixture struct {
	pool *pgxpool.Pool
}

func (f *reviewServicePostgresFixture) count(t *testing.T, query string, args ...any) int {
	t.Helper()
	var count int
	if err := f.pool.QueryRow(context.Background(), query, args...).Scan(&count); err != nil {
		t.Fatal(err)
	}
	return count
}

func TestPhase107ReviewServiceGrantRevokeDelegationNoOpAudit(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	ctx := context.Background()
	service := NewReviewService(fx.pool, nil)
	lead := permissions.Actor{AppUserID: 11, Status: "active"}
	command := ReviewDelegationCommand{
		Actor:              lead,
		TargetMembershipID: 32,
		Action:             permissions.ActionReviewTextDecide,
	}

	if err := service.GrantDelegation(ctx, command); err != nil {
		t.Fatal(err)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM fansub_group_member_review_capabilities WHERE fansub_group_member_id=32`); got != 1 {
		t.Fatalf("grant rows=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_audit_events WHERE event_code='delegation.granted'`); got != 1 {
		t.Fatalf("grant audit rows=%d", got)
	}

	if err := service.GrantDelegation(ctx, command); err != nil {
		t.Fatal(err)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_audit_events WHERE event_code='delegation.granted'`); got != 1 {
		t.Fatalf("idempotent grant changed audit rows=%d", got)
	}

	if err := service.RevokeDelegation(ctx, command); err != nil {
		t.Fatal(err)
	}
	if err := service.RevokeDelegation(ctx, command); err != nil {
		t.Fatal(err)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_audit_events WHERE event_code='delegation.revoked'`); got != 1 {
		t.Fatalf("revoke/no-op audit rows=%d", got)
	}
}

func TestPhase107ReviewServiceDelegationCrossGroupAndDelegatedOnlyDenied(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	ctx := context.Background()
	service := NewReviewService(fx.pool, nil)

	cases := []ReviewDelegationCommand{
		{
			Actor:              permissions.Actor{AppUserID: 11, Status: "active"},
			TargetMembershipID: 33,
			Action:             permissions.ActionReviewTextDecide,
		},
		{
			Actor:              permissions.Actor{AppUserID: 14, Status: "active"},
			TargetMembershipID: 32,
			Action:             permissions.ActionReviewTextDecide,
		},
	}
	for _, command := range cases {
		if err := service.GrantDelegation(ctx, command); !errors.Is(err, ErrReviewCapabilityDenied) {
			t.Fatalf("expected capability denial, got %v", err)
		}
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM fansub_group_member_review_capabilities`); got != 0 {
		t.Fatalf("denied grants persisted rows=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_audit_events`); got != 0 {
		t.Fatalf("denied grants persisted audit rows=%d", got)
	}
}

func TestPhase107ReviewServicePlatformAdminDelegationAndInactiveTarget(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	ctx := context.Background()
	service := NewReviewService(fx.pool, nil)
	platform := permissions.Actor{AppUserID: 16, Status: "active", IsPlatformAdmin: true}

	if err := service.GrantDelegation(ctx, ReviewDelegationCommand{
		Actor:              platform,
		TargetMembershipID: 32,
		Action:             permissions.ActionReviewImageDecide,
	}); err != nil {
		t.Fatal(err)
	}
	if err := service.GrantDelegation(ctx, ReviewDelegationCommand{
		Actor:              platform,
		TargetMembershipID: 35,
		Action:             permissions.ActionReviewImageDecide,
	}); !errors.Is(err, ErrReviewDelegationTargetIneligible) {
		t.Fatalf("expected inactive target denial, got %v", err)
	}
	if err := service.RevokeDelegation(ctx, ReviewDelegationCommand{
		Actor:              platform,
		TargetMembershipID: 35,
		Action:             permissions.ActionReviewImageDecide,
	}); err != nil {
		t.Fatalf("inactive target revoke must remain allowed: %v", err)
	}
}

func TestPhase107ReviewServiceDelegationRollbackOnMandatoryAuditFailure(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	ctx := context.Background()
	if _, err := fx.pool.Exec(ctx, `
		CREATE FUNCTION phase107_reject_delegation_audit() RETURNS trigger
		LANGUAGE plpgsql AS $$
		BEGIN
			IF NEW.event_code = 'delegation.granted' THEN
				RAISE EXCEPTION 'forced audit failure';
			END IF;
			RETURN NEW;
		END;
		$$;
		CREATE TRIGGER phase107_reject_delegation_audit
		BEFORE INSERT ON review_audit_events
		FOR EACH ROW EXECUTE FUNCTION phase107_reject_delegation_audit();
	`); err != nil {
		t.Fatal(err)
	}
	service := NewReviewService(fx.pool, nil)
	err := service.GrantDelegation(ctx, ReviewDelegationCommand{
		Actor:              permissions.Actor{AppUserID: 11, Status: "active"},
		TargetMembershipID: 32,
		Action:             permissions.ActionReviewContributionDecide,
	})
	if err == nil {
		t.Fatal("expected mandatory audit failure")
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM fansub_group_member_review_capabilities`); got != 0 {
		t.Fatalf("grant survived audit rollback rows=%d", got)
	}
}
