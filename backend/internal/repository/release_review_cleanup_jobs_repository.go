package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

func (r *ReleaseReviewCleanupRepository) ClaimNextFileDeleteJob(
	ctx context.Context,
	now time.Time,
	claimUntil time.Time,
) (*ReleaseReviewFileDeleteJob, error) {
	if r == nil || r.pool == nil || now.IsZero() || claimUntil.Before(now) {
		return nil, ErrValidation
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin release review file job claim: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var job ReleaseReviewFileDeleteJob
	err = tx.QueryRow(ctx, `
		SELECT job.id,
		       job.release_version_media_id,
		       job.media_asset_id,
		       job.media_file_id,
		       COALESCE(media_file.path, ''),
		       job.attempt_count + 1
		FROM release_review_file_delete_jobs job
		LEFT JOIN media_files media_file ON media_file.id = job.media_file_id
		WHERE job.job_state = 'pending'
		  AND (job.next_attempt_at IS NULL OR job.next_attempt_at <= $1)
		ORDER BY job.id
		LIMIT 1
		FOR UPDATE OF job SKIP LOCKED
	`, now.UTC()).Scan(
		&job.ID,
		&job.ReleaseVersionMediaID,
		&job.MediaAssetID,
		&job.MediaFileID,
		&job.Path,
		&job.AttemptCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("claim release review file delete job: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE release_review_file_delete_jobs
		SET attempt_count = $2,
		    last_attempt_at = $3,
		    last_error_code = NULL,
		    next_attempt_at = $4,
		    updated_at = $3
		WHERE id = $1
	`, job.ID, job.AttemptCount, now.UTC(), claimUntil.UTC()); err != nil {
		return nil, fmt.Errorf("persist release review file job claim %d: %w", job.ID, err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit release review file job claim %d: %w", job.ID, err)
	}
	return &job, nil
}

func (r *ReleaseReviewCleanupRepository) HasOtherMediaAssetReference(
	ctx context.Context,
	mediaAssetID int64,
	excludeReleaseVersionMediaID int64,
) (bool, error) {
	if r == nil || r.pool == nil || mediaAssetID <= 0 || excludeReleaseVersionMediaID <= 0 {
		return false, ErrValidation
	}
	rows, err := r.pool.Query(ctx, `
		SELECT namespace.nspname, relation.relname, attribute.attname
		FROM pg_constraint constraint_row
		JOIN pg_class relation ON relation.oid = constraint_row.conrelid
		JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
		JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY source_key(attnum, position)
		  ON TRUE
		JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY target_key(attnum, position)
		  ON target_key.position = source_key.position
		JOIN pg_attribute attribute
		  ON attribute.attrelid = constraint_row.conrelid
		 AND attribute.attnum = source_key.attnum
		JOIN pg_attribute target_attribute
		  ON target_attribute.attrelid = constraint_row.confrelid
		 AND target_attribute.attnum = target_key.attnum
		WHERE constraint_row.contype = 'f'
		  AND constraint_row.confrelid = 'media_assets'::regclass
		  AND target_attribute.attname = 'id'
		ORDER BY namespace.nspname, relation.relname, attribute.attname
	`)
	if err != nil {
		return false, fmt.Errorf("list media asset reference paths: %w", err)
	}
	defer rows.Close()

	type referencePath struct {
		schema string
		table  string
		column string
	}
	references := make([]referencePath, 0)
	for rows.Next() {
		var ref referencePath
		if err := rows.Scan(&ref.schema, &ref.table, &ref.column); err != nil {
			return false, fmt.Errorf("scan media asset reference path: %w", err)
		}
		if ref.table != "media_files" {
			references = append(references, ref)
		}
	}
	if err := rows.Err(); err != nil {
		return false, fmt.Errorf("iterate media asset reference paths: %w", err)
	}
	for _, ref := range references {
		table := pgx.Identifier{ref.schema, ref.table}.Sanitize()
		column := pgx.Identifier{ref.column}.Sanitize()
		query := fmt.Sprintf(`SELECT EXISTS(SELECT 1 FROM %s WHERE %s = $1)`, table, column)
		args := []any{mediaAssetID}
		if ref.table == "release_version_media" {
			query = fmt.Sprintf(
				`SELECT EXISTS(SELECT 1 FROM %s WHERE %s = $1 AND id <> $2)`,
				table,
				column,
			)
			args = append(args, excludeReleaseVersionMediaID)
		}
		var exists bool
		if err := r.pool.QueryRow(ctx, query, args...).Scan(&exists); err != nil {
			return false, fmt.Errorf(
				"check media asset reference %s.%s: %w",
				ref.table,
				ref.column,
				err,
			)
		}
		if exists {
			return true, nil
		}
	}
	return false, nil
}

func (r *ReleaseReviewCleanupRepository) CompleteFileDeleteJob(
	ctx context.Context,
	job ReleaseReviewFileDeleteJob,
	completedAt time.Time,
	markFileDeleted bool,
) error {
	if r == nil || r.pool == nil || job.ID <= 0 || completedAt.IsZero() {
		return ErrValidation
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin release review file job completion %d: %w", job.ID, err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	if markFileDeleted {
		if _, err := tx.Exec(ctx, `
			UPDATE media_files
			SET status = 'deleted'
			WHERE id = $1 AND media_id = $2
		`, job.MediaFileID, job.MediaAssetID); err != nil {
			return fmt.Errorf("mark release review media file %d deleted: %w", job.MediaFileID, err)
		}
	}
	if _, err := tx.Exec(ctx, `
		UPDATE release_review_file_delete_jobs
		SET job_state = 'completed',
		    last_error_code = NULL,
		    next_attempt_at = NULL,
		    completed_at = $2,
		    updated_at = $2
		WHERE id = $1
		  AND job_state = 'pending'
	`, job.ID, completedAt.UTC()); err != nil {
		return fmt.Errorf("complete release review file job %d: %w", job.ID, err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit release review file job completion %d: %w", job.ID, err)
	}
	return nil
}

func (r *ReleaseReviewCleanupRepository) FailFileDeleteJob(
	ctx context.Context,
	jobID int64,
	errorCode string,
	at time.Time,
	retryAt time.Time,
) error {
	if r == nil || r.pool == nil || jobID <= 0 || errorCode == "" ||
		at.IsZero() || retryAt.Before(at) {
		return ErrValidation
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE release_review_file_delete_jobs
		SET last_error_code = $2,
		    next_attempt_at = $3,
		    updated_at = $4
		WHERE id = $1
		  AND job_state = 'pending'
	`, jobID, errorCode, retryAt.UTC(), at.UTC())
	if err != nil {
		return fmt.Errorf("fail release review file job %d: %w", jobID, err)
	}
	return nil
}
