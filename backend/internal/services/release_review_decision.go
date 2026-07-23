package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/repository"
)

const (
	releaseReviewContributionRuleCode    = "release.contribution"
	releaseReviewContributionRuleVersion = 1
	releaseReviewContributionSlot        = "confirmed"
)

func creditReleaseReviewContribution(
	ctx context.Context,
	db repository.DBTX,
	target ReviewTarget,
	effectiveAt time.Time,
) error {
	if db == nil ||
		target.SubmitterAppUserID == nil || *target.SubmitterAppUserID <= 0 ||
		target.BeneficiaryMemberID == nil || *target.BeneficiaryMemberID <= 0 {
		return fmt.Errorf("credit release review contribution: %w", ErrReviewTargetAttributionInvalid)
	}
	sourceID, releaseVersionID, err := releaseReviewContributionContext(ctx, db, target.Ref)
	if err != nil {
		return err
	}
	appUserID := *target.SubmitterAppUserID
	groupID := target.FansubGroupID
	_, err = NewPointService(nil).CreditInTx(ctx, db, CreditCommand{
		MemberID:       *target.BeneficiaryMemberID,
		ActorAppUserID: &appUserID,
		Source: SourceRef{
			RewardKind: RewardKindWork,
			Type:       target.Ref.SourceType,
			Key:        target.Ref.StableKey,
			Slot:       releaseReviewContributionSlot,
		},
		Rule:             RuleRef{Code: releaseReviewContributionRuleCode, Version: releaseReviewContributionRuleVersion},
		FansubGroupID:    &groupID,
		ReleaseVersionID: &releaseVersionID,
		EffectiveAt:      effectiveAt,
	})
	if err != nil {
		return fmt.Errorf(
			"credit release review contribution %s:%d: %w",
			target.Ref.SourceType,
			sourceID,
			err,
		)
	}
	return nil
}

func releaseReviewContributionContext(
	ctx context.Context,
	db repository.DBTX,
	ref ReviewTargetRef,
) (sourceID, releaseVersionID int64, err error) {
	sourceID, err = parseReleaseReviewSourceID(ref, ref.SourceType)
	if err != nil {
		return 0, 0, err
	}
	var query string
	switch ref.SourceType {
	case ReleaseVersionNoteReviewSourceType:
		query = `
			SELECT release_version_id
			FROM release_version_notes
			WHERE id = $1 AND deleted_at IS NULL
		`
	case ReleaseVersionMediaReviewSourceType:
		query = `
			SELECT release_version_id
			FROM release_version_media
			WHERE id = $1 AND deleted_at IS NULL
		`
	default:
		return 0, 0, repository.ErrNotFound
	}
	err = db.QueryRow(ctx, query, sourceID).Scan(&releaseVersionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, 0, repository.ErrNotFound
	}
	if err != nil {
		return 0, 0, fmt.Errorf(
			"load release review contribution context %s:%d: %w",
			ref.SourceType,
			sourceID,
			err,
		)
	}
	if releaseVersionID <= 0 {
		return 0, 0, repository.ErrValidation
	}
	return sourceID, releaseVersionID, nil
}
