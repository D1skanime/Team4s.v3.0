package services

// Phase 137 — Transactional per-user override mutation (137-CONTEXT.md D06-D08).
//
// EffectiveRightsService.MutateOverride is the single write path for a group-scoped
// personal capability allow/deny override. It mirrors ReviewService.changeDelegation's
// established Begin -> defer Rollback -> authorize -> validate -> lock -> compare ->
// mutate -> append history -> Commit shape, using permissions.ResolveGroupRights (via
// CanForFansubGroup) for authorization and repository.AuthzUserOverridesRepository for
// persistence.
//
// D06 allows exactly three logical operations -- SET ALLOW, SET DENY, REMOVE -- and no
// generic toggle. A mutation is a real change only when the stored effect actually
// changes (none/allow/deny transitions); an exact repeat (allow->allow, deny->deny,
// none->none) is a true no-op: no history row is appended and no reason is required.
// Every real change is atomic with its immutable history append in one transaction; a
// history-insert failure rolls back the override mutation too (D06 "Atomicity").
//
// D07 authorizes mutation exclusively through the dedicated, non-hard-coded
// user_group_capability_override.manage capability, resolved for the target group via
// the same central ResolveGroupRights precedence used everywhere else in Phase 137 --
// platform_admin flows through its existing non-deniable bypass, and self-mutation is
// allowed only because the actor happens to hold that capability, never through a
// special-cased identity check.
//
// D08 keeps every operation strictly scoped to one (target_app_user_id, fansub_group_id)
// pair resolved and locked server-side; a manipulated or foreign target/group id simply
// fails to resolve an active membership (ErrEffectiveRightsTargetNotActiveMember) instead
// of disclosing whether the target exists in a different group.

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
)

// ActionEffectiveRightsOverrideManage is the dedicated, group-scoped management
// capability D07 requires for override mutation. Migration 0150 seeds it only to
// fansub_lead and makes it permanently non-overridable. It is an alias for
// permissions.ActionUserGroupCapabilityOverrideManage (added by this plan alongside
// permissions.allKnownActions -- 137-04-SUMMARY.md flagged that no Action constant
// existed yet); kept as a service-local name so callers of this file need not reach
// into the permissions package for it.
const ActionEffectiveRightsOverrideManage = permissions.ActionUserGroupCapabilityOverrideManage

// EffectiveRightsActivationStatus mirrors the Phase-136 handler contract's
// activation_status concept (capability_policy_contract.go's CapabilityActivationStatus)
// without importing the handlers package, which services must never depend on. Phase 137
// only ever produces "active": a committed real change or a committed no-op are both
// immediately effective, and this service never returns a pending/persisted-only state.
type EffectiveRightsActivationStatus string

const EffectiveRightsActivationStatusActive EffectiveRightsActivationStatus = "active"

// OverrideMutationKind is exactly the three D06 logical operations. There is
// deliberately no generic toggle.
type OverrideMutationKind string

const (
	OverrideMutationSetAllow OverrideMutationKind = "set_allow"
	OverrideMutationSetDeny  OverrideMutationKind = "set_deny"
	OverrideMutationRemove   OverrideMutationKind = "remove"
)

// Override mutation reason categories, matching migration 0146's
// chk_user_group_capability_override_history_reason_category CHECK values exactly.
const (
	OverrideReasonCategoryTaskDelegation  = "task_delegation"
	OverrideReasonCategorySecurityMeasure = "security_measure"
	OverrideReasonCategoryRoleGap         = "role_gap"
	OverrideReasonCategoryOther           = "other"
)

var (
	ErrEffectiveRightsMutationInvalid       = errors.New("effective rights mutation invalid")
	ErrEffectiveRightsCapabilityDenied      = errors.New("effective rights capability denied")
	ErrEffectiveRightsActionUnknown         = errors.New("effective rights action unknown")
	ErrEffectiveRightsActionNotOverridable  = errors.New("effective rights action not overridable")
	ErrEffectiveRightsTargetNotActiveMember = errors.New("effective rights target not active member")
	ErrEffectiveRightsReasonRequired        = errors.New("effective rights reason required")
)

