package repository

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type pointRuleRow struct {
	values []any
	err    error
}

func (r pointRuleRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	for i := range dest {
		reflect.ValueOf(dest[i]).Elem().Set(reflect.ValueOf(r.values[i]))
	}
	return nil
}

type pointRuleDB struct {
	sql  string
	args []any
	row  pgx.Row
}

func (d *pointRuleDB) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}
func (d *pointRuleDB) QueryRow(_ context.Context, sql string, args ...any) pgx.Row {
	d.sql, d.args = sql, args
	return d.row
}

func TestPointRulesValidationBoundary(t *testing.T) {
	r := NewPointRulesRepository(&pointRuleDB{})
	for _, tc := range []struct {
		code    string
		version int
	}{{"", 1}, {"  ", 1}, {"work", 0}, {"work", -1}} {
		if _, err := r.GetByRef(context.Background(), tc.code, tc.version); !errors.Is(err, ErrValidation) {
			t.Fatalf("GetByRef(%q,%d) error = %v", tc.code, tc.version, err)
		}
	}
}

func TestPointRulesExactRef(t *testing.T) {
	created := time.Date(2026, 7, 22, 12, 0, 0, 0, time.UTC)
	db := &pointRuleDB{row: pointRuleRow{values: []any{int64(7), "release_subtitle", 3, "fansub_work", 15, created}}}
	rule, err := NewPointRulesRepository(db).GetByRef(context.Background(), "release_subtitle", 3)
	if err != nil {
		t.Fatal(err)
	}
	if rule.ID != 7 || rule.Code != "release_subtitle" || rule.Version != 3 || rule.Category != "fansub_work" || rule.PointValue != 15 || !rule.CreatedAt.Equal(created) {
		t.Fatalf("unexpected rule: %+v", rule)
	}
	if !strings.Contains(db.sql, "rule_code = $1") || !strings.Contains(db.sql, "rule_version = $2") || strings.Contains(strings.ToUpper(db.sql), "ORDER BY") {
		t.Fatalf("query is not exact ref lookup: %s", db.sql)
	}
	if !reflect.DeepEqual(db.args, []any{"release_subtitle", 3}) {
		t.Fatalf("args = %#v", db.args)
	}
}

func TestPointRulesNotFound(t *testing.T) {
	db := &pointRuleDB{row: pointRuleRow{err: pgx.ErrNoRows}}
	_, err := NewPointRulesRepository(db).GetByRef(context.Background(), "missing", 1)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v", err)
	}
}

func TestPointRulesBoundaryReadOnlyAPI(t *testing.T) {
	typeOf := reflect.TypeOf((*PointRulesRepository)(nil))
	for _, forbidden := range []string{"Latest", "Active", "Schedule", "Update", "Delete", "Upsert"} {
		if _, ok := typeOf.MethodByName(forbidden); ok {
			t.Fatalf("forbidden method %s exists", forbidden)
		}
	}
}
