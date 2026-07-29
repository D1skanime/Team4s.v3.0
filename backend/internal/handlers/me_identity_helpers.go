package handlers

import (
	"context"
	"errors"

	"team4s.v3/backend/internal/repository"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// resolveVerifiedMemberIDForAppUser ermittelt die member_id des eingeloggten App-Users
// über member_claims. Dies ist der gemeinsame Ownership-Gate-Seam fuer ALLE /me/*-Handler,
// die einen verifizierten Member-Bezug brauchen (D-08, Plan 116-02) -- memberID kommt
// NIEMALS aus einem Query-/Body-/Path-Parameter, ausschliesslich aus der
// bearer-token-abgeleiteten identity.AppUserID (T-116-02-01). Gibt repository.ErrNotFound
// zurück, wenn kein verifizierter Claim vorhanden ist.
//
// Extrahiert aus ContributionsMeHandler.resolveVerifiedMemberID (unveränderte SQL/Logik) --
// ContributionsMeHandler.resolveVerifiedMemberID delegiert seither hierher, damit beide
// Handler exakt denselben Ownership-Gate-Code teilen statt ihn zu duplizieren.
func resolveVerifiedMemberIDForAppUser(ctx context.Context, db *pgxpool.Pool, appUserID int64) (int64, error) {
	var memberID int64
	err := db.QueryRow(ctx, `
		SELECT member_id FROM member_claims
		WHERE app_user_id = $1 AND claim_status = 'verified'
		ORDER BY verified_at DESC
		LIMIT 1
	`, appUserID).Scan(&memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, repository.ErrNotFound
		}
		return 0, err
	}
	return memberID, nil
}
