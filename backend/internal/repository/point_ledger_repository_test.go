package repository

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ledgerRowFunc func(...any) error

func (f ledgerRowFunc) Scan(dest ...any) error { return f(dest...) }

type ledgerFakeDB struct {
	queries []string
	args    [][]any
	rows    []pgx.Row
}

func (d *ledgerFakeDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}
func (d *ledgerFakeDB) QueryRow(_ context.Context, sql string, args ...any) pgx.Row {
	d.queries = append(d.queries, sql)
	d.args = append(d.args, args)
	row := d.rows[0]
	d.rows = d.rows[1:]
	return row
}

func TestPointLedgerValidation(t *testing.T) {
	r := NewPointLedgerRepository(&ledgerFakeDB{})
	valid := PointAwardInput{MemberID: 1, SourceType: "contribution", SourceKey: "7", RuleID: 2, RuleCode: "subtitle", RuleVersion: 1, RuleCategory: "fansub_work", RulePointValue: 10, EffectiveAt: time.Now(), IdempotencyKey: "award:7"}
	for name, mutate := range map[string]func(*PointAwardInput){
		"member": func(v *PointAwardInput) { v.MemberID = 0 }, "source": func(v *PointAwardInput) { v.SourceType = " " },
		"key": func(v *PointAwardInput) { v.IdempotencyKey = "" }, "rule": func(v *PointAwardInput) { v.RuleID = 0 },
		"version": func(v *PointAwardInput) { v.RuleVersion = 0 }, "value": func(v *PointAwardInput) { v.RulePointValue = 0 },
		"time": func(v *PointAwardInput) { v.EffectiveAt = time.Time{} },
	} {
		t.Run(name, func(t *testing.T) {
			in := valid
			mutate(&in)
			if _, err := r.InsertAward(context.Background(), in); !errors.Is(err, ErrValidation) {
				t.Fatalf("error = %v", err)
			}
		})
	}

	for name, in := range map[string]PointReversalInput{
		"original": {ActorAppUserID: 1, IdempotencyKey: "r", EffectiveAt: time.Now(), Reason: "x"},
		"actor":    {OriginalEntryID: 1, IdempotencyKey: "r", EffectiveAt: time.Now(), Reason: "x"},
		"key":      {OriginalEntryID: 1, ActorAppUserID: 1, EffectiveAt: time.Now(), Reason: "x"},
		"time":     {OriginalEntryID: 1, ActorAppUserID: 1, IdempotencyKey: "r", Reason: "x"},
		"reason":   {OriginalEntryID: 1, ActorAppUserID: 1, IdempotencyKey: "r", EffectiveAt: time.Now()},
	} {
		t.Run("reversal_"+name, func(t *testing.T) {
			if _, err := r.InsertReversal(context.Background(), in); !errors.Is(err, ErrValidation) {
				t.Fatalf("error = %v", err)
			}
		})
	}
}

func TestPointLedgerSQLContract(t *testing.T) {
	source, err := os.ReadFile("point_ledger_repository.go")
	if err != nil {
		t.Fatal(err)
	}
	s := strings.ToUpper(string(source))
	for _, required := range []string{"ON CONFLICT DO NOTHING", "INSERT INTO POINT_LEDGER_ENTRIES", "INSERT", "SELECT", "FOR UPDATE", "REVERSAL_OF_ENTRY_ID"} {
		if !strings.Contains(s, required) {
			t.Errorf("missing SQL contract %q", required)
		}
	}
	for _, forbidden := range []string{"UPDATE POINT_LEDGER_ENTRIES", "DELETE FROM POINT_LEDGER_ENTRIES"} {
		if strings.Contains(s, forbidden) {
			t.Errorf("forbidden SQL %q", forbidden)
		}
	}
}

