package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type ReviewKind string

const (
	ReviewKindText         ReviewKind = "text"
	ReviewKindImage        ReviewKind = "image"
	ReviewKindContribution ReviewKind = "contribution"
)

type ReviewDecision string

const (
	ReviewDecisionConfirm ReviewDecision = "confirm"
	ReviewDecisionReject  ReviewDecision = "reject"
)

type ReviewRejectionCategory string

type ReviewDecisionInput struct {
	SourceType         string
	StableKey          string
	SourceRevision     int64
	ReviewKind         ReviewKind
	Decision           ReviewDecision
	RejectionCategory  *ReviewRejectionCategory
	FansubGroupID      int64
	ReviewerAppUserID  int64
	ReviewerMemberID   *int64
	IsPlatformOverride bool
	DecidedAt          time.Time
}

type ReviewDecisionRow struct {
	ID                 int64
	SourceType         string
	StableKey          string
	SourceRevision     int64
	ReviewKind         ReviewKind
	Decision           ReviewDecision
	RejectionCategory  *ReviewRejectionCategory
	FansubGroupID      int64
	ReviewerAppUserID  int64
	ReviewerMemberID   *int64
	IsPlatformOverride bool
	DecidedAt          time.Time
}

type ReviewDecisionRepository struct {
	db DBTX
}

func NewReviewDecisionRepository(db DBTX) *ReviewDecisionRepository {
	return &ReviewDecisionRepository{db: db}
}

func (r *ReviewDecisionRepository) WithDB(db DBTX) *ReviewDecisionRepository {
	return NewReviewDecisionRepository(db)
}

const reviewDecisionColumns = `id, source_type, source_key, source_revision,
	review_kind, decision, rejection_category, fansub_group_id,
	reviewer_app_user_id, reviewer_member_id, is_platform_override, decided_at`

// InsertDecision is the only first-decision-wins arbiter. Every conflict,
// including an identical retry by the original actor, returns ErrConflict.
func (r *ReviewDecisionRepository) InsertDecision(
	ctx context.Context,
	input ReviewDecisionInput,
) (*ReviewDecisionRow, error) {
	if err := normalizeAndValidateReviewDecision(r, &input); err != nil {
		return nil, err
	}

	row, err := scanReviewDecision(r.db.QueryRow(ctx, `
		INSERT INTO review_decisions (
			source_type,
			source_key,
			source_revision,
			review_kind,
			decision,
			rejection_category,
			fansub_group_id,
			reviewer_app_user_id,
			reviewer_member_id,
			is_platform_override,
			decided_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (source_type, source_key, source_revision) DO NOTHING
		RETURNING `+reviewDecisionColumns,
		input.SourceType,
		input.StableKey,
		input.SourceRevision,
		input.ReviewKind,
		input.Decision,
		input.RejectionCategory,
		input.FansubGroupID,
		input.ReviewerAppUserID,
		input.ReviewerMemberID,
		input.IsPlatformOverride,
		input.DecidedAt,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf(
			"insert review decision source=%q key=%q revision=%d: %w",
			input.SourceType,
			input.StableKey,
			input.SourceRevision,
			ErrConflict,
		)
	}
	if err != nil {
		return nil, fmt.Errorf(
			"insert review decision source=%q key=%q revision=%d: %w",
			input.SourceType,
			input.StableKey,
			input.SourceRevision,
			err,
		)
	}
	return row, nil
}

func scanReviewDecision(row pgx.Row) (*ReviewDecisionRow, error) {
	var result ReviewDecisionRow
	var kind string
	var decision string
	var rejectionCategory *string
	err := row.Scan(
		&result.ID,
		&result.SourceType,
		&result.StableKey,
		&result.SourceRevision,
		&kind,
		&decision,
		&rejectionCategory,
		&result.FansubGroupID,
		&result.ReviewerAppUserID,
		&result.ReviewerMemberID,
		&result.IsPlatformOverride,
		&result.DecidedAt,
	)
	result.ReviewKind = ReviewKind(kind)
	result.Decision = ReviewDecision(decision)
	if rejectionCategory != nil {
		category := ReviewRejectionCategory(*rejectionCategory)
		result.RejectionCategory = &category
	}
	return &result, err
}

func normalizeAndValidateReviewDecision(
	repo *ReviewDecisionRepository,
	input *ReviewDecisionInput,
) error {
	if repo == nil || repo.db == nil || input == nil {
		return fmt.Errorf("insert review decision: %w", ErrValidation)
	}
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.StableKey = strings.TrimSpace(input.StableKey)
	input.DecidedAt = postgresTimestamp(input.DecidedAt)
	if input.RejectionCategory != nil {
		category := ReviewRejectionCategory(strings.TrimSpace(string(*input.RejectionCategory)))
		input.RejectionCategory = &category
	}

	if input.SourceType == "" ||
		input.StableKey == "" ||
		input.SourceRevision <= 0 ||
		!isKnownReviewKind(input.ReviewKind) ||
		!isKnownReviewDecision(input.Decision) ||
		input.FansubGroupID <= 0 ||
		input.ReviewerAppUserID <= 0 ||
		input.DecidedAt.IsZero() {
		return fmt.Errorf("insert review decision: %w", ErrValidation)
	}
	if input.ReviewerMemberID != nil && *input.ReviewerMemberID <= 0 {
		return fmt.Errorf("insert review decision reviewer member: %w", ErrValidation)
	}
	if input.Decision == ReviewDecisionReject {
		if input.RejectionCategory == nil || *input.RejectionCategory == "" {
			return fmt.Errorf("insert review decision rejection category: %w", ErrValidation)
		}
		return nil
	}
	if input.RejectionCategory != nil {
		return fmt.Errorf("insert review decision confirm category: %w", ErrValidation)
	}
	return nil
}

func isKnownReviewKind(kind ReviewKind) bool {
	switch kind {
	case ReviewKindText, ReviewKindImage, ReviewKindContribution:
		return true
	default:
		return false
	}
}

func isKnownReviewDecision(decision ReviewDecision) bool {
	return decision == ReviewDecisionConfirm || decision == ReviewDecisionReject
}
