package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type ReviewAuditEventCode string

const (
	ReviewAuditEventDelegationGranted    ReviewAuditEventCode = "delegation.granted"
	ReviewAuditEventDelegationRevoked    ReviewAuditEventCode = "delegation.revoked"
	ReviewAuditEventReviewConfirmed      ReviewAuditEventCode = "review.confirmed"
	ReviewAuditEventReviewRejected       ReviewAuditEventCode = "review.rejected"
	ReviewAuditEventReviewOverride       ReviewAuditEventCode = "review.override"
	ReviewAuditEventReviewCreditAwarded  ReviewAuditEventCode = "review_credit.awarded"
	ReviewAuditEventReviewCreditReversed ReviewAuditEventCode = "review_credit.reversed"
)

type ReviewAuditActorKind string

const (
	ReviewAuditActorAppUser ReviewAuditActorKind = "app_user"
	ReviewAuditActorSystem  ReviewAuditActorKind = "system"
)

type ReviewReasonKind string

const (
	ReviewReasonKindReject   ReviewReasonKind = "reject"
	ReviewReasonKindOverride ReviewReasonKind = "override"
)

type ReviewAuditEventInput struct {
	EventCode          ReviewAuditEventCode
	ReviewDecisionID   *int64
	ActorKind          ReviewAuditActorKind
	ActorAppUserID     *int64
	ActorMemberID      *int64
	FansubGroupID      int64
	SourceType         string
	SourceKey          string
	SourceRevision     int64
	Decision           *string
	IsPlatformOverride bool
	HasReason          bool
	OccurredAt         time.Time
}

type ReviewAuditEvent struct {
	ID                 int64
	EventCode          ReviewAuditEventCode
	ReviewDecisionID   *int64
	ActorKind          ReviewAuditActorKind
	ActorAppUserID     *int64
	ActorMemberID      *int64
	FansubGroupID      int64
	SourceType         string
	SourceKey          string
	SourceRevision     int64
	Decision           *string
	IsPlatformOverride bool
	HasReason          bool
	OccurredAt         time.Time
}

type ReviewAuditRepository struct {
	db DBTX
}

func NewReviewAuditRepository(db DBTX) *ReviewAuditRepository {
	return &ReviewAuditRepository{db: db}
}

func (r *ReviewAuditRepository) WithDB(db DBTX) *ReviewAuditRepository {
	return NewReviewAuditRepository(db)
}

const reviewAuditEventColumns = `id, event_code, review_decision_id, actor_kind,
	actor_app_user_id, actor_member_id, fansub_group_id, source_type, source_key,
	source_revision, decision, is_platform_override, has_reason, occurred_at`

// InsertEvent writes one immutable structured event through the caller's
// transaction. Reason bodies are deliberately not accepted by this method.
func (r *ReviewAuditRepository) InsertEvent(
	ctx context.Context,
	input ReviewAuditEventInput,
) (int64, error) {
	if err := normalizeAndValidateReviewAuditEvent(r, &input); err != nil {
		return 0, err
	}

	var eventID int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO review_audit_events (
			event_code,
			review_decision_id,
			actor_kind,
			actor_app_user_id,
			actor_member_id,
			fansub_group_id,
			source_type,
			source_key,
			source_revision,
			decision,
			is_platform_override,
			has_reason,
			occurred_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`,
		input.EventCode,
		input.ReviewDecisionID,
		input.ActorKind,
		input.ActorAppUserID,
		input.ActorMemberID,
		input.FansubGroupID,
		input.SourceType,
		input.SourceKey,
		input.SourceRevision,
		input.Decision,
		input.IsPlatformOverride,
		input.HasReason,
		input.OccurredAt,
	).Scan(&eventID)
	if err != nil {
		return 0, fmt.Errorf("insert review audit event %q: %w", input.EventCode, err)
	}
	return eventID, nil
}

// InsertReason stores removable free text only in the dedicated child table.
// Errors intentionally identify only the structured parent and reason kind.
func (r *ReviewAuditRepository) InsertReason(
	ctx context.Context,
	auditEventID int64,
	kind ReviewReasonKind,
	reasonText string,
) error {
	if r == nil || r.db == nil || auditEventID <= 0 ||
		!isKnownReviewReasonKind(kind) || strings.TrimSpace(reasonText) == "" {
		return fmt.Errorf("insert review audit reason: %w", ErrValidation)
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO review_reason_texts (
			audit_event_id,
			reason_kind,
			reason_text
		)
		VALUES ($1, $2, $3)
	`, auditEventID, kind, reasonText)
	if err != nil {
		return fmt.Errorf(
			"insert review audit reason (event=%d, kind=%q): %w",
			auditEventID,
			kind,
			err,
		)
	}
	return nil
}