// EffectiveRightsOverrideMutationCommand is the full input to one D06 mutation
// operation. Actor is the caller whose management capability is checked; TargetAppUserID
// is the subject whose personal override is read/written. Both are always resolved
// against the exact same FansubGroupID (D08).
type EffectiveRightsOverrideMutationCommand struct {
	Actor           permissions.Actor
	TargetAppUserID int64
	FansubGroupID   int64
	ActionCode      permissions.Action
	Kind            OverrideMutationKind
	ReasonCategory  string
	ReasonText      string
}

// EffectiveRightsOverrideMutationResult reports whether a mutation actually changed
// stored state (D06 "Real changes" vs "Exact idempotent repetitions") along with the
// before/after effect ("allow"/"deny"/nil for "no override stored").
type EffectiveRightsOverrideMutationResult struct {
	Changed          bool
	BeforeEffect     *string
	AfterEffect      *string
	ActivationStatus EffectiveRightsActivationStatus
}

// effectiveRightsOverrideRepo is the minimal persistence surface MutateOverride needs
// from repository.AuthzUserOverridesRepository. It exists as a local interface (mirroring
// ReviewTargetAdapter's role in review_service.go) purely so tests in this package can
// substitute a wrapper -- e.g. to force a history-insert failure and prove the rollback
// behavior, or to observe the exact moment the target membership lock is held for a
// deterministic concurrency proof. Production code always uses the real repository.
type effectiveRightsOverrideRepo interface {
	LoadOverridePolicy(ctx context.Context, actionCode string) (*repository.CapabilityOverridePolicy, error)
	LockTargetMembership(ctx context.Context, appUserID int64, fansubGroupID int64) (*repository.TargetMembership, error)
	UpsertOverride(ctx context.Context, appUserID int64, fansubGroupID int64, actionCode string, effect string, actorAppUserID int64) (beforeEffect *string, afterEffect string, err error)
	DeleteOverride(ctx context.Context, appUserID int64, fansubGroupID int64, actionCode string) (beforeEffect *string, err error)
	AppendHistory(ctx context.Context, entry repository.UserGroupCapabilityOverrideHistoryEntry) (int64, error)
}

// EffectiveRightsService owns the transactional override mutation write path.
type EffectiveRightsService struct {
	starter PointTxStarter
	now     func() time.Time

	// newOverrideRepo and testBarrier exist solely for this package's own tests
	// (effective_rights_service_test.go / effective_rights_concurrency_test.go).
	// Production callers only ever use NewEffectiveRightsService, which leaves both nil.
	newOverrideRepo func(tx pgx.Tx) effectiveRightsOverrideRepo
	testBarrier     func(stage string)
}

func NewEffectiveRightsService(starter PointTxStarter) *EffectiveRightsService {
	return &EffectiveRightsService{starter: starter, now: time.Now}
}

func (s *EffectiveRightsService) overrideRepoFor(tx pgx.Tx) effectiveRightsOverrideRepo {
	if s.newOverrideRepo != nil {
		return s.newOverrideRepo(tx)
	}
	return repository.NewAuthzUserOverridesRepository(tx)
}

func (s *EffectiveRightsService) signalBarrier(stage string) {
	if s.testBarrier != nil {
		s.testBarrier(stage)
	}
}

