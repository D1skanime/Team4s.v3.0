package handlers

import (
	"encoding/json"
	"errors"
	"strings"
)

// This file owns transport-only DTOs for the Phase 136 capability policy
// contract. Runtime resolution, persistence and authorization are implemented
// by later phases; these types intentionally contain no domain behavior.

type EffectiveRightProvenance string

const (
	EffectiveRightProvenanceIDPGlobalRole EffectiveRightProvenance = "idp_global_role"
	EffectiveRightProvenanceGroupRole     EffectiveRightProvenance = "group_role"
	EffectiveRightProvenanceUserAllow     EffectiveRightProvenance = "user_allow"
	EffectiveRightProvenanceUserDeny      EffectiveRightProvenance = "user_deny"
	// Phase 137 (D04, 137-02) additive values: mirror the resolver's own
	// permissions.Provenance* constants (effective_rights.go) so the HTTP DTO
	// vocabulary never drifts from the central resolver's vocabulary.
	EffectiveRightProvenancePlatformAdmin    EffectiveRightProvenance = "platform_admin"
	EffectiveRightProvenanceSpecializedGrant EffectiveRightProvenance = "specialized_grant"
	EffectiveRightProvenanceNoGrant          EffectiveRightProvenance = "no_grant"
)

type CapabilityOverrideEffect string

const (
	CapabilityOverrideEffectAllow CapabilityOverrideEffect = "allow"
	CapabilityOverrideEffectDeny  CapabilityOverrideEffect = "deny"
)

type CapabilityActivationStatus string

const (
	CapabilityActivationStatusPersisted CapabilityActivationStatus = "persisted"
	CapabilityActivationStatusActive    CapabilityActivationStatus = "active"
	CapabilityActivationStatusPending   CapabilityActivationStatus = "pending"
	CapabilityActivationStatusFailed    CapabilityActivationStatus = "failed"
)

type CapabilityMutationStatus string

const (
	CapabilityMutationStatusChanged CapabilityMutationStatus = "changed"
	CapabilityMutationStatusNoOp    CapabilityMutationStatus = "no_op"
)

type CapabilityOverrideReasonCategory string

const (
	CapabilityOverrideReasonTaskDelegation  CapabilityOverrideReasonCategory = "task_delegation"
	CapabilityOverrideReasonSecurityMeasure CapabilityOverrideReasonCategory = "security_measure"
	CapabilityOverrideReasonRoleGap         CapabilityOverrideReasonCategory = "role_gap"
	CapabilityOverrideReasonOther           CapabilityOverrideReasonCategory = "other"
)

// EffectiveRightState is the additively extended Phase-137 DTO (D04): the
// original Phase-136 fields (action_code, allowed, provenance, decisive,
// non_deniable) remain unchanged, and this plan closes the gap 137-02-SUMMARY.md
// deferred by adding the six D04 provenance fields the shared OpenAPI contract
// (shared/contracts/admin-capabilities.yaml, openapi.yaml) already locked:
// granting_roles, user_allow, user_deny, specialized_grants, decisive_source,
// reason_code. One shape serves both mutation results and inspection.
type EffectiveRightState struct {
	ActionCode        string                   `json:"action_code"`
	Allowed           bool                     `json:"allowed"`
	Provenance        EffectiveRightProvenance `json:"provenance"`
	Decisive          bool                     `json:"decisive"`
	NonDeniable       bool                     `json:"non_deniable"`
	GrantingRoles     []string                 `json:"granting_roles"`
	UserAllow         bool                     `json:"user_allow"`
	UserDeny          bool                     `json:"user_deny"`
	SpecializedGrants []string                 `json:"specialized_grants"`
	DecisiveSource    EffectiveRightProvenance `json:"decisive_source"`
	ReasonCode        string                   `json:"reason_code"`
}

type CapabilityOverrideReason struct {
	Category CapabilityOverrideReasonCategory `json:"category"`
	Text     *string                          `json:"text,omitempty"`
}

func (reason CapabilityOverrideReason) Validate() error {
	switch reason.Category {
	case CapabilityOverrideReasonTaskDelegation,
		CapabilityOverrideReasonSecurityMeasure,
		CapabilityOverrideReasonRoleGap:
		return nil
	case CapabilityOverrideReasonOther:
		if reason.Text == nil || strings.TrimSpace(*reason.Text) == "" {
			return errors.New("reason text is required when category is other")
		}
		return nil
	default:
		return errors.New("invalid capability override reason category")
	}
}

func (reason *CapabilityOverrideReason) UnmarshalJSON(data []byte) error {
	type wireReason CapabilityOverrideReason
	var decoded wireReason
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}
	*reason = CapabilityOverrideReason(decoded)
	return reason.Validate()
}

type CapabilityOverrideState struct {
	GroupID         int64                    `json:"group_id"`
	TargetUserID    int64                    `json:"target_user_id"`
	ActionCode      string                   `json:"action_code"`
	Effect          CapabilityOverrideEffect `json:"effect"`
	Reason          CapabilityOverrideReason `json:"reason"`
	CreatedByUserID int64                    `json:"created_by_user_id"`
	CreatedAt       string                   `json:"created_at"`
}

type CapabilityOverrideImpactItem struct {
	TargetUserID int64               `json:"target_user_id"`
	Before       EffectiveRightState `json:"before"`
	After        EffectiveRightState `json:"after"`
}

type CapabilityOverrideImpactPreview struct {
	AffectedUserCount int                            `json:"affected_user_count"`
	Items             []CapabilityOverrideImpactItem `json:"items"`
}

type CapabilityOverrideAuditItem struct {
	ID           int64                     `json:"id"`
	GroupID      int64                     `json:"group_id"`
	TargetUserID int64                     `json:"target_user_id"`
	ActionCode   string                    `json:"action_code"`
	ActorUserID  int64                     `json:"actor_user_id"`
	OccurredAt   string                    `json:"occurred_at"`
	Before       *CapabilityOverrideState  `json:"before"`
	After        *CapabilityOverrideState  `json:"after"`
	Reason       *CapabilityOverrideReason `json:"reason"`
}

type CapabilityOverrideMutationResult struct {
	Status           CapabilityMutationStatus   `json:"status"`
	Changed          bool                       `json:"changed"`
	Before           *CapabilityOverrideState   `json:"before"`
	After            *CapabilityOverrideState   `json:"after"`
	EffectiveRight   EffectiveRightState        `json:"effective_right"`
	ActivationStatus CapabilityActivationStatus `json:"activation_status"`
}

type CapabilityOverrideMutationRequest struct {
	GroupID      int64                     `json:"group_id"`
	TargetUserID int64                     `json:"target_user_id"`
	ActionCode   string                    `json:"action_code"`
	Effect       *CapabilityOverrideEffect `json:"effect"`
	Reason       *CapabilityOverrideReason `json:"reason,omitempty"`
}

// capabilityOverrideMutationCommand is backend-only provenance. Handlers derive
// ActorIsPlatformAdmin from authenticated identity after decoding the external
// request; clients cannot populate this command directly.
type capabilityOverrideMutationCommand struct {
	CapabilityOverrideMutationRequest
	ActorIsPlatformAdmin bool
}
