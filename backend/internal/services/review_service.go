package services

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
)

var (
	ErrReviewAlreadyDecided             = errors.New("review already decided")
	ErrReviewSelfReviewForbidden        = errors.New("review self-review forbidden")
	ErrReviewOverrideReasonRequired     = errors.New("review override reason required")
	ErrReviewRejectionCategoryRequired  = errors.New("review rejection category required")
	ErrReviewRejectionReasonRequired    = errors.New("review rejection reason required")
	ErrReviewTargetAttributionInvalid   = errors.New("review target attribution invalid")
	ErrReviewCapabilityDenied           = errors.New("review capability denied")
	ErrReviewTargetNotFound             = errors.New("review target not found")
	ErrReviewTargetNotPending           = errors.New("review target not pending")
	ErrReviewDecisionInvalid            = errors.New("review decision invalid")
	ErrReviewActionInvalid              = errors.New("review action invalid")
	ErrReviewDelegationTargetIneligible = errors.New("review delegation target ineligible")
)

type ReviewDelegationCommand struct {
	Actor              permissions.Actor
	TargetMembershipID int64
	Action             permissions.Action
}
type ReviewTargetRef struct{ SourceType, StableKey string }
type ReviewTarget struct {
	Ref                                     ReviewTargetRef
	Revision                                int64
	ReviewKind                              repository.ReviewKind
	FansubGroupID                           int64
	SubmitterAppUserID, BeneficiaryMemberID *int64
	Pending                                 bool
}
type ReviewDecision = repository.ReviewDecision

const (
	ReviewDecisionConfirm = repository.ReviewDecisionConfirm
	ReviewDecisionReject  = repository.ReviewDecisionReject
)

type ReviewTargetAdapter interface {
	LoadForDecision(context.Context, repository.DBTX, ReviewTargetRef) (ReviewTarget, error)
	ApplyDecision(context.Context, repository.DBTX, ReviewTarget, ReviewDecision) error
}
type ReviewDecisionCommand struct {
	Actor              permissions.Actor
	Target             ReviewTargetRef
	Decision           ReviewDecision
	RejectionCategory  repository.ReviewRejectionCategory
	RejectReason       string
	SelfReviewOverride bool
	OverrideReason     string
}
type reviewPointCreditor interface {
	CreditInTx(context.Context, repository.DBTX, CreditCommand) (*repository.PointLedgerEntry, error)
}
type ReviewService struct {
	starter  PointTxStarter
	adapters map[string]ReviewTargetAdapter
	points   reviewPointCreditor
	now      func() time.Time
}