// MutateOverride applies exactly one D06 logical operation (SET ALLOW / SET DENY /
// REMOVE) to one (TargetAppUserID, FansubGroupID, ActionCode) override, atomically with
// its immutable history append, per the D06 pseudocode:
//
//	BEGIN
//	  authorize actor
//	  validate target membership
//	  validate capability + user_overridable
//	  read/lock current override state consistently
//	  apply override mutation
//	  append immutable history (skipped for an exact no-op)
//	COMMIT
func (s *EffectiveRightsService) MutateOverride(
	ctx context.Context,
	cmd EffectiveRightsOverrideMutationCommand,
) (*EffectiveRightsOverrideMutationResult, error) {
	if s == nil || s.starter == nil {
		return nil, fmt.Errorf("mutate override: %w", repository.ErrValidation)
	}
	actionCode := strings.TrimSpace(string(cmd.ActionCode))
	if cmd.TargetAppUserID <= 0 || cmd.FansubGroupID <= 0 || actionCode == "" {
		return nil, fmt.Errorf("mutate override: %w", repository.ErrValidation)
	}
	switch cmd.Kind {
	case OverrideMutationSetAllow, OverrideMutationSetDeny, OverrideMutationRemove:
	default:
		return nil, fmt.Errorf("mutate override kind: %w", ErrEffectiveRightsMutationInvalid)
	}

	tx, err := s.starter.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("mutate override begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// D07: authorize the actor's dedicated management capability against the exact
	// target group. Platform admin flows through the resolver's own non-deniable
	// bypass; ordinary role names receive no special-casing here.
	authz := repository.NewAuthzRepository(tx)
	authResult, err := permissions.NewService(authz).CanForFansubGroup(
		ctx, cmd.Actor, ActionEffectiveRightsOverrideManage, cmd.FansubGroupID,
	)
	if err != nil {
		return nil, fmt.Errorf("mutate override authorize: %w", err)
	}
	if !authResult.Allowed {
		return nil, ErrEffectiveRightsCapabilityDenied
	}

	overrides := s.overrideRepoFor(tx)

	// D02/D08: a mutation may only be applied against a currently active membership in
	// the exact same target group. A genuinely missing membership and a foreign/wrong
	// group both resolve to the same neutral error, and an existing-but-inactive
	// membership does too -- consistent with D08's "prefer neutral not_found behavior"
	// and D02's dormant-override model (the resolver, not this service, is what keeps a
	// retained override visible-but-ineffective; this service never auto-deletes it, it
	// simply refuses to mutate against an inactive target).
	membership, err := overrides.LockTargetMembership(ctx, cmd.TargetAppUserID, cmd.FansubGroupID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrEffectiveRightsTargetNotActiveMember
		}
		return nil, fmt.Errorf("mutate override lock membership: %w", err)
	}
	if strings.TrimSpace(membership.Status) != "active" {
		return nil, ErrEffectiveRightsTargetNotActiveMember
	}
	s.signalBarrier("locked_membership")

	// D07/D08: the action must exist in the canonical catalog and be user_overridable;
	// migration 0146's composite FK is the fail-closed database backstop behind this
	// service-level check.
	policy, err := overrides.LoadOverridePolicy(ctx, actionCode)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrEffectiveRightsActionUnknown
		}
		return nil, fmt.Errorf("mutate override policy: %w", err)
	}
	if !policy.UserOverridable {
		return nil, ErrEffectiveRightsActionNotOverridable
	}

	before, after, changed, err := applyOverrideMutation(ctx, overrides, cmd, actionCode)
	if err != nil {
		return nil, err
	}

	if !changed {
		// D06: an exact repeat is a true no-op -- no history row, no fabricated
		// timestamp, and no reason requirement, but still a committed, active result.
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("mutate override commit no-op: %w", err)
		}
		return &EffectiveRightsOverrideMutationResult{
			Changed: false, BeforeEffect: before, AfterEffect: after,
			ActivationStatus: EffectiveRightsActivationStatusActive,
		}, nil
	}

	reasonCategory, reasonText, err := validateOverrideMutationReason(cmd.ReasonCategory, cmd.ReasonText)
	if err != nil {
		return nil, err
	}

	if _, err := overrides.AppendHistory(ctx, repository.UserGroupCapabilityOverrideHistoryEntry{
		AppUserID:            cmd.TargetAppUserID,
		FansubGroupID:        cmd.FansubGroupID,
		ActionCode:           actionCode,
		ActorAppUserID:       cmd.Actor.AppUserID,
		ActorIsPlatformAdmin: cmd.Actor.IsPlatformAdmin,
		BeforeEffect:         before,
		AfterEffect:          after,
		ReasonCategory:       reasonCategory,
		ReasonText:           reasonText,
	}); err != nil {
		// D06 "Atomicity": a history-append failure must roll back the override
		// mutation too -- the deferred tx.Rollback above does exactly that since
		// Commit is never reached on this path.
		return nil, fmt.Errorf("mutate override append history: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("mutate override commit: %w", err)
	}

	return &EffectiveRightsOverrideMutationResult{
		Changed: true, BeforeEffect: before, AfterEffect: after,
		ActivationStatus: EffectiveRightsActivationStatusActive,
	}, nil
}