func TestPointLedgerRetryComparison(t *testing.T) {
	effective := time.Date(2026, 7, 22, 12, 0, 0, 123456789, time.FixedZone("CEST", 2*60*60))
	storedEffective := postgresTimestamp(effective)
	input := PointAwardInput{MemberID: 1, ActorAppUserID: pointInt64Ptr(9), SourceType: "contribution", SourceKey: "7", RuleID: 2, RuleCode: "subtitle", RuleVersion: 1, RuleCategory: "fansub_work", RulePointValue: 10, EffectiveAt: effective, IdempotencyKey: "award:7"}
	existing := PointLedgerEntry{ID: 5, MemberID: 1, ActorAppUserID: pointInt64Ptr(9), SourceType: "contribution", SourceKey: "7", RuleID: 2, RuleCodeSnapshot: "subtitle", RuleVersionSnapshot: 1, RuleCategorySnapshot: "fansub_work", RulePointValueSnapshot: 10, PointValue: 10, EntryKind: "award", EffectiveAt: storedEffective, RecordedAt: storedEffective.Add(time.Second), IdempotencyKey: "award:7"}
	db := &ledgerFakeDB{rows: []pgx.Row{ledgerRowFunc(func(...any) error { return pgx.ErrNoRows }), ledgerEntryRow(existing)}}
	got, err := NewPointLedgerRepository(db).InsertAward(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != existing.ID {
		t.Fatalf("ID = %d", got.ID)
	}

	mismatch := existing
	mismatch.RuleCategorySnapshot = "platform_contribution"
	db = &ledgerFakeDB{rows: []pgx.Row{ledgerRowFunc(func(...any) error { return pgx.ErrNoRows }), ledgerEntryRow(mismatch)}}
	if _, err := NewPointLedgerRepository(db).InsertAward(context.Background(), input); !errors.Is(err, ErrConflict) {
		t.Fatalf("mismatch error = %v", err)
	}
}

func TestPointLedgerErrorMapping(t *testing.T) {
	input := PointReversalInput{OriginalEntryID: 99, ActorAppUserID: 1, IdempotencyKey: "reverse:99", EffectiveAt: time.Now(), Reason: "duplicate"}
	db := &ledgerFakeDB{rows: []pgx.Row{ledgerRowFunc(func(...any) error { return pgx.ErrNoRows }), ledgerRowFunc(func(...any) error { return pgx.ErrNoRows })}}
	_, err := NewPointLedgerRepository(db).InsertReversal(context.Background(), input)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v", err)
	}
}

func pointInt64Ptr(v int64) *int64 { return &v }

func ledgerEntryRow(entry PointLedgerEntry) pgx.Row {
	return ledgerRowFunc(func(dest ...any) error {
		values := []any{entry.ID, entry.MemberID, entry.ActorAppUserID, entry.FansubGroupID, entry.ReleaseVersionID, entry.SourceType, entry.SourceKey, entry.RuleID, entry.RuleCodeSnapshot, entry.RuleVersionSnapshot, entry.RuleCategorySnapshot, entry.RulePointValueSnapshot, entry.PointValue, entry.EntryKind, entry.ReversalOfEntryID, entry.ReversalReason, entry.EffectiveAt, entry.RecordedAt, entry.IdempotencyKey}
		for i, value := range values {
			switch out := dest[i].(type) {
			case *int64:
				*out = value.(int64)
			case **int64:
				*out = value.(*int64)
			case *int:
				*out = value.(int)
			case *string:
				*out = value.(string)
			case **string:
				*out = value.(*string)
			case *time.Time:
				*out = value.(time.Time)
			}
		}
		return nil
	})
}

