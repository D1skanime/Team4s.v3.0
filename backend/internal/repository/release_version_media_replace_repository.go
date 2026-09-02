package repository

// This file exists to keep new replace-file logic out of the already-oversized
// release_version_media_repository.go (680 lines) and admin_content_release_version_media.go
// (1148 lines) handler file, per CLAUDE.md's 450-line-per-file cap.
//
// ReplaceReleaseVersionMediaFile swaps the stored media_asset_id on an existing
// release_version_media row while leaving the row's own id untouched (Zielbild 1's
// "id bleibt" invariant, 144-CONTEXT.md). EnqueueReleaseVersionMediaFileDeleteJob then
// enqueues the OLD (pre-replace) media_asset_id's files into the existing
// release_review_file_delete_jobs outbox table so they are cleaned up asynchronously
// instead of being left orphaned in storage (Zielbild 4).
//
// Neither method performs the source_revision bump or the review_state reset to
// 'pending' — that is ReleaseReviewLifecycleRepository.SubmitMedia's job
// (release_review_lifecycle_repository.go), already used by PatchReleaseVersionMedia
// and the upload handler for the identical purpose. Callers compose all three calls
// inside one transaction: ReplaceReleaseVersionMediaFile, then
// EnqueueReleaseVersionMediaFileDeleteJob for the returned previous asset id, then
// SubmitMedia.

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// ReplaceReleaseVersionMediaFile swaps the media_asset_id on an existing, non-deleted
// release_version_media row to newMediaAssetID and returns the row's PREVIOUS
// media_asset_id (the file being retired). The row's own id is never read from or
// written to by either statement below — that is what preserves Zielbild 1's identity
// invariant. Returns ErrNotFound if the relation does not exist or is soft-deleted.
func (r *MediaRepository) ReplaceReleaseVersionMediaFile(
	ctx context.Context,
	tx pgx.Tx,
	relationID int64,
	newMediaAssetID int64,
) (previousMediaAssetID int64, err error) {
	err = tx.QueryRow(ctx, `
		SELECT media_asset_id
		FROM release_version_media
		WHERE id = $1
		  AND deleted_at IS NULL
		FOR UPDATE
	`, relationID).Scan(&previousMediaAssetID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("lock release_version_media %d for file replace: %w", relationID, err)
	}

	tag, err := tx.Exec(ctx, `
		UPDATE release_version_media
		SET media_asset_id = $2,
		    updated_at     = NOW()
		WHERE id = $1
		  AND deleted_at IS NULL
	`, relationID, newMediaAssetID)
	if err != nil {
		return 0, fmt.Errorf("replace release_version_media file %d: %w", relationID, err)
	}
	if tag.RowsAffected() == 0 {
		return 0, ErrNotFound
	}

	return previousMediaAssetID, nil
}

// EnqueueReleaseVersionMediaFileDeleteJob enqueues every media_files row belonging to
// mediaAssetID (the OLD, pre-replace asset) into release_review_file_delete_jobs for
// async cleanup by the existing worker (services/release_review_cleanup.go). Mirrors
// the exact INSERT used by scrubExpiredReleaseReviewMedia
// (release_review_cleanup_repository.go). ON CONFLICT (media_file_id) DO NOTHING makes
// a second enqueue of the same relation+asset (e.g. a retried or double-invoked
// replace) a safe no-op rather than a duplicate cleanup obligation.
func (r *MediaRepository) EnqueueReleaseVersionMediaFileDeleteJob(
	ctx context.Context,
	tx pgx.Tx,
	relationID int64,
	mediaAssetID int64,
	enqueuedAt time.Time,
) error {
	if _, err := tx.Exec(ctx, `
		INSERT INTO release_review_file_delete_jobs (
			release_version_media_id,
			media_asset_id,
			media_file_id,
			job_state,
			created_at,
			updated_at
		)
		SELECT $1, $2, media_file.id, 'pending', $3, $3
		FROM media_files media_file
		WHERE media_file.media_id = $2
		ON CONFLICT (media_file_id) DO NOTHING
	`, relationID, mediaAssetID, enqueuedAt); err != nil {
		return fmt.Errorf("enqueue release_review_file_delete_jobs for asset %d: %w", mediaAssetID, err)
	}
	return nil
}
