package repository

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
)

// Candidates are read across every selected group together. Anime identity is
// resolved from the actual release version; equal group/version/range alone never
// makes a segment from another anime eligible.
const autoAssignThemeSegmentsForNewReleaseVersionQuery = `
    SELECT ts.id, tt.name
    FROM theme_segments ts
    JOIN themes t ON t.id=ts.theme_id
    JOIN theme_types tt ON tt.id=t.theme_type_id
    JOIN episodes e ON e.anime_id=t.anime_id
    JOIN fansub_releases fr ON fr.episode_id=e.id
    JOIN release_versions rv ON rv.release_id=fr.id AND rv.id=$1
    WHERE ts.fansub_group_id=ANY($2::bigint[])
      AND COALESCE(NULLIF(BTRIM(ts.version), ''), 'v1') = $3
      AND ts.start_episode IS NOT NULL AND ts.end_episode IS NOT NULL
      AND ts.start_episode <= $4 AND ts.end_episode >= $4
    ORDER BY ts.id
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

// Called with the anime lock held, once per release version after all group links
// are written. An ambiguous OP/ED slot stays empty; no ordering heuristic selects a
// winner. Existing assignments are retained. Other unambiguous types still attach.
func autoAssignThemeSegmentsForNewReleaseVersion(ctx context.Context, tx pgx.Tx, releaseVersionID int64, groupIDs []int64, normalizedVersion string, episodeSortIndex *int) error {
	if episodeSortIndex == nil {
		return nil
	}
	rows, err := tx.Query(ctx, autoAssignThemeSegmentsForNewReleaseVersionQuery, releaseVersionID, groupIDs, normalizedVersion, *episodeSortIndex)
	if err != nil {
		return err
	}
	slots := make(map[string][]int64)
	toAssign := make([]int64, 0)
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			rows.Close()
			return err
		}
		if slot := segmentAssignmentSlotType(name); slot != "" {
			slots[slot] = append(slots[slot], id)
		} else {
			toAssign = append(toAssign, id)
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	existingRows, err := tx.Query(ctx, `SELECT tt.name FROM theme_segment_assignments a JOIN theme_segments s ON s.id=a.theme_segment_id JOIN themes t ON t.id=s.theme_id JOIN theme_types tt ON tt.id=t.theme_type_id WHERE a.release_version_id=$1`, releaseVersionID)
	if err != nil {
		return err
	}
	occupied := make(map[string]bool)
	for existingRows.Next() {
		var name string
		if err := existingRows.Scan(&name); err != nil {
			existingRows.Close()
			return err
		}
		occupied[segmentAssignmentSlotType(name)] = true
	}
	err = existingRows.Err()
	existingRows.Close()
	if err != nil {
		return err
	}
	for slot, candidates := range slots {
		if occupied[slot] {
			continue
		}
		if len(candidates) == 1 {
			toAssign = append(toAssign, candidates[0])
		} else {
			// At most two bounded messages per release version; no source URLs,
			// user content or arbitrary candidate list enters the log.
			log.Printf("segment auto-assignment skipped: release_version_id=%d type=%s candidates=%d reason=ambiguous_slot", releaseVersionID, slot, len(candidates))
		}
	}
	if len(toAssign) == 0 {
		return nil
	}
	if _, err := tx.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) SELECT unnest($1::bigint[]), $2 ON CONFLICT (theme_segment_id, release_version_id) DO NOTHING`, toAssign, releaseVersionID); err != nil {
		return fmt.Errorf("auto-assign segments release_version=%d: %w", releaseVersionID, err)
	}
	// Plan 156-16 (GAP-04/GAP-05): ein Segment, das hier seine erste Zuweisung erhaelt (NULL
	// Origin, keine bisherigen Zuweisungen), bekommt sofort eine Origin. Ein Segment mit
	// bereits gueltiger Origin bleibt unangetastet, selbst wenn diese neue Zuweisung eine
	// niedrigere Episode traegt (Auftragspunkt 8) -- ensureThemeSegmentOriginTx entscheidet das
	// zentral, nicht diese Schleife.
	for _, segmentID := range toAssign {
		if _, err := ensureThemeSegmentOriginTx(ctx, tx, segmentID); err != nil {
			return fmt.Errorf("auto-assign segments release_version=%d: ensure origin segment=%d: %w", releaseVersionID, segmentID, err)
		}
	}
	return nil
}
