package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type groupLinkTx interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
	Commit(context.Context) error
	Rollback(context.Context) error
}

type FansubRepository struct {
	db               *pgxpool.Pool
	mediaStorageDir  string
	beginGroupLinkTx func(context.Context) (groupLinkTx, error)
}

func NewFansubRepository(db *pgxpool.Pool, mediaStorageDir ...string) *FansubRepository {
	storageDir := ""
	if len(mediaStorageDir) > 0 {
		storageDir = mediaStorageDir[0]
	}
	return &FansubRepository{
		db:              db,
		mediaStorageDir: storageDir,
		beginGroupLinkTx: func(ctx context.Context) (groupLinkTx, error) {
			return db.BeginTx(ctx, pgx.TxOptions{})
		},
	}
}

