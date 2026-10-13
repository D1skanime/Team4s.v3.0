package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// BumpMediaRevisionForMetadataEdit is the narrow optimistic-concurrency primitive for
// metadata-only release media edits (title/caption/category/is_preview_candidate).
//
// BUG-174-04 (user decision, Option 1, 2026-10-06) and the follow-up user decision of
// 2026-10-12 (Option B) both establish the same rule for release_version_media: editing
// metadata that carries no file content must NEVER reopen review, for ANY editor --
// uploader or non-uploader alike. Only an actual file replacement (ReplaceReleaseVersionMediaFile,
// via SubmitMedia/ResubmitMediaKeepingSubmitter) may reset review_state back to 'pending'.
//
// This method keeps the two concepts that earlier revisions of this code conflated --
// "optimistic-concurrency revision counter" and "re-review trigger" -- cleanly separate: it
// locks the lifecycle row (serializing against SubmitMedia/ResubmitMediaKeepingSubmitter
// running concurrently on the same relation), verifies the caller-supplied expectedRevision
// against the row's current source_revision, and on a match increments source_revision by
// exactly one so a concurrent metadata edit against the same stale revision is still
// detected -- but it never touches review_state, decided_at, submitted_at, cleanup_due_at,
// or tombstoned_at. A confirmed/rejected medium stays confirmed/rejected; it does not
// reappear in the review queue just because its title or caption changed.
//
// expectedRevision must be non-nil and positive: metadata edits on release_version_media
// (unlike some older call sites) always participate in optimistic concurrency now, so a
// missing source_revision is a validation error at the handler layer, not a silent no-op
// here. A relation with no lifecycle row yet (never submitted) is a conflict: the caller
// believes a revision exists that does not.
func (r *ReleaseReviewLifecycleRepository) BumpMediaRevisionForMetadataEdit(
	ctx context.Context,
	relationID int64,
	expectedRevision *int64,
) (int64, error) {
	if r == nil || r.db == nil || relationID <= 0 {
		return 0, ErrValidation
	}
	if expectedRevision == nil || *expectedRevision <= 0 {
		return 0, ErrValidation
	}

	var currentRevision int64
	err := r.db.QueryRow(ctx, `
		SELECT source_revision
		FROM release_version_media_review_lifecycle
		WHERE release_version_media_id = $1
		FOR UPDATE
	`, relationID).Scan(&currentRevision)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrConflict
	}
	if err != nil {
		return 0, fmt.Errorf("lock release media revision for metadata edit %d: %w", relationID, err)
	}
	if *expectedRevision != currentRevision {
		return 0, ErrConflict
	}

	var newRevision int64
	if err := r.db.QueryRow(ctx, `
		UPDATE release_version_media_review_lifecycle
		SET source_revision = source_revision + 1,
		    last_activity_at = NOW()
		WHERE release_version_media_id = $1
		RETURNING source_revision
	`, relationID).Scan(&newRevision); err != nil {
		return 0, fmt.Errorf("bump release media revision for metadata edit %d: %w", relationID, err)
	}
	return newRevision, nil
}
