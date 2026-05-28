export type ProfileVisibility = 'public' | 'members_only'

export interface MemberProfileCapabilities {
  can_view_own_profile: boolean
  can_edit_own_profile: boolean
  can_upload_own_avatar: boolean
  can_open_keycloak_account: boolean
  can_view_memberships: boolean
  can_view_historical_credits: boolean
}

export interface MemberProfileMembership {
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_slug: string
  group_status: string
  joined_year?: number | null
  left_year?: number | null
  app_member_status?: string | null
  app_member_roles?: string[]
  has_historical_link: boolean
}

export interface MemberProfileCredit {
  fansub_group_id: number
  fansub_group_name: string
  role_name: string
  role_label: string
  release_count: number
}

export interface MemberProfileData {
  member_id: number
  app_user_id: number
  legacy_user_id?: number | null
  display_name: string
  fansub_name: string
  email: string
  keycloak_subject: string
  bio?: string | null
  member_story?: string | null
  active_from_year?: number | null
  active_until_year?: number | null
  is_currently_active: boolean
  profile_visibility: ProfileVisibility
  avatar?: {
    id: number
    filename: string
    public_url: string
    source_original_url?: string | null
    mime_type: string
    size_bytes: number
    width?: number | null
    height?: number | null
    created_at: string
  } | null
  keycloak_account_url?: string | null
  capabilities: MemberProfileCapabilities
  memberships: MemberProfileMembership[]
  historical_credits: MemberProfileCredit[]
  created_at: string
  updated_at: string
  account_status: 'pending' | 'active' | 'disabled'
  account_display_name: string
  account_global_roles: string[]
}

export interface MemberProfileResponse {
  data: MemberProfileData
}

export interface UpdateMemberProfileRequest {
  display_name?: string | null
  fansub_name?: string | null
  bio?: string | null
  member_story?: string | null
  active_from_year?: number | null
  active_until_year?: number | null
  is_currently_active?: boolean | null
  profile_visibility?: ProfileVisibility | null
}
