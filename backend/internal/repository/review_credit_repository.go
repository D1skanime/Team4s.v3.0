package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type ReviewCreditSlot string

const (
	ReviewCreditSlotReject  ReviewCreditSlot = "reject"
	ReviewCreditSlotConfirm ReviewCreditSlot = "confirm"
)

type ReviewCreditSlotKey struct {
	SourceType string
	StableKey  string
	Slot       ReviewCreditSlot
}

type ReviewCreditSlotInput struct {
	ReviewCreditSlotKey
	ReviewerMemberID   int64
	ReviewDecisionID   int64
	PointLedgerEntryID int64
	CreatedAt          time.Time
}

type ReviewCreditSlotRow struct {
	ID                 int64
	SourceType         string
	StableKey          string
	Slot               ReviewCreditSlot
	ReviewerMemberID   int64
	ReviewDecisionID   int64
	PointLedgerEntryID int64
	CreatedAt          time.Time
}

type ReviewCreditRepository struct {
	db DBTX
}

func NewReviewCreditRepository(db DBTX) *ReviewCreditRepository {
	return &ReviewCreditRepository{db: db}
}

func (r *ReviewCreditRepository) WithDB(db DBTX) *ReviewCreditRepository {
	return NewReviewCreditRepository(db)
}

// LockSlot serializes the source-global award decision in the caller's
// transaction. The advisory hash only distributes locks; the table's complete
// text-key unique constraint remains the business identity authority.
func (r *ReviewCreditRepository) LockSlot(
	ctx context.Context,
	key ReviewCreditSlotKey,
) error {
	if err := normalizeAndValidateReviewCreditSlotKey(r, &key); err != nil {
		return err
	}
	lockToken := reviewCreditLockToken(key)
	if _, err := r.db.Exec(ctx, `
		SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))
	`, lockToken); err != nil {
		return fmt.Errorf(
			"lock review credit slot source=%q key=%q slot=%q: %w",
			key.SourceType,
			key.StableKey,
			key.Slot,
			err,
		)
	}
	return nil
}

// HasSlot is the required post-lock recheck before PointService.CreditInTx.
func (r *ReviewCreditRepository) HasSlot(
	ctx context.Context,
	key ReviewCreditSlotKey,
) (bool, error) {
	if err := normalizeAndValidateReviewCreditSlotKey(r, &key); err != nil {
		return false, err
	}
	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM review_credit_slots
			WHERE source_type = $1
			  AND source_key = $2
			  AND credit_slot = $3
		)
	`, key.SourceType, key.StableKey, key.Slot).Scan(&exists); err != nil {
		return false, fmt.Errorf(
			"check review credit slot source=%q key=%q slot=%q: %w",
			key.SourceType,
			key.StableKey,
			key.Slot,
			err,
		)
	}
	return exists, nil
}

// InsertSlot appends the link to the actual PointService-created ledger entry.
// It never writes, updates, or deletes ledger or slot history itself.
func (r *ReviewCreditRepository) InsertSlot(
	ctx context.Context,
	input ReviewCreditSlotInput,
) (*ReviewCreditSlotRow, error) {
	if err := normalizeAndValidateReviewCreditSlotInput(r, &input); err != nil {
		return nil, err
	}

	row, err := scanReviewCreditSlot(r.db.QueryRow(ctx, `
		INSERT INTO review_credit_slots (
			source_type,
			source_key,
			credit_slot,
			reviewer_member_id,
			review_decision_id,
			point_ledger_entry_id,
			created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (source_type, source_key, credit_slot) DO NOTHING
		RETURNING id, source_type, source_key, credit_slot, reviewer_member_id,
			review_decision_id, point_ledger_entry_id, created_at
	`,
		input.SourceType,
		input.StableKey,
		input.Slot,
		input.ReviewerMemberID,
		input.ReviewDecisionID,
		input.PointLedgerEntryID,
		input.CreatedAt,
	))
	if errors.Is(err, pgx.ErrNoRows) || isUniqueViolation(err) {
		return nil, fmt.Errorf(
			"insert review credit slot source=%q key=%q slot=%q: %w",
			input.SourceType,
			input.StableKey,
			input.Slot,
			ErrConflict,
		)
	}
	if err != nil {
		return nil, fmt.Errorf(
			"insert review credit slot source=%q key=%q slot=%q: %w",
			input.SourceType,
			input.StableKey,
			input.Slot,
			err,
		)
	}
	return row, nil
}

func scanReviewCreditSlot(row pgx.Row) (*ReviewCreditSlotRow, error) {
	var result ReviewCreditSlotRow
	var slot string
	err := row.Scan(
		&result.ID,
		&result.SourceType,
		&result.StableKey,
		&slot,
		&result.ReviewerMemberID,
		&result.ReviewDecisionID,
		&result.PointLedgerEntryID,
		&result.CreatedAt,
	)
	result.Slot = ReviewCreditSlot(slot)
	return &result, err
}

func normalizeAndValidateReviewCreditSlotInput(
	repo *ReviewCreditRepository,
	input *ReviewCreditSlotInput,
) error {
	if input == nil {
		return fmt.Errorf("insert review credit slot: %w", ErrValidation)
	}
	if err := normalizeAndValidateReviewCreditSlotKey(repo, &input.ReviewCreditSlotKey); err != nil {
		return err
	}
	input.CreatedAt = postgresTimestamp(input.CreatedAt)
	if input.ReviewerMemberID <= 0 ||
		input.ReviewDecisionID <= 0 ||
		input.PointLedgerEntryID <= 0 ||
		input.CreatedAt.IsZero() {
		return fmt.Errorf("insert review credit slot: %w", ErrValidation)
	}
	return nil
}

func normalizeAndValidateReviewCreditSlotKey(
	repo *ReviewCreditRepository,
	key *ReviewCreditSlotKey,
) error {
	if repo == nil || repo.db == nil || key == nil {
		return fmt.Errorf("review credit slot: %w", ErrValidation)
	}
	key.SourceType = strings.TrimSpace(key.SourceType)
	key.StableKey = strings.TrimSpace(key.StableKey)
	if key.SourceType == "" ||
		key.StableKey == "" ||
		(key.Slot != ReviewCreditSlotReject && key.Slot != ReviewCreditSlotConfirm) {
		return fmt.Errorf("review credit slot: %w", ErrValidation)
	}
	return nil
}

func reviewCreditLockToken(key ReviewCreditSlotKey) string {
	return fmt.Sprintf(
		"review-credit-v1|source:%d:%s|key:%d:%s|slot:%s",
		len([]byte(key.SourceType)),
		key.SourceType,
		len([]byte(key.StableKey)),
		key.StableKey,
		key.Slot,
	)
}
