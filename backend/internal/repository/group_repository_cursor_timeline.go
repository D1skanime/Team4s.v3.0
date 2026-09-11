package repository

// attachReleaseTimelineSegments und ihr First-Occurrence-Helfer sind aus
// group_repository_cursor.go ausgelagert (Plan 156-06), damit beide Dateien
// unter dem 450-Zeilen-Limit bleiben. GetGroupReleasesCursor bleibt
// unveraendert in group_repository_cursor.go und ruft attachReleaseTimelineSegments
// weiterhin unqualifiziert auf (gleiches Package).

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

// attachReleaseTimelineSegments befuellt TimelineSegments je Episode aus
// theme_segment_assignments (P156-10) -- nicht mehr ueber einen
// start_episode/end_episode-Bereichsvergleich. Die Segmenttyp-Klassifikation
// laeuft ueber CanonicalSegmentType (theme_segment_type.go) statt ueber eine
// SQL-LIKE-Heuristik. Nach dem Scan wendet die Funktion die First-Occurrence-
// Regel an (P156-11/P156-12): ein Segment erscheint auf der Projekt-Timeline
// nur bei seiner GLOBAL (projektweit, nicht nur innerhalb der aktuell
// geladenen Cursor-Seite) ersten zugewiesenen Release-Version. Das macht die
// Regel korrekt auch dann, wenn die erste Folge eines geteilten Segments auf
// einer frueheren, gerade nicht geladenen Seite liegt. Genau zwei Abfragen
// fuer die gesamte Seite (P156-16): der Zeilen-Scan hier plus die eine
// gebuendelte Abfrage in loadFirstOccurrenceReleaseVersionIDs -- keine
// Abfrage je Episode oder je Segment.
func (r *GroupRepository) attachReleaseTimelineSegments(
	ctx context.Context,
	animeID int64,
	groupID int64,
	episodes []models.EpisodeReleaseSummary,
) error {
	if len(episodes) == 0 {
		return nil
	}

	releaseIDs := make([]int64, 0, len(episodes))
	indexByReleaseID := make(map[int64]int, len(episodes))
	for index, episode := range episodes {
		releaseIDs = append(releaseIDs, episode.ID)
		indexByReleaseID[episode.ID] = index
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			tsa.release_version_id AS release_version_id,
			ts.id AS segment_id,
			tt.name AS segment_type_name,
			COALESCE(NULLIF(BTRIM(t.title), ''), tt.name) AS title,
			ts.start_time::text AS start_time,
			ts.end_time::text AS end_time,
			NULLIF(BTRIM(ts.version), '') AS version,
			ts.start_episode AS start_episode,
			ts.end_episode AS end_episode
		FROM theme_segment_assignments tsa
		JOIN theme_segments ts ON ts.id = tsa.theme_segment_id
		JOIN themes t ON t.id = ts.theme_id AND t.anime_id = $1
		JOIN theme_types tt ON tt.id = t.theme_type_id
		WHERE tsa.release_version_id = ANY($3::bigint[])
		  AND ts.fansub_group_id = $2
		ORDER BY tsa.release_version_id, ts.start_time NULLS LAST, ts.id
	`, animeID, groupID, releaseIDs)
	if err != nil {
		return fmt.Errorf("query release timeline segments (%d,%d): %w", animeID, groupID, err)
	}
	defer rows.Close()

	type scannedTimelineSegment struct {
		releaseID int64
		segment   models.ReleaseTimelineSegment
	}
	scanned := make([]scannedTimelineSegment, 0)
	segmentIDSeen := make(map[int64]bool)
	segmentIDs := make([]int64, 0)
	for rows.Next() {
		var (
			releaseID     int64
			segment       models.ReleaseTimelineSegment
			themeTypeName string
		)
		if err := rows.Scan(
			&releaseID,
			&segment.ID,
			&themeTypeName,
			&segment.Title,
			&segment.StartTime,
			&segment.EndTime,
			&segment.Version,
			&segment.StartEpisode,
			&segment.EndEpisode,
		); err != nil {
			return fmt.Errorf("scan release timeline segment: %w", err)
		}
		segment.Type = CanonicalSegmentType(themeTypeName)

		scanned = append(scanned, scannedTimelineSegment{releaseID: releaseID, segment: segment})
		if !segmentIDSeen[segment.ID] {
			segmentIDSeen[segment.ID] = true
			segmentIDs = append(segmentIDs, segment.ID)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate release timeline segments: %w", err)
	}
	rows.Close()

	if len(scanned) == 0 {
		return nil
	}

	firstOccurrenceReleaseVersionID, err := r.loadFirstOccurrenceReleaseVersionIDs(ctx, animeID, groupID, segmentIDs)
	if err != nil {
		return err
	}

	for _, item := range scanned {
		if item.releaseID != firstOccurrenceReleaseVersionID[item.segment.ID] {
			continue
		}
		index, ok := indexByReleaseID[item.releaseID]
		if !ok {
			continue
		}

		episodes[index].TimelineSegments = append(episodes[index].TimelineSegments, item.segment)
		switch item.segment.Type {
		case "OP":
			episodes[index].HasOP = true
		case "ED":
			episodes[index].HasED = true
		case "INSERT":
			episodes[index].InsertCount++
		case "KARA":
			episodes[index].KaraokeCount++
		}
	}

	return nil
}

// loadFirstOccurrenceReleaseVersionIDs ermittelt fuer jede uebergebene
// theme_segment_id GLOBAL (projektweit ueber die vollstaendige
// Zuweisungshistorie in theme_segment_assignments, nicht nur innerhalb der
// aktuell geladenen Cursor-Seite) die zuerst zugewiesene release_version_id.
// Das ist der Mechanismus, der die First-Occurrence-Regel auch ueber
// Cursor-Seitenwechsel hinweg korrekt macht: eine Folge auf einer spaeter
// geladenen Seite darf ein Segment nicht erneut zeigen, nur weil dessen
// erste Folge auf einer frueheren, gerade nicht geladenen Seite liegt. Genau
// EINE gebuendelte Abfrage fuer die gesamte Menge der auf dieser Seite
// gefundenen Segmente -- keine Abfrage je Segment oder je Episode.
func (r *GroupRepository) loadFirstOccurrenceReleaseVersionIDs(
	ctx context.Context,
	animeID int64,
	groupID int64,
	segmentIDs []int64,
) (map[int64]int64, error) {
	if len(segmentIDs) == 0 {
		return map[int64]int64{}, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			tsa.theme_segment_id,
			(ARRAY_AGG(rev.id ORDER BY
				COALESCE(ep.sort_index, CASE WHEN ep.episode_number ~ '^[0-9]+$' THEN ep.episode_number::int END) ASC NULLS LAST,
				rev.id ASC
			))[1] AS first_release_version_id
		FROM theme_segment_assignments tsa
		JOIN theme_segments ts ON ts.id = tsa.theme_segment_id
		JOIN themes t ON t.id = ts.theme_id AND t.anime_id = $1
		JOIN release_versions rev ON rev.id = tsa.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE ts.fansub_group_id = $2
		  AND tsa.theme_segment_id = ANY($3::bigint[])
		GROUP BY tsa.theme_segment_id
	`, animeID, groupID, segmentIDs)
	if err != nil {
		return nil, fmt.Errorf("query first-occurrence release versions (%d,%d): %w", animeID, groupID, err)
	}
	defer rows.Close()

	result := make(map[int64]int64, len(segmentIDs))
	for rows.Next() {
		var segmentID, firstReleaseVersionID int64
		if err := rows.Scan(&segmentID, &firstReleaseVersionID); err != nil {
			return nil, fmt.Errorf("scan first-occurrence release version: %w", err)
		}
		result[segmentID] = firstReleaseVersionID
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate first-occurrence release versions: %w", err)
	}
	return result, nil
}
