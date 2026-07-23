package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
)

var (
	ErrReviewCapabilityDenied           = errors.New("review capability denied")
	ErrReviewActionInvalid              = errors.New("review action invalid")
	ErrReviewDelegationTargetIneligible = errors.New("review delegation target ineligible")
)

type ReviewDelegationCommand struct {
	Actor              permissions.Actor
	TargetMembershipID int64
	Action             permissions.Action
}

type ReviewService struct {
	starter  PointTxStarter
	adapters map[string]any
	now      func() time.Time
}

func NewReviewService(starter PointTxStarter, adapters map[string]any) *ReviewService {
	copiedAdapters := make(map[string]any, len(adapters))
	for sourceType, adapter := range adapters {
		copiedAdapters[sourceType] = adapter
	}
	return &ReviewService{
		starter:  starter,
		adapters: copiedAdapters,
		now:      time.Now,
	}
}

func (s *ReviewService) GrantDelegation(ctx context.Context, cmd ReviewDelegationCommand) error {
	return s.changeDelegation(ctx, cmd, true)
}

func (s *ReviewService) RevokeDelegation(ctx context.Context, cmd ReviewDelegationCommand) error {
	return s.changeDelegation(ctx, cmd, false)
}

func (s *ReviewService) changeDelegation(
	ctx context.Context,
	cmd ReviewDelegationCommand,
	grant bool,
) error {
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
		ctx,
		cmd.Actor,
		permissions.ActionFansubGroupMembersManage,
		target.FansubGroupID,
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

	var changed bool
	if grant {
		changed, err = delegations.GrantAction(ctx, target.MembershipID, string(cmd.Action))
	} else {
		changed, err = delegations.RevokeAction(ctx, target.MembershipID, string(cmd.Action))
	}
	if err != nil {
		return fmt.Errorf("change review delegation mutate: %w", err)
	}

	if changed {
		eventCode := repository.ReviewAuditEventDelegationRevoked
		if grant {
			eventCode = repository.ReviewAuditEventDelegationGranted
		}
		actorAppUserID := cmd.Actor.AppUserID
		_, err = repository.NewReviewAuditRepository(tx).InsertEvent(ctx, repository.ReviewAuditEventInput{
			EventCode:      eventCode,
			ActorKind:      repository.ReviewAuditActorAppUser,
			ActorAppUserID: &actorAppUserID,
			FansubGroupID:  target.FansubGroupID,
			SourceType:     "review_delegation",
			SourceKey:      delegationAuditSourceKey(target.MembershipID, cmd.Action),
			SourceRevision: 1,
			OccurredAt:     s.now().UTC(),
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

func eligibleDelegationTarget(target *repository.ReviewDelegationMembership) bool {
	return target != nil &&
		target.MembershipID > 0 &&
		target.FansubGroupID > 0 &&
		target.AppUserID > 0 &&
		target.MemberID != nil &&
		*target.MemberID > 0 &&
		strings.TrimSpace(target.MembershipStatus) == "active" &&
		strings.TrimSpace(target.AppUserStatus) == "active" &&
		target.HasVerifiedMemberClaim
}

func isDelegableReviewAction(action permissions.Action) bool {
	return action == permissions.ActionReviewTextDecide ||
		action == permissions.ActionReviewImageDecide ||
		action == permissions.ActionReviewContributionDecide
}

func delegationAuditSourceKey(
	membershipID int64,
	action permissions.Action,
) string {
	actionCode := string(action)
	return "membership:" + strconv.FormatInt(membershipID, 10) +
		":action:" + strconv.Itoa(len([]byte(actionCode))) + ":" + actionCode
}
