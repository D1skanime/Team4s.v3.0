package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// DependencySummary reports how many real, counted dependents a single
// (release_version_id, fansub_group_id) pair has (Phase 187). Deliberately
// never includes release_crew_snapshots (D-09): that table holds no actual
// crew content of its own -- only release_version_id/fansub_group_id/
// snapshot_mode -- real credit content lives exclusively in
// release_role_credit_lifecycles.
type DependencySummary struct {
	Credits int32
	Media   int32
	Notes   int32
}

// HasAny reports whether this pair has at least one real dependent of any
// counted kind.
func (s DependencySummary) HasAny() bool {
	return s.Credits > 0 || s.Media > 0 || s.Notes > 0
}

// dependentsQueryRower is the minimal surface countReleaseVersionGroupDependents
// needs. Both *pgxpool.Pool and pgx.Tx satisfy it, so the same counting
// function serves a pre-write transactional check (A2: pre-check, no
// savepoints) and a plain, non-transactional read (GetReleaseVersionGroupDependents).
type dependentsQueryRower interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// countReleaseVersionGroupDependents counts the real dependents of a single
// (release_version_id, fansub_group_id) pair: awarded/pending/reversed
// release_role_credit_lifecycles rows (D-07), non-deleted release_version_media
// rows (D-08), and non-deleted release_version_notes rows (D-08). This is the
// EXACT SAME call regardless of whether the fansub group is the release's only
// group or one of several partner groups -- no parameter distinguishes "sole"
// vs "partner" (D-07's "no exception for partner groups").
func countReleaseVersionGroupDependents(
	ctx context.Context,
	db dependentsQueryRower,
	releaseVersionID int64,
	fansubGroupID int64,
) (DependencySummary, error) {
	var summary DependencySummary
	err := db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM release_role_credit_lifecycles
				WHERE release_version_id = $1 AND fansub_group_id = $2) AS credits,
			(SELECT COUNT(*) FROM release_version_media
				WHERE release_version_id = $1 AND fansub_group_id = $2 AND deleted_at IS NULL) AS media,
			(SELECT COUNT(*) FROM release_version_notes
				WHERE release_version_id = $1 AND fansub_group_id = $2 AND deleted_at IS NULL) AS notes
	`, releaseVersionID, fansubGroupID).Scan(&summary.Credits, &summary.Media, &summary.Notes)
	if err != nil {
		return DependencySummary{}, fmt.Errorf("count release version group dependents: %w", err)
	}
	return summary, nil
}

// GetReleaseVersionGroupDependents is the sole exported entry point Plan 04's
// handler code uses to inspect a single pair's dependents before offering a
// group change in the UI. Kept as a thin wrapper here (not added to
// episode_version_repository.go itself) so that already-oversized file is not
// touched -- and therefore does not need the 450-line split -- in this phase.
func (r *EpisodeVersionRepository) GetReleaseVersionGroupDependents(
	ctx context.Context,
	releaseVersionID int64,
	fansubGroupID int64,
) (DependencySummary, error) {
	return countReleaseVersionGroupDependents(ctx, r.db, releaseVersionID, fansubGroupID)
}

// queryCurrentReleaseVersionGroupIDs reads the current fansub_group_id set for
// a release version, inside the caller's transaction (A2: pre-check runs
// before any DELETE/INSERT for the same mapping/patch).
func queryCurrentReleaseVersionGroupIDs(ctx context.Context, tx pgx.Tx, releaseVersionID int64) ([]int64, error) {
	rows, err := tx.Query(ctx, `
		SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1
	`, releaseVersionID)
	if err != nil {
		return nil, fmt.Errorf("query current release version groups: %w", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan current release version group id: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate current release version group ids: %w", err)
	}
	return ids, nil
}

// diffRemovedReleaseVersionGroupIDs is a pure set-difference helper: current
// minus new. A same-group update or an add-only change always yields an empty
// result (the guard below becomes a no-op); only an actual replace/removal
// produces a non-empty result. This single definition is why D-07 ("removing
// a partner group follows the same Stufe-2 logic, no exception") and D-12
// ("same-group update / adding a partner group is always allowed") are both
// already true without any call-site-specific exception logic.
func diffRemovedReleaseVersionGroupIDs(current, new []int64) []int64 {
	keep := make(map[int64]struct{}, len(new))
	for _, id := range new {
		keep[id] = struct{}{}
	}
	removed := make([]int64, 0, len(current))
	for _, id := range current {
		if _, stillPresent := keep[id]; !stillPresent {
			removed = append(removed, id)
		}
	}
	return removed
}

// ensureReleaseVersionGroupsNotReducedToEmpty rejects a patch that would
// reduce a release version from one or more current groups down to zero new
// groups (D-06/D-14). A release version with zero current groups is not this
// function's concern (nothing to protect) and an unchanged/non-empty new
// count is always allowed.
func ensureReleaseVersionGroupsNotReducedToEmpty(currentCount, newCount int) error {
	if currentCount > 0 && newCount == 0 {
		return ErrReleaseVersionGroupsEmpty
	}
	return nil
}

// ensureRemovedReleaseVersionGroupsHaveNoDependents gates an actual group
// replacement/removal on every removed group having zero real dependents
// (D-01/D-07/D-08/D-09). Called with an empty removed slice -- the same-group
// update / add-only case -- it returns nil WITHOUT issuing any query.
func ensureRemovedReleaseVersionGroupsHaveNoDependents(
	ctx context.Context,
	tx pgx.Tx,
	releaseVersionID int64,
	removed []int64,
) error {
	for _, fansubGroupID := range removed {
		summary, err := countReleaseVersionGroupDependents(ctx, tx, releaseVersionID, fansubGroupID)
		if err != nil {
			return err
		}
		if summary.HasAny() {
			return &GroupHasDependentsError{FansubGroupID: fansubGroupID, Summary: summary}
		}
	}
	return nil
}
