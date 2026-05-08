package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// StaleProcessingCleanupCandidate represents a media_asset row stuck in
// status='processing' beyond the stale threshold.
// The cleanup service marks these assets as 'failed' and removes staging files.
type StaleProcessingCleanupCandidate struct {
	MediaAssetID int64
	FilePath     string
	StuckSince   time.Time
}

// MissingFileCleanupCandidate represents a media_files row whose physical file
// is missing from the storage layer. The cleanup service marks these rows as
// status='missing' and escalates the asset to 'failed' when no ready variant
// remains.
type MissingFileCleanupCandidate struct {
	MediaFileID  int64
	MediaAssetID int64
	FilePath     string
}

// SoftDeleteCleanupCandidate represents a release_version_media row that has
// been soft-deleted and has no other active relation referencing the same
// media_asset. The cleanup service physically removes the asset files for these
// rows.
type SoftDeleteCleanupCandidate struct {
	RelationID       int64
	MediaAssetID     int64
	OriginalFilePath string
	ThumbFilePath    string
	DeletedAt        time.Time
}

// SelectStaleProcessingRVMAssets returns media_assets rows that are still in
// status='processing' and were created more than staleAge ago. These assets
// are stuck upload attempts that never reached 'ready'. The cleanup service
// transitions them to 'failed'.
//
// Only assets referenced by at least one release_version_media row are
// selected — orphan assets not yet linked to a release_version are excluded
// because a separate orphan-directory scan handles those.
func (r *MediaRepository) SelectStaleProcessingRVMAssets(
	ctx context.Context,
	staleAge time.Duration,
) ([]StaleProcessingCleanupCandidate, error) {
	cutoff := time.Now().UTC().Add(-staleAge)
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ma.id, COALESCE(ma.file_path, '')
		FROM media_assets ma
		JOIN release_version_media rvm ON rvm.media_asset_id = ma.id
		WHERE ma.status = 'processing'
		  AND ma.created_at < $1
	`, cutoff)
	if err != nil {
		return nil, fmt.Errorf("select stale processing rvm assets: %w", err)
	}
	defer rows.Close()

	var candidates []StaleProcessingCleanupCandidate
	for rows.Next() {
		var c StaleProcessingCleanupCandidate
		if err := rows.Scan(&c.MediaAssetID, &c.FilePath); err != nil {
			return nil, fmt.Errorf("scan stale processing rvm asset row: %w", err)
		}
		c.StuckSince = cutoff
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stale processing rvm asset rows: %w", err)
	}
	return candidates, nil
}

// SelectMissingFileRVMCandidates returns media_files rows whose status is NOT
// 'missing' or 'deleted' and that belong to media_assets referenced by at
// least one release_version_media row. The caller checks the physical existence
// of each FilePath and calls MarkMediaFileMissing for absent files.
func (r *MediaRepository) SelectMissingFileRVMCandidates(
	ctx context.Context,
) ([]MissingFileCleanupCandidate, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT mf.id, mf.media_id, COALESCE(mf.path, '')
		FROM media_files mf
		JOIN release_version_media rvm ON rvm.media_asset_id = mf.media_id
		JOIN media_assets ma ON ma.id = mf.media_id
		WHERE mf.status NOT IN ('missing', 'deleted')
		  AND ma.status NOT IN ('failed', 'deleted')
	`)
	if err != nil {
		return nil, fmt.Errorf("select missing file rvm candidates: %w", err)
	}
	defer rows.Close()

	var candidates []MissingFileCleanupCandidate
	for rows.Next() {
		var c MissingFileCleanupCandidate
		if err := rows.Scan(&c.MediaFileID, &c.MediaAssetID, &c.FilePath); err != nil {
			return nil, fmt.Errorf("scan missing file rvm candidate row: %w", err)
		}
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate missing file rvm candidate rows: %w", err)
	}
	return candidates, nil
}

