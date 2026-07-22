package services

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/repository"
)

type RewardKind string

const (
	RewardKindWork   RewardKind = "work"
	RewardKindReview RewardKind = "review"
)

type RuleRef struct {
	Code    string
	Version int
}
type SourceRef struct {
	RewardKind      RewardKind
	Type, Key, Slot string
}
type CreditCommand struct {
	MemberID                        int64
	ActorAppUserID                  *int64
	Source                          SourceRef
	Rule                            RuleRef
	FansubGroupID, ReleaseVersionID *int64
	EffectiveAt                     time.Time
}
type ReverseCommand struct {
	AwardEntryID, ActorAppUserID int64
	Reason                       string
	EffectiveAt                  time.Time
}

type PointTxStarter interface {
	Begin(context.Context) (pgx.Tx, error)
}
type PointService struct{ starter PointTxStarter }

func NewPointService(starter PointTxStarter) *PointService { return &PointService{starter: starter} }

func (s *PointService) CreditInTx(ctx context.Context, db repository.DBTX, cmd CreditCommand) (*repository.PointLedgerEntry, error) {
	if err := validateCreditCommand(db, cmd); err != nil {
		return nil, err
	}
	rule, err := repository.NewPointRulesRepository(db).GetByRef(ctx, cmd.Rule.Code, cmd.Rule.Version)
	if err != nil {
		return nil, fmt.Errorf("credit points lookup rule: %w", err)
	}
	entry, err := repository.NewPointLedgerRepository(db).InsertAward(ctx, repository.PointAwardInput{
		MemberID: cmd.MemberID, ActorAppUserID: cmd.ActorAppUserID, FansubGroupID: cmd.FansubGroupID,
		ReleaseVersionID: cmd.ReleaseVersionID, SourceType: cmd.Source.Type, SourceKey: cmd.Source.Key,
		RuleID: rule.ID, RuleCode: rule.Code, RuleVersion: rule.Version, RuleCategory: rule.Category,
		RulePointValue: rule.PointValue, EffectiveAt: cmd.EffectiveAt, IdempotencyKey: buildCreditIdempotencyKey(cmd),
	})
	if err != nil {
		return nil, fmt.Errorf("credit points insert award: %w", err)
	}
	return entry, nil
}

func (s *PointService) Credit(ctx context.Context, cmd CreditCommand) (*repository.PointLedgerEntry, error) {
	if s == nil || s.starter == nil {
		return nil, fmt.Errorf("credit points begin: %w", repository.ErrValidation)
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("credit points begin: %w", err)
	}
	entry, err := s.CreditInTx(ctx, tx, cmd)
	if err != nil {
		_ = tx.Rollback(ctx)
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		_ = tx.Rollback(ctx)
		return nil, fmt.Errorf("credit points commit: %w", err)
	}
	return entry, nil
}

func buildCreditIdempotencyKey(cmd CreditCommand) string {
	return "v1|" + string(cmd.Source.RewardKind) + "|" + cmd.Source.Type + "|" + cmd.Source.Key + "|beneficiary:" + strconv.FormatInt(cmd.MemberID, 10) + "|slot:" + cmd.Source.Slot
}

func validateCreditCommand(db repository.DBTX, cmd CreditCommand) error {
	if db == nil || cmd.MemberID <= 0 || cmd.EffectiveAt.IsZero() || !validToken(cmd.Rule.Code) || cmd.Rule.Version <= 0 || !validToken(string(cmd.Source.RewardKind)) || !validToken(cmd.Source.Type) || !validToken(cmd.Source.Key) || !validToken(cmd.Source.Slot) {
		return fmt.Errorf("credit points command: %w", repository.ErrValidation)
	}
	if cmd.Source.RewardKind != RewardKindWork && cmd.Source.RewardKind != RewardKindReview {
		return fmt.Errorf("credit points reward kind: %w", repository.ErrValidation)
	}
	if !validOptionalID(cmd.ActorAppUserID) || !validOptionalID(cmd.FansubGroupID) || !validOptionalID(cmd.ReleaseVersionID) {
		return fmt.Errorf("credit points context: %w", repository.ErrValidation)
	}
	return nil
}

func validToken(value string) bool {
	return value != "" && value == strings.TrimSpace(value) && !strings.Contains(value, "|")
}
func validOptionalID(value *int64) bool { return value == nil || *value > 0 }

func (s *PointService) ReverseInTx(ctx context.Context, db repository.DBTX, cmd ReverseCommand) (*repository.PointLedgerEntry, error) {
	if db == nil || cmd.AwardEntryID <= 0 || cmd.ActorAppUserID <= 0 || cmd.EffectiveAt.IsZero() || strings.TrimSpace(cmd.Reason) == "" || cmd.Reason != strings.TrimSpace(cmd.Reason) {
		return nil, fmt.Errorf("reverse points command: %w", repository.ErrValidation)
	}
	ledger := repository.NewPointLedgerRepository(db)
	original, err := ledger.GetForUpdate(ctx, cmd.AwardEntryID)
	if err != nil {
		return nil, fmt.Errorf("reverse points lock award: %w", err)
	}
	if original.EntryKind != "award" {
		return nil, fmt.Errorf("reverse points original is not award: %w", repository.ErrValidation)
	}
	entry, err := ledger.InsertReversal(ctx, repository.PointReversalInput{OriginalEntryID: cmd.AwardEntryID, ActorAppUserID: cmd.ActorAppUserID, IdempotencyKey: "v1|reversal|award:" + strconv.FormatInt(cmd.AwardEntryID, 10), EffectiveAt: cmd.EffectiveAt, Reason: cmd.Reason})
	if err != nil {
		return nil, fmt.Errorf("reverse points insert: %w", err)
	}
	return entry, nil
}

func (s *PointService) Reverse(ctx context.Context, cmd ReverseCommand) (*repository.PointLedgerEntry, error) {
	if s == nil || s.starter == nil {
		return nil, fmt.Errorf("reverse points begin: %w", repository.ErrValidation)
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("reverse points begin: %w", err)
	}
	entry, err := s.ReverseInTx(ctx, tx, cmd)
	if err != nil {
		_ = tx.Rollback(ctx)
		return nil, err
	}
	if err = tx.Commit(ctx); err != nil {
		_ = tx.Rollback(ctx)
		return nil, fmt.Errorf("reverse points commit: %w", err)
	}
	return entry, nil
}
