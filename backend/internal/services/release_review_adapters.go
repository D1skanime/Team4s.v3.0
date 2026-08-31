package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"team4s.v3/backend/internal/repository"

	"github.com/jackc/pgx/v5"
)

const (
	ReleaseVersionNoteReviewSourceType  = repository.ReleaseVersionNoteReviewSourceType
	ReleaseVersionMediaReviewSourceType = repository.ReleaseVersionMediaReviewSourceType
)

type releaseVersionNoteReviewAdapter struct {
	now func() time.Time
}

type releaseVersionMediaReviewAdapter struct {
	now func() time.Time
}

func ReleaseReviewAdapters() map[string]ReviewTargetAdapter {
	return map[string]ReviewTargetAdapter{
		ReleaseVersionNoteReviewSourceType:  &releaseVersionNoteReviewAdapter{now: time.Now},
		ReleaseVersionMediaReviewSourceType: &releaseVersionMediaReviewAdapter{now: time.Now},
	}
}

func (a *releaseVersionNoteReviewAdapter) LoadForDecision(
	ctx context.Context,
	db repository.DBTX,
	ref ReviewTargetRef,
) (ReviewTarget, error) {
	sourceID, err := parseReleaseReviewSourceID(ref, ReleaseVersionNoteReviewSourceType)
	if err != nil {
		return ReviewTarget{}, err
	}
	var target ReviewTarget
	var state string
	err = db.QueryRow(ctx, `
		SELECT lifecycle.source_revision,
		       rvn.fansub_group_id,
		       lifecycle.submitter_app_user_id,
		       lifecycle.submitter_member_id,
		       lifecycle.review_state
		FROM release_version_note_review_lifecycle lifecycle
		JOIN release_version_notes rvn
		  ON rvn.id = lifecycle.release_version_note_id
		 AND rvn.member_id = lifecycle.submitter_member_id
		 AND rvn.deleted_at IS NULL
		JOIN release_version_groups rvg
		  ON rvg.release_version_id = rvn.release_version_id
		 AND rvg.fansub_group_id = rvn.fansub_group_id
		JOIN member_claims claim
		  ON claim.app_user_id = lifecycle.submitter_app_user_id
		 AND claim.member_id = lifecycle.submitter_member_id
		 AND claim.claim_status = 'verified'
		WHERE lifecycle.release_version_note_id = $1
	`, sourceID).Scan(
		&target.Revision,
		&target.FansubGroupID,
		&target.SubmitterAppUserID,
		&target.BeneficiaryMemberID,
		&state,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return ReviewTarget{}, repository.ErrNotFound
	}
	if err != nil {
		return ReviewTarget{}, fmt.Errorf("load release note review target %d: %w", sourceID, err)
	}
	target.Ref = ref
	target.ReviewKind = repository.ReviewKindText
	target.Pending = repository.ReleaseReviewState(state) == repository.ReleaseReviewStatePending
	return target, nil
}

func (a *releaseVersionNoteReviewAdapter) ApplyDecision(
	ctx context.Context,
	db repository.DBTX,
	target ReviewTarget,
	decision ReviewDecision,
) error {
	sourceID, err := parseReleaseReviewSourceID(target.Ref, ReleaseVersionNoteReviewSourceType)
	if err != nil {
		return err
	}
	decidedAt := adapterNow(a.now)
	if err := applyReleaseReviewLifecycleDecision(
		ctx,
		db,
		"release_version_note_review_lifecycle",
		"release_version_note_id",
		sourceID,
		target.Revision,
		decision,
		decidedAt,
	); err != nil {
		return err
	}

	visibility, status := "internal", "draft"
	if decision == ReviewDecisionConfirm {
		visibility, status = "public", "published"
	}
	tag, err := db.Exec(ctx, `
		UPDATE release_version_notes
		SET visibility = $2,
		    status = $3
		WHERE id = $1
		  AND deleted_at IS NULL
	`, sourceID, visibility, status)
	if err != nil {
		return fmt.Errorf("apply release note review source %d: %w", sourceID, err)
	}
	if tag.RowsAffected() != 1 {
		return repository.ErrConflict
	}
	if decision == ReviewDecisionConfirm {
		if err := creditReleaseReviewContribution(ctx, db, target, decidedAt); err != nil {
			return err
		}
		return auditReleaseReviewPublished(ctx, db, target, decidedAt)
	}
	return nil
}

