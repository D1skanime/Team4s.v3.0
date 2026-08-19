package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// resolvedSegmentVariant ist das Ergebnis der deterministischen Pro-Release-Version-
// Playback-Aufloesung. Lebt bewusst in dieser NEUEN, fokussierten Datei statt im
// bereits 2259 Zeilen grossen admin_content_anime_themes.go (Nyquist-Fix W-mod,
// CLAUDE.md 450-Zeilen-Regel; gleiche Repo-Split-Konvention wie
// theme_segment_render_cache.go / theme_segment_assignments.go / theme_segment_overrides.go).
type resolvedSegmentVariant struct {
	ReleaseVariantID   int64
	DurationSeconds    *int32
	JellyfinExternalID *string
	JellyfinStreamURL  *string
}

// resolveThemeSegmentReleaseVariantTx loest fuer eine KONKRETE releaseVersionID die
// zugehoerige release_variants-Zeile auf. Ersetzt die alte, ueber
// fansub_group_id/version/anime_id "irgendeine passende Variante irgendeiner Episode"
// ratende resolved_variant-CTE (RESEARCH.md Risk 3, vormals
// admin_content_anime_themes.go:1366-1391) durch eine direkte, release_version_id-
// gebundene Aufloesung. Der Aufrufer kennt die exakte release_version_id bereits aus
// der Zuweisung (theme_segment_assignments), sodass keine Bereichs-Rateaufgabe mehr
// noetig ist -- das behebt Risk 3 strukturell, nicht nur per Zusatzfilter.
//
// ss.external_id (bzw. bei fehlendem Jellyfin-Stream ersatzweise die Variante selbst)
// wird von den Aufrufstellen unveraendert als SourceIdentity an
// services.BuildSegmentRenderCacheKey durchgereicht -- das unterscheidet sich
// zwischen zwei Release-Versionen mit unterschiedlichen Streams (Nyquist-Fix W2,
// behebt RESEARCH.md Risk 1 auf Ebene der tatsaechlich genutzten Hash-Funktion).
//
// Liefert nil ohne Fehler, wenn releaseVersionID zu keiner release_variants-Zeile
// gehoert (analog dem frueheren LEFT JOIN ... ON TRUE-Verhalten bei fehlender Variante).
func resolveThemeSegmentReleaseVariantTx(ctx context.Context, tx pgx.Tx, segmentID int64, releaseVersionID int64) (*resolvedSegmentVariant, error) {
	if releaseVersionID <= 0 {
		return nil, nil
	}

	var result resolvedSegmentVariant
	err := tx.QueryRow(ctx, `
		SELECT
			rv.id,
			rv.duration_seconds,
			ss.external_id,
			ss.url
		FROM release_variants rv
		LEFT JOIN release_streams rs ON rs.variant_id = rv.id
		LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id AND ss.provider_type = 'jellyfin'
		WHERE rv.release_version_id = $1
		ORDER BY
			CASE WHEN ss.external_id IS NOT NULL THEN 0 ELSE 1 END,
			rv.id ASC
		LIMIT 1
	`, releaseVersionID).Scan(
		&result.ReleaseVariantID,
		&result.DurationSeconds,
		&result.JellyfinExternalID,
		&result.JellyfinStreamURL,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("resolve theme segment release variant segment=%d release_version=%d: %w", segmentID, releaseVersionID, err)
	}
	return &result, nil
}

