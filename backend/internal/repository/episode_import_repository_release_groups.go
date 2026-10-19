package repository

import (
	"context"
	"fmt"
	"sort"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// upsertReleaseVersionGroup was extracted verbatim out of
// episode_import_repository_release_helpers.go (Phase 187, Plan 03, Task 1 --
// pure split, no behavior change at extraction time) to keep that file under
// the project's 450-line limit. Plan 03's Task 2 wires the Phase-187
// dependents guard (release_version_group_guard.go, Plan 01) into this
// function -- the import path's sibling of Plan 02's editor-path
// syncEpisodeVersionSelectedGroups, but deliberately NARROWER per D-12: only
// an actual group-replace is blocked, never a same-group re-apply or a
// partner-group addition. That distinction falls out of
// diffRemovedReleaseVersionGroupIDs' set-difference by construction (an
// unchanged or add-only `memberGroups` set always yields an empty `removed`
// set, so ensureRemovedReleaseVersionGroupsHaveNoDependents is a no-op) --
// no `isImportPath`-style exception flag exists or is needed.
func upsertReleaseVersionGroup(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	mapping models.EpisodeImportMappingRow,
	media models.EpisodeImportMediaCandidate,
	learned *[]models.LearnedFansubAlias,
) error {
	memberGroups, err := resolveImportFansubSelection(ctx, tx, mapping, media)
	if err != nil {
		return err
	}

	currentIDs, err := queryCurrentReleaseVersionGroupIDs(ctx, tx, releaseVersionID)
	if err != nil {
		return err
	}
	if err := ensureReleaseVersionGroupsNotReducedToEmpty(len(currentIDs), len(memberGroups)); err != nil {
		return err
	}
	if len(memberGroups) == 0 {
		// currentIDs is already empty here (the guard above would have
		// rejected the patch otherwise) -- a release version that never had a
		// group stays a pure no-op, same as before this guard existed.
		return nil
	}

	if err := learnFansubGroupAliasesForExplicitSelection(ctx, tx, mapping, media, memberGroups, learned); err != nil {
		return err
	}

	animeID, err := lookupAnimeIDByReleaseVersion(ctx, tx, releaseVersionID)
	if err != nil {
		return err
	}
	if err := lockSegmentAssignmentAnimeTx(ctx, tx, animeID); err != nil {
		return err
	}

	newIDs := make([]int64, len(memberGroups))
	for i, g := range memberGroups {
		newIDs[i] = g.ID
	}

	// D-12: removed is the set of currently-present groups that the new
	// selection drops. A same-group update or a pure add (partner group)
	// always yields an empty removed set here, so the guard below is a
	// no-op in those cases -- only an actual replace/removal is gated.
	removed := diffRemovedReleaseVersionGroupIDs(currentIDs, newIDs)
	if err := ensureRemovedReleaseVersionGroupsHaveNoDependents(ctx, tx, releaseVersionID, removed); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		DELETE FROM release_version_groups
		WHERE release_version_id = $1
		  AND fansub_group_id <> ALL($2::bigint[])
	`, releaseVersionID, newIDs); err != nil {
		return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
	}

	// Phase 156, Workstream B (P156-04): Episoden-Sortindex + normalisierte Version EINMAL
	// aufloesen (nicht pro Gruppe), damit das nachfolgende Auto-Assign gebuendelt pro Gruppe
	// laufen kann statt pro Segment. Siehe episode_import_repository_release_autoassign.go.
	episodeSortIndex, normalizedVersion, err := resolveReleaseVersionEpisodeSortIndexAndVersion(ctx, tx, releaseVersionID)
	if err != nil {
		return err
	}

	for _, group := range memberGroups {
		if _, err := tx.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id)
			VALUES ($1, $2)
			ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
		`, releaseVersionID, group.ID); err != nil {
			return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, group.ID, err)
		}
	}
	if err := autoAssignThemeSegmentsForNewReleaseVersion(ctx, tx, releaseVersionID, newIDs, normalizedVersion, episodeSortIndex); err != nil {
		return err
	}

	return ensureAnimeFansubGroupLinksForMembers(ctx, tx, animeID, memberGroups)
}

// ensureAnimeFansubGroupLinksForMembers schreibt idempotente anime_fansub_groups-Zeilen
// für alle echten Mitglieds-Gruppen (D-07 — nur echte Mitglieds-IDs, keine Kombigruppen-ID).
// Moved here (Phase 187, Plan 03, Task 1) alongside upsertReleaseVersionGroup since both deal
// with writing the release-version/anime group relationships -- a thematically coherent split,
// not just a line-count workaround.
func ensureAnimeFansubGroupLinksForMembers(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	memberGroups []resolvedImportFansubGroup,
) error {
	for _, groupID := range buildAnimeFansubLinkGroupIDs(memberGroups) {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes)
			VALUES ($1, $2, false, NULL)
			ON CONFLICT (anime_id, fansub_group_id) DO NOTHING
		`, animeID, groupID); err != nil {
			return fmt.Errorf("ensure anime fansub group link anime=%d group=%d: %w", animeID, groupID, err)
		}
	}
	return nil
}

// buildAnimeFansubLinkGroupIDs extrahiert deduplizierte, sortierte Gruppen-IDs
// aus einer flachen Liste echter Mitglieds-Gruppen (D-07 — kein EffectiveGroup mehr).
func buildAnimeFansubLinkGroupIDs(memberGroups []resolvedImportFansubGroup) []int64 {
	seen := make(map[int64]struct{}, len(memberGroups))
	result := make([]int64, 0, len(memberGroups))
	for _, group := range memberGroups {
		if group.ID <= 0 {
			continue
		}
		if _, exists := seen[group.ID]; exists {
			continue
		}
		seen[group.ID] = struct{}{}
		result = append(result, group.ID)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i] < result[j]
	})
	return result
}
