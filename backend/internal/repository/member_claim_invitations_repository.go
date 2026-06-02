package repository

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MemberClaimInvitationRepository struct {
	db           *pgxpool.Pool
	appPublicURL string
}

func NewMemberClaimInvitationRepository(db *pgxpool.Pool, appPublicURL string) *MemberClaimInvitationRepository {
	return &MemberClaimInvitationRepository{db: db, appPublicURL: strings.TrimRight(strings.TrimSpace(appPublicURL), "/")}
}

type MemberClaimInvitationRow struct {
	ID            int64     `json:"id"`
	MemberID      int64     `json:"member_id"`
	FansubGroupID int64     `json:"fansub_group_id"`
	Status        string    `json:"status"`
	ExpiresAt     time.Time `json:"expires_at"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateInvitationResult struct {
	Invitation MemberClaimInvitationRow `json:"invitation"`
	InviteLink string                   `json:"invite_link"`
}

func (r *MemberClaimInvitationRepository) CreateInvitation(ctx context.Context, memberID int64, fansubGroupID int64, createdByAppUserID int64) (*CreateInvitationResult, error) {
	if memberID <= 0 || fansubGroupID <= 0 || createdByAppUserID <= 0 {
		return nil, fmt.Errorf("create member claim invitation: invalid ids")
	}
	var belongsToGroup bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM hist_fansub_group_members
			WHERE member_id = $1
			  AND fansub_group_id = $2
		)
	`, memberID, fansubGroupID).Scan(&belongsToGroup); err != nil {
		return nil, fmt.Errorf("create member claim invitation: check group membership: %w", err)
	}
	if !belongsToGroup {
		return nil, ErrNotFound
	}
	if err := r.expirePendingInvitations(ctx, memberID); err != nil {
		return nil, err
	}

	rawToken, tokenHash, err := generateClaimInvitationToken()
	if err != nil {
		return nil, fmt.Errorf("create member claim invitation: generate token: %w", err)
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO member_claim_invitations (
			member_id,
			fansub_group_id,
			token_hash,
			status,
			expires_at,
			created_by_app_user_id,
			created_at,
			updated_at
		)
		VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '7 days', $4, NOW(), NOW())
		RETURNING id, member_id, fansub_group_id, status, expires_at, created_at
	`, memberID, fansubGroupID, tokenHash, createdByAppUserID)

	invitation, err := scanMemberClaimInvitation(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, &ClaimMutationError{Code: "pending_invitation_exists", Message: "Es gibt bereits einen aktiven Einladungslink für diesen Member.", HTTPStatus: 409}
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create member claim invitation: %w", err)
	}

	return &CreateInvitationResult{
		Invitation: invitation,
		InviteLink: r.buildInviteLink(rawToken),
	}, nil
}

func (r *MemberClaimInvitationRepository) AcceptInvitation(ctx context.Context, tokenRaw string, acceptedByAppUserID int64) error {
	token := strings.TrimSpace(tokenRaw)
	if token == "" {
		return &ClaimMutationError{Code: "missing_token", Message: "Einladungs-Token fehlt.", HTTPStatus: 400}
	}
	if acceptedByAppUserID <= 0 {
		return fmt.Errorf("accept member claim invitation: invalid app user id")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("accept member claim invitation: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	invitation, err := scanMemberClaimInvitation(tx.QueryRow(ctx, `
		SELECT id, member_id, fansub_group_id, status, expires_at, created_at
		FROM member_claim_invitations
		WHERE token_hash = $1
		FOR UPDATE
	`, hashClaimInvitationToken(token)))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("accept member claim invitation: query invitation: %w", err)
	}

	if invitation.Status != "pending" {
		return mapTerminalClaimInvitationState(invitation.Status)
	}
	if !invitation.ExpiresAt.After(time.Now().UTC()) {
		if _, err := tx.Exec(ctx, `
			UPDATE member_claim_invitations
			SET status = 'expired', updated_at = NOW()
			WHERE id = $1
		`, invitation.ID); err != nil {
			return fmt.Errorf("accept member claim invitation: mark expired: %w", err)
		}
		return &ClaimMutationError{Code: "invitation_expired", Message: "Dieser Einladungslink ist abgelaufen.", HTTPStatus: 410}
	}

	var alreadyVerified bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM member_claims
			WHERE member_id = $1
			  AND claim_status = 'verified'
		)
	`, invitation.MemberID).Scan(&alreadyVerified); err != nil {
		return fmt.Errorf("accept member claim invitation: check verified invariant: %w", err)
	}
	if alreadyVerified {
		return &ClaimMutationError{Code: "already_verified", Message: "Dieser historische Member-Eintrag ist bereits einem Team4s-Account zugeordnet.", HTTPStatus: 409}
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO member_claims (
			app_user_id,
			member_id,
			claim_status,
			verification_method,
			verified_by,
			verified_at,
			created_at,
			updated_at
		)
		VALUES ($1, $2, 'verified', 'invite_link', $1, NOW(), NOW(), NOW())
		ON CONFLICT (member_id, app_user_id)
		DO UPDATE SET
			claim_status = 'verified',
			verification_method = 'invite_link',
			verified_by = $1,
			verified_at = NOW(),
			updated_at = NOW()
	`, acceptedByAppUserID, invitation.MemberID); err != nil {
		return fmt.Errorf("accept member claim invitation: upsert claim: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE members SET noindex = false, updated_at = NOW() WHERE id = $1
	`, invitation.MemberID); err != nil {
		return fmt.Errorf("accept member claim invitation: update member noindex: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE member_claim_invitations
		SET status = 'accepted',
			accepted_by_app_user_id = $2,
			accepted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, invitation.ID, acceptedByAppUserID); err != nil {
		return fmt.Errorf("accept member claim invitation: update invitation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("accept member claim invitation: commit: %w", err)
	}
	return nil
}

func (r *MemberClaimInvitationRepository) CancelInvitation(ctx context.Context, invitationID int64, memberID int64, fansubGroupID int64, cancelledByAppUserID int64) error {
	if invitationID <= 0 || memberID <= 0 || fansubGroupID <= 0 || cancelledByAppUserID <= 0 {
		return fmt.Errorf("cancel member claim invitation: invalid ids")
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE member_claim_invitations
		SET status = 'cancelled',
			cancelled_by_app_user_id = $2,
			cancelled_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		  AND member_id = $3
		  AND fansub_group_id = $4
		  AND status = 'pending'
	`, invitationID, cancelledByAppUserID, memberID, fansubGroupID)
	if err != nil {
		return fmt.Errorf("cancel member claim invitation: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MemberClaimInvitationRepository) ListInvitationsForMember(ctx context.Context, memberID int64) ([]MemberClaimInvitationRow, error) {
	if memberID <= 0 {
		return nil, fmt.Errorf("list member claim invitations: invalid member id")
	}
	if err := r.expirePendingInvitations(ctx, memberID); err != nil {
		return nil, err
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, member_id, fansub_group_id, status, expires_at, created_at
		FROM member_claim_invitations
		WHERE member_id = $1
		ORDER BY created_at DESC, id DESC
		LIMIT 10
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("list member claim invitations: %w", err)
	}
	defer rows.Close()

	items := make([]MemberClaimInvitationRow, 0)
	for rows.Next() {
		item, err := scanMemberClaimInvitation(rows)
		if err != nil {
			return nil, fmt.Errorf("list member claim invitations: scan: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list member claim invitations: iterate: %w", err)
	}
	return items, nil
}

func (r *MemberClaimInvitationRepository) expirePendingInvitations(ctx context.Context, memberID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE member_claim_invitations
		SET status = 'expired',
			updated_at = NOW()
		WHERE member_id = $1
		  AND status = 'pending'
		  AND expires_at <= NOW()
	`, memberID)
	if err != nil {
		return fmt.Errorf("expire pending member claim invitations: %w", err)
	}
	return nil
}

func (r *MemberClaimInvitationRepository) buildInviteLink(rawToken string) string {
	link := "/claim-invitations/accept?token=" + rawToken
	if r.appPublicURL == "" {
		return link
	}
	return r.appPublicURL + link
}

type memberClaimInvitationScanner interface {
	Scan(dest ...any) error
}

func scanMemberClaimInvitation(row memberClaimInvitationScanner) (MemberClaimInvitationRow, error) {
	var invitation MemberClaimInvitationRow
	err := row.Scan(
		&invitation.ID,
		&invitation.MemberID,
		&invitation.FansubGroupID,
		&invitation.Status,
		&invitation.ExpiresAt,
		&invitation.CreatedAt,
	)
	return invitation, err
}

func generateClaimInvitationToken() (string, string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", "", err
	}
	rawToken := base64.RawURLEncoding.EncodeToString(buffer)
	return rawToken, hashClaimInvitationToken(rawToken), nil
}

func hashClaimInvitationToken(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}

func mapTerminalClaimInvitationState(status string) error {
	switch strings.TrimSpace(status) {
	case "cancelled":
		return &ClaimMutationError{Code: "invitation_cancelled", Message: "Diese Einladung wurde bereits zurückgezogen.", HTTPStatus: 410}
	case "accepted":
		return &ClaimMutationError{Code: "invitation_used", Message: "Diese Einladung wurde bereits verwendet.", HTTPStatus: 409}
	case "expired":
		return &ClaimMutationError{Code: "invitation_expired", Message: "Dieser Einladungslink ist abgelaufen.", HTTPStatus: 410}
	default:
		return &ClaimMutationError{Code: "invalid_invitation_state", Message: "Diese Einladung kann nicht mehr verwendet werden.", HTTPStatus: 409}
	}
}
