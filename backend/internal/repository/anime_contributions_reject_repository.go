package repository

// Ausgelagert aus anime_contributions_proposal_repository.go (450-Zeilen-Limit, Phase 76-02).
// Enthält RejectWithMemberReason — erweiterte Reject-Methode mit Pflicht-Begründung (D-09).

import (
	"context"
	"fmt"
)

// RejectWithMemberReason setzt den Status einer Contribution auf 'disputed',
// schreibt review_note und member_reason (Pflicht-Begründung D-09, Phase 76).
// Gibt ErrNotFound zurück wenn kein 'proposed' oder 'confirmed'-Eintrag mit der ID existiert.
func (r *AnimeContributionsRepository) RejectWithMemberReason(
	ctx context.Context,
	contributionID int64,
	actorAppUserID int64,
	reviewNote *string,
	memberReason *string,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE anime_contributions
		SET
			status = 'disputed',
			review_note = $2,
			member_reason = $3,
			updated_at = NOW()
		WHERE id = $1 AND (status = 'proposed' OR status = 'confirmed')
	`, contributionID, reviewNote, memberReason)
	if err != nil {
		return fmt.Errorf("vorschlag ablehnen mit begründung: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("vorschlag ablehnen mit begründung: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}
