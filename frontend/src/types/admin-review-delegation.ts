export interface ReviewDelegationRow { action_code: string; granted: boolean; membership_active: boolean; app_user_active: boolean; has_verified_claim: boolean; eligible_for_grant: boolean }
export interface ReviewDelegationMutationRequest { action_code: string; grant: boolean }
export interface ReviewDelegationMutationResult { action_code: string; granted: boolean }
