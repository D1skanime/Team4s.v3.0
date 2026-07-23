package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type ReleaseReviewState string

const (
	ReleaseReviewStatePending    ReleaseReviewState = "pending"
	ReleaseReviewStateConfirmed  ReleaseReviewState = "confirmed"
	ReleaseReviewStateRejected   ReleaseReviewState = "rejected"
	ReleaseReviewStateTombstoned ReleaseReviewState = "tombstoned"
)

const (
	ReleaseVersionNoteReviewSourceType  = "release_version_note"
	ReleaseVersionMediaReviewSourceType = "release_version_media"
)

type ReleaseReviewSubmissionInput struct {
	SourceID         int64
	ActorAppUserID   int64
	ExpectedRevision *int64
	LastActivityAt   time.Time
}

type ReleaseReviewLifecycle struct {
	SourceType         string
	SourceID           int64
	StableKey          string
	SourceRevision     int64
	ReviewState        ReleaseReviewState
	FansubGroupID      int64
	ReleaseVersionID   int64
	Category           string
	SubmitterAppUserID int64
	SubmitterMemberID  int64
	SubmittedAt        time.Time
	LastActivityAt     time.Time
}

type ReleaseReviewLifecycleRepository struct {
	db DBTX
}

func NewReleaseReviewLifecycleRepository(db DBTX) *ReleaseReviewLifecycleRepository {
	return &ReleaseReviewLifecycleRepository{db: db}
}

func (r *ReleaseReviewLifecycleRepository) WithDB(db DBTX) *ReleaseReviewLifecycleRepository {
	return NewReleaseReviewLifecycleRepository(db)
}

func (r *ReleaseReviewLifecycleRepository) SubmitNote(
	ctx context.Context,
	input ReleaseReviewSubmissionInput,
) (*ReleaseReviewLifecycle, error) {
	if err := validateReleaseReviewSubmission(r, input); err != nil {
		return nil, err
	}
	memberID, err := r.resolveSingleVerifiedMember(ctx, input.ActorAppUserID)
	if err != nil {
		return nil, err
	}

	var source ReleaseReviewLifecycle
	err = r.db.QueryRow(ctx, `
		SELECT rvn.id, rvn.release_version_id, rvn.fansub_group_id, rvn.member_id
		FROM release_version_notes rvn
		JOIN release_version_groups rvg
		  ON rvg.release_version_id = rvn.release_version_id
		 AND rvg.fansub_group_id = rvn.fansub_group_id
		JOIN fansub_group_members fgm
		  ON fgm.fansub_group_id = rvn.fansub_group_id
		 AND fgm.app_user_id = $2
		 AND fgm.member_id = rvn.member_id
		 AND fgm.status = 'active'
		WHERE rvn.id = $1
		  AND rvn.member_id = $3
		  AND rvn.deleted_at IS NULL
		FOR UPDATE OF rvn
	`, input.SourceID, input.ActorAppUserID, memberID).Scan(
		&source.SourceID,
		&source.ReleaseVersionID,
		&source.FansubGroupID,
		&source.SubmitterMemberID,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load release note submission source %d: %w", input.SourceID, err)
	}
	source.SourceType = ReleaseVersionNoteReviewSourceType
	source.StableKey = strconv.FormatInt(source.SourceID, 10)
	source.SubmitterAppUserID = input.ActorAppUserID

	if _, err = r.db.Exec(ctx, `
		UPDATE release_version_notes
		SET visibility = 'internal',
		    status = 'draft'
		WHERE id = $1
		  AND deleted_at IS NULL
	`, source.SourceID); err != nil {
		return nil, fmt.Errorf("make release note submission private %d: %w", source.SourceID, err)
	}

	return r.submitLifecycle(ctx, source, input)
}

