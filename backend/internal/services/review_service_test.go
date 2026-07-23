package services

import (
	"context"
	"errors"
	"path/filepath"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
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
		CREATE TABLE phase107_review_target_mutations (
			source_type TEXT NOT NULL,
			stable_key TEXT NOT NULL,
			source_revision BIGINT NOT NULL,
			decision TEXT NOT NULL,
			PRIMARY KEY (source_type, stable_key, source_revision)
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
		INSERT INTO point_rules(rule_code, rule_version, category, point_value)
		VALUES ('fixture.work', 1, 'fansub_work', 3);
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

type reviewFixtureAdapter struct {
	mu             sync.Mutex
	targets        map[string]ReviewTarget
	loadCalls      int
	applyCalls     int
	applyErr       error
	creditWork     bool
	reverseAwardID int64
	workActorID    int64
}

func (a *reviewFixtureAdapter) LoadForDecision(
	_ context.Context,
	_ repository.DBTX,
	ref ReviewTargetRef,
) (ReviewTarget, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.loadCalls++
	target, ok := a.targets[ref.StableKey]
	if !ok {
		return ReviewTarget{}, repository.ErrNotFound
	}
	return target, nil
}

func (a *reviewFixtureAdapter) ApplyDecision(
	ctx context.Context,
	db repository.DBTX,
	target ReviewTarget,
	decision ReviewDecision,
) error {
	a.mu.Lock()
	a.applyCalls++
	applyErr := a.applyErr
	creditWork := a.creditWork
	reverseAwardID := a.reverseAwardID
	workActorID := a.workActorID
	a.mu.Unlock()
	if applyErr != nil {
		return applyErr
	}
	if _, err := db.Exec(ctx, `
		INSERT INTO phase107_review_target_mutations(
			source_type, stable_key, source_revision, decision
		)
		VALUES ($1, $2, $3, $4)
	`, target.Ref.SourceType, target.Ref.StableKey, target.Revision, decision); err != nil {
		return err
	}
	now := time.Now().UTC()
	if creditWork {
		actorID := workActorID
		_, err := NewPointService(nil).CreditInTx(ctx, db, CreditCommand{
			MemberID:       *target.BeneficiaryMemberID,
			ActorAppUserID: &actorID,
			Source: SourceRef{
				RewardKind: RewardKindWork,
				Type:       "fixture_work",
				Key:        target.Ref.StableKey,
				Slot:       "work",
			},
			Rule:          RuleRef{Code: "fixture.work", Version: 1},
			FansubGroupID: &target.FansubGroupID,
			EffectiveAt:   now,
		})
		if err != nil {
			return err
		}
	}
	if reverseAwardID > 0 {
		_, err := NewPointService(nil).ReverseInTx(ctx, db, ReverseCommand{
			AwardEntryID:   reverseAwardID,
			ActorAppUserID: workActorID,
			Reason:         "review_override_reversal",
			EffectiveAt:    now,
		})
		return err
	}
	return nil
}

func (a *reviewFixtureAdapter) setTarget(target ReviewTarget) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.targets[target.Ref.StableKey] = target
}

type reviewPointFake struct {
	calls atomic.Int32
	err   error
}

func (p *reviewPointFake) CreditInTx(
	_ context.Context,
	_ repository.DBTX,
	_ CreditCommand,
) (*repository.PointLedgerEntry, error) {
	p.calls.Add(1)
	if p.err != nil {
		return nil, p.err
	}
	return &repository.PointLedgerEntry{ID: 901}, nil
}

func reviewID(value int64) *int64 {
	return &value
}

func reviewFixtureTarget(
	ref ReviewTargetRef,
	revision int64,
	submitterAppUserID *int64,
	beneficiaryMemberID *int64,
) ReviewTarget {
	return ReviewTarget{
		Ref:                 ref,
		Revision:            revision,
		ReviewKind:          repository.ReviewKindText,
		FansubGroupID:       21,
		SubmitterAppUserID:  submitterAppUserID,
		BeneficiaryMemberID: beneficiaryMemberID,
		Pending:             true,
	}
}

func assertPhase107TargetAttributionRejected(
	t *testing.T,
	actor permissions.Actor,
) {
	t.Helper()
	fx := openPhase107ReviewServicePostgres(t)
	validSubmitter := int64(12)
	validBeneficiary := int64(102)
	zero := int64(0)
	negative := int64(-1)
	cases := []struct {
		name        string
		submitter   *int64
		beneficiary *int64
	}{
		{name: "missing submitter", beneficiary: &validBeneficiary},
		{name: "zero submitter", submitter: &zero, beneficiary: &validBeneficiary},
		{name: "negative submitter", submitter: &negative, beneficiary: &validBeneficiary},
		{name: "missing beneficiary", submitter: &validSubmitter},
		{name: "zero beneficiary", submitter: &validSubmitter, beneficiary: &zero},
		{name: "negative beneficiary", submitter: &validSubmitter, beneficiary: &negative},
	}
	adapter := &reviewFixtureAdapter{targets: make(map[string]ReviewTarget)}
	points := &reviewPointFake{}
	service := NewReviewService(fx.pool, map[string]ReviewTargetAdapter{"fixture": adapter})
	service.points = points
	for index, testCase := range cases {
		ref := ReviewTargetRef{SourceType: "fixture", StableKey: "attribution-" + string(rune('a'+index))}
		adapter.setTarget(reviewFixtureTarget(ref, 1, testCase.submitter, testCase.beneficiary))
		_, err := service.Decide(context.Background(), ReviewDecisionCommand{
			Actor:    actor,
			Target:   ref,
			Decision: ReviewDecisionConfirm,
		})
		if !errors.Is(err, ErrReviewTargetAttributionInvalid) {
			t.Fatalf("%s: expected attribution error, got %v", testCase.name, err)
		}
	}
	if adapter.applyCalls != 0 {
		t.Fatalf("invalid attribution applied adapter %d times", adapter.applyCalls)
	}
	if points.calls.Load() != 0 {
		t.Fatalf("invalid attribution called PointService %d times", points.calls.Load())
	}
	for table, query := range map[string]string{
		"decisions": `SELECT COUNT(*) FROM review_decisions`,
		"mutations": `SELECT COUNT(*) FROM phase107_review_target_mutations`,
		"audit":     `SELECT COUNT(*) FROM review_audit_events`,
		"reasons":   `SELECT COUNT(*) FROM review_reason_texts`,
		"slots":     `SELECT COUNT(*) FROM review_credit_slots`,
		"ledger":    `SELECT COUNT(*) FROM point_ledger_entries`,
	} {
		if got := fx.count(t, query); got != 0 {
			t.Fatalf("invalid attribution persisted %s=%d", table, got)
		}
	}
}

func TestPhase107ReviewServiceRejectsOrdinaryDecisionWithoutTargetAttribution(t *testing.T) {
	assertPhase107TargetAttributionRejected(
		t,
		permissions.Actor{AppUserID: 11, Status: "active"},
	)
}

func TestPhase107ReviewServiceRejectsPlatformAdminDecisionWithoutTargetAttribution(t *testing.T) {
	assertPhase107TargetAttributionRejected(
		t,
		permissions.Actor{AppUserID: 16, Status: "active", IsPlatformAdmin: true},
	)
}

func TestPhase107ReviewServiceRejectValidationAndSelfReview(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	adapter := &reviewFixtureAdapter{targets: make(map[string]ReviewTarget)}
	service := NewReviewService(fx.pool, map[string]ReviewTargetAdapter{"fixture": adapter})
	ctx := context.Background()
	lead := permissions.Actor{AppUserID: 11, Status: "active"}
	submitter := int64(12)
	beneficiary := int64(102)

	validationCases := []struct {
		key      string
		category repository.ReviewRejectionCategory
		reason   string
		want     error
	}{
		{key: "missing-category", reason: "Konkreter Grund", want: ErrReviewRejectionCategoryRequired},
		{key: "missing-reason", category: "quality", want: ErrReviewRejectionReasonRequired},
		{key: "unicode-whitespace", category: "quality", reason: "\u2003\u00a0", want: ErrReviewRejectionReasonRequired},
	}
	for _, testCase := range validationCases {
		ref := ReviewTargetRef{SourceType: "fixture", StableKey: testCase.key}
		adapter.setTarget(reviewFixtureTarget(ref, 1, &submitter, &beneficiary))
		_, err := service.Decide(ctx, ReviewDecisionCommand{
			Actor:             lead,
			Target:            ref,
			Decision:          ReviewDecisionReject,
			RejectionCategory: testCase.category,
			RejectReason:      testCase.reason,
		})
		if !errors.Is(err, testCase.want) {
			t.Fatalf("%s: got %v", testCase.key, err)
		}
	}

	selfAppRef := ReviewTargetRef{SourceType: "fixture", StableKey: "self-app"}
	adapter.setTarget(reviewFixtureTarget(selfAppRef, 1, reviewID(11), &beneficiary))
	if _, err := service.Decide(ctx, ReviewDecisionCommand{
		Actor: lead, Target: selfAppRef, Decision: ReviewDecisionConfirm,
	}); !errors.Is(err, ErrReviewSelfReviewForbidden) {
		t.Fatalf("app-user self review: %v", err)
	}
	selfMemberRef := ReviewTargetRef{SourceType: "fixture", StableKey: "self-member"}
	adapter.setTarget(reviewFixtureTarget(selfMemberRef, 1, &submitter, reviewID(101)))
	if _, err := service.Decide(ctx, ReviewDecisionCommand{
		Actor: lead, Target: selfMemberRef, Decision: ReviewDecisionConfirm,
	}); !errors.Is(err, ErrReviewSelfReviewForbidden) {
		t.Fatalf("verified-member self review: %v", err)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_decisions`); got != 0 {
		t.Fatalf("invalid/self decisions persisted=%d", got)
	}
}

func TestPhase107ReviewServicePlatformAdminOverrideAndWorkCredits(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	adapter := &reviewFixtureAdapter{
		targets:     make(map[string]ReviewTarget),
		creditWork:  true,
		workActorID: 16,
	}
	service := NewReviewService(fx.pool, map[string]ReviewTargetAdapter{"fixture": adapter})
	ctx := context.Background()
	platform := permissions.Actor{AppUserID: 16, Status: "active", IsPlatformAdmin: true}
	beneficiary := int64(102)
	selfRef := ReviewTargetRef{SourceType: "fixture", StableKey: "platform-self"}
	adapter.setTarget(reviewFixtureTarget(selfRef, 1, reviewID(16), &beneficiary))

	if _, err := service.Decide(ctx, ReviewDecisionCommand{
		Actor: platform, Target: selfRef, Decision: ReviewDecisionConfirm,
	}); !errors.Is(err, ErrReviewSelfReviewForbidden) {
		t.Fatalf("platform self without override: %v", err)
	}
	if _, err := service.Decide(ctx, ReviewDecisionCommand{
		Actor:              platform,
		Target:             selfRef,
		Decision:           ReviewDecisionConfirm,
		SelfReviewOverride: true,
		OverrideReason:     "\u2003",
	}); !errors.Is(err, ErrReviewOverrideReasonRequired) {
		t.Fatalf("platform whitespace override: %v", err)
	}
	if _, err := service.Decide(ctx, ReviewDecisionCommand{
		Actor:              platform,
		Target:             selfRef,
		Decision:           ReviewDecisionConfirm,
		SelfReviewOverride: true,
		OverrideReason:     "Support-Entscheidung mit Vier-Augen-Ausnahme",
	}); err != nil {
		t.Fatal(err)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_credit_slots`); got != 0 {
		t.Fatalf("platform review slots=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM point_ledger_entries WHERE source_type='review_decision'`); got != 0 {
		t.Fatalf("platform review credits=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM point_ledger_entries WHERE source_type='fixture_work'`); got != 1 {
		t.Fatalf("adapter-owned work credits=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_reason_texts WHERE reason_kind='override'`); got != 1 {
		t.Fatalf("override reasons=%d", got)
	}
}

func TestPhase107ReviewServiceFirstDecisionWinsConcurrent(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	submitter := int64(12)
	beneficiary := int64(102)
	ref := ReviewTargetRef{SourceType: "fixture", StableKey: "concurrent"}
	adapter := &reviewFixtureAdapter{targets: map[string]ReviewTarget{
		ref.StableKey: reviewFixtureTarget(ref, 1, &submitter, &beneficiary),
	}}
	service := NewReviewService(fx.pool, map[string]ReviewTargetAdapter{"fixture": adapter})
	start := make(chan struct{})
	var ready sync.WaitGroup
	ready.Add(2)
	results := make(chan error, 2)
	commands := []ReviewDecisionCommand{
		{
			Actor:  permissions.Actor{AppUserID: 11, Status: "active"},
			Target: ref, Decision: ReviewDecisionConfirm,
		},
		{
			Actor:  permissions.Actor{AppUserID: 11, Status: "active"},
			Target: ref, Decision: ReviewDecisionReject,
			RejectionCategory: "quality", RejectReason: "Nicht ausreichend geprüft",
		},
	}
	for _, command := range commands {
		command := command
		go func() {
			ready.Done()
			<-start
			_, err := service.Decide(context.Background(), command)
			results <- err
		}()
	}
	ready.Wait()
	close(start)
	var successes, conflicts int
	for range commands {
		err := <-results
		if err == nil {
			successes++
		} else if errors.Is(err, ErrReviewAlreadyDecided) {
			conflicts++
		} else {
			t.Fatalf("unexpected concurrent result: %v", err)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("successes=%d conflicts=%d", successes, conflicts)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_decisions`); got != 1 {
		t.Fatalf("decisions=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM phase107_review_target_mutations`); got != 1 {
		t.Fatalf("adapter mutations=%d", got)
	}
}

func TestPhase107ReviewServiceCreditSlotsAcrossRevisionsAndIndependentSources(t *testing.T) {
	fx := openPhase107ReviewServicePostgres(t)
	submitter := int64(12)
	beneficiary := int64(102)
	ref := ReviewTargetRef{SourceType: "fixture", StableKey: "revisions"}
	otherRef := ReviewTargetRef{SourceType: "fixture", StableKey: "independent"}
	adapter := &reviewFixtureAdapter{targets: make(map[string]ReviewTarget)}
	service := NewReviewService(fx.pool, map[string]ReviewTargetAdapter{"fixture": adapter})
	lead := permissions.Actor{AppUserID: 11, Status: "active"}

	for revision := int64(1); revision <= 2; revision++ {
		adapter.setTarget(reviewFixtureTarget(ref, revision, &submitter, &beneficiary))
		if _, err := service.Decide(context.Background(), ReviewDecisionCommand{
			Actor: lead, Target: ref, Decision: ReviewDecisionReject,
			RejectionCategory: "quality", RejectReason: "Revision weiter überarbeiten",
		}); err != nil {
			t.Fatal(err)
		}
	}
	adapter.setTarget(reviewFixtureTarget(ref, 3, &submitter, &beneficiary))
	if _, err := service.Decide(context.Background(), ReviewDecisionCommand{
		Actor: lead, Target: ref, Decision: ReviewDecisionConfirm,
	}); err != nil {
		t.Fatal(err)
	}
	adapter.setTarget(reviewFixtureTarget(otherRef, 1, &submitter, &beneficiary))
	if _, err := service.Decide(context.Background(), ReviewDecisionCommand{
		Actor: lead, Target: otherRef, Decision: ReviewDecisionConfirm,
	}); err != nil {
		t.Fatal(err)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_decisions`); got != 4 {
		t.Fatalf("decisions=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM review_credit_slots`); got != 3 {
		t.Fatalf("credit slots=%d", got)
	}
	if got := fx.count(t, `SELECT COUNT(*) FROM point_ledger_entries WHERE source_type='review_decision'`); got != 3 {
		t.Fatalf("review awards=%d", got)
	}
}

func TestPhase107ReviewServiceDecisionRollback(t *testing.T) {
	tests := []struct {
		name    string
		prepare func(*testing.T, *reviewServicePostgresFixture, *ReviewService, *reviewFixtureAdapter)
	}{
		{
			name: "adapter",
			prepare: func(_ *testing.T, _ *reviewServicePostgresFixture, _ *ReviewService, adapter *reviewFixtureAdapter) {
				adapter.applyErr = errors.New("forced adapter failure")
			},
		},
		{
			name: "audit",
			prepare: func(t *testing.T, fx *reviewServicePostgresFixture, _ *ReviewService, _ *reviewFixtureAdapter) {
				if _, err := fx.pool.Exec(context.Background(), `
					CREATE FUNCTION phase107_reject_decision_audit() RETURNS trigger
					LANGUAGE plpgsql AS $$
					BEGIN RAISE EXCEPTION 'forced decision audit failure'; END;
					$$;
					CREATE TRIGGER phase107_reject_decision_audit
					BEFORE INSERT ON review_audit_events
					FOR EACH ROW EXECUTE FUNCTION phase107_reject_decision_audit();
				`); err != nil {
					t.Fatal(err)
				}
			},
		},
		{
			name: "points",
			prepare: func(_ *testing.T, _ *reviewServicePostgresFixture, service *ReviewService, _ *reviewFixtureAdapter) {
				service.points = &reviewPointFake{err: errors.New("forced points failure")}
			},
		},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			fx := openPhase107ReviewServicePostgres(t)
			submitter := int64(12)
			beneficiary := int64(102)
			ref := ReviewTargetRef{SourceType: "fixture", StableKey: "rollback-" + testCase.name}
			adapter := &reviewFixtureAdapter{targets: map[string]ReviewTarget{
				ref.StableKey: reviewFixtureTarget(ref, 1, &submitter, &beneficiary),
			}}
			service := NewReviewService(fx.pool, map[string]ReviewTargetAdapter{"fixture": adapter})
			testCase.prepare(t, fx, service, adapter)
			if _, err := service.Decide(context.Background(), ReviewDecisionCommand{
				Actor:  permissions.Actor{AppUserID: 11, Status: "active"},
				Target: ref, Decision: ReviewDecisionConfirm,
			}); err == nil {
				t.Fatal("expected rollback error")
			}
			for table, query := range map[string]string{
				"decisions": `SELECT COUNT(*) FROM review_decisions`,
				"mutations": `SELECT COUNT(*) FROM phase107_review_target_mutations`,
				"audit":     `SELECT COUNT(*) FROM review_audit_events`,
				"slots":     `SELECT COUNT(*) FROM review_credit_slots`,
				"ledger":    `SELECT COUNT(*) FROM point_ledger_entries`,
			} {
				if got := fx.count(t, query); got != 0 {
					t.Fatalf("%s survived rollback=%d", table, got)
				}
			}
		})
	}
}

var _ ReviewTargetAdapter = (*reviewFixtureAdapter)(nil)
var _ reviewPointCreditor = (*reviewPointFake)(nil)
var _ pgx.Tx = (*pointTestTx)(nil)
