package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
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
	db           *pgxpool.Pool
	auditLogRepo *AuditLogRepository
}

func NewMemberClaimsRepository(db *pgxpool.Pool) *MemberClaimsRepository {
	return &MemberClaimsRepository{db: db}
}

// WithAuditLog setzt den AuditLogRepository für denied-Audit-Einträge beim Claim-Block.
// Fehlertolerant — nil-safe.
func (r *MemberClaimsRepository) WithAuditLog(auditLog *AuditLogRepository) *MemberClaimsRepository {
	r.auditLogRepo = auditLog
	return r
}

type MemberSearchResult struct {
	ID          int64  `json:"id"`
	Nickname    string `json:"nickname"`
	DisplayName string `json:"display_name"`
}

type MemberClaimRow struct {
	ID             int64     `json:"id"`
	AppUserID      int64     `json:"app_user_id"`
	MemberID       int64     `json:"member_id"`
	MemberNickname string    `json:"member_nickname"`
	ClaimStatus    string    `json:"claim_status"`
	Note           *string   `json:"note"`
	CreatedAt      time.Time `json:"created_at"`
}

// PendingClaimAttentionRow is one pending self-service claim with the group context
// required for a leader's dashboard task. Authorization is intentionally not decided here.
type PendingClaimAttentionRow struct {
	ClaimID         int64     `json:"claim_id"`
	FansubGroupID   int64     `json:"fansub_group_id"`
	FansubGroupName string    `json:"fansub_group_name"`
	MemberNickname  string    `json:"member_nickname"`
	CreatedAt       time.Time `json:"created_at"`
}

// ListPendingClaimAttentionCandidates returns all open claims together with their
// group context. The dashboard handler filters this list through the central permission
// service so personal overrides and platform-admin access are respected.
func (r *MemberClaimsRepository) ListPendingClaimAttentionCandidates(ctx context.Context) ([]PendingClaimAttentionRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT
			mc.id,
			hgm.fansub_group_id,
			fg.name,
			COALESCE(NULLIF(m.nickname, ''), 'Mitglied') AS member_nickname,
			mc.created_at
		FROM member_claims mc
		JOIN members m ON m.id = mc.member_id
		JOIN hist_fansub_group_members hgm ON hgm.member_id = mc.member_id
		JOIN fansub_groups fg ON fg.id = hgm.fansub_group_id
		WHERE mc.claim_status = 'pending'
		ORDER BY mc.created_at ASC, mc.id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list pending claim attention candidates: %w", err)
	}
	defer rows.Close()

	items := make([]PendingClaimAttentionRow, 0)
	for rows.Next() {
		var item PendingClaimAttentionRow
		if err := rows.Scan(&item.ClaimID, &item.FansubGroupID, &item.FansubGroupName, &item.MemberNickname, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan pending claim attention candidate: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pending claim attention candidates: %w", err)
	}
	return items, nil
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
		  AND m.user_id IS NULL
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

func (r *MemberClaimsRepository) VerifyClaim(ctx context.Context, fansubGroupID int64, claimID int64, verifiedByAppUserID int64) error {
	if fansubGroupID <= 0 || claimID <= 0 || verifiedByAppUserID <= 0 {
		return fmt.Errorf("verify member claim: invalid ids")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("verify member claim: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var memberID int64
	if err := tx.QueryRow(ctx, `
		SELECT mc.member_id
		FROM member_claims mc
		JOIN hist_fansub_group_members hgm ON hgm.member_id = mc.member_id
		WHERE mc.id = $1
		  AND hgm.fansub_group_id = $2
		FOR UPDATE
	`, claimID, fansubGroupID).Scan(&memberID); err != nil {
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
		UPDATE members
		SET noindex = false,
			profile_visibility = 'public',
			updated_at = NOW()
		WHERE id = $1
	`, memberID); err != nil {
		return fmt.Errorf("verify member claim: update member noindex: %w", err)
	}

	// Verknüpfe den Member-Datensatz mit dem CLAIMENDEN App-User (nicht dem
	// bestätigenden Admin), damit die Domain-Projektion Profil-Link, Slug und
	// Mitgliederzählung für neu geclaimte Mitglieder auflösen kann. Ohne diesen
	// Schritt bliebe members.user_id NULL und die Verknüpfung dauerhaft fehlen.
	// Nur setzen, wenn noch nicht verknüpft (Legacy-Links nicht überschreiben).
	if _, err := tx.Exec(ctx, `
		UPDATE members m
		SET user_id = au.legacy_user_id, updated_at = NOW()
		FROM member_claims mc
		JOIN app_users au ON au.id = mc.app_user_id
		WHERE m.id = $1
		  AND mc.id = $2
		  AND mc.app_user_id IS NOT NULL
		  AND m.user_id IS NULL
	`, memberID, claimID); err != nil {
		return fmt.Errorf("verify member claim: link member to app user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("verify member claim: commit: %w", err)
	}
	if err := r.ResolvePendingRolesToActive(ctx, memberID, fansubGroupID, verifiedByAppUserID); err != nil {
		// Die Claim-Verifikation ist bereits committed. Rollen-Aktivierung ist ein
		// nachgelagerter Komfortpfad und darf den erfolgreichen Claim nicht kippen.
		log.Printf("verify member claim: resolve pending roles: %v", err)
	}
	return nil
}

func (r *MemberClaimsRepository) RejectClaim(ctx context.Context, fansubGroupID int64, claimID int64, verifiedByAppUserID int64) error {
	if fansubGroupID <= 0 || claimID <= 0 || verifiedByAppUserID <= 0 {
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
		  AND EXISTS (
			SELECT 1
			FROM hist_fansub_group_members hgm
			WHERE hgm.member_id = member_claims.member_id
			  AND hgm.fansub_group_id = $3
		  )
	`, claimID, verifiedByAppUserID, fansubGroupID)
	if err != nil {
		return fmt.Errorf("reject member claim: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type memberClaimScanner interface {
	Scan(dest ...any) error
}

func scanMemberClaim(row memberClaimScanner) (MemberClaimRow, error) {
	var claim MemberClaimRow
	var note sql.NullString
	err := row.Scan(
		&claim.ID,
		&claim.AppUserID,
		&claim.MemberID,
		&claim.ClaimStatus,
		&note,
		&claim.CreatedAt,
	)
	claim.Note = nullableStringPtr(note)
	return claim, err
}

func scanMemberClaimWithMember(row memberClaimScanner) (MemberClaimRow, error) {
	var claim MemberClaimRow
	var note sql.NullString
	err := row.Scan(
		&claim.ID,
		&claim.AppUserID,
		&claim.MemberID,
		&claim.MemberNickname,
		&claim.ClaimStatus,
		&note,
		&claim.CreatedAt,
	)
	claim.Note = nullableStringPtr(note)
	return claim, err
}

func scanMemberClaims(rows pgx.Rows, contextLabel string) ([]MemberClaimRow, error) {
	items := make([]MemberClaimRow, 0)
	for rows.Next() {
		var claim MemberClaimRow
		var note sql.NullString
		if err := rows.Scan(
			&claim.ID,
			&claim.AppUserID,
			&claim.MemberID,
			&claim.MemberNickname,
			&claim.ClaimStatus,
			&note,
			&claim.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("%s: scan: %w", contextLabel, err)
		}
		claim.Note = nullableStringPtr(note)
		items = append(items, claim)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("%s: iterate: %w", contextLabel, err)
	}
	return items, nil
}

func nullableStringPtr(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	return &value.String
}