func TestPointLedgerPostgresAwardRetryAndLostResponse(t *testing.T) {
	pool := openPointLedgerPostgres(t)
	r := NewPointLedgerRepository(pool)
	in := postgresAwardInput("award:retry")
	first, err := r.InsertAward(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	second, err := r.InsertAward(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != second.ID {
		t.Fatalf("retry IDs differ: %d != %d", first.ID, second.ID)
	}
	in.SourceKey = "changed"
	if _, err := r.InsertAward(context.Background(), in); !errors.Is(err, ErrConflict) {
		t.Fatalf("mismatch error = %v", err)
	}
}

func TestPointLedgerPostgresConcurrentAward(t *testing.T) {
	pool := openPointLedgerPostgres(t)
	r := NewPointLedgerRepository(pool)
	in := postgresAwardInput("award:concurrent")
	start := make(chan struct{})
	results := make(chan *PointLedgerEntry, 2)
	errs := make(chan error, 2)
	var ready sync.WaitGroup
	ready.Add(2)
	for range 2 {
		go func() {
			ready.Done()
			<-start
			got, err := r.InsertAward(context.Background(), in)
			results <- got
			errs <- err
		}()
	}
	ready.Wait()
	close(start)
	a, b := <-results, <-results
	if err := <-errs; err != nil {
		t.Fatal(err)
	}
	if err := <-errs; err != nil {
		t.Fatal(err)
	}
	if a.ID != b.ID {
		t.Fatalf("concurrent IDs differ: %d != %d", a.ID, b.ID)
	}
}

func TestPointLedgerPostgresReversalRetryConcurrentAndLostResponse(t *testing.T) {
	pool := openPointLedgerPostgres(t)
	r := NewPointLedgerRepository(pool)
	original, err := r.InsertAward(context.Background(), postgresAwardInput("award:reverse"))
	if err != nil {
		t.Fatal(err)
	}
	in := PointReversalInput{OriginalEntryID: original.ID, ActorAppUserID: 10, IdempotencyKey: "reverse:retry", EffectiveAt: time.Date(2026, 7, 22, 13, 0, 0, 987654321, time.UTC), Reason: "duplicate"}
	start := make(chan struct{})
	results := make(chan *PointLedgerEntry, 2)
	errs := make(chan error, 2)
	var ready sync.WaitGroup
	ready.Add(2)
	for range 2 {
		go func() {
			ready.Done()
			<-start
			got, err := r.InsertReversal(context.Background(), in)
			results <- got
			errs <- err
		}()
	}
	ready.Wait()
	close(start)
	a, b := <-results, <-results
	if err := <-errs; err != nil {
		t.Fatal(err)
	}
	if err := <-errs; err != nil {
		t.Fatal(err)
	}
	if a.ID != b.ID {
		t.Fatalf("reversal IDs differ: %d != %d", a.ID, b.ID)
	}
	in.Reason = "different"
	if _, err := r.InsertReversal(context.Background(), in); !errors.Is(err, ErrConflict) {
		t.Fatalf("mismatch error = %v", err)
	}
	if _, err := r.InsertReversal(context.Background(), PointReversalInput{OriginalEntryID: a.ID, ActorAppUserID: 10, IdempotencyKey: "reverse:again", EffectiveAt: in.EffectiveAt, Reason: "invalid"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("reversal-of-reversal error = %v", err)
	}
}

func TestPointLedgerPostgresRollback(t *testing.T) {
	pool := openPointLedgerPostgres(t)
	tx, err := pool.Begin(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := NewPointLedgerRepository(tx).InsertAward(context.Background(), postgresAwardInput("award:rollback")); err != nil {
		t.Fatal(err)
	}
	if err := tx.Rollback(context.Background()); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM point_ledger_entries WHERE idempotency_key='award:rollback'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("rollback left %d rows", count)
	}
}

func openPointLedgerPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase106Postgres(t)
	_, file, _, _ := runtime.Caller(0)
	testsupport.ApplySQLFile(t, pool, filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0131_member_point_foundation.up.sql"))
	if _, err := pool.Exec(context.Background(), `INSERT INTO members(id) VALUES (1); INSERT INTO app_users(id) VALUES (10); INSERT INTO fansub_groups(id) VALUES (20); INSERT INTO release_versions(id) VALUES (30); INSERT INTO point_rules(id, rule_code, rule_version, category, point_value) VALUES (101, 'release_work', 1, 'fansub_work', 10)`); err != nil {
		t.Fatal(err)
	}
	return pool
}

func postgresAwardInput(key string) PointAwardInput {
	return PointAwardInput{MemberID: 1, ActorAppUserID: pointInt64Ptr(10), FansubGroupID: pointInt64Ptr(20), ReleaseVersionID: pointInt64Ptr(30), SourceType: "release_version", SourceKey: "30", RuleID: 101, RuleCode: "release_work", RuleVersion: 1, RuleCategory: "fansub_work", RulePointValue: 10, EffectiveAt: time.Date(2026, 7, 22, 12, 0, 0, 123456789, time.UTC), IdempotencyKey: key}
}
