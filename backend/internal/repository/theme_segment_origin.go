package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

// SetThemeSegmentOrigin setzt oder korrigiert die administrativ korrigierbare
// origin_release_version_id eines Kara-Segments (Phase 156, Workstream C). Die
// Ziel-Release-Version MUSS dem Segment bereits ueber theme_segment_assignments
// zugewiesen sein -- diese Pruefung laeuft als expliziter SELECT EXISTS VOR dem
// UPDATE, weil die FK auf origin_release_version_id nur die Existenz der
// Release-Version generell sicherstellt, nicht ihre Zuweisung zu GENAU diesem
// Segment (156-CONTEXT.md: "die Ziel-Release-Version muss dem Segment
// tatsaechlich zugewiesen sein"). Ein nicht zugewiesenes Ziel wird mit
// ErrConflict abgelehnt -- nicht still uebernommen, nicht geklemmt (P156-06,
// T-156-02). segmentID/releaseVersionID<=0 sowie ein nicht existierendes
// Segment liefern ErrNotFound.
//
// Reihenfolge (bewusst abweichend von einer reinen "Membership zuerst"-Pruefung):
// zuerst wird geprueft, ob das Segment ueberhaupt existiert (ErrNotFound), DANACH
// die Zuweisungs-Mitgliedschaft (ErrConflict). Eine nicht existierende segmentID
// kann per FK NIEMALS eine theme_segment_assignments-Zeile besitzen -- ein reiner
// Membership-Check zuerst wuerde einen fehlenden Segment daher IMMER als
// ErrConflict statt ErrNotFound melden und die beiden Fehlerfaelle fuer den
// Aufrufer ununterscheidbar machen.
//
// Seit Plan 156-12/GAP-01 laeuft der gesamte Ablauf in EINER Transaktion: sobald
// sich die Origin tatsaechlich auf eine ANDERE Release-Version aendert, wird im
// SELBEN Commit jede bestehende theme_segment_contributors-Auswahl entfernt, deren
// member_id kein effektiver Contributor der NEUEN Origin mehr ist (die
// Segment-Contributor-Auswahl referenziert nur die Person, niemals eine konkrete
// Contribution-Zeile -- 156-UAT.md Nachtrag 2026-09-12). removedContributorCount
// meldet die Anzahl der entfernten Zeilen (0, wenn keine ungueltig waren oder keine
// Auswahl bestand) -- nie still verworfen (T-156-22).
func (r *AdminContentRepository) SetThemeSegmentOrigin(ctx context.Context, segmentID int64, releaseVersionID int64) (int, error) {
	if segmentID <= 0 || releaseVersionID <= 0 {
		return 0, ErrNotFound
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin set theme segment origin segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var segmentExists bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM theme_segments WHERE id = $1)
	`, segmentID).Scan(&segmentExists); err != nil {
		return 0, fmt.Errorf("set theme segment origin segment=%d release_version=%d: check segment existence: %w", segmentID, releaseVersionID, err)
	}
	if !segmentExists {
		return 0, ErrNotFound
	}

	var assigned bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM theme_segment_assignments
			WHERE theme_segment_id = $1 AND release_version_id = $2
		)
	`, segmentID, releaseVersionID).Scan(&assigned); err != nil {
		return 0, fmt.Errorf("set theme segment origin segment=%d release_version=%d: check assignment membership: %w", segmentID, releaseVersionID, err)
	}
	if !assigned {
		return 0, ErrConflict
	}

	tag, err := tx.Exec(ctx, `
		UPDATE theme_segments SET origin_release_version_id = $2 WHERE id = $1
	`, segmentID, releaseVersionID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return 0, ErrConflict
		}
		return 0, fmt.Errorf("set theme segment origin segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}
	if tag.RowsAffected() == 0 {
		return 0, ErrNotFound
	}

	effective, err := loadPublicEffectiveContributors(ctx, tx, []int64{releaseVersionID})
	if err != nil {
		return 0, fmt.Errorf("set theme segment origin segment=%d release_version=%d: load new origin's effective contributors: %w", segmentID, releaseVersionID, err)
	}
	validMemberIDs := make([]int64, 0, len(effective[releaseVersionID]))
	for _, contributor := range effective[releaseVersionID] {
		validMemberIDs = append(validMemberIDs, contributor.MemberID)
	}

	cleanupTag, err := tx.Exec(ctx, `
		DELETE FROM theme_segment_contributors
		WHERE theme_segment_id = $1
		  AND NOT (member_id = ANY($2))
	`, segmentID, validMemberIDs)
	if err != nil {
		return 0, fmt.Errorf("set theme segment origin segment=%d release_version=%d: cleanup now-invalid contributor selection: %w", segmentID, releaseVersionID, err)
	}
	removedContributorCount := int(cleanupTag.RowsAffected())

	// Plan 156-18 (GAP-07): der EINE Schreibpfad, der ensureThemeSegmentOriginTx nie durchlaeuft
	// (die manuelle Origin-Korrektur), bekommt die Vorauswahl hier direkt verdrahtet -- nach dem
	// Cleanup, vor dem Commit, in derselben Transaktion. Der bereits validierte
	// releaseVersionID-Parameter ist die neue Origin; ensureThemeSegmentContributorsPreselectedTx
	// selbst entscheidet per Marker, ob ueberhaupt etwas zu tun ist (kein erneutes Preselect nach
	// einem spaeteren Origin-Wechsel). Die zurueckgegebene Anzahl wird bewusst nicht
	// weitergereicht -- die Signatur bleibt (int, error), der Admin sieht das Ergebnis ueber den
	// naechsten Kandidaten-Fetch.
	if _, err := ensureThemeSegmentContributorsPreselectedTx(ctx, tx, segmentID, &releaseVersionID); err != nil {
		return 0, fmt.Errorf("set theme segment origin segment=%d release_version=%d: preselect contributors: %w", segmentID, releaseVersionID, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit set theme segment origin segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}

	return removedContributorCount, nil
}
