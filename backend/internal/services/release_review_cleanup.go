package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"team4s.v3/backend/internal/repository"
)

const (
	ReleaseReviewCleanupProductionRetention = 90 * 24 * time.Hour
	ReleaseReviewCleanupLocalRetention      = 5 * time.Hour
	ReleaseReviewCleanupInterval            = 10 * time.Minute
	ReleaseReviewCleanupRetryDelay          = 10 * time.Minute
	releaseReviewCleanupBatchSize           = 50
)

type ReleaseReviewCleanupStore interface {
	ScrubRejectedBefore(
		ctx context.Context,
		cutoff time.Time,
		tombstonedAt time.Time,
		limit int,
	) (repository.ReleaseReviewCleanupCounts, error)
	ClaimNextFileDeleteJob(
		ctx context.Context,
		now time.Time,
		claimUntil time.Time,
	) (*repository.ReleaseReviewFileDeleteJob, error)
	HasOtherMediaAssetReference(
		ctx context.Context,
		mediaAssetID int64,
		excludeReleaseVersionMediaID int64,
	) (bool, error)
	CompleteFileDeleteJob(
		ctx context.Context,
		job repository.ReleaseReviewFileDeleteJob,
		completedAt time.Time,
		markFileDeleted bool,
	) error
	FailFileDeleteJob(
		ctx context.Context,
		jobID int64,
		errorCode string,
		at time.Time,
		retryAt time.Time,
	) error
}

type ReleaseReviewCleanupFileStore interface {
	ResolveManagedPath(raw string) (string, bool)
	RemoveResolvedManagedFile(path string) error
}

type ReleaseReviewCleanupService struct {
	store     ReleaseReviewCleanupStore
	files     ReleaseReviewCleanupFileStore
	retention time.Duration
	now       func() time.Time
}

func NewReleaseReviewCleanupService(
	store ReleaseReviewCleanupStore,
	files ReleaseReviewCleanupFileStore,
	retention time.Duration,
	now func() time.Time,
) *ReleaseReviewCleanupService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &ReleaseReviewCleanupService{
		store:     store,
		files:     files,
		retention: retention,
		now:       now,
	}
}

func ReleaseReviewCleanupRetentionForProfile(profile string) time.Duration {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "", "local", "dev", "development", "test":
		return ReleaseReviewCleanupLocalRetention
	default:
		return ReleaseReviewCleanupProductionRetention
	}
}

func (s *ReleaseReviewCleanupService) RunOnce(ctx context.Context) error {
	if s == nil || s.store == nil || s.files == nil || s.retention <= 0 || s.now == nil {
		return fmt.Errorf("release review cleanup is not configured")
	}
	now := s.now().UTC()
	if _, err := s.store.ScrubRejectedBefore(
		ctx,
		now.Add(-s.retention),
		now,
		releaseReviewCleanupBatchSize,
	); err != nil {
		return fmt.Errorf("release review logical cleanup: %w", err)
	}
	for processed := 0; processed < releaseReviewCleanupBatchSize; processed++ {
		job, err := s.store.ClaimNextFileDeleteJob(
			ctx,
			now,
			now.Add(ReleaseReviewCleanupRetryDelay),
		)
		if err != nil {
			return fmt.Errorf("claim release review physical cleanup: %w", err)
		}
		if job == nil {
			return nil
		}
		if err := s.processFileDeleteJob(ctx, *job, now); err != nil {
			return err
		}
	}
	return nil
}

func (s *ReleaseReviewCleanupService) processFileDeleteJob(
	ctx context.Context,
	job repository.ReleaseReviewFileDeleteJob,
	now time.Time,
) error {
	referenced, err := s.store.HasOtherMediaAssetReference(
		ctx,
		job.MediaAssetID,
		job.ReleaseVersionMediaID,
	)
	if err != nil {
		return s.persistPhysicalFailure(ctx, job, "reference_check_failed", now)
	}
	if referenced {
		if err := s.store.CompleteFileDeleteJob(ctx, job, now, false); err != nil {
			return fmt.Errorf("complete retained release review file job %d: %w", job.ID, err)
		}
		return nil
	}
	if strings.TrimSpace(job.Path) == "" {
		if err := s.store.CompleteFileDeleteJob(ctx, job, now, false); err != nil {
			return fmt.Errorf("complete absent release review file job %d: %w", job.ID, err)
		}
		return nil
	}
	resolved, ok := s.files.ResolveManagedPath(job.Path)
	if !ok {
		return s.persistPhysicalFailure(
			ctx,
			job,
			"path_outside_managed_storage",
			now,
		)
	}
	if err := s.files.RemoveResolvedManagedFile(resolved); err != nil {
		return s.persistPhysicalFailure(ctx, job, "storage_remove_failed", now)
	}
	if err := s.store.CompleteFileDeleteJob(ctx, job, now, true); err != nil {
		return fmt.Errorf("complete release review file job %d: %w", job.ID, err)
	}
	return nil
}

func (s *ReleaseReviewCleanupService) persistPhysicalFailure(
	ctx context.Context,
	job repository.ReleaseReviewFileDeleteJob,
	errorCode string,
	now time.Time,
) error {
	if err := s.store.FailFileDeleteJob(
		ctx,
		job.ID,
		errorCode,
		now,
		now.Add(ReleaseReviewCleanupRetryDelay),
	); err != nil {
		return fmt.Errorf(
			"persist release review file job %d failure %s: %w",
			job.ID,
			errorCode,
			err,
		)
	}
	return nil
}
