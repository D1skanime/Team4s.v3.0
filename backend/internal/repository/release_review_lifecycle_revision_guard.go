package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// CheckMediaRevisionConflict is the narrow revision-conflict guard D-06 (176-09, F-14
// follow-up / BUG-174-04 "Folgehinweis") adds for non-uploader metadata-only edits on release
// media. BUG-174-04 (user decision, Option 1) deliberately keeps non-uploader metadata edits
// (title/caption/category/is_preview_candidate) out of SubmitMedia -- a non-uploader with
// "Bearbeiten (alle)" rights must not re-open review on every correction. That decision never
// touched optimistic-concurrency protection: SubmitMedia's own revision check only runs for
// the uploader's own edits, so two non-uploaders (or a non-uploader racing the uploader's own
// resubmission) editing the same relation concurrently could silently overwrite each other's
// change with no conflict signal at all.
//
// This method restores exactly that missing protection without reopening review: it locks the
// lifecycle row (serializing against SubmitMedia/ResubmitMediaKeepingSubmitter running in a
// concurrent transaction on the same relation) and compares the caller-supplied expectedRevision
// against the row's current source_revision, but never mutates source_revision or review_state
// -- BUG-174-04's "no re-review for non-uploader metadata edits" decision stays intact.
//
// expectedRevision == nil means the caller did not participate in optimistic concurrency for
// this request (matches the pre-existing behavior for callers that omit source_revision) and is
// a no-op. A relation with no lifecycle row yet (never submitted) and a non-nil expectedRevision
// is a conflict: the caller believes a revision exists that does not.
func (r *ReleaseReviewLifecycleRepository) CheckMediaRevisionConflict(
	ctx context.Context,
	relationID int64,
	expectedRevision *int64,
) error {
	if r == nil || r.db == nil || relationID <= 0 {
		return ErrValidation
	}
	if expectedRevision == nil {
		return nil
	}
	if *expectedRevision <= 0 {
		return ErrValidation
	}

	var currentRevision int64
	err := r.db.QueryRow(ctx, `
		SELECT source_revision
		FROM release_version_media_review_lifecycle
		WHERE release_version_media_id = $1
		FOR UPDATE
	`, relationID).Scan(&currentRevision)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrConflict
	}
	if err != nil {
		return fmt.Errorf("check release media revision conflict %d: %w", relationID, err)
	}
	if *expectedRevision != currentRevision {
		return ErrConflict
	}
	return nil
}
