package handlers

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// filterAssignmentsWithoutOverride entfernt aus assignedReleaseVersionIDs alle IDs, fuer die
// overriddenReleaseVersionIDs einen aktiven Eintrag traegt (D-01: eine ueberschriebene Folge
// behaelt ihre eigene Zeit und wird durch eine Basis-Zeit-Aenderung NICHT mit-invalidiert). Reine
// Funktion ohne DB-Zugriff, isoliert testbar (Plan 117-04 Task 3).
func filterAssignmentsWithoutOverride(assignedReleaseVersionIDs []int64, overriddenReleaseVersionIDs map[int64]bool) []int64 {
	result := make([]int64, 0, len(assignedReleaseVersionIDs))
	for _, releaseVersionID := range assignedReleaseVersionIDs {
		if overriddenReleaseVersionIDs[releaseVersionID] {
			continue
		}
		result = append(result, releaseVersionID)
	}
	return result
}

// nonOverriddenSegmentAssignments laedt alle aktuell zugewiesenen Release-Versionen eines
// geteilten Kara-Segments und filtert diejenigen heraus, fuer die ein aktiver
// theme_segment_episode_overrides-Eintrag existiert (D-01/D-03). Wird von UpdateAnimeSegment
// verwendet, um eine Basis-Zeit-Aenderung nur an NICHT ueberschriebenen Zuweisungen zu
// invalidieren.
func nonOverriddenSegmentAssignments(ctx context.Context, themeRepo adminThemeRepository, segmentID int64) ([]int64, error) {
	assignedIDs, err := themeRepo.ListThemeSegmentAssignments(ctx, segmentID)
	if err != nil {
		return nil, err
	}

	overridden := make(map[int64]bool, len(assignedIDs))
	for _, releaseVersionID := range assignedIDs {
		if _, overrideErr := themeRepo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionID); overrideErr == nil {
			overridden[releaseVersionID] = true
		} else if !errors.Is(overrideErr, repository.ErrNotFound) {
			return nil, overrideErr
		}
	}

	return filterAssignmentsWithoutOverride(assignedIDs, overridden), nil
}

// captureSegmentRenderSources laedt fuer jede angegebene releaseVersionID die aktuelle
// release-version-scoped Render-Quelle (oder nil, wenn noch keine theme_segment_playback_sources-
// Zeile existiert). Wird vor einer Basis-Zeit-Aenderung aufgerufen, um den "vorher"-Stand fuer den
// spaeteren segmentRenderInputsChanged-Vergleich festzuhalten.
func (h *AdminContentHandler) captureSegmentRenderSources(ctx context.Context, segmentID int64, releaseVersionIDs []int64) (map[int64]*models.ThemeSegmentRenderSource, error) {
	streamRepo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		return nil, fmt.Errorf("segment render fan-out: theme repo does not implement segment stream repository")
	}

	sources := make(map[int64]*models.ThemeSegmentRenderSource, len(releaseVersionIDs))
	for _, releaseVersionID := range releaseVersionIDs {
		source, err := streamRepo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionID)
		if err != nil {
			if !errorsIsNotFound(err) {
				return nil, err
			}
			source = nil
		}
		sources[releaseVersionID] = source
	}
	return sources, nil
}

// resetAndQueueSegmentRenderForAssignments fan-outet die Render-Cache-Invalidierung ueber alle
// gegebenen release-version-IDs (Plan 117-04 Task 2).
//
// requireChange=true vergleicht fuer jede releaseVersionID die per captureSegmentRenderSources
// VOR der Aenderung eingesammelte Quelle gegen die aktuelle (per segmentRenderInputsChanged) und
// invalidiert nur bei tatsaechlicher Abweichung -- der UpdateAnimeSegment-Basis-Zeit-Pfad.
//
// requireChange=false invalidiert IMMER, ohne Vergleich -- der AttachSegmentLibraryAsset-Pfad
// (RESEARCH.md Risk 5): ein Asset-/Quellenwechsel betrifft die gemeinsame Wiedergabequelle aller
// zugewiesenen Release-Versionen (auch ueberschriebener, deren Override nur die ZEIT, nicht die
// Quelle ersetzt), gilt also immer als render-relevant.
func (h *AdminContentHandler) resetAndQueueSegmentRenderForAssignments(
	ctx context.Context,
	segmentID int64,
	releaseVersionIDs []int64,
	beforeSources map[int64]*models.ThemeSegmentRenderSource,
	requireChange bool,
) error {
	streamRepo, ok := h.themeRepo.(segmentStreamThemeRepository)
	if !ok {
		return fmt.Errorf("segment render fan-out: theme repo does not implement segment stream repository")
	}

	for _, releaseVersionID := range releaseVersionIDs {
		if requireChange {
			after, err := streamRepo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionID)
			if err != nil {
				if !errorsIsNotFound(err) {
					return err
				}
				after = nil
			}
			if !segmentRenderInputsChanged(beforeSources[releaseVersionID], after) {
				continue
			}
		}
		if err := h.resetAndQueueSegmentRenderAfterChange(ctx, segmentID, releaseVersionID); err != nil {
			return err
		}
	}
	return nil
}