// GetEvent is a read-only verification seam and never emits another event.
func (r *ReviewAuditRepository) GetEvent(
	ctx context.Context,
	auditEventID int64,
) (*ReviewAuditEvent, error) {
	if r == nil || r.db == nil || auditEventID <= 0 {
		return nil, fmt.Errorf("get review audit event: %w", ErrValidation)
	}

	event, err := scanReviewAuditEvent(r.db.QueryRow(ctx, `
		SELECT `+reviewAuditEventColumns+`
		FROM review_audit_events
		WHERE id = $1
	`, auditEventID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("review audit event %d: %w", auditEventID, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get review audit event %d: %w", auditEventID, err)
	}
	return event, nil
}

func scanReviewAuditEvent(row pgx.Row) (*ReviewAuditEvent, error) {
	var event ReviewAuditEvent
	var eventCode string
	var actorKind string
	err := row.Scan(
		&event.ID,
		&eventCode,
		&event.ReviewDecisionID,
		&actorKind,
		&event.ActorAppUserID,
		&event.ActorMemberID,
		&event.FansubGroupID,
		&event.SourceType,
		&event.SourceKey,
		&event.SourceRevision,
		&event.Decision,
		&event.IsPlatformOverride,
		&event.HasReason,
		&event.OccurredAt,
	)
	event.EventCode = ReviewAuditEventCode(eventCode)
	event.ActorKind = ReviewAuditActorKind(actorKind)
	return &event, err
}

func normalizeAndValidateReviewAuditEvent(
	repo *ReviewAuditRepository,
	input *ReviewAuditEventInput,
) error {
	if repo == nil || repo.db == nil || input == nil {
		return fmt.Errorf("insert review audit event: %w", ErrValidation)
	}
	input.SourceType = strings.TrimSpace(input.SourceType)
	input.SourceKey = strings.TrimSpace(input.SourceKey)
	input.OccurredAt = postgresTimestamp(input.OccurredAt)
	if !isKnownReviewAuditEventCode(input.EventCode) ||
		!isKnownReviewAuditActorKind(input.ActorKind) ||
		input.FansubGroupID <= 0 ||
		input.SourceType == "" ||
		input.SourceKey == "" ||
		input.SourceRevision <= 0 ||
		input.OccurredAt.IsZero() {
		return fmt.Errorf("insert review audit event: %w", ErrValidation)
	}
	if input.ReviewDecisionID != nil && *input.ReviewDecisionID <= 0 {
		return fmt.Errorf("insert review audit event decision: %w", ErrValidation)
	}
	if input.Decision != nil && *input.Decision != "confirm" && *input.Decision != "reject" {
		return fmt.Errorf("insert review audit event decision: %w", ErrValidation)
	}
	if input.ActorKind == ReviewAuditActorAppUser {
		if input.ActorAppUserID == nil || *input.ActorAppUserID <= 0 {
			return fmt.Errorf("insert review audit event actor: %w", ErrValidation)
		}
		if input.ActorMemberID != nil && *input.ActorMemberID <= 0 {
			return fmt.Errorf("insert review audit event member: %w", ErrValidation)
		}
		return nil
	}
	if input.ActorAppUserID != nil || input.ActorMemberID != nil {
		return fmt.Errorf("insert review audit system actor: %w", ErrValidation)
	}
	return nil
}

func isKnownReviewAuditEventCode(code ReviewAuditEventCode) bool {
	switch code {
	case ReviewAuditEventDelegationGranted,
		ReviewAuditEventDelegationRevoked,
		ReviewAuditEventReviewConfirmed,
		ReviewAuditEventReviewRejected,
		ReviewAuditEventReviewOverride,
		ReviewAuditEventReviewCreditAwarded,
		ReviewAuditEventReviewCreditReversed:
		return true
	default:
		return false
	}
}

func isKnownReviewAuditActorKind(kind ReviewAuditActorKind) bool {
	return kind == ReviewAuditActorAppUser || kind == ReviewAuditActorSystem
}

func isKnownReviewReasonKind(kind ReviewReasonKind) bool {
	return kind == ReviewReasonKindReject || kind == ReviewReasonKindOverride
}