func (r *ReleaseReviewLifecycleRepository) SubmitMedia(
	ctx context.Context,
	input ReleaseReviewSubmissionInput,
) (*ReleaseReviewLifecycle, error) {
	if err := validateReleaseReviewSubmission(r, input); err != nil {
		return nil, err
	}
	memberID, err := r.resolveSingleVerifiedMember(ctx, input.ActorAppUserID)
	if err != nil {
		return nil, err
	}

	var source ReleaseReviewLifecycle
	err = r.db.QueryRow(ctx, `
		SELECT rvm.id, rvm.release_version_id, rvm.fansub_group_id, rvm.category
		FROM release_version_media rvm
		JOIN release_version_groups rvg
		  ON rvg.release_version_id = rvm.release_version_id
		 AND rvg.fansub_group_id = rvm.fansub_group_id
		JOIN app_users au
		  ON au.id = $2
		 AND au.legacy_user_id = rvm.uploaded_by_user_id
		JOIN fansub_group_members fgm
		  ON fgm.fansub_group_id = rvm.fansub_group_id
		 AND fgm.app_user_id = au.id
		 AND fgm.member_id = $3
		 AND fgm.status = 'active'
		WHERE rvm.id = $1
		  AND rvm.deleted_at IS NULL
		FOR UPDATE OF rvm
	`, input.SourceID, input.ActorAppUserID, memberID).Scan(
		&source.SourceID,
		&source.ReleaseVersionID,
		&source.FansubGroupID,
		&source.Category,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load release media submission source %d: %w", input.SourceID, err)
	}
	if !isReleaseReviewMediaCategory(source.Category) {
		return nil, ErrValidation
	}
	source.SourceType = ReleaseVersionMediaReviewSourceType
	source.StableKey = strconv.FormatInt(source.SourceID, 10)
	source.SubmitterAppUserID = input.ActorAppUserID
	source.SubmitterMemberID = memberID

	return r.submitLifecycle(ctx, source, input)
}

