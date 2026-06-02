package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MemberRequestsRepository struct {
	db *pgxpool.Pool
}

func NewMemberRequestsRepository(db *pgxpool.Pool) *MemberRequestsRepository {
	return &MemberRequestsRepository{db: db}
}

type MemberRequestRow struct {
	ID          int64     `json:"id"`
	AppUserID   int64     `json:"app_user_id"`
	ClaimStatus string    `json:"claim_status"`
	Note        *string   `json:"note,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (r *MemberRequestsRepository) SubmitRequest(ctx context.Context, appUserID int64, note string) (*MemberRequestRow, error) {
	if appUserID <= 0 {
		return nil, fmt.Errorf("submit member request: invalid app user id")
	}

	row := r.db.QueryRow(ctx, `
		WITH existing AS (
			SELECT id, app_user_id, claim_status, note, created_at
			FROM member_claims
			WHERE app_user_id = $1
			  AND member_id IS NULL
			  AND claim_status = 'pending'
			ORDER BY created_at DESC, id DESC
			LIMIT 1
		),
		inserted AS (
			INSERT INTO member_claims (app_user_id, member_id, claim_status, note, created_at, updated_at)
			SELECT $1, NULL, 'pending', NULLIF($2, ''), NOW(), NOW()
			WHERE NOT EXISTS (SELECT 1 FROM existing)
			RETURNING id, app_user_id, claim_status, note, created_at
		)
		SELECT id, app_user_id, claim_status, note, created_at FROM inserted
		UNION ALL
		SELECT id, app_user_id, claim_status, note, created_at FROM existing
		LIMIT 1
	`, appUserID, strings.TrimSpace(note))

	request, err := scanMemberRequest(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("submit member request: %w", err)
	}
	return &request, nil
}

func (r *MemberRequestsRepository) ListPendingRequests(ctx context.Context) ([]MemberRequestRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, COALESCE(app_user_id, 0), claim_status, note, created_at
		FROM member_claims
		WHERE member_id IS NULL
		  AND claim_status = 'pending'
		ORDER BY created_at ASC, id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list member requests: %w", err)
	}
	defer rows.Close()

	items := make([]MemberRequestRow, 0)
	for rows.Next() {
		item, err := scanMemberRequest(rows)
		if err != nil {
			return nil, fmt.Errorf("list member requests: scan: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list member requests: iterate: %w", err)
	}
	return items, nil
}

func (r *MemberRequestsRepository) ApproveRequest(ctx context.Context, requestID int64, adminUserID int64, nickname string) error {
	nick := strings.TrimSpace(nickname)
	if requestID <= 0 || adminUserID <= 0 || nick == "" {
		return fmt.Errorf("approve member request: invalid input")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("approve member request: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var appUserID int64
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(app_user_id, 0)
		FROM member_claims
		WHERE id = $1
		  AND member_id IS NULL
		  AND claim_status = 'pending'
		FOR UPDATE
	`, requestID).Scan(&appUserID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("approve member request: lock request: %w", err)
	}
	if appUserID <= 0 {
		return ErrNotFound
	}

	var memberID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO members (nickname, display_name, noindex, updated_at)
		VALUES ($1, $1, false, NOW())
		RETURNING id
	`, nick).Scan(&memberID); err != nil {
		return fmt.Errorf("approve member request: create member: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE member_claims
		SET member_id = $2,
			claim_status = 'verified',
			verification_method = 'admin_created',
			verified_by = $3,
			verified_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, requestID, memberID, adminUserID); err != nil {
		return fmt.Errorf("approve member request: update request: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("approve member request: commit: %w", err)
	}
	return nil
}

func (r *MemberRequestsRepository) RejectRequest(ctx context.Context, requestID int64, adminUserID int64) error {
	if requestID <= 0 || adminUserID <= 0 {
		return fmt.Errorf("reject member request: invalid ids")
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE member_claims
		SET claim_status = 'rejected',
			verified_by = $2,
			verified_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		  AND member_id IS NULL
		  AND claim_status = 'pending'
	`, requestID, adminUserID)
	if err != nil {
		return fmt.Errorf("reject member request: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type memberRequestScanner interface {
	Scan(dest ...any) error
}

func scanMemberRequest(row memberRequestScanner) (MemberRequestRow, error) {
	var item MemberRequestRow
	if err := row.Scan(&item.ID, &item.AppUserID, &item.ClaimStatus, &item.Note, &item.CreatedAt); err != nil {
		return item, err
	}
	return item, nil
}