func NewReviewService(starter PointTxStarter, adapters map[string]ReviewTargetAdapter) *ReviewService {
	copied := make(map[string]ReviewTargetAdapter, len(adapters))
	for sourceType, adapter := range adapters {
		copied[sourceType] = adapter
	}
	return &ReviewService{starter: starter, adapters: copied, points: NewPointService(nil), now: time.Now}
}
func (s *ReviewService) GrantDelegation(ctx context.Context, cmd ReviewDelegationCommand) error {
	return s.changeDelegation(ctx, cmd, true)
}
func (s *ReviewService) RevokeDelegation(ctx context.Context, cmd ReviewDelegationCommand) error {
	return s.changeDelegation(ctx, cmd, false)
}
func (s *ReviewService) changeDelegation(ctx context.Context, cmd ReviewDelegationCommand, grant bool) error {
	if s == nil || s.starter == nil || cmd.TargetMembershipID <= 0 {
		return fmt.Errorf("change review delegation: %w", repository.ErrValidation)
	}
	if !isDelegableReviewAction(cmd.Action) {
		return fmt.Errorf("change review delegation: %w", ErrReviewActionInvalid)
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return fmt.Errorf("change review delegation begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	delegations := repository.NewReviewDelegationRepository(tx)
	target, err := delegations.LockMembership(ctx, cmd.TargetMembershipID)
	if err != nil {
		return fmt.Errorf("change review delegation lock target: %w", err)
	}
	authz := repository.NewAuthzRepository(tx)
	allowed, err := permissions.NewService(authz).CanForFansubGroup(
		ctx, cmd.Actor, permissions.ActionFansubGroupMembersManage, target.FansubGroupID,
	)
	if err != nil {
		return fmt.Errorf("change review delegation authorize: %w", err)
	}
	if !allowed.Allowed {
		return fmt.Errorf("change review delegation authorize: %w", ErrReviewCapabilityDenied)
	}
	if grant && !eligibleDelegationTarget(target) {
		return fmt.Errorf("change review delegation target: %w", ErrReviewDelegationTargetIneligible)
	}
	if grant {
		allowed.Allowed, err = delegations.GrantAction(ctx, target.MembershipID, string(cmd.Action))
	} else {
		allowed.Allowed, err = delegations.RevokeAction(ctx, target.MembershipID, string(cmd.Action))
	}
	if err != nil {
		return fmt.Errorf("change review delegation mutate: %w", err)
	}
	if allowed.Allowed {
		code := repository.ReviewAuditEventDelegationRevoked
		if grant {
			code = repository.ReviewAuditEventDelegationGranted
		}
		actorID := cmd.Actor.AppUserID
		_, err = repository.NewReviewAuditRepository(tx).InsertEvent(ctx, repository.ReviewAuditEventInput{
			EventCode: code, ActorKind: repository.ReviewAuditActorAppUser, ActorAppUserID: &actorID,
			FansubGroupID: target.FansubGroupID, SourceType: "review_delegation",
			SourceKey:      delegationAuditSourceKey(target.MembershipID, cmd.Action),
			SourceRevision: 1, OccurredAt: s.now().UTC(),
		})
		if err != nil {
			return fmt.Errorf("change review delegation audit: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("change review delegation commit: %w", err)
	}
	return nil
}
func (s *ReviewService) Decide(ctx context.Context, cmd ReviewDecisionCommand) (*repository.ReviewDecisionRow, error) {
	adapter, ref, err := s.resolveAdapter(cmd.Target)
	if err != nil {
		return nil, err
	}
	if s.starter == nil {
		return nil, fmt.Errorf("review decision begin: %w", repository.ErrValidation)
	}
	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("review decision begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	target, err := adapter.LoadForDecision(ctx, tx, ref)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, ErrReviewTargetNotFound) {
			return nil, ErrReviewTargetNotFound
		}
		return nil, fmt.Errorf("review target load: %w", err)
	}
	action, err := validateLoadedReviewTarget(ref, target)
	if err != nil {
		return nil, err
	}
	if target.SubmitterAppUserID == nil || *target.SubmitterAppUserID <= 0 ||
		target.BeneficiaryMemberID == nil || *target.BeneficiaryMemberID <= 0 {
		return nil, ErrReviewTargetAttributionInvalid
	}
	authz := repository.NewAuthzRepository(tx)
	actorMembers, err := authz.ResolveVerifiedActorMemberIDs(ctx, cmd.Actor.AppUserID)
	if err != nil {
		return nil, fmt.Errorf("review decision resolve actor identity: %w", err)
	}
	authorization, err := permissions.NewService(authz).CanReviewForFansubGroup(
		ctx, cmd.Actor, action, target.FansubGroupID,
	)
	if err != nil {
		return nil, fmt.Errorf("review decision authorize: %w", err)
	}
	if !authorization.Allowed {
		return nil, ErrReviewCapabilityDenied
	}
	self := cmd.Actor.AppUserID == *target.SubmitterAppUserID ||
		containsReviewMemberID(actorMembers, *target.BeneficiaryMemberID)
	override, err := validateReviewIntent(cmd, self)
	if err != nil {
		return nil, err
	}
	decidedAt := s.now().UTC()
	var reviewerMemberID *int64
	if !cmd.Actor.IsPlatformAdmin && authorization.MemberID > 0 {
		memberID := authorization.MemberID
		reviewerMemberID = &memberID
	}
	decisionRow, err := repository.NewReviewDecisionRepository(tx).InsertDecision(ctx, repository.ReviewDecisionInput{
		SourceType: target.Ref.SourceType, StableKey: target.Ref.StableKey,
		SourceRevision: target.Revision, ReviewKind: target.ReviewKind, Decision: cmd.Decision,
		RejectionCategory: normalizedReviewRejectionCategory(cmd), FansubGroupID: target.FansubGroupID,
		ReviewerAppUserID: cmd.Actor.AppUserID, ReviewerMemberID: reviewerMemberID,
		IsPlatformOverride: override, DecidedAt: decidedAt,
	})
	if errors.Is(err, repository.ErrConflict) {
		return nil, ErrReviewAlreadyDecided
	}
	if err != nil {
		return nil, fmt.Errorf("review decision insert: %w", err)
	}
	if err = adapter.ApplyDecision(ctx, tx, target, cmd.Decision); err != nil {
		if errors.Is(err, repository.ErrConflict) || errors.Is(err, repository.ErrNotFound) ||
			errors.Is(err, ErrReviewTargetNotPending) {
			return nil, ErrReviewTargetNotPending
		}
		return nil, fmt.Errorf("review decision apply target: %w", err)
	}
	audit := repository.NewReviewAuditRepository(tx)
	eventID, err := insertDecisionAudit(ctx, audit, cmd, target, decisionRow, reviewerMemberID, override, decidedAt)
	if err != nil {
		return nil, err
	}
	if cmd.Decision == ReviewDecisionReject {
		if err = audit.InsertReason(ctx, eventID, repository.ReviewReasonKindReject, cmd.RejectReason); err != nil {
			return nil, fmt.Errorf("review decision insert rejection reason: %w", err)
		}
	}
	if override {
		if err = insertOverrideAudit(ctx, audit, cmd, target, decisionRow, decidedAt); err != nil {
			return nil, err
		}
	}
	if !cmd.Actor.IsPlatformAdmin {
		if reviewerMemberID == nil {
			return nil, fmt.Errorf("review decision reviewer member: %w", ErrReviewCapabilityDenied)
		}
		if err = s.creditDecision(ctx, tx, audit, cmd, target, decisionRow, *reviewerMemberID, decidedAt); err != nil {
			return nil, err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("review decision commit: %w", err)
	}
	return decisionRow, nil
}
func (s *ReviewService) resolveAdapter(ref ReviewTargetRef) (ReviewTargetAdapter, ReviewTargetRef, error) {
	if s == nil {
		return nil, ReviewTargetRef{}, fmt.Errorf("review target adapter: %w", repository.ErrValidation)
	}
	canonical := ReviewTargetRef{SourceType: strings.TrimSpace(ref.SourceType), StableKey: strings.TrimSpace(ref.StableKey)}
	if canonical.SourceType == "" || canonical.StableKey == "" || canonical != ref {
		return nil, ReviewTargetRef{}, ErrReviewTargetNotFound
	}
	adapter, ok := s.adapters[canonical.SourceType]
	if !ok || adapter == nil {
		return nil, ReviewTargetRef{}, ErrReviewTargetNotFound
	}
	return adapter, canonical, nil
}
func validateLoadedReviewTarget(ref ReviewTargetRef, target ReviewTarget) (permissions.Action, error) {
	if target.Ref != ref || target.Revision <= 0 || target.FansubGroupID <= 0 {
		return "", fmt.Errorf("review target snapshot: %w", repository.ErrValidation)
	}
	action, err := reviewActionForKind(target.ReviewKind)
	if err != nil {
		return "", err
	}
	if !target.Pending {
		return "", ErrReviewTargetNotPending
	}
	return action, nil
}
func reviewActionForKind(kind repository.ReviewKind) (permissions.Action, error) {
	switch kind {
	case repository.ReviewKindText:
		return permissions.ActionReviewTextDecide, nil
	case repository.ReviewKindImage:
		return permissions.ActionReviewImageDecide, nil
	case repository.ReviewKindContribution:
		return permissions.ActionReviewContributionDecide, nil
	default:
		return "", fmt.Errorf("review target kind: %w", ErrReviewActionInvalid)
	}
}
func validateReviewIntent(cmd ReviewDecisionCommand, self bool) (bool, error) {
	switch cmd.Decision {
	case ReviewDecisionReject:
		if strings.TrimSpace(string(cmd.RejectionCategory)) == "" {
			return false, ErrReviewRejectionCategoryRequired
		}
		if strings.TrimSpace(cmd.RejectReason) == "" {
			return false, ErrReviewRejectionReasonRequired
		}
	case ReviewDecisionConfirm:
		if string(cmd.RejectionCategory) != "" || cmd.RejectReason != "" {
			return false, ErrReviewDecisionInvalid
		}
	default:
		return false, ErrReviewDecisionInvalid
	}
	if !self {
		if cmd.SelfReviewOverride || cmd.OverrideReason != "" {
			return false, ErrReviewSelfReviewForbidden
		}
		return false, nil
	}
	if !cmd.Actor.IsPlatformAdmin || !cmd.SelfReviewOverride {
		return false, ErrReviewSelfReviewForbidden
	}
	if strings.TrimSpace(cmd.OverrideReason) == "" {
		return false, ErrReviewOverrideReasonRequired
	}
	return true, nil
}
func insertDecisionAudit(
	ctx context.Context, audit *repository.ReviewAuditRepository, cmd ReviewDecisionCommand,
	target ReviewTarget, row *repository.ReviewDecisionRow, memberID *int64,
	override bool, at time.Time,
) (int64, error) {
	code, hasReason := repository.ReviewAuditEventReviewConfirmed, false
	if cmd.Decision == ReviewDecisionReject {
		code, hasReason = repository.ReviewAuditEventReviewRejected, true
	}
	eventID, err := audit.InsertEvent(ctx, decisionAuditInput(code, cmd, target, row.ID, memberID, override, hasReason, at))
	if err != nil {
		return 0, fmt.Errorf("review decision insert audit: %w", err)
	}
	return eventID, nil
}
func insertOverrideAudit(
	ctx context.Context, audit *repository.ReviewAuditRepository, cmd ReviewDecisionCommand,
	target ReviewTarget, row *repository.ReviewDecisionRow, at time.Time,
) error {
	eventID, err := audit.InsertEvent(ctx, decisionAuditInput(
		repository.ReviewAuditEventReviewOverride, cmd, target, row.ID, nil, true, true, at,
	))
	if err != nil {
		return fmt.Errorf("review decision insert override audit: %w", err)
	}
	if err = audit.InsertReason(ctx, eventID, repository.ReviewReasonKindOverride, cmd.OverrideReason); err != nil {
		return fmt.Errorf("review decision insert override reason: %w", err)
	}
	return nil
}
func decisionAuditInput(
	code repository.ReviewAuditEventCode, cmd ReviewDecisionCommand, target ReviewTarget,
	decisionID int64, memberID *int64, override, hasReason bool, at time.Time,
) repository.ReviewAuditEventInput {
	actorID, decision := cmd.Actor.AppUserID, string(cmd.Decision)
	return repository.ReviewAuditEventInput{
		EventCode: code, ReviewDecisionID: &decisionID, ActorKind: repository.ReviewAuditActorAppUser,
		ActorAppUserID: &actorID, ActorMemberID: memberID, FansubGroupID: target.FansubGroupID,
		SourceType: target.Ref.SourceType, SourceKey: target.Ref.StableKey, SourceRevision: target.Revision,
		Decision: &decision, IsPlatformOverride: override, HasReason: hasReason, OccurredAt: at,
	}
}
func (s *ReviewService) creditDecision(
	ctx context.Context, tx repository.DBTX, audit *repository.ReviewAuditRepository,
	cmd ReviewDecisionCommand, target ReviewTarget, row *repository.ReviewDecisionRow,
	memberID int64, at time.Time,
) error {
	slot := repository.ReviewCreditSlotConfirm
	if cmd.Decision == ReviewDecisionReject {
		slot = repository.ReviewCreditSlotReject
	}
	key := repository.ReviewCreditSlotKey{
		SourceType: target.Ref.SourceType, StableKey: target.Ref.StableKey, Slot: slot,
	}
	credits := repository.NewReviewCreditRepository(tx)
	if err := credits.LockSlot(ctx, key); err != nil {
		return fmt.Errorf("review decision lock credit slot: %w", err)
	}
	exists, err := credits.HasSlot(ctx, key)
	if err != nil {
		return fmt.Errorf("review decision check credit slot: %w", err)
	}
	if exists {
		return nil
	}
	if s.points == nil {
		return fmt.Errorf("review decision credit points: %w", repository.ErrValidation)
	}
	actorID, groupID := cmd.Actor.AppUserID, target.FansubGroupID
	entry, err := s.points.CreditInTx(ctx, tx, CreditCommand{
		MemberID: memberID, ActorAppUserID: &actorID,
		Source: SourceRef{RewardKind: RewardKindReview, Type: "review_decision",
			Key: reviewPointSourceKey(target.Ref), Slot: string(slot)},
		Rule: RuleRef{Code: "review.decision", Version: 1}, FansubGroupID: &groupID, EffectiveAt: at,
	})
	if err != nil {
		return fmt.Errorf("review decision credit points: %w", err)
	}
	if entry == nil || entry.ID <= 0 {
		return fmt.Errorf("review decision credit points: %w", repository.ErrValidation)
	}
	if _, err = credits.InsertSlot(ctx, repository.ReviewCreditSlotInput{
		ReviewCreditSlotKey: key, ReviewerMemberID: memberID, ReviewDecisionID: row.ID,
		PointLedgerEntryID: entry.ID, CreatedAt: at,
	}); err != nil {
		return fmt.Errorf("review decision insert credit slot: %w", err)
	}
	input := decisionAuditInput(
		repository.ReviewAuditEventReviewCreditAwarded, cmd, target, row.ID, &memberID, false, false, at,
	)
	if _, err = audit.InsertEvent(ctx, input); err != nil {
		return fmt.Errorf("review decision insert credit audit: %w", err)
	}
	return nil
}
func eligibleDelegationTarget(target *repository.ReviewDelegationMembership) bool {
	return target != nil && target.MembershipID > 0 && target.FansubGroupID > 0 &&
		target.AppUserID > 0 && target.MemberID != nil && *target.MemberID > 0 &&
		strings.TrimSpace(target.MembershipStatus) == "active" &&
		strings.TrimSpace(target.AppUserStatus) == "active" && target.HasVerifiedMemberClaim
}
func isDelegableReviewAction(action permissions.Action) bool {
	return action == permissions.ActionReviewTextDecide ||
		action == permissions.ActionReviewImageDecide ||
		action == permissions.ActionReviewContributionDecide
}
func containsReviewMemberID(memberIDs []int64, target int64) bool {
	for _, memberID := range memberIDs {
		if memberID == target {
			return true
		}
	}
	return false
}
func normalizedReviewRejectionCategory(cmd ReviewDecisionCommand) *repository.ReviewRejectionCategory {
	if cmd.Decision != ReviewDecisionReject {
		return nil
	}
	category := repository.ReviewRejectionCategory(strings.TrimSpace(string(cmd.RejectionCategory)))
	return &category
}
func delegationAuditSourceKey(membershipID int64, action permissions.Action) string {
	code := string(action)
	return "membership:" + strconv.FormatInt(membershipID, 10) +
		":action:" + strconv.Itoa(len([]byte(code))) + ":" + code
}
func reviewPointSourceKey(ref ReviewTargetRef) string {
	source, key := []byte(ref.SourceType), []byte(ref.StableKey)
	return "source:" + strconv.Itoa(len(source)) + ":" + hex.EncodeToString(source) +
		":key:" + strconv.Itoa(len(key)) + ":" + hex.EncodeToString(key)
}
