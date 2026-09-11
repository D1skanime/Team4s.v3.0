package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// autoAssignThemeSegmentsForNewReleaseVersionQuery ist Workstream B (Phase 156, P156-04): die
// Rueckrichtung zu AssignThemeSegmentToEpisodeRange (theme_segment_assignments.go) -- eine neu
// angelegte Release-Version bekommt automatisch alle bereits bestehenden, passenden
// Segmentzuweisungen, ohne separate Admin-Aktion. Die Episoden-/Versionsaufloesung ist
// BYTE-IDENTISCH zu themeSegmentRangeTargetQuery's COALESCE-Fragmenten (siehe
// theme_segment_assignments.go), damit "Segment zuerst" und "Release zuerst" bei gleichem Input
// immer dieselbe Zielmenge sehen. Eine Zeile pro passendem Segment, gebuendelt in EINER Abfrage
// pro tatsaechlich angehaengter Fansub-Gruppe -- niemals eine Schleife pro Segment (P156-16).
const autoAssignThemeSegmentsForNewReleaseVersionQuery = `
	INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id)
	SELECT ts.id, $1
	FROM theme_segments ts
	WHERE ts.fansub_group_id = $2
	  AND COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1') = $3
	  AND ts.start_episode IS NOT NULL AND ts.end_episode IS NOT NULL
	  AND ts.start_episode <= $4 AND ts.end_episode >= $4
	ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING
`

// resolveReleaseVersionEpisodeSortIndexAndVersion loest den Episoden-Sortindex und die
// normalisierte Version einer Release-Version auf -- exakt dieselben COALESCE-Fragmente wie
// theme_segment_assignments.go's themeSegmentRangeTargetQuery, damit beide Richtungen bei
// gleichem Input dieselbe Zielmenge sehen (P156-04). episodeSortIndex ist nil, wenn die Episode
// keine aufloesbare Position hat (Episoden-Nummer nicht numerisch, kein sort_index) -- in diesem
// Fall wird das automatische Zuweisen uebersprungen, nie faelschlich mit 0 geraten.
func resolveReleaseVersionEpisodeSortIndexAndVersion(ctx context.Context, tx pgx.Tx, releaseVersionID int64) (*int, string, error) {
	var episodeSortIndex *int
	var normalizedVersion string
	if err := tx.QueryRow(ctx, `
		SELECT
			COALESCE(ep.sort_index, CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END),
			COALESCE(NULLIF(BTRIM(rev.version), ''), 'v1')
		FROM release_versions rev
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE rev.id = $1
	`, releaseVersionID).Scan(&episodeSortIndex, &normalizedVersion); err != nil {
		return nil, "", fmt.Errorf("resolve episode sort index for release version %d: %w", releaseVersionID, err)
	}
	return episodeSortIndex, normalizedVersion, nil
}

// autoAssignThemeSegmentsForNewReleaseVersion fuehrt das gebuendelte Auto-Assign fuer EINE
// angehaengte Fansub-Gruppe der neu angelegten Release-Version aus. episodeSortIndex/
// normalizedVersion werden vom Aufrufer EINMAL pro Release-Version aufgeloest (nicht pro Gruppe)
// und hier nur noch verwendet. Ist episodeSortIndex nil (Episode ohne aufloesbare Position), wird
// die Zuweisung als No-Op uebersprungen -- niemals einem Segment eine Episode unbekannter Position
// zuordnen.
func autoAssignThemeSegmentsForNewReleaseVersion(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	groupID int64,
	normalizedVersion string,
	episodeSortIndex *int,
) error {
	if episodeSortIndex == nil {
		return nil
	}
	if _, err := tx.Exec(ctx, autoAssignThemeSegmentsForNewReleaseVersionQuery,
		releaseVersionID, groupID, normalizedVersion, *episodeSortIndex,
	); err != nil {
		return fmt.Errorf("auto-assign theme segments on release creation version=%d group=%d: %w", releaseVersionID, groupID, err)
	}
	return nil
}
