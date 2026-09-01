package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type SubmitClaimInput struct {
	MemberID  int64
	AppUserID int64
	Note      string
}

func (r *MemberClaimsRepository) SubmitClaim(ctx context.Context, input SubmitClaimInput) (*MemberClaimRow, error) {
	if input.MemberID <= 0 || input.AppUserID <= 0 {
		return nil, fmt.Errorf("submit member claim: invalid ids")
	}

	// Gedenkprofile und bereits mit einem Team4s-Konto verknüpfte Mitglieder
	// können keinen neuen Identitätsanspruch erhalten.
	var profileStatus string
	var linkedUserID sql.NullInt64
	var hasVerifiedClaim bool
	if err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(m.profile_status, 'active'),
			m.user_id,
			EXISTS (
				SELECT 1
				FROM member_claims mc
				WHERE mc.member_id = m.id
				  AND mc.claim_status = 'verified'
			)
		FROM members m
		WHERE m.id = $1
	`, input.MemberID).Scan(&profileStatus, &linkedUserID, &hasVerifiedClaim); err != nil {
		return nil, fmt.Errorf("submit member claim: check profile_status: %w", err)
	}
	if linkedUserID.Valid || hasVerifiedClaim {
		return nil, &ClaimMutationError{
			Code:       "member_already_assigned",
			Message:    "Dieser Member-Eintrag ist bereits einem Team4s-Konto zugeordnet.",
			HTTPStatus: 409,
		}
	}
	if profileStatus == "memorial" {
		// denied-Audit schreiben (D-15). Fehlertolerant via _ = (blockiert den Fehler-Return nicht).
		// Action-Key "member_claim.memorial_blocked" als String-Literal (D-15-Stub-Erzwingung).
		_ = func() error {
			if r.auditLogRepo == nil {
				return nil
			}
			return r.auditLogRepo.Write(ctx, AuditLogEntry{
				ActorAppUserID: &input.AppUserID,
				EventType:      "member_claim.memorial_blocked",
				TargetType:     "member",
				TargetID:       &input.MemberID,
				Action:         "submit_claim",
				Outcome:        "denied",
			})
		}()
		return nil, &ClaimMutationError{
			Code:       "memorial_not_claimable",
			Message:    "Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden.",
			HTTPStatus: 409,
		}
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
