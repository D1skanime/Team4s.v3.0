package repository

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ReleaseReviewCleanupCounts struct {
	Notes int
	Media int
}

type ReleaseReviewFileDeleteJob struct {
	ID                    int64
	ReleaseVersionMediaID int64
	MediaAssetID          int64
	MediaFileID           int64
	Path                  string
	AttemptCount          int
}

type ReleaseReviewCleanupRepository struct {
	pool *pgxpool.Pool
}

func NewReleaseReviewCleanupRepository(pool *pgxpool.Pool) *ReleaseReviewCleanupRepository {
	return &ReleaseReviewCleanupRepository{pool: pool}
}

func (r *ReleaseReviewCleanupRepository) ScrubRejectedBefore(
	ctx context.Context,
	cutoff time.Time,
	tombstonedAt time.Time,
	limit int,
) (ReleaseReviewCleanupCounts, error) {
	if r == nil || r.pool == nil || cutoff.IsZero() || tombstonedAt.IsZero() || limit <= 0 {
		return ReleaseReviewCleanupCounts{}, ErrValidation
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return ReleaseReviewCleanupCounts{}, fmt.Errorf("begin release review logical cleanup: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	counts := ReleaseReviewCleanupCounts{}
	if counts.Notes, err = scrubExpiredReleaseReviewNotes(
		ctx, tx, cutoff.UTC(), tombstonedAt.UTC(), limit,
	); err != nil {
		return ReleaseReviewCleanupCounts{}, err
	}
	if counts.Media, err = scrubExpiredReleaseReviewMedia(
		ctx, tx, cutoff.UTC(), tombstonedAt.UTC(), limit,
	); err != nil {
		return ReleaseReviewCleanupCounts{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ReleaseReviewCleanupCounts{}, fmt.Errorf("commit release review logical cleanup: %w", err)
	}
	return counts, nil
}

type releaseReviewCleanupSource struct {
	SourceID       int64
	SourceRevision int64
	FansubGroupID  int64
	MediaAssetID   int64
}

func scrubExpiredReleaseReviewNotes(
	ctx context.Context,
	tx pgx.Tx,
	cutoff time.Time,
	tombstonedAt time.Time,
	limit int,
) (int, error) {
	rows, err := tx.Query(ctx, `
		SELECT lifecycle.release_version_note_id,
		       lifecycle.source_revision,
		       note.fansub_group_id
		FROM release_version_note_review_lifecycle lifecycle
		JOIN release_version_notes note
		  ON note.id = lifecycle.release_version_note_id
		WHERE lifecycle.review_state = 'rejected'
		  AND lifecycle.last_activity_at <= $1
		ORDER BY lifecycle.last_activity_at, lifecycle.id
		LIMIT $2
		FOR UPDATE OF lifecycle SKIP LOCKED
	`, cutoff, limit)
	if err != nil {
		return 0, fmt.Errorf("select expired release review notes: %w", err)
	}
	sources, err := scanReleaseReviewCleanupSources(rows, false)
	if err != nil {
		return 0, err
	}
	for _, source := range sources {
		if _, err := tx.Exec(ctx, `
			UPDATE release_version_notes
			SET title = NULL,
			    body_markdown = '',
			    body_html = '',
			    body_json = NULL,
			    body_text = '',
			    visibility = 'internal',
			    status = 'deleted',
			    deleted_at = COALESCE(deleted_at, $2)
			WHERE id = $1
		`, source.SourceID, tombstonedAt); err != nil {
			return 0, fmt.Errorf("scrub release review note %d: %w", source.SourceID, err)
		}
		if err := tombstoneReleaseReviewLifecycle(
			ctx,
			tx,
			"release_version_note_review_lifecycle",
			"release_version_note_id",
			source.SourceID,
			source.SourceRevision,
			tombstonedAt,
		); err != nil {
			return 0, err
		}
		if err := scrubReleaseReviewReasons(
			ctx, tx, ReleaseVersionNoteReviewSourceType, source, tombstonedAt,
		); err != nil {
			return 0, err
		}
	}
	return len(sources), nil
}

func scrubExpiredReleaseReviewMedia(
	ctx context.Context,
	tx pgx.Tx,
	cutoff time.Time,
	tombstonedAt time.Time,
	limit int,
) (int, error) {
	rows, err := tx.Query(ctx, `
		SELECT lifecycle.release_version_media_id,
		       lifecycle.source_revision,
		       media.fansub_group_id,
		       media.media_asset_id
		FROM release_version_media_review_lifecycle lifecycle
		JOIN release_version_media media
		  ON media.id = lifecycle.release_version_media_id
		WHERE lifecycle.review_state = 'rejected'
		  AND lifecycle.last_activity_at <= $1
		ORDER BY lifecycle.last_activity_at, lifecycle.id
		LIMIT $2
		FOR UPDATE OF lifecycle, media SKIP LOCKED
	`, cutoff, limit)
	if err != nil {
		return 0, fmt.Errorf("select expired release review media: %w", err)
	}
	sources, err := scanReleaseReviewCleanupSources(rows, true)
	if err != nil {
		return 0, err
	}
	for _, source := range sources {
		if _, err := tx.Exec(ctx, `
			UPDATE release_version_media
			SET caption = NULL,
			    is_preview_candidate = false,
			    deleted_at = COALESCE(deleted_at, $2),
			    updated_at = $2
			WHERE id = $1
		`, source.SourceID, tombstonedAt); err != nil {
			return 0, fmt.Errorf("detach release review media %d: %w", source.SourceID, err)
		}
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
		`, source.SourceID, source.MediaAssetID, tombstonedAt); err != nil {
			return 0, fmt.Errorf("enqueue release review media files %d: %w", source.SourceID, err)
		}
		if err := tombstoneReleaseReviewLifecycle(
			ctx,
			tx,
			"release_version_media_review_lifecycle",
			"release_version_media_id",
			source.SourceID,
			source.SourceRevision,
			tombstonedAt,
		); err != nil {
			return 0, err
		}
		if err := scrubReleaseReviewReasons(
			ctx, tx, ReleaseVersionMediaReviewSourceType, source, tombstonedAt,
		); err != nil {
			return 0, err
		}
	}
	return len(sources), nil
}

func scanReleaseReviewCleanupSources(
	rows pgx.Rows,
	withMediaAsset bool,
) ([]releaseReviewCleanupSource, error) {
	defer rows.Close()
	sources := make([]releaseReviewCleanupSource, 0)
	for rows.Next() {
		var source releaseReviewCleanupSource
		var err error
		if withMediaAsset {
			err = rows.Scan(
				&source.SourceID,
				&source.SourceRevision,
				&source.FansubGroupID,
				&source.MediaAssetID,
			)
		} else {
			err = rows.Scan(
				&source.SourceID,
				&source.SourceRevision,
				&source.FansubGroupID,
			)
		}
		if err != nil {
			return nil, fmt.Errorf("scan release review cleanup source: %w", err)
		}
		sources = append(sources, source)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release review cleanup sources: %w", err)
	}
	return sources, nil
}

func tombstoneReleaseReviewLifecycle(
	ctx context.Context,
	tx pgx.Tx,
	table string,
	sourceColumn string,
	sourceID int64,
	sourceRevision int64,
	tombstonedAt time.Time,
) error {
	query := fmt.Sprintf(`
		UPDATE %s
		SET review_state = 'tombstoned',
		    tombstoned_at = $3,
		    cleanup_due_at = $3,
		    updated_at = $3
		WHERE %s = $1
		  AND source_revision = $2
		  AND review_state = 'rejected'
	`, table, sourceColumn)
	tag, err := tx.Exec(ctx, query, sourceID, sourceRevision, tombstonedAt)
	if err != nil {
		return fmt.Errorf("tombstone release review lifecycle %s:%d: %w", table, sourceID, err)
	}
	if tag.RowsAffected() != 1 {
		return ErrConflict
	}
	return nil
}

func scrubReleaseReviewReasons(
	ctx context.Context,
	tx pgx.Tx,
	sourceType string,
	source releaseReviewCleanupSource,
	tombstonedAt time.Time,
) error {
	sourceKey := strconv.FormatInt(source.SourceID, 10)
	if _, err := tx.Exec(ctx, `
		DELETE FROM review_reason_texts reason
		USING review_audit_events event
		WHERE reason.audit_event_id = event.id
		  AND event.source_type = $1
		  AND event.source_key = $2
	`, sourceType, sourceKey); err != nil {
		return fmt.Errorf("scrub release review reasons %s:%s: %w", sourceType, sourceKey, err)
	}
	if _, err := NewReviewAuditRepository(tx).InsertEvent(ctx, ReviewAuditEventInput{
		EventCode:      ReviewAuditEventReasonScrubbed,
		ActorKind:      ReviewAuditActorSystem,
		FansubGroupID:  source.FansubGroupID,
		SourceType:     sourceType,
		SourceKey:      sourceKey,
		SourceRevision: source.SourceRevision,
		OccurredAt:     tombstonedAt,
	}); err != nil {
		return fmt.Errorf("audit release review reason scrub %s:%s: %w", sourceType, sourceKey, err)
	}
	return nil
}