// applyOverrideMutation performs exactly one D06 logical operation against the
// already-locked target and reports whether it was a real change. Real-change
// classification always follows the D06 transition lists: none<->allow<->deny is real,
// allow->allow/deny->deny/none->none is not.
func applyOverrideMutation(
	ctx context.Context,
	overrides effectiveRightsOverrideRepo,
	cmd EffectiveRightsOverrideMutationCommand,
	actionCode string,
) (before *string, after *string, changed bool, err error) {
	switch cmd.Kind {
	case OverrideMutationSetAllow, OverrideMutationSetDeny:
		effect := "allow"
		if cmd.Kind == OverrideMutationSetDeny {
			effect = "deny"
		}
		beforeEffect, afterEffect, upsertErr := overrides.UpsertOverride(
			ctx, cmd.TargetAppUserID, cmd.FansubGroupID, actionCode, effect, cmd.Actor.AppUserID,
		)
		if upsertErr != nil {
			return nil, nil, false, fmt.Errorf("mutate override upsert: %w", upsertErr)
		}
		afterCopy := afterEffect
		return beforeEffect, &afterCopy, beforeEffect == nil || *beforeEffect != afterEffect, nil
	case OverrideMutationRemove:
		beforeEffect, deleteErr := overrides.DeleteOverride(ctx, cmd.TargetAppUserID, cmd.FansubGroupID, actionCode)
		if deleteErr != nil {
			return nil, nil, false, fmt.Errorf("mutate override delete: %w", deleteErr)
		}
		return beforeEffect, nil, beforeEffect != nil, nil
	default:
		return nil, nil, false, fmt.Errorf("mutate override kind: %w", ErrEffectiveRightsMutationInvalid)
	}
}

// validateOverrideMutationReason enforces D06's "every real override mutation must
// carry a reason" rule for every actor -- including platform admins, even though
// migration 0146's own CHECK constraint (chk_user_group_capability_override_history_
// reason_required) only requires it for non-platform-admin actors. This service chooses
// the stricter, uniform rule rather than relying on that DB-level laxity.
func validateOverrideMutationReason(category string, text string) (*string, *string, error) {
	trimmedCategory := strings.TrimSpace(category)
	if trimmedCategory == "" {
		return nil, nil, ErrEffectiveRightsReasonRequired
	}
	switch trimmedCategory {
	case OverrideReasonCategoryTaskDelegation, OverrideReasonCategorySecurityMeasure, OverrideReasonCategoryRoleGap:
		return &trimmedCategory, normalizedOverrideReasonText(text), nil
	case OverrideReasonCategoryOther:
		trimmedText := strings.TrimSpace(text)
		if trimmedText == "" {
			return nil, nil, ErrEffectiveRightsReasonRequired
		}
		return &trimmedCategory, &trimmedText, nil
	default:
		return nil, nil, ErrEffectiveRightsMutationInvalid
	}
}

func normalizedOverrideReasonText(text string) *string {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
