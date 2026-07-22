package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/repository"
)

func validReverse() ReverseCommand {
	return ReverseCommand{AwardEntryID: 9, ActorAppUserID: 10, Reason: "duplicate", EffectiveAt: time.Date(2026, 7, 22, 13, 0, 0, 0, time.UTC)}
}
func originalAward() repository.PointLedgerEntry {
	return repository.PointLedgerEntry{ID: 9, MemberID: 42, SourceType: "release", SourceKey: "rv:17", RuleID: 3, RuleCodeSnapshot: "timing", RuleVersionSnapshot: 1, RuleCategorySnapshot: "fansub_work", RulePointValueSnapshot: 7, PointValue: 7, EntryKind: "award", EffectiveAt: time.Now(), RecordedAt: time.Now(), IdempotencyKey: "award"}
}
func reversalEntry(c ReverseCommand) repository.PointLedgerEntry {
	o := originalAward()
	id := o.ID
	reason := c.Reason
	actor := c.ActorAppUserID
	return repository.PointLedgerEntry{ID: 10, MemberID: o.MemberID, ActorAppUserID: &actor, SourceType: o.SourceType, SourceKey: o.SourceKey, RuleID: o.RuleID, RuleCodeSnapshot: o.RuleCodeSnapshot, RuleVersionSnapshot: o.RuleVersionSnapshot, RuleCategorySnapshot: o.RuleCategorySnapshot, RulePointValueSnapshot: o.RulePointValueSnapshot, PointValue: -o.PointValue, EntryKind: "reversal", ReversalOfEntryID: &id, ReversalReason: &reason, EffectiveAt: c.EffectiveAt, RecordedAt: time.Now(), IdempotencyKey: "v1|reversal|award:9"}
}

func TestPointServiceReverseValidation(t *testing.T) {
	for i, mutate := range []func(*ReverseCommand){func(c *ReverseCommand) { c.AwardEntryID = 0 }, func(c *ReverseCommand) { c.ActorAppUserID = 0 }, func(c *ReverseCommand) { c.Reason = " " }, func(c *ReverseCommand) { c.Reason = " x" }, func(c *ReverseCommand) { c.EffectiveAt = time.Time{} }} {
		c := validReverse()
		mutate(&c)
		if _, err := NewPointService(nil).ReverseInTx(context.Background(), &pointTestDB{}, c); !errors.Is(err, repository.ErrValidation) {
			t.Fatalf("case %d: %v", i, err)
		}
	}
}

func TestPointServiceReverseInTxRetryAndError(t *testing.T) {
	c := validReverse()
	o := originalAward()
	rev := reversalEntry(c)
	db := &pointTestDB{rows: []pgx.Row{ledgerRow(o), ledgerRow(o), ledgerRow(rev)}}
	got, err := NewPointService(nil).ReverseInTx(context.Background(), db, c)
	if err != nil {
		t.Fatal(err)
	}
	if got.PointValue != -7 || got.IdempotencyKey != "v1|reversal|award:9" {
		t.Fatalf("unexpected reversal: %+v", got)
	}
	bad := o
	bad.EntryKind = "reversal"
	db = &pointTestDB{rows: []pgx.Row{ledgerRow(bad)}}
	if _, err := NewPointService(nil).ReverseInTx(context.Background(), db, c); !errors.Is(err, repository.ErrValidation) {
		t.Fatalf("reversal of reversal: %v", err)
	}
	conflict := errors.New("wrapped conflict")
	db = &pointTestDB{rows: []pgx.Row{ledgerRow(o), ledgerRow(o), pointTestRow{scan: func(...any) error { return conflict }}}}
	if _, err := NewPointService(nil).ReverseInTx(context.Background(), db, c); !errors.Is(err, conflict) {
		t.Fatalf("error chain: %v", err)
	}
}

func TestPointServiceReverseStandaloneLifecycle(t *testing.T) {
	c := validReverse()
	o := originalAward()
	rev := reversalEntry(c)
	tx := &pointTestTx{}
	tx.rows = []pgx.Row{ledgerRow(o), ledgerRow(o), ledgerRow(rev)}
	st := &pointTestStarter{tx: tx}
	if _, err := NewPointService(st).Reverse(context.Background(), c); err != nil {
		t.Fatal(err)
	}
	if tx.commits != 1 || tx.rollbacks != 0 {
		t.Fatalf("lifecycle %+v", tx)
	}
	tx = &pointTestTx{}
	tx.rows = []pgx.Row{pointTestRow{scan: func(...any) error { return errors.New("lock") }}}
	st = &pointTestStarter{tx: tx}
	if _, err := NewPointService(st).Reverse(context.Background(), c); err == nil {
		t.Fatal("expected error")
	}
	if tx.commits != 0 || tx.rollbacks != 1 {
		t.Fatalf("lifecycle %+v", tx)
	}
}
