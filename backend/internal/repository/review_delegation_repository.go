package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// ReviewDelegationMembership is the server-resolved policy snapshot for one
// canonical fansub-group membership. Callers evaluate policy only after this
// row has been locked in their transaction.
type ReviewDelegationMembership struct {
	MembershipID           int64
	FansubGroupID          int64
	AppUserID              int64
	MemberID               *int64
	MembershipStatus       string
	AppUserStatus          string
	HasVerifiedMemberClaim bool
}

// ReviewDelegationRepository mutates direct review actions through a
// caller-owned DB or transaction. It never owns transaction lifecycle.
type ReviewDelegationRepository struct {
	db DBTX
}

func NewReviewDelegationRepository(db DBTX) *ReviewDelegationRepository {
	return &ReviewDelegationRepository{db: db}
}

func (r *ReviewDelegationRepository) WithDB(db DBTX) *ReviewDelegationRepository {
	return NewReviewDelegationRepository(db)
}

// LockMembership locks exactly the addressed membership and returns every
// snapshot needed by the service policy. The verified claim must match both
// the membership's app user and its member anchor.
func (r *ReviewDelegationRepository) LockMembership(
	ctx context.Context,
	fansubGroupMemberID int64,
) (*ReviewDelegationMembership, error) {
	if r == nil || r.db == nil || fansubGroupMemberID <= 0 {
		return nil, fmt.Errorf("lock review delegation membership: %w", ErrValidation)
	}

	var membership ReviewDelegationMembership
	err := r.db.QueryRow(ctx, `
		SELECT
			fgm.id,
			fgm.fansub_group_id,
			fgm.app_user_id,
			fgm.member_id,
			fgm.status,
			au.status,
			EXISTS (
				SELECT 1
				FROM member_claims mc
				WHERE mc.app_user_id = fgm.app_user_id
				  AND mc.member_id = fgm.member_id
				  AND mc.claim_status = 'verified'
			)
		FROM fansub_group_members fgm
		JOIN app_users au ON au.id = fgm.app_user_id
		WHERE fgm.id = $1
		FOR UPDATE OF fgm
	`, fansubGroupMemberID).Scan(
		&membership.MembershipID,
		&membership.FansubGroupID,
		&membership.AppUserID,
		&membership.MemberID,
		&membership.MembershipStatus,
		&membership.AppUserStatus,
		&membership.HasVerifiedMemberClaim,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("review delegation membership %d: %w", fansubGroupMemberID, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("lock review delegation membership %d: %w", fansubGroupMemberID, err)
	}
	return &membership, nil
}

// GrantAction adds one exact direct review action. The active grant table uses
// its schema-owned created_at timestamp; actor attribution is written by the
// caller to immutable review audit in the same transaction.
func (r *ReviewDelegationRepository) GrantAction(
	ctx context.Context,
	fansubGroupMemberID int64,
	actionCode string,
) (bool, error) {
	actionCode = strings.TrimSpace(actionCode)
	if r == nil || r.db == nil || fansubGroupMemberID <= 0 || actionCode == "" {
		return false, fmt.Errorf("grant review action: %w", ErrValidation)
	}

	tag, err := r.db.Exec(ctx, `
		INSERT INTO fansub_group_member_review_capabilities (
			fansub_group_member_id,
			action_code
		)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, fansubGroupMemberID, actionCode)
	if err != nil {
		return false, fmt.Errorf(
			"grant review action (membership=%d, action=%q): %w",
			fansubGroupMemberID,
			actionCode,
			err,
		)
	}
	return tag.RowsAffected() == 1, nil
}

// RevokeAction removes only one exact active grant. Decisions, audit events,
// reasons, credits, and ledger history are not addressed by this mutation.
func (r *ReviewDelegationRepository) RevokeAction(
	ctx context.Context,
	fansubGroupMemberID int64,
	actionCode string,
) (bool, error) {
	actionCode = strings.TrimSpace(actionCode)
	if r == nil || r.db == nil || fansubGroupMemberID <= 0 || actionCode == "" {
		return false, fmt.Errorf("revoke review action: %w", ErrValidation)
	}

	tag, err := r.db.Exec(ctx, `
		DELETE FROM fansub_group_member_review_capabilities
		WHERE fansub_group_member_id = $1
		  AND action_code = $2
	`, fansubGroupMemberID, actionCode)
	if err != nil {
		return false, fmt.Errorf(
			"revoke review action (membership=%d, action=%q): %w",
			fansubGroupMemberID,
			actionCode,
			err,
		)
	}
	return tag.RowsAffected() == 1, nil
}
