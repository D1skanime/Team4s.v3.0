package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ClaimMutationError struct {
	Code       string
	Message    string
	HTTPStatus int
}

func (e *ClaimMutationError) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

func AsClaimMutationError(err error) (*ClaimMutationError, bool) {
	var target *ClaimMutationError
	if errors.As(err, &target) {
		return target, true
	}
	return nil, false
}

type MemberClaimsRepository struct {
	db *pgxpool.Pool
}

func NewMemberClaimsRepository(db *pgxpool.Pool) *MemberClaimsRepository {
	return &MemberClaimsRepository{db: db}
}

type MemberSearchResult struct {
	ID          int64  `json:"id"`
	Nickname    string `json:"nickname"`
	DisplayName string `json:"display_name"`
}

type MemberClaimRow struct {
	ID             int64          `json:"id"`
	AppUserID      int64          `json:"app_user_id"`
	MemberID       int64          `json:"member_id"`
	MemberNickname string         `json:"member_nickname"`
	ClaimStatus    string         `json:"claim_status"`
	Note           sql.NullString `json:"note"`
	CreatedAt      time.Time      `json:"created_at"`
}

type SubmitClaimInput struct {
	MemberID  int64
	AppUserID int64
	Note      string
}

func (r *MemberClaimsRepository) SearchHistoricalMembers(ctx context.Context, query string) ([]MemberSearchResult, error) {
	search := strings.TrimSpace(query)
	if len(search) < 2 {
		return []MemberSearchResult{}, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			m.id,
			COALESCE(NULLIF(m.nickname, ''), 'Mitglied') AS nickname,
			COALESCE(NULLIF(m.display_name, ''), '') AS display_name
		FROM members m
		WHERE m.nickname ILIKE $1
		  AND NOT EXISTS (
			SELECT 1
			FROM member_claims mc
			WHERE mc.member_id = m.id
			  AND mc.claim_status = 'verified'
		  )
		ORDER BY LOWER(COALESCE(NULLIF(m.nickname, ''), 'Mitglied')), m.id
		LIMIT 10
	`, "%"+search+"%")
	if err != nil {
		return nil, fmt.Errorf("search historical members: %w", err)
	}
	defer rows.Close()

	results := make([]MemberSearchResult, 0)
	for rows.Next() {
		var item MemberSearchResult
		if err := rows.Scan(&item.ID, &item.Nickname, &item.DisplayName); err != nil {
			return nil, fmt.Errorf("search historical members: scan: %w", err)
		}
		results = append(results, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("search historical members: iterate: %w", err)
	}
	return results, nil
}

func (r *MemberClaimsRepository) SubmitClaim(ctx context.Context, input SubmitClaimInput) (*MemberClaimRow, error) {
	if input.MemberID <= 0 || input.AppUserID <= 0 {
		return nil, fmt.Errorf("submit member claim: invalid ids")
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO member_claims (app_user_id, member_id, claim_status, note, created_at, updated_at)
		VALUES ($1, $2, 'pending', NULLIF($3, ''), NOW(), NOW())
		ON CONFLICT (member_id, app_user_id)
		DO UPDATE SET
			note = NULLIF(EXCLUDED.note, ''),
			claim_status = 'pending',
			updated_at = NOW()
		RETURNING id, app_user_id, member_id, claim_status, note, created_at
	`, input.AppUserID, input.MemberID, strings.TrimSpace(input.Note))

	claim, err := scanMemberClaim(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("submit member claim: %w", err)
	}
	return &claim, nil
}

