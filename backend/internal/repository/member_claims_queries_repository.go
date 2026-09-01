package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

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

func (r *MemberClaimsRepository) UpdateNoindex(ctx context.Context, appUserID int64, noindex bool) error {
	if appUserID <= 0 {
		return ErrNotFound
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE members
		SET noindex = $1,
			updated_at = NOW()
		WHERE id = (
			SELECT member_id
			FROM member_claims
			WHERE app_user_id = $2
			  AND claim_status = 'verified'
			ORDER BY verified_at DESC
			LIMIT 1
		)
	`, noindex, appUserID)
	if err != nil {
		return fmt.Errorf("update member profile noindex: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