// hydrateSegmentAssignmentMetadataList befuellt AssignedReleaseVersionIDs/IsShared/
// HasEpisodeOverride/AssignedEpisodes fuer eine Liste von Segmenten in genau zwei
// Batch-Queries (kein N+1) -- gleiches Zwei-Pass-Hydrations-Muster wie
// hydrateSegmentPlaybackMetadataList/hydrateSegmentLibraryMetadataList
// (admin_content_anime_themes.go). AssignedEpisodes traegt zusaetzlich die ECHTE
// Episodennummer je Zuweisung (nicht die interne release_version_id), ueber dasselbe
// Join-Muster release_versions -> fansub_releases -> episodes wie Plan 117-08 fuer
// applies_through_episode -- Grundlage fuer die "Folge {N}"-Zuweisungs-Chips in
// Plan 117-07 (behebt B3 aus dem Plan-Checker).
func (r *AdminContentRepository) hydrateSegmentAssignmentMetadataList(ctx context.Context, segments []models.AdminThemeSegment) error {
	if len(segments) == 0 {
		return nil
	}

	hasAssignments, err := r.hasTable(ctx, "theme_segment_assignments")
	if err != nil {
		return err
	}
	if !hasAssignments {
		return nil
	}

	segmentIDs := make([]int64, len(segments))
	indexBySegmentID := make(map[int64]int, len(segments))
	for i := range segments {
		segmentIDs[i] = segments[i].ID
		indexBySegmentID[segments[i].ID] = i
	}

	assignmentRows, err := r.db.Query(ctx, `
		SELECT
			tsa.theme_segment_id,
			tsa.release_version_id,
			ep.episode_number
		FROM theme_segment_assignments tsa
		JOIN release_versions rv ON rv.id = tsa.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE tsa.theme_segment_id = ANY($1)
		ORDER BY tsa.theme_segment_id, tsa.release_version_id ASC
	`, segmentIDs)
	if err != nil {
		return fmt.Errorf("list theme segment assignment metadata: %w", err)
	}
	defer assignmentRows.Close()

	for assignmentRows.Next() {
		var segmentID, releaseVersionID int64
		var episodeNumber string
		if err := assignmentRows.Scan(&segmentID, &releaseVersionID, &episodeNumber); err != nil {
			return fmt.Errorf("scan theme segment assignment metadata: %w", err)
		}
		idx, ok := indexBySegmentID[segmentID]
		if !ok {
			continue
		}
		segments[idx].AssignedReleaseVersionIDs = append(segments[idx].AssignedReleaseVersionIDs, releaseVersionID)
		segments[idx].AssignedEpisodes = append(segments[idx].AssignedEpisodes, models.AdminThemeSegmentAssignmentEpisode{
			ReleaseVersionID: releaseVersionID,
			EpisodeNumber:    episodeNumber,
		})
	}
	if err := assignmentRows.Err(); err != nil {
		return fmt.Errorf("iterate theme segment assignment metadata: %w", err)
	}

	for i := range segments {
		segments[i].IsShared = len(segments[i].AssignedReleaseVersionIDs) > 1
	}

	hasOverrides, err := r.hasTable(ctx, "theme_segment_episode_overrides")
	if err != nil {
		return err
	}
	if !hasOverrides {
		return nil
	}

	// PRO-Folge-Aufloesung (Quick-Task 260819-lm5, Runde 5 Korrektheits-Fix): release_version_id
	// wird jetzt mitgelesen, damit genau die ueberschriebene Zuweisung (nicht das ganze Segment)
	// markiert werden kann. Segmentweites HasEpisodeOverride bleibt zusaetzlich bestehen (wird an
	// anderer Stelle fuer die "Zeit hier ueberschrieben"-Badge auf dem Segment selbst verwendet).
	overrideRows, err := r.db.Query(ctx, `
		SELECT theme_segment_id, release_version_id
		FROM theme_segment_episode_overrides
		WHERE theme_segment_id = ANY($1)
	`, segmentIDs)
	if err != nil {
		return fmt.Errorf("list theme segment override metadata: %w", err)
	}
	defer overrideRows.Close()

	segmentsWithOverride := make(map[int64]bool)
	for overrideRows.Next() {
		var segmentID, releaseVersionID int64
		if err := overrideRows.Scan(&segmentID, &releaseVersionID); err != nil {
			return fmt.Errorf("scan theme segment override metadata: %w", err)
		}
		segmentsWithOverride[segmentID] = true
		idx, ok := indexBySegmentID[segmentID]
		if !ok {
			continue
		}
		for i := range segments[idx].AssignedEpisodes {
			if segments[idx].AssignedEpisodes[i].ReleaseVersionID == releaseVersionID {
				segments[idx].AssignedEpisodes[i].HasOverride = true
				break
			}
		}
	}
	if err := overrideRows.Err(); err != nil {
		return fmt.Errorf("iterate theme segment override metadata: %w", err)
	}

	for segmentID := range segmentsWithOverride {
		if idx, ok := indexBySegmentID[segmentID]; ok {
			segments[idx].HasEpisodeOverride = true
		}
	}

	return nil
}
