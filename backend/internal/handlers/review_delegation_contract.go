package handlers

// Review delegation is distinct from generic effective-rights overrides.
type ReviewDelegationRow struct {
	ActionCode       string `json:"action_code"`
	Granted          bool   `json:"granted"`
	MembershipActive bool   `json:"membership_active"`
	AppUserActive    bool   `json:"app_user_active"`
	HasVerifiedClaim bool   `json:"has_verified_claim"`
	EligibleForGrant bool   `json:"eligible_for_grant"`
}

type ReviewDelegationMutationRequest struct {
	ActionCode string `json:"action_code"`
	Grant      *bool  `json:"grant"`
}

type ReviewDelegationMutationResult struct {
	ActionCode string `json:"action_code"`
	Granted    bool   `json:"granted"`
}
