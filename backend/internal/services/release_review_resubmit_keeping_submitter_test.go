package services

import (
	"context"
	"testing"
	"time"

	"team4s.v3/backend/internal/repository"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestReleaseMediaReplaceByLeadResetsConfirmedReviewKeepingSubmitter locks WR-03 (user
// decision 2026-10-06, option 2): when someone other than the uploader replaces the file of
// an already confirmed release medium, the medium goes back to pending, the original
// submitter stays recorded, the revision advances, and a stale revision is rejected.
func TestReleaseMediaReplaceByLeadResetsConfirmedReviewKeepingSubmitter(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	ctx := context.Background()
	startedAt := time.Date(2026, 10, 6, 12, 0, 0, 0, time.UTC)

	submitted := fx.submitMedia(t, 601, 11, nil, startedAt)
	require.Equal(t, repository.ReleaseReviewStatePending, submitted.ReviewState)

	// Mark the medium as confirmed directly: this test targets the replace reset, not the
	// decision flow (whose fixture depends on tables this Phase-107 fixture lacks, F-14).
	_, err := fx.pool.Exec(ctx, `
		UPDATE release_version_media_review_lifecycle
		SET review_state = 'confirmed', decided_at = $2, last_activity_at = $2, updated_at = $2
		WHERE release_version_media_id = $1
	`, 601, startedAt.Add(10*time.Minute))
	require.NoError(t, err)

	var state string
	require.NoError(t, fx.pool.QueryRow(ctx, `
		SELECT review_state FROM release_version_media_review_lifecycle WHERE release_version_media_id = 601
	`).Scan(&state))
	require.Equal(t, string(repository.ReleaseReviewStateConfirmed), state)

	replacedAt := startedAt.Add(time.Hour)
	tx, err := fx.pool.Begin(ctx)
	require.NoError(t, err)
	row, err := repository.NewReleaseReviewLifecycleRepository(tx).ResubmitMediaKeepingSubmitter(ctx, repository.ReleaseReviewSubmissionInput{
		SourceID:         601,
		ActorAppUserID:   12, // the lead who replaced the file, not the uploader
		ExpectedRevision: releaseReviewRevision(submitted.SourceRevision),
		LastActivityAt:   replacedAt,
	})
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
	require.NotNil(t, row)

	assert.Equal(t, repository.ReleaseReviewStatePending, row.ReviewState)
	assert.EqualValues(t, submitted.SourceRevision+1, row.SourceRevision)
	assert.EqualValues(t, 11, row.SubmitterAppUserID, "original uploader stays the submitter")
	assert.EqualValues(t, submitted.SubmitterMemberID, row.SubmitterMemberID)

	var persistedState string
	var submitter int64
	var decidedAtNull bool
	require.NoError(t, fx.pool.QueryRow(ctx, `
		SELECT review_state, submitter_app_user_id, decided_at IS NULL
		FROM release_version_media_review_lifecycle WHERE release_version_media_id = 601
	`).Scan(&persistedState, &submitter, &decidedAtNull))
	assert.Equal(t, string(repository.ReleaseReviewStatePending), persistedState)
	assert.EqualValues(t, 11, submitter)
	assert.True(t, decidedAtNull, "the previous confirm decision no longer applies to the new file")

	var auditActor int64
	require.NoError(t, fx.pool.QueryRow(ctx, `
		SELECT actor_app_user_id FROM review_audit_events
		WHERE source_type = $1 AND source_key = '601' AND event_code = $2
		ORDER BY id DESC LIMIT 1
	`, ReleaseVersionMediaReviewSourceType, string(repository.ReviewAuditEventSourceResubmitted)).Scan(&auditActor))
	assert.EqualValues(t, 12, auditActor, "the acting lead is recorded in the audit trail")

	tx2, err := fx.pool.Begin(ctx)
	require.NoError(t, err)
	defer tx2.Rollback(ctx) //nolint:errcheck
	_, err = repository.NewReleaseReviewLifecycleRepository(tx2).ResubmitMediaKeepingSubmitter(ctx, repository.ReleaseReviewSubmissionInput{
		SourceID:         601,
		ActorAppUserID:   12,
		ExpectedRevision: releaseReviewRevision(submitted.SourceRevision), // stale
		LastActivityAt:   replacedAt.Add(time.Minute),
	})
	assert.ErrorIs(t, err, repository.ErrConflict)
}

func TestReleaseMediaResubmitKeepingSubmitterWithoutLifecycleIsNoop(t *testing.T) {
	fx := openReleaseReviewSubmissionFixture(t)
	ctx := context.Background()
	tx, err := fx.pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck
	row, err := repository.NewReleaseReviewLifecycleRepository(tx).ResubmitMediaKeepingSubmitter(ctx, repository.ReleaseReviewSubmissionInput{
		SourceID:         602,
		ActorAppUserID:   12,
		ExpectedRevision: releaseReviewRevision(1),
		LastActivityAt:   time.Date(2026, 10, 6, 12, 0, 0, 0, time.UTC),
	})
	require.NoError(t, err)
	assert.Nil(t, row, "a never-submitted medium has no review state to reset")
}
