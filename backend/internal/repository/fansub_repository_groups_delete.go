package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// 189-08 Task 1: split out of fansub_repository_groups.go (pure import-path
// move, zero behavior change) -- fansub_repository_groups.go had grown past
// the 450-line project limit. This file holds DeleteGroup, the mandatory
// home for Task 2's dependents pre-check (D-12).

func (r *FansubRepository) DeleteGroup(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin delete fansub group tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// D-12 (189-REVIEW.md CR-02): pre-check every real dependent INSIDE the
	// already-open transaction, mirroring
	// ensureRemovedReleaseVersionGroupsHaveNoDependents's precedent in
	// release_version_group_guard.go -- minimizes the TOCTOU window in which
	// a dependent row could be created between the check and the DELETE.
	// This applies identically to every caller -- including platform admins,
	// who gate through the same DeleteFansub handler with no bypass branch --
	// turning today's silent CASCADE / raw uncaught FK error (e.g.
	// review_decisions/review_audit_events, which have no ON DELETE clause
	// at all) into one consistent, counted, typed error.
	summary, err := countFansubGroupDependents(ctx, tx, id)
	if err != nil {
		return fmt.Errorf("check fansub group %d dependents: %w", id, err)
	}
	if summary.HasAny() {
		return &FansubGroupHasDependentsError{FansubGroupID: id, Summary: summary}
	}

	// Historical members and contributions intentionally use RESTRICT FKs.
	// Admin group deletion is the explicit cleanup boundary for those records.
	if _, err := tx.Exec(ctx, `DELETE FROM anime_contributions WHERE fansub_group_id = $1`, id); err != nil {
		return fmt.Errorf("delete fansub group %d contributions: %w", id, err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM hist_fansub_group_members WHERE fansub_group_id = $1`, id); err != nil {
		return fmt.Errorf("delete fansub group %d historical members: %w", id, err)
	}

	commandTag, err := tx.Exec(ctx, `DELETE FROM fansub_groups WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete fansub group %d: %w", id, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit delete fansub group tx: %w", err)
	}

	return nil
}
