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
func (r *AdminContentRepository) SetThemeSegmentOrigin(ctx context.Context, segmentID int64, releaseVersionID int64) error {
	if segmentID <= 0 || releaseVersionID <= 0 {
		return ErrNotFound
	}

	var segmentExists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM theme_segments WHERE id = $1)
	`, segmentID).Scan(&segmentExists); err != nil {
		return fmt.Errorf("set theme segment origin segment=%d release_version=%d: check segment existence: %w", segmentID, releaseVersionID, err)
	}
	if !segmentExists {
		return ErrNotFound
	}

	var assigned bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM theme_segment_assignments
			WHERE theme_segment_id = $1 AND release_version_id = $2
		)
	`, segmentID, releaseVersionID).Scan(&assigned); err != nil {
		return fmt.Errorf("set theme segment origin segment=%d release_version=%d: check assignment membership: %w", segmentID, releaseVersionID, err)
	}
	if !assigned {
		return ErrConflict
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE theme_segments SET origin_release_version_id = $2 WHERE id = $1
	`, segmentID, releaseVersionID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return ErrConflict
		}
		return fmt.Errorf("set theme segment origin segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
