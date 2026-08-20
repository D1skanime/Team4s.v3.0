package handlers

// This file owns transport-only DTOs for the Phase 136 capability policy
// contract. Runtime resolution, persistence and authorization are implemented
// by later phases; these types intentionally contain no domain behavior.

type EffectiveRightProvenance string

const (
	EffectiveRightProvenanceIDPGlobalRole EffectiveRightProvenance = "idp_global_role"
	EffectiveRightProvenanceGroupRole     EffectiveRightProvenance = "group_role"
	EffectiveRightProvenanceUserAllow     EffectiveRightProvenance = "user_allow"
	EffectiveRightProvenanceUserDeny      EffectiveRightProvenance = "user_deny"
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
	CapabilityOverrideReasonTaskDelegation CapabilityOverrideReasonCategory = "task_delegation"
	CapabilityOverrideReasonSecurityMeasure CapabilityOverrideReasonCategory = "security_measure"
	CapabilityOverrideReasonRoleGap         CapabilityOverrideReasonCategory = "role_gap"
	CapabilityOverrideReasonOther           CapabilityOverrideReasonCategory = "other"
)

type EffectiveRightState struct {
	ActionCode  string                   `json:"action_code"`
	Allowed     bool                     `json:"allowed"`
	Provenance  EffectiveRightProvenance `json:"provenance"`
	Decisive    bool                     `json:"decisive"`
	NonDeniable bool                     `json:"non_deniable"`
}

type CapabilityOverrideReason struct {
	Category CapabilityOverrideReasonCategory `json:"category"`
	Text     *string                          `json:"text,omitempty"`
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

type NonPlatformAdminOverrideMutationRequest struct {
	GroupID              int64                     `json:"group_id"`
	TargetUserID         int64                     `json:"target_user_id"`
	ActionCode           string                    `json:"action_code"`
	Effect               *CapabilityOverrideEffect `json:"effect"`
	ActorIsPlatformAdmin bool                      `json:"actor_is_platform_admin"`
	Reason               CapabilityOverrideReason  `json:"reason"`
}

type PlatformAdminOverrideMutationRequest struct {
	GroupID              int64                     `json:"group_id"`
	TargetUserID         int64                     `json:"target_user_id"`
	ActionCode           string                    `json:"action_code"`
	Effect               *CapabilityOverrideEffect `json:"effect"`
	ActorIsPlatformAdmin bool                      `json:"actor_is_platform_admin"`
	Reason               *CapabilityOverrideReason `json:"reason,omitempty"`
}
