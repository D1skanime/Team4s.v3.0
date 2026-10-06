package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
)

// ResubmitMediaKeepingSubmitter puts an already-submitted release medium back into review
// after its file content was replaced by someone other than the uploader (e.g. a group or
// project lead with update-all rights). The original submitter stays recorded on the
// lifecycle row; only the review state (back to pending), the source revision and the
// activity timestamps change. The acting user is recorded in the audit event.
//
// WR-03 / BUG-174-04 follow-up, user decision 2026-10-06 (option 2): replacing the file
// changes the reviewed content, so a confirmed state must never carry over to a new file.
// Metadata-only edits by non-uploaders keep the review state (handled by the caller).
//
// A medium that was never submitted has no lifecycle row; then there is nothing to reset
// and nil, nil is returned. Revision-conflict and tombstone rules match submitLifecycle.
func (r *ReleaseReviewLifecycleRepository) ResubmitMediaKeepingSubmitter(
	ctx context.Context,
	input ReleaseReviewSubmissionInput,
) (*ReleaseReviewLifecycle, error) {
	if err := validateReleaseReviewSubmission(r, input); err != nil {
		return nil, err
	}

	var source ReleaseReviewLifecycle
	var previousRevision int64
	var previousState string
	err := r.db.QueryRow(ctx, `
		SELECT lifecycle.source_revision, lifecycle.review_state,
		       lifecycle.submitter_app_user_id, lifecycle.submitter_member_id,
		       rvm.release_version_id, rvm.fansub_group_id, rvm.category
		FROM release_version_media_review_lifecycle lifecycle
		JOIN release_version_media rvm ON rvm.id = lifecycle.release_version_media_id
		WHERE lifecycle.release_version_media_id = $1
		  AND rvm.deleted_at IS NULL
		FOR UPDATE OF lifecycle
	`, input.SourceID).Scan(
		&previousRevision, &previousState,
		&source.SubmitterAppUserID, &source.SubmitterMemberID,
		&source.ReleaseVersionID, &source.FansubGroupID, &source.Category,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lock release media review lifecycle %d for resubmit: %w", input.SourceID, err)
	}
	if input.ExpectedRevision == nil ||
		*input.ExpectedRevision != previousRevision ||
		ReleaseReviewState(previousState) == ReleaseReviewStateTombstoned {
		return nil, ErrConflict
	}
	if !isReleaseReviewMediaCategory(source.Category) {
		return nil, ErrValidation
	}

	source.SourceType = ReleaseVersionMediaReviewSourceType
	source.SourceID = input.SourceID
	source.StableKey = strconv.FormatInt(input.SourceID, 10)
	source.SourceRevision = previousRevision + 1
	source.ReviewState = ReleaseReviewStatePending
	source.LastActivityAt = input.LastActivityAt.UTC()

	table, sourceColumn, err := releaseReviewLifecycleTable(source.SourceType)
	if err != nil {
		return nil, err
	}
	if err := r.updateLifecycle(ctx, table, sourceColumn, source); err != nil {
		return nil, err
	}

	actorAppUserID := input.ActorAppUserID
	if _, err := NewReviewAuditRepository(r.db).InsertEvent(ctx, ReviewAuditEventInput{
		EventCode:      ReviewAuditEventSourceResubmitted,
		ActorKind:      ReviewAuditActorAppUser,
		ActorAppUserID: &actorAppUserID,
		FansubGroupID:  source.FansubGroupID,
		SourceType:     source.SourceType,
		SourceKey:      source.StableKey,
		SourceRevision: source.SourceRevision,
		OccurredAt:     source.LastActivityAt,
	}); err != nil {
		return nil, fmt.Errorf("audit release media resubmit %d: %w", input.SourceID, err)
	}
	return &source, nil
}