func (r *ReleaseReviewLifecycleRepository) resolveSingleVerifiedMember(
	ctx context.Context,
	appUserID int64,
) (int64, error) {
	var count int
	var memberID *int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*), MIN(member_id)
		FROM member_claims
		WHERE app_user_id = $1
		  AND claim_status = 'verified'
		  AND member_id IS NOT NULL
	`, appUserID).Scan(&count, &memberID)
	if err != nil {
		return 0, fmt.Errorf("resolve release review member for app user %d: %w", appUserID, err)
	}
	if count != 1 || memberID == nil || *memberID <= 0 {
		return 0, ErrValidation
	}
	return *memberID, nil
}

func (r *ReleaseReviewLifecycleRepository) submitLifecycle(
	ctx context.Context,
	source ReleaseReviewLifecycle,
	input ReleaseReviewSubmissionInput,
) (*ReleaseReviewLifecycle, error) {
	table, sourceColumn, err := releaseReviewLifecycleTable(source.SourceType)
	if err != nil {
		return nil, err
	}

	var previousRevision int64
	var previousState string
	lockQuery := fmt.Sprintf(`
		SELECT source_revision, review_state
		FROM %s
		WHERE %s = $1
		FOR UPDATE
	`, table, sourceColumn)
	err = r.db.QueryRow(ctx, lockQuery, source.SourceID).Scan(&previousRevision, &previousState)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		if input.ExpectedRevision != nil {
			return nil, ErrConflict
		}
		source.SourceRevision = 1
		source.ReviewState = ReleaseReviewStatePending
		source.SubmittedAt = input.LastActivityAt.UTC()
		source.LastActivityAt = input.LastActivityAt.UTC()
		if err := r.insertLifecycle(ctx, table, sourceColumn, source); err != nil {
			return nil, err
		}
	case err != nil:
		return nil, fmt.Errorf("lock release review lifecycle %s:%d: %w", source.SourceType, source.SourceID, err)
	default:
		if input.ExpectedRevision == nil ||
			*input.ExpectedRevision != previousRevision ||
			ReleaseReviewState(previousState) == ReleaseReviewStateTombstoned {
			return nil, ErrConflict
		}
		source.SourceRevision = previousRevision + 1
		source.ReviewState = ReleaseReviewStatePending
		source.LastActivityAt = input.LastActivityAt.UTC()
		if err := r.updateLifecycle(ctx, table, sourceColumn, source); err != nil {
			return nil, err
		}
	}

	eventCode := ReviewAuditEventSourceSubmitted
	if previousRevision > 0 {
		eventCode = ReviewAuditEventSourceResubmitted
	}
	appUserID := source.SubmitterAppUserID
	memberID := source.SubmitterMemberID
	if _, err := NewReviewAuditRepository(r.db).InsertEvent(ctx, ReviewAuditEventInput{
		EventCode:      eventCode,
		ActorKind:      ReviewAuditActorAppUser,
		ActorAppUserID: &appUserID,
		ActorMemberID:  &memberID,
		FansubGroupID:  source.FansubGroupID,
		SourceType:     source.SourceType,
		SourceKey:      source.StableKey,
		SourceRevision: source.SourceRevision,
		OccurredAt:     source.LastActivityAt,
	}); err != nil {
		return nil, fmt.Errorf("audit release review submission %s:%d: %w", source.SourceType, source.SourceID, err)
	}

	return &source, nil
}

func (r *ReleaseReviewLifecycleRepository) insertLifecycle(
	ctx context.Context,
	table, sourceColumn string,
	source ReleaseReviewLifecycle,
) error {
	if source.SourceType == ReleaseVersionNoteReviewSourceType {
		query := fmt.Sprintf(`
			INSERT INTO %s (
				%s, source_revision, review_state,
				submitter_app_user_id, submitter_member_id,
				submitted_at, last_activity_at, created_at, updated_at
			)
			VALUES ($1, $2, 'pending', $3, $4, $5, $5, $5, $5)
		`, table, sourceColumn)
		_, err := r.db.Exec(ctx, query,
			source.SourceID,
			source.SourceRevision,
			source.SubmitterAppUserID,
			source.SubmitterMemberID,
			source.LastActivityAt,
		)
		if err != nil {
			return fmt.Errorf("insert release note review lifecycle %d: %w", source.SourceID, err)
		}
		return nil
	}
	query := fmt.Sprintf(`
		INSERT INTO %s (
			%s, source_revision, review_state, category,
			submitter_app_user_id, submitter_member_id,
			submitted_at, last_activity_at, created_at, updated_at
		)
		VALUES ($1, $2, 'pending', $3, $4, $5, $6, $6, $6, $6)
	`, table, sourceColumn)
	_, err := r.db.Exec(ctx, query,
		source.SourceID,
		source.SourceRevision,
		source.Category,
		source.SubmitterAppUserID,
		source.SubmitterMemberID,
		source.LastActivityAt,
	)
	if err != nil {
		return fmt.Errorf("insert release media review lifecycle %d: %w", source.SourceID, err)
	}
	return nil
}

func (r *ReleaseReviewLifecycleRepository) updateLifecycle(
	ctx context.Context,
	table, sourceColumn string,
	source ReleaseReviewLifecycle,
) error {
	categoryUpdate := ""
	args := []any{
		source.SourceID,
		source.SourceRevision,
		source.SubmitterAppUserID,
		source.SubmitterMemberID,
		source.LastActivityAt,
	}
	if source.SourceType == ReleaseVersionMediaReviewSourceType {
		categoryUpdate = ", category = $6"
		args = append(args, source.Category)
	}
	query := fmt.Sprintf(`
		UPDATE %s
		SET source_revision = $2,
		    review_state = 'pending',
		    submitter_app_user_id = $3,
		    submitter_member_id = $4,
		    last_activity_at = $5,
		    decided_at = NULL,
		    cleanup_due_at = NULL,
		    tombstoned_at = NULL,
		    updated_at = $5
		    %s
		WHERE %s = $1
	`, table, categoryUpdate, sourceColumn)
	tag, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update release review lifecycle %s:%d: %w", source.SourceType, source.SourceID, err)
	}
	if tag.RowsAffected() != 1 {
		return ErrConflict
	}
	return nil
}

func releaseReviewLifecycleTable(sourceType string) (string, string, error) {
	switch sourceType {
	case ReleaseVersionNoteReviewSourceType:
		return "release_version_note_review_lifecycle", "release_version_note_id", nil
	case ReleaseVersionMediaReviewSourceType:
		return "release_version_media_review_lifecycle", "release_version_media_id", nil
	default:
		return "", "", ErrValidation
	}
}

func validateReleaseReviewSubmission(
	repo *ReleaseReviewLifecycleRepository,
	input ReleaseReviewSubmissionInput,
) error {
	if repo == nil || repo.db == nil ||
		input.SourceID <= 0 ||
		input.ActorAppUserID <= 0 ||
		input.LastActivityAt.IsZero() {
		return ErrValidation
	}
	if input.ExpectedRevision != nil && *input.ExpectedRevision <= 0 {
		return ErrValidation
	}
	return nil
}

func isReleaseReviewMediaCategory(category string) bool {
	switch strings.TrimSpace(category) {
	case "screenshot", "typesetting_karaoke", "fun_outtake", "other":
		return true
	default:
		return false
	}
}
