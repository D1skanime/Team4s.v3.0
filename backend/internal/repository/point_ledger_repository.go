package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type PointLedgerEntry struct {
	ID                     int64
	MemberID               int64
	ActorAppUserID         *int64
	FansubGroupID          *int64
	ReleaseVersionID       *int64
	SourceType             string
	SourceKey              string
	RuleID                 int64
	RuleCodeSnapshot       string
	RuleVersionSnapshot    int
	RuleCategorySnapshot   string
	RulePointValueSnapshot int
	PointValue             int
	EntryKind              string
	ReversalOfEntryID      *int64
	ReversalReason         *string
	EffectiveAt            time.Time
	RecordedAt             time.Time
	IdempotencyKey         string
}

type PointAwardInput struct {
	MemberID         int64
	ActorAppUserID   *int64
	FansubGroupID    *int64
	ReleaseVersionID *int64
	SourceType       string
	SourceKey        string
	RuleID           int64
	RuleCode         string
	RuleVersion      int
	RuleCategory     string
	RulePointValue   int
	EffectiveAt      time.Time
	IdempotencyKey   string
}

type PointReversalInput struct {
	OriginalEntryID int64
	ActorAppUserID  int64
	IdempotencyKey  string
	EffectiveAt     time.Time
	Reason          string
}

type PointLedgerRepository struct{ db DBTX }

func NewPointLedgerRepository(db DBTX) *PointLedgerRepository { return &PointLedgerRepository{db: db} }
func (r *PointLedgerRepository) WithDB(db DBTX) *PointLedgerRepository {
	return NewPointLedgerRepository(db)
}

const pointLedgerColumns = `id, member_id, actor_app_user_id, fansub_group_id, release_version_id,
	source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
	rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind,
	reversal_of_entry_id, reversal_reason, effective_at, recorded_at, idempotency_key`

func scanPointLedgerEntry(row pgx.Row) (*PointLedgerEntry, error) {
	var entry PointLedgerEntry
	err := row.Scan(&entry.ID, &entry.MemberID, &entry.ActorAppUserID, &entry.FansubGroupID,
		&entry.ReleaseVersionID, &entry.SourceType, &entry.SourceKey, &entry.RuleID,
		&entry.RuleCodeSnapshot, &entry.RuleVersionSnapshot, &entry.RuleCategorySnapshot,
		&entry.RulePointValueSnapshot, &entry.PointValue, &entry.EntryKind,
		&entry.ReversalOfEntryID, &entry.ReversalReason, &entry.EffectiveAt, &entry.RecordedAt,
		&entry.IdempotencyKey)
	return &entry, err
}

func (r *PointLedgerRepository) InsertAward(ctx context.Context, input PointAwardInput) (*PointLedgerEntry, error) {
	normalizeAwardInput(&input)
	if err := validateAwardInput(r, input); err != nil {
		return nil, err
	}
	entry, err := scanPointLedgerEntry(r.db.QueryRow(ctx, `
		INSERT INTO point_ledger_entries (
			member_id, actor_app_user_id, fansub_group_id, release_version_id,
			source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
			rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind,
			effective_at, idempotency_key
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,'award',$12,$13)
		ON CONFLICT (idempotency_key) DO NOTHING
		RETURNING `+pointLedgerColumns,
		input.MemberID, input.ActorAppUserID, input.FansubGroupID, input.ReleaseVersionID,
		input.SourceType, input.SourceKey, input.RuleID, input.RuleCode, input.RuleVersion,
		input.RuleCategory, input.RulePointValue, input.EffectiveAt, input.IdempotencyKey))
	if err == nil {
		return entry, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("insert point award: %w", err)
	}

	existing, err := r.getByIdempotencyKey(ctx, input.IdempotencyKey)
	if err != nil {
		return nil, fmt.Errorf("resolve point award retry: %w", err)
	}
	if !awardMatchesInput(existing, input) {
		return nil, fmt.Errorf("point award idempotency mismatch: %w", ErrConflict)
	}
	return existing, nil
}

