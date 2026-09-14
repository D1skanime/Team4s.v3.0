package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// themeSegmentOriginRecomputeQuery ist die zentrale, EINE Backfill-Regel fuer die Herkunfts-
// Neuberechnung eines Kara-Segments -- die ORDER BY-Ausdruecke sind woertlich aus Migration
// 0161s origin_candidate-CTE uebernommen (siehe Migration 0164 fuer den Beweis der
// Uebereinstimmung), damit die Regel niemals zweimal, leicht unterschiedlich, implementiert
// wird. Null Treffer (pgx.ErrNoRows) bedeutet "keine Zuweisung mehr uebrig" und wird vom
// Aufrufer als NULL behandelt, nie als Fehler.
const themeSegmentOriginRecomputeQuery = `
	SELECT tsa.release_version_id
	FROM theme_segment_assignments tsa
	JOIN release_versions rv ON rv.id = tsa.release_version_id
	JOIN fansub_releases fr ON fr.id = rv.release_id
	JOIN episodes ep ON ep.id = fr.episode_id
	WHERE tsa.theme_segment_id = $1
	ORDER BY
	    COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int END) ASC NULLS LAST,
	    tsa.release_version_id ASC
	LIMIT 1
`

// ThemeSegmentOriginSyncOutcome ist der Rueckgabewert von ensureThemeSegmentOriginTx.
// Before/After sind die Herkunfts-Release-Version vor und nach dem Aufruf (nil == "Origin
// nicht bestimmt"). Changed ist nur dann true, wenn After tatsaechlich von Before abweicht.
// RemovedContributorCount meldet, wie viele theme_segment_contributors-Zeilen im selben Aufruf
// wegen des Origin-Wechsels entfernt wurden (0, wenn Changed==false oder nichts zu entfernen war).
type ThemeSegmentOriginSyncOutcome struct {
	Before                  *int64
	After                   *int64
	Changed                 bool
	RemovedContributorCount int
}

// ensureThemeSegmentOriginTx ist die EINE zentrale Origin-Gueltigkeits-Pruefung/-Neuberechnung
// (Phase 156, Plan 156-16, GAP-04/GAP-05 aus der Live-UAT vom 2026-09-14). Sie schliesst die
// Luecke, dass theme_segments.origin_release_version_id bisher NUR beim expliziten
// SetThemeSegmentOrigin-Aufruf geprueft wurde, nie erneut, wenn sich die Zuweisungsmenge selbst
// aendert (Bereichs-Sync, Segment-Anlage, automatische Zuweisung einer neuen Release-Version).
//
// Regel (Auftragspunkt 8, niemals verletzt): eine gueltige Origin -- NULL, oder eine
// Release-Version, der das Segment aktuell ueber theme_segment_assignments zugewiesen ist --
// wird NIEMALS ueberschrieben, auch nicht durch eine spaeter hinzukommende Zuweisung mit
// niedrigerer Episode. Nur eine UNGUELTIGE Origin (auf eine Release-Version zeigend, der das
// Segment nicht mehr zugewiesen ist) oder eine fehlende Origin (NULL) bei vorhandenen
// Zuweisungen wird neu berechnet, per themeSegmentOriginRecomputeQuery -- derselben Regel wie
// Migration 0161s urspruenglicher Backfill und Migration 0164s Reparatur.
//
// Aendert sich die Origin tatsaechlich (inklusive NULL -> Wert, Wert -> anderer Wert, oder
// Wert -> NULL), wird im SELBEN Commit jede jetzt ungueltige theme_segment_contributors-Zeile
// entfernt -- niemals eine neue eingefuegt (P156-05/P156-06, keine automatische
// Contributor-Auswahl). Ist die neue Origin nicht-NULL, bleiben nur Zeilen erhalten, deren
// member_id ein effektiver Contributor der neuen Origin ist (identischer Cleanup-Pfad wie
// SetThemeSegmentOrigin). Ist die neue Origin NULL, werden ALLE Contributor-Zeilen des Segments
// entfernt, weil ein Segment ohne Origin per Konstruktion keine Contributor-Auswahl tragen darf
// (156-UAT.md Auftragspunkt 2/14).
func ensureThemeSegmentOriginTx(ctx context.Context, tx pgx.Tx, segmentID int64) (*ThemeSegmentOriginSyncOutcome, error) {
	var currentOrigin *int64
	if err := tx.QueryRow(ctx, `
		SELECT origin_release_version_id FROM theme_segments WHERE id = $1
	`, segmentID).Scan(&currentOrigin); err != nil {
		return nil, fmt.Errorf("ensure theme segment origin segment=%d: load current origin: %w", segmentID, err)
	}

	if currentOrigin != nil {
		var stillAssigned bool
		if err := tx.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM theme_segment_assignments
				WHERE theme_segment_id = $1 AND release_version_id = $2
			)
		`, segmentID, *currentOrigin).Scan(&stillAssigned); err != nil {
			return nil, fmt.Errorf("ensure theme segment origin segment=%d: check current origin membership: %w", segmentID, err)
		}
		if stillAssigned {
			// Eine gueltige Origin wird NIE angefasst -- auch nicht, wenn eine
			// niedriger-episodische Zuweisung existiert (Auftragspunkt 8).
			return &ThemeSegmentOriginSyncOutcome{Before: currentOrigin, After: currentOrigin, Changed: false}, nil
		}
	}

	var recomputed *int64
	if err := tx.QueryRow(ctx, themeSegmentOriginRecomputeQuery, segmentID).Scan(&recomputed); err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("ensure theme segment origin segment=%d: recompute: %w", segmentID, err)
		}
		recomputed = nil
	}

	outcome := &ThemeSegmentOriginSyncOutcome{
		Before:  currentOrigin,
		After:   recomputed,
		Changed: !originValuesEqual(currentOrigin, recomputed),
	}
	if !outcome.Changed {
		// NULL blieb NULL -- ein Segment ganz ohne Zuweisung hat nichts zu bereinigen.
		return outcome, nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE theme_segments SET origin_release_version_id = $2 WHERE id = $1
	`, segmentID, recomputed); err != nil {
		return nil, fmt.Errorf("ensure theme segment origin segment=%d: update origin: %w", segmentID, err)
	}

	if recomputed == nil {
		tag, err := tx.Exec(ctx, `
			DELETE FROM theme_segment_contributors WHERE theme_segment_id = $1
		`, segmentID)
		if err != nil {
			return nil, fmt.Errorf("ensure theme segment origin segment=%d: clear contributors on NULL origin: %w", segmentID, err)
		}
		outcome.RemovedContributorCount = int(tag.RowsAffected())
		return outcome, nil
	}

	effective, err := loadPublicEffectiveContributors(ctx, tx, []int64{*recomputed})
	if err != nil {
		return nil, fmt.Errorf("ensure theme segment origin segment=%d: load new origin's effective contributors: %w", segmentID, err)
	}
	validMemberIDs := make([]int64, 0, len(effective[*recomputed]))
	for _, contributor := range effective[*recomputed] {
		validMemberIDs = append(validMemberIDs, contributor.MemberID)
	}

	cleanupTag, err := tx.Exec(ctx, `
		DELETE FROM theme_segment_contributors
		WHERE theme_segment_id = $1
		  AND NOT (member_id = ANY($2))
	`, segmentID, validMemberIDs)
	if err != nil {
		return nil, fmt.Errorf("ensure theme segment origin segment=%d: cleanup now-invalid contributor selection: %w", segmentID, err)
	}
	outcome.RemovedContributorCount = int(cleanupTag.RowsAffected())
	return outcome, nil
}

func originValuesEqual(a, b *int64) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}