// SelectSoftDeleteRVMCleanupCandidates returns soft-deleted release_version_media
// rows whose associated media_asset is NOT referenced by any other active
// (non-deleted) release_version_media row. These are safe for physical file
// deletion and subsequent hard-delete or status update of the asset.
//
// The no-other-reference check is enforced at SQL level: the subquery counts
// active rows for the same media_asset_id excluding the current soft-deleted
// row. Only exclusively-owned assets are returned.
func (r *MediaRepository) SelectSoftDeleteRVMCleanupCandidates(
	ctx context.Context,
) ([]SoftDeleteCleanupCandidate, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvm.id,
			rvm.media_asset_id,
			COALESCE(mf_orig.path, ''),
			COALESCE(mf_thumb.path, ''),
			rvm.deleted_at
		FROM release_version_media rvm
		LEFT JOIN media_files mf_orig  ON mf_orig.media_id  = rvm.media_asset_id AND mf_orig.variant  = 'original'
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb'
		WHERE rvm.deleted_at IS NOT NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM release_version_media other
			WHERE other.media_asset_id = rvm.media_asset_id
			  AND other.id             != rvm.id
			  AND other.deleted_at     IS NULL
		  )
	`)
	if err != nil {
		return nil, fmt.Errorf("select soft delete rvm cleanup candidates: %w", err)
	}
	defer rows.Close()

	var candidates []SoftDeleteCleanupCandidate
	for rows.Next() {
		var c SoftDeleteCleanupCandidate
		if err := rows.Scan(
			&c.RelationID, &c.MediaAssetID,
			&c.OriginalFilePath, &c.ThumbFilePath,
			&c.DeletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan soft delete rvm cleanup candidate row: %w", err)
		}
		candidates = append(candidates, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate soft delete rvm cleanup candidate rows: %w", err)
	}
	return candidates, nil
}

// IsMediaAssetReferencedByOtherRVM checks whether mediaAssetID is referenced
// by any active (non-deleted) release_version_media row other than
// excludeRelationID. Returns true if another reference exists.
//
// Used by the cleanup service as a runtime safety check before physically
// deleting asset files even when the SQL query already enforces this at
// selection time.
func (r *MediaRepository) IsMediaAssetReferencedByOtherRVM(
	ctx context.Context,
	mediaAssetID int64,
	excludeRelationID int64,
) (bool, error) {
	var count int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media
		WHERE media_asset_id = $1
		  AND id             != $2
		  AND deleted_at     IS NULL
	`, mediaAssetID, excludeRelationID).Scan(&count); err != nil {
		return false, fmt.Errorf("check rvm asset references for asset %d: %w", mediaAssetID, err)
	}
	return count > 0, nil
}

// MarkMediaAssetStatusByID updates media_assets.status for a single asset row.
// Used by the cleanup service to transition stale-processing assets to 'failed'.
func (r *MediaRepository) MarkMediaAssetStatusByID(
	ctx context.Context,
	mediaAssetID int64,
	status string,
) error {
	_, err := r.db.Exec(ctx,
		`UPDATE media_assets SET status = $1 WHERE id = $2`,
		status, mediaAssetID,
	)
	if err != nil {
		return fmt.Errorf("mark media asset %d status=%s: %w", mediaAssetID, status, err)
	}
	return nil
}

// MarkMediaFileMissing updates media_files.status to 'missing' for a single
// file row. Called by the cleanup service after a physical existence check fails.
func (r *MediaRepository) MarkMediaFileMissing(
	ctx context.Context,
	mediaFileID int64,
) error {
	_, err := r.db.Exec(ctx,
		`UPDATE media_files SET status = 'missing' WHERE id = $1`,
		mediaFileID,
	)
	if err != nil {
		return fmt.Errorf("mark media file %d missing: %w", mediaFileID, err)
	}
	return nil
}

// HasReadyMediaFileForAsset returns true when at least one media_files row for
// the given asset has status='ready'. Used by the cleanup service to decide
// whether to escalate the asset to 'failed' after marking a file as missing.
func (r *MediaRepository) HasReadyMediaFileForAsset(
	ctx context.Context,
	mediaAssetID int64,
) (bool, error) {
	var count int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM media_files
		WHERE media_id = $1
		  AND status   = 'ready'
	`, mediaAssetID).Scan(&count); err != nil {
		return false, fmt.Errorf("check ready media files for asset %d: %w", mediaAssetID, err)
	}
	return count > 0, nil
}

// HardDeleteRVMAndAsset physically removes the release_version_media row and
// its associated media_assets + media_files rows.
// Called only after IsMediaAssetReferencedByOtherRVM confirms no other active
// relation holds the same asset. The caller is responsible for deleting
// physical files before calling this method.
func (r *MediaRepository) HardDeleteRVMAndAsset(
	ctx context.Context,
	relationID int64,
	mediaAssetID int64,
) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin hard delete rvm tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM media_files WHERE media_id = $1`, mediaAssetID,
	); err != nil {
		return fmt.Errorf("hard delete media_files for asset %d: %w", mediaAssetID, err)
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM release_version_media WHERE id = $1`, relationID,
	); err != nil {
		return fmt.Errorf("hard delete release_version_media %d: %w", relationID, err)
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM media_assets WHERE id = $1`, mediaAssetID,
	); err != nil {
		return fmt.Errorf("hard delete media_assets %d: %w", mediaAssetID, err)
	}
	return tx.Commit(ctx)
}