func (r *PointLedgerRepository) GetForUpdate(ctx context.Context, entryID int64) (*PointLedgerEntry, error) {
	if r == nil || r.db == nil || entryID <= 0 {
		return nil, fmt.Errorf("get point entry for update: %w", ErrValidation)
	}
	entry, err := scanPointLedgerEntry(r.db.QueryRow(ctx, `SELECT `+pointLedgerColumns+` FROM point_ledger_entries WHERE id = $1 FOR UPDATE`, entryID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("point entry %d: %w", entryID, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get point entry %d for update: %w", entryID, err)
	}
	return entry, nil
}

func (r *PointLedgerRepository) InsertReversal(ctx context.Context, input PointReversalInput) (*PointLedgerEntry, error) {
	input.IdempotencyKey, input.Reason = strings.TrimSpace(input.IdempotencyKey), strings.TrimSpace(input.Reason)
	input.EffectiveAt = postgresTimestamp(input.EffectiveAt)
	if r == nil || r.db == nil || input.OriginalEntryID <= 0 || input.ActorAppUserID <= 0 || input.IdempotencyKey == "" || input.EffectiveAt.IsZero() || input.Reason == "" {
		return nil, fmt.Errorf("insert point reversal: %w", ErrValidation)
	}
	original, err := r.GetForUpdate(ctx, input.OriginalEntryID)
	if err != nil {
		return nil, err
	}
	if original.EntryKind != "award" {
		return nil, fmt.Errorf("point entry %d is not an award: %w", input.OriginalEntryID, ErrValidation)
	}

	entry, err := scanPointLedgerEntry(r.db.QueryRow(ctx, `
		INSERT INTO point_ledger_entries (
			member_id, actor_app_user_id, fansub_group_id, release_version_id,
			source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
			rule_category_snapshot, rule_point_value_snapshot, point_value, entry_kind,
			reversal_of_entry_id, reversal_reason, effective_at, idempotency_key
		)
		SELECT member_id, $2, fansub_group_id, release_version_id,
			source_type, source_key, rule_id, rule_code_snapshot, rule_version_snapshot,
			rule_category_snapshot, rule_point_value_snapshot, -point_value, 'reversal',
			id, $3, $4, $5
		FROM point_ledger_entries WHERE id = $1 AND entry_kind = 'award'
		ON CONFLICT DO NOTHING
		RETURNING `+pointLedgerColumns,
		input.OriginalEntryID, input.ActorAppUserID, input.Reason, input.EffectiveAt, input.IdempotencyKey))
	if err == nil {
		return entry, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("insert point reversal: %w", err)
	}

	existing, keyErr := r.getByIdempotencyKey(ctx, input.IdempotencyKey)
	if errors.Is(keyErr, ErrNotFound) {
		existing, keyErr = r.getByReversedEntryID(ctx, input.OriginalEntryID)
	}
	if keyErr != nil {
		return nil, fmt.Errorf("resolve point reversal retry: %w", keyErr)
	}
	if !reversalMatchesInput(existing, original, input) {
		return nil, fmt.Errorf("point reversal idempotency mismatch: %w", ErrConflict)
	}
	return existing, nil
}

func (r *PointLedgerRepository) getByIdempotencyKey(ctx context.Context, key string) (*PointLedgerEntry, error) {
	entry, err := scanPointLedgerEntry(r.db.QueryRow(ctx, `SELECT `+pointLedgerColumns+` FROM point_ledger_entries WHERE idempotency_key = $1`, key))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("point ledger key %q: %w", key, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get point ledger key %q: %w", key, err)
	}
	return entry, nil
}

func (r *PointLedgerRepository) getByReversedEntryID(ctx context.Context, originalID int64) (*PointLedgerEntry, error) {
	entry, err := scanPointLedgerEntry(r.db.QueryRow(ctx, `SELECT `+pointLedgerColumns+` FROM point_ledger_entries WHERE reversal_of_entry_id = $1`, originalID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("point reversal for %d: %w", originalID, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get point reversal for %d: %w", originalID, err)
	}
	return entry, nil
}

func normalizeAwardInput(input *PointAwardInput) {
	input.SourceType, input.SourceKey = strings.TrimSpace(input.SourceType), strings.TrimSpace(input.SourceKey)
	input.RuleCode, input.RuleCategory = strings.TrimSpace(input.RuleCode), strings.TrimSpace(input.RuleCategory)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.EffectiveAt = postgresTimestamp(input.EffectiveAt)
}

func postgresTimestamp(value time.Time) time.Time {
	if value.IsZero() {
		return value
	}
	return time.UnixMicro(value.UnixMicro()).UTC()
}

func validateAwardInput(r *PointLedgerRepository, input PointAwardInput) error {
	if r == nil || r.db == nil || input.MemberID <= 0 || input.SourceType == "" || input.SourceKey == "" || input.RuleID <= 0 || input.RuleCode == "" || input.RuleVersion <= 0 || input.RuleCategory == "" || input.RulePointValue <= 0 || input.EffectiveAt.IsZero() || input.IdempotencyKey == "" {
		return fmt.Errorf("insert point award: %w", ErrValidation)
	}
	if input.ActorAppUserID != nil && *input.ActorAppUserID <= 0 {
		return fmt.Errorf("insert point award actor: %w", ErrValidation)
	}
	if input.FansubGroupID != nil && *input.FansubGroupID <= 0 {
		return fmt.Errorf("insert point award group: %w", ErrValidation)
	}
	if input.ReleaseVersionID != nil && *input.ReleaseVersionID <= 0 {
		return fmt.Errorf("insert point award release version: %w", ErrValidation)
	}
	return nil
}

func awardMatchesInput(entry *PointLedgerEntry, input PointAwardInput) bool {
	return entry != nil && entry.EntryKind == "award" && entry.ReversalOfEntryID == nil && entry.ReversalReason == nil &&
		entry.MemberID == input.MemberID && optionalInt64Equal(entry.ActorAppUserID, input.ActorAppUserID) &&
		optionalInt64Equal(entry.FansubGroupID, input.FansubGroupID) && optionalInt64Equal(entry.ReleaseVersionID, input.ReleaseVersionID) &&
		entry.SourceType == input.SourceType && entry.SourceKey == input.SourceKey && entry.RuleID == input.RuleID &&
		entry.RuleCodeSnapshot == input.RuleCode && entry.RuleVersionSnapshot == input.RuleVersion &&
		entry.RuleCategorySnapshot == input.RuleCategory && entry.RulePointValueSnapshot == input.RulePointValue &&
		entry.PointValue == input.RulePointValue && entry.EffectiveAt.Equal(input.EffectiveAt) && entry.IdempotencyKey == input.IdempotencyKey
}

func reversalMatchesInput(entry, original *PointLedgerEntry, input PointReversalInput) bool {
	return entry != nil && original != nil && entry.EntryKind == "reversal" && entry.ReversalOfEntryID != nil && *entry.ReversalOfEntryID == original.ID &&
		entry.ReversalReason != nil && *entry.ReversalReason == input.Reason && entry.ActorAppUserID != nil && *entry.ActorAppUserID == input.ActorAppUserID &&
		entry.MemberID == original.MemberID && entry.SourceType == original.SourceType && entry.SourceKey == original.SourceKey && entry.RuleID == original.RuleID &&
		entry.RuleCodeSnapshot == original.RuleCodeSnapshot && entry.RuleVersionSnapshot == original.RuleVersionSnapshot &&
		entry.RuleCategorySnapshot == original.RuleCategorySnapshot && entry.RulePointValueSnapshot == original.RulePointValueSnapshot &&
		entry.PointValue == -original.PointValue && optionalInt64Equal(entry.FansubGroupID, original.FansubGroupID) &&
		optionalInt64Equal(entry.ReleaseVersionID, original.ReleaseVersionID) && entry.EffectiveAt.Equal(input.EffectiveAt) && entry.IdempotencyKey == input.IdempotencyKey
}

func optionalInt64Equal(a, b *int64) bool {
	return (a == nil && b == nil) || (a != nil && b != nil && *a == *b)
}
