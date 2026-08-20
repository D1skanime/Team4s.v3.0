package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type phase136Row struct {
	values []any
	err    error
}

func (r phase136Row) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	for i, value := range r.values {
		switch target := dest[i].(type) {
		case *int64:
			*target = value.(int64)
		case *models.FansubGroupLinkType:
			*target = value.(models.FansubGroupLinkType)
		case **string:
			*target = value.(*string)
		case *string:
			*target = value.(string)
		case *time.Time:
			*target = value.(time.Time)
		default:
			panic("unsupported scan target")
		}
	}
	return nil
}

type phase136LinkTx struct {
	rows       []phase136Row
	queryCount int
	execCount  int
	execErr    error
	commitErr  error
	commits    int
	rollbacks  int
}

func (tx *phase136LinkTx) QueryRow(context.Context, string, ...any) pgx.Row {
	row := tx.rows[tx.queryCount]
	tx.queryCount++
	return row
}
func (tx *phase136LinkTx) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	tx.execCount++
	return pgconn.NewCommandTag("UPDATE 1"), tx.execErr
}
func (tx *phase136LinkTx) Commit(context.Context) error   { tx.commits++; return tx.commitErr }
func (tx *phase136LinkTx) Rollback(context.Context) error { tx.rollbacks++; return nil }

func phase136StoredLink(url string) phase136Row {
	return phase136Row{values: []any{int64(7), int64(41), models.FansubGroupLinkTypeWebsite, (*string)(nil), url, time.Unix(100, 0)}}
}
func phase136URLRow(value *string) phase136Row { return phase136Row{values: []any{value}} }
func phase136Repo(tx *phase136LinkTx) *FansubRepository {
	return &FansubRepository{beginGroupLinkTx: func(context.Context) (groupLinkTx, error) { return tx, nil }}
}
func phase136URLPatch(value string) models.FansubGroupLinkPatchInput {
	return models.FansubGroupLinkPatchInput{URL: models.OptionalString{Set: true, Value: &value}}
}

func TestPhase136UpdateGroupLinkScopedNotFound(t *testing.T) {
	tx := &phase136LinkTx{rows: []phase136Row{{err: pgx.ErrNoRows}}}
	item, changed, err := phase136Repo(tx).UpdateGroupLink(context.Background(), 41, 7, phase136URLPatch("https://new.example"))
	if !errors.Is(err, ErrNotFound) || item != nil || changed || tx.commits != 0 || tx.rollbacks != 1 {
		t.Fatalf("item=%v changed=%v err=%v commits=%d rollbacks=%d", item, changed, err, tx.commits, tx.rollbacks)
	}
}

func TestPhase136UpdateGroupLinkExactNoOp(t *testing.T) {
	tx := &phase136LinkTx{rows: []phase136Row{phase136StoredLink("https://same.example")}}
	item, changed, err := phase136Repo(tx).UpdateGroupLink(context.Background(), 41, 7, phase136URLPatch("  https://same.example  "))
	if err != nil || item == nil || changed || tx.queryCount != 1 || tx.execCount != 0 || tx.commits != 1 {
		t.Fatalf("item=%v changed=%v err=%v queries=%d exec=%d commits=%d", item, changed, err, tx.queryCount, tx.execCount, tx.commits)
	}
}

func TestPhase136UpdateGroupLinkChangedCommit(t *testing.T) {
	newURL := "https://new.example"
	tx := &phase136LinkTx{rows: []phase136Row{phase136StoredLink("https://old.example"), phase136StoredLink(newURL), phase136URLRow(&newURL), phase136URLRow(nil), phase136URLRow(nil)}}
	item, changed, err := phase136Repo(tx).UpdateGroupLink(context.Background(), 41, 7, phase136URLPatch(newURL))
	if err != nil || item == nil || !changed || tx.queryCount != 5 || tx.execCount != 1 || tx.commits != 1 {
		t.Fatalf("item=%v changed=%v err=%v queries=%d exec=%d commits=%d", item, changed, err, tx.queryCount, tx.execCount, tx.commits)
	}
}

func TestPhase136UpdateGroupLinkConflictRollback(t *testing.T) {
	conflict := &pgconn.PgError{Code: "23505"}
	tx := &phase136LinkTx{rows: []phase136Row{phase136StoredLink("https://old.example"), {err: conflict}}}
	item, changed, err := phase136Repo(tx).UpdateGroupLink(context.Background(), 41, 7, phase136URLPatch("https://new.example"))
	if !errors.Is(err, ErrConflict) || item != nil || changed || tx.commits != 0 || tx.rollbacks != 1 {
		t.Fatalf("item=%v changed=%v err=%v commits=%d rollbacks=%d", item, changed, err, tx.commits, tx.rollbacks)
	}
}

func TestPhase136UpdateGroupLinkLegacySyncRollback(t *testing.T) {
	newURL := "https://new.example"
	tx := &phase136LinkTx{rows: []phase136Row{phase136StoredLink("https://old.example"), phase136StoredLink(newURL), phase136URLRow(&newURL), phase136URLRow(nil), phase136URLRow(nil)}, execErr: errors.New("legacy sync failed")}
	item, changed, err := phase136Repo(tx).UpdateGroupLink(context.Background(), 41, 7, phase136URLPatch(newURL))
	if err == nil || item != nil || changed || tx.commits != 0 || tx.rollbacks != 1 {
		t.Fatalf("item=%v changed=%v err=%v commits=%d rollbacks=%d", item, changed, err, tx.commits, tx.rollbacks)
	}
}

func TestPhase136UpdateGroupLinkCommitFailureRollsBack(t *testing.T) {
	newURL := "https://new.example"
	tx := &phase136LinkTx{rows: []phase136Row{phase136StoredLink("https://old.example"), phase136StoredLink(newURL), phase136URLRow(&newURL), phase136URLRow(nil), phase136URLRow(nil)}, commitErr: errors.New("commit failed")}
	item, changed, err := phase136Repo(tx).UpdateGroupLink(context.Background(), 41, 7, phase136URLPatch(newURL))
	if err == nil || item != nil || changed || tx.commits != 1 || tx.rollbacks != 1 {
		t.Fatalf("item=%v changed=%v err=%v commits=%d rollbacks=%d", item, changed, err, tx.commits, tx.rollbacks)
	}
}
