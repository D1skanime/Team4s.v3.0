package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// assertMemberClaimable prüft, ob ein Member-Profil beansprucht werden darf.
// Gibt einen ClaimMutationError mit Code "memorial_not_claimable" und HTTP 409
// zurück, wenn das Profil als Gedenkprofil geführt wird (D-17/Fallstrick 3).
// Wird von SubmitClaim (MemberClaimsRepository) und AcceptInvitation
// (MemberClaimInvitationRepository) aufgerufen — beide Claim-Pfade (Fallstrick 3).
func assertMemberClaimable(ctx context.Context, db *pgxpool.Pool, memberID int64) error {
	var profileStatus string
	err := db.QueryRow(ctx, `
		SELECT COALESCE(profile_status, 'active')
		FROM members
		WHERE id = $1
	`, memberID).Scan(&profileStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("assert member claimable (id=%d): %w", memberID, err)
	}

	if profileStatus == "memorial" {
		return &ClaimMutationError{
			Code:       "memorial_not_claimable",
			Message:    "Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden.",
			HTTPStatus: 409,
		}
	}
	return nil
}