func (a *releaseVersionMediaReviewAdapter) LoadForDecision(
	ctx context.Context,
	db repository.DBTX,
	ref ReviewTargetRef,
) (ReviewTarget, error) {
	sourceID, err := parseReleaseReviewSourceID(ref, ReleaseVersionMediaReviewSourceType)
	if err != nil {
		return ReviewTarget{}, err
	}
	var target ReviewTarget
	var state string
	err = db.QueryRow(ctx, `
		SELECT lifecycle.source_revision,
		       rvm.fansub_group_id,
		       lifecycle.submitter_app_user_id,
		       lifecycle.submitter_member_id,
		       lifecycle.review_state
		FROM release_version_media_review_lifecycle lifecycle
		JOIN release_version_media rvm
		  ON rvm.id = lifecycle.release_version_media_id
		 AND rvm.deleted_at IS NULL
		JOIN release_version_groups rvg
		  ON rvg.release_version_id = rvm.release_version_id
		 AND rvg.fansub_group_id = rvm.fansub_group_id
		JOIN app_users app_user
		  ON app_user.id = lifecycle.submitter_app_user_id
		 AND app_user.legacy_user_id = rvm.uploaded_by_user_id
		JOIN member_claims claim
		  ON claim.app_user_id = lifecycle.submitter_app_user_id
		 AND claim.member_id = lifecycle.submitter_member_id
		 AND claim.claim_status = 'verified'
		WHERE lifecycle.release_version_media_id = $1
	`, sourceID).Scan(
		&target.Revision,
		&target.FansubGroupID,
		&target.SubmitterAppUserID,
		&target.BeneficiaryMemberID,
		&state,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return ReviewTarget{}, repository.ErrNotFound
	}
	if err != nil {
		return ReviewTarget{}, fmt.Errorf("load release media review target %d: %w", sourceID, err)
	}
	target.Ref = ref
	target.ReviewKind = repository.ReviewKindImage
	target.Pending = repository.ReleaseReviewState(state) == repository.ReleaseReviewStatePending
	return target, nil
}

func (a *releaseVersionMediaReviewAdapter) ApplyDecision(
	ctx context.Context,
	db repository.DBTX,
	target ReviewTarget,
	decision ReviewDecision,
) error {
	sourceID, err := parseReleaseReviewSourceID(target.Ref, ReleaseVersionMediaReviewSourceType)
	if err != nil {
		return err
	}
	decidedAt := adapterNow(a.now)
	if err := applyReleaseReviewLifecycleDecision(
		ctx,
		db,
		"release_version_media_review_lifecycle",
		"release_version_media_id",
		sourceID,
		target.Revision,
		decision,
		decidedAt,
	); err != nil {
		return err
	}
	visibility, reviewStatus := "private", "rejected"
	if decision == ReviewDecisionConfirm {
		visibility, reviewStatus = "public", "approved"
	}
	tag, err := db.Exec(ctx, `
		UPDATE media_assets asset
		SET visibility_id = (SELECT id FROM visibilities WHERE name = $2),
		    review_status_id = (SELECT id FROM review_statuses WHERE code = $3)
		FROM release_version_media media
		WHERE media.id = $1
		  AND media.deleted_at IS NULL
		  AND asset.id = media.media_asset_id
	`, sourceID, visibility, reviewStatus)
	if err != nil {
		return fmt.Errorf("apply release media review source %d: %w", sourceID, err)
	}
	if tag.RowsAffected() != 1 {
		return repository.ErrConflict
	}
	if decision == ReviewDecisionConfirm {
		if err := creditReleaseReviewContribution(ctx, db, target, decidedAt); err != nil {
			return err
		}
		return auditReleaseReviewPublished(ctx, db, target, decidedAt)
	}
	return nil
}

func applyReleaseReviewLifecycleDecision(
	ctx context.Context,
	db repository.DBTX,
	table, sourceColumn string,
	sourceID, expectedRevision int64,
	decision ReviewDecision,
	decidedAt time.Time,
) error {
	state := repository.ReleaseReviewStateRejected
	if decision == ReviewDecisionConfirm {
		state = repository.ReleaseReviewStateConfirmed
	} else if decision != ReviewDecisionReject {
		return repository.ErrValidation
	}
	query := fmt.Sprintf(`
		UPDATE %s
		SET review_state = $3,
		    decided_at = $4,
		    updated_at = $4
		WHERE %s = $1
		  AND source_revision = $2
		  AND review_state = 'pending'
	`, table, sourceColumn)
	tag, err := db.Exec(ctx, query, sourceID, expectedRevision, state, decidedAt)
	if err != nil {
		return fmt.Errorf("apply release review lifecycle %s:%d: %w", table, sourceID, err)
	}
	if tag.RowsAffected() != 1 {
		return repository.ErrConflict
	}
	return nil
}

func auditReleaseReviewPublished(
	ctx context.Context,
	db repository.DBTX,
	target ReviewTarget,
	at time.Time,
) error {
	if _, err := repository.NewReviewAuditRepository(db).InsertEvent(ctx, repository.ReviewAuditEventInput{
		EventCode:      repository.ReviewAuditEventSourcePublished,
		ActorKind:      repository.ReviewAuditActorSystem,
		FansubGroupID:  target.FansubGroupID,
		SourceType:     target.Ref.SourceType,
		SourceKey:      target.Ref.StableKey,
		SourceRevision: target.Revision,
		OccurredAt:     at,
	}); err != nil {
		return fmt.Errorf("audit published release review source: %w", err)
	}
	return nil
}

func parseReleaseReviewSourceID(ref ReviewTargetRef, expectedSourceType string) (int64, error) {
	if ref.SourceType != expectedSourceType {
		return 0, repository.ErrNotFound
	}
	sourceID, err := strconv.ParseInt(ref.StableKey, 10, 64)
	if err != nil || sourceID <= 0 || strconv.FormatInt(sourceID, 10) != ref.StableKey {
		return 0, repository.ErrNotFound
	}
	return sourceID, nil
}

func adapterNow(now func() time.Time) time.Time {
	if now == nil {
		return time.Now().UTC()
	}
	return now().UTC()
}