func (r *MemberClaimsRepository) VerifyClaim(ctx context.Context, claimID int64, verifiedByAppUserID int64) error {
	if claimID <= 0 || verifiedByAppUserID <= 0 {
		return fmt.Errorf("verify member claim: invalid ids")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("verify member claim: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var memberID int64
	if err := tx.QueryRow(ctx, `
		SELECT member_id
		FROM member_claims
		WHERE id = $1
		FOR UPDATE
	`, claimID).Scan(&memberID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("verify member claim: lock claim: %w", err)
	}

	var alreadyVerified bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM member_claims
			WHERE member_id = $1
			  AND claim_status = 'verified'
		)
	`, memberID).Scan(&alreadyVerified); err != nil {
		return fmt.Errorf("verify member claim: check verified invariant: %w", err)
	}
	if alreadyVerified {
		return &ClaimMutationError{Code: "already_verified", Message: "Dieser Member-Eintrag ist bereits verifiziert.", HTTPStatus: 409}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE member_claims
		SET claim_status = 'verified',
			verified_by = $2,
			verified_at = NOW(),
			verification_method = 'manual_review',
			updated_at = NOW()
		WHERE id = $1
	`, claimID, verifiedByAppUserID); err != nil {
		return fmt.Errorf("verify member claim: update claim: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE members SET noindex = false, updated_at = NOW() WHERE id = $1
	`, memberID); err != nil {
		return fmt.Errorf("verify member claim: update member noindex: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("verify member claim: commit: %w", err)
	}
	return nil
}

func (r *MemberClaimsRepository) RejectClaim(ctx context.Context, claimID int64, verifiedByAppUserID int64) error {
	if claimID <= 0 || verifiedByAppUserID <= 0 {
		return fmt.Errorf("reject member claim: invalid ids")
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE member_claims
		SET claim_status = 'rejected',
			verified_by = $2,
			verified_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		  AND claim_status = 'pending'
	`, claimID, verifiedByAppUserID)
	if err != nil {
		return fmt.Errorf("reject member claim: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MemberClaimsRepository) ListPendingClaimsForGroup(ctx context.Context, fansubGroupID int64) ([]MemberClaimRow, error) {
	if fansubGroupID <= 0 {
		return nil, fmt.Errorf("list pending member claims: invalid fansub group id")
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			mc.id,
			COALESCE(mc.app_user_id, 0) AS app_user_id,
			mc.member_id,
			COALESCE(NULLIF(m.nickname, ''), 'Mitglied') AS member_nickname,
			mc.claim_status,
			mc.note,
			mc.created_at
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		JOIN hist_fansub_group_members hgm ON hgm.member_id = mc.member_id
		WHERE hgm.fansub_group_id = $1
		  AND mc.claim_status = 'pending'
		ORDER BY mc.created_at ASC, mc.id ASC
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list pending member claims: %w", err)
	}
	defer rows.Close()

	return scanMemberClaims(rows, "list pending member claims")
}

func (r *MemberClaimsRepository) GetMyClaim(ctx context.Context, appUserID int64) (*MemberClaimRow, error) {
	if appUserID <= 0 {
		return nil, ErrNotFound
	}

	row := r.db.QueryRow(ctx, `
		SELECT
			mc.id,
			COALESCE(mc.app_user_id, 0) AS app_user_id,
			mc.member_id,
			COALESCE(NULLIF(m.nickname, ''), 'Mitglied') AS member_nickname,
			mc.claim_status,
			mc.note,
			mc.created_at
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		WHERE mc.app_user_id = $1
		ORDER BY mc.created_at DESC, mc.id DESC
		LIMIT 1
	`, appUserID)

	claim, err := scanMemberClaimWithMember(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get my member claim: %w", err)
	}
	return &claim, nil
}

type memberClaimScanner interface {
	Scan(dest ...any) error
}

func scanMemberClaim(row memberClaimScanner) (MemberClaimRow, error) {
	var claim MemberClaimRow
	err := row.Scan(
		&claim.ID,
		&claim.AppUserID,
		&claim.MemberID,
		&claim.ClaimStatus,
		&claim.Note,
		&claim.CreatedAt,
	)
	return claim, err
}

func scanMemberClaimWithMember(row memberClaimScanner) (MemberClaimRow, error) {
	var claim MemberClaimRow
	err := row.Scan(
		&claim.ID,
		&claim.AppUserID,
		&claim.MemberID,
		&claim.MemberNickname,
		&claim.ClaimStatus,
		&claim.Note,
		&claim.CreatedAt,
	)
	return claim, err
}

func scanMemberClaims(rows pgx.Rows, contextLabel string) ([]MemberClaimRow, error) {
	items := make([]MemberClaimRow, 0)
	for rows.Next() {
		var claim MemberClaimRow
		if err := rows.Scan(
			&claim.ID,
			&claim.AppUserID,
			&claim.MemberID,
			&claim.MemberNickname,
			&claim.ClaimStatus,
			&claim.Note,
			&claim.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("%s: scan: %w", contextLabel, err)
		}
		items = append(items, claim)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: iterate: %w", contextLabel, err)
	}
	return items, nil
}
