package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type userIDLookupQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func resolveOptionalExistingUserID(
	ctx context.Context,
	querier userIDLookupQuerier,
	userID int64,
) (*int64, error) {
	if userID <= 0 {
		return nil, nil
	}

	var id int64
	if err := querier.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("resolve actor user %d: %w", userID, err)
	}

	return &id, nil
}
