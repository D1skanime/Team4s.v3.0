package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// ActivateClaimedMember uebernimmt ein verifiziert-geclaimtes historisches Mitglied als
// AKTIVES Gruppenmitglied (fansub_group_members + Rollen). Leader-Override (#26/D-16): funktioniert
// auch fuer BEENDETE historische Rollen -- anders als die automatische Aktivierung beim Claim
// (ResolvePendingRolesToActive), die nur offene Rollen (ended_date IS NULL) uebernimmt. Governance-
// Rollen (fansub_lead/founder) werden NICHT automatisch uebernommen (bewusst manuell zuweisen).
func (r *MemberClaimsRepository) ActivateClaimedMember(ctx context.Context, fansubGroupID int64, memberID int64, actorAppUserID int64) error {
	if fansubGroupID <= 0 || memberID <= 0 || actorAppUserID <= 0 {
		return fmt.Errorf("activate claimed member: invalid ids")
	}

	// 1) Der App-User, der dieses historische Mitglied verifiziert geclaimt hat.
	var appUserID int64
	if err := r.db.QueryRow(ctx, `
		SELECT mc.app_user_id
		FROM member_claims mc
		JOIN hist_fansub_group_members hgm ON hgm.member_id = mc.member_id
		WHERE mc.member_id = $1
		  AND hgm.fansub_group_id = $2
		  AND mc.claim_status = 'verified'
		  AND mc.app_user_id IS NOT NULL
		LIMIT 1
	`, memberID, fansubGroupID).Scan(&appUserID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("activate claimed member: find claim app user: %w", err)
	}

	// 2) Uebernehmbare Rollen aus der Historie (auch beendete), ohne Governance-Rollen.
	roleCodes, err := r.collectActivatableHistoricalRoles(ctx, memberID, fansubGroupID)
	if err != nil {
		return err
	}
	if len(roleCodes) == 0 {
		return &ClaimMutationError{
			Code:       "no_activatable_roles",
			Message:    "Keine übernehmbaren Rollen dokumentiert (nur Leitungsrollen) — bitte manuell zuweisen.",
			HTTPStatus: 422,
		}
	}

	// 3) Aktive Mitgliedschaft + Rollen anlegen (Wiederverwendung des Invite-Accept-Pfads).
	appMemberRepo := NewFansubGroupAppMemberRepository(r.db)
	if _, err := appMemberRepo.EnsureInvitationAcceptance(ctx, fansubGroupID, appUserID, roleCodes, &actorAppUserID); err != nil {
		if errors.Is(err, ErrConflict) {
			return &ClaimMutationError{Code: "already_active", Message: "Diese Person ist bereits aktives Mitglied.", HTTPStatus: 409}
		}
		return fmt.Errorf("activate claimed member: ensure membership: %w", err)
	}
	return nil
}

func (r *MemberClaimsRepository) collectActivatableHistoricalRoles(ctx context.Context, memberID int64, fansubGroupID int64) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT r.role_code
		FROM hist_group_member_roles r
		JOIN hist_fansub_group_members hgm ON hgm.id = r.hist_fansub_group_member_id
		WHERE hgm.member_id = $1
		  AND hgm.fansub_group_id = $2
		  AND r.role_code NOT IN ('fansub_lead', 'founder')
		ORDER BY r.role_code
	`, memberID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("activate claimed member: list roles: %w", err)
	}
	defer rows.Close()
	roleCodes := make([]string, 0)
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, fmt.Errorf("activate claimed member: scan role: %w", err)
		}
		roleCodes = append(roleCodes, code)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("activate claimed member: iterate roles: %w", err)
	}
	return roleCodes, nil
}
