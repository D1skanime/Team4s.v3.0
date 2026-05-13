package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
)

type fakeUserIDLookupQuerier struct {
	row fakeUserIDLookupRow
}

func (f fakeUserIDLookupQuerier) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return f.row
}

type fakeUserIDLookupRow struct {
	id  int64
	err error
}

func (f fakeUserIDLookupRow) Scan(dest ...any) error {
	if f.err != nil {
		return f.err
	}
	ptr, ok := dest[0].(*int64)
	if !ok {
		return errors.New("expected *int64 destination")
	}
	*ptr = f.id
	return nil
}

func TestResolveOptionalExistingUserID(t *testing.T) {
	t.Run("returns nil for non-positive ids", func(t *testing.T) {
		id, err := resolveOptionalExistingUserID(context.Background(), fakeUserIDLookupQuerier{}, 0)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if id != nil {
			t.Fatalf("expected nil id, got %v", *id)
		}
	})

	t.Run("returns nil for missing user rows", func(t *testing.T) {
		id, err := resolveOptionalExistingUserID(context.Background(), fakeUserIDLookupQuerier{
			row: fakeUserIDLookupRow{err: pgx.ErrNoRows},
		}, 1)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if id != nil {
			t.Fatalf("expected nil id, got %v", *id)
		}
	})

	t.Run("returns pointer for existing users", func(t *testing.T) {
		id, err := resolveOptionalExistingUserID(context.Background(), fakeUserIDLookupQuerier{
			row: fakeUserIDLookupRow{id: 7},
		}, 7)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if id == nil || *id != 7 {
			t.Fatalf("expected resolved id 7, got %v", id)
		}
	})
}
