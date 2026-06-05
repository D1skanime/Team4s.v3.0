export type ProfileVisibility = 'public' | 'members_only'
export type TipTapDocument = Record<string, unknown>

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
  logo_url?: string | null
  group_status: string
  joined_year?: number | null
  left_year?: number | null
  app_member_status?: string | null
  app_member_roles?: string[]
  has_historical_link: boolean
  historical_member_status?: 'draft' | 'historical' | 'confirmed' | 'disputed' | null
}

export interface MemberProfileCredit {
  fansub_group_id: number
  fansub_group_name: string
  role_name: string
  role_label: string
  release_count: number
}

export interface MemberProfileRecentMedia {
  id: number
  category: string
  thumbnail_url?: string | null
  anime_title: string
  release_version_id: number
  release_version_label: string
}

export interface MemberProfileRecentContribution {
  id: number
  anime_title: string
  anime_id: number
  fansub_group_name: string
  role_name: string
  role_label: string
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
  member_story_json?: TipTapDocument | null
  member_story_html?: string | null
  member_story_text?: string | null
  member_story_editor_type?: 'tiptap'
  member_story_content_schema_version?: number
  active_from_date?: string | null
  active_until_date?: string | null
  active_from_year?: number | null
  active_until_year?: number | null
  is_currently_active: boolean
  noindex: boolean
  is_verified: boolean
  claim_status?: 'pending' | 'verified' | 'rejected' | null
  claim_member_nick?: string | null
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
  background_image?: {
    public_url: string
    source_original_url?: string | null
  } | null
  keycloak_account_url?: string | null
  capabilities: MemberProfileCapabilities
  memberships: MemberProfileMembership[]
  historical_credits: MemberProfileCredit[]
  recent_media: MemberProfileRecentMedia[]
  recent_contributions: MemberProfileRecentContribution[]
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
  member_story_json?: TipTapDocument | null
  active_from_date?: string | null
  active_until_date?: string | null
  active_from_year?: number | null
  active_until_year?: number | null
  is_currently_active?: boolean | null
  profile_visibility?: ProfileVisibility | null
}

export interface PublicMemberProfileData {
  member_id: number
  fansub_name: string
  bio?: string | null
  member_story_html?: string | null
  active_from_date?: string | null
  active_until_date?: string | null
  is_currently_active: boolean
  noindex: boolean
  is_verified: boolean
  profile_visibility: ProfileVisibility
  avatar?: {
    public_url: string
  } | null
  background_image?: {
    public_url: string
    source_original_url?: string | null
  } | null
  memberships: MemberProfileMembership[]
  recent_media: MemberProfileRecentMedia[]
  recent_contributions: MemberProfileRecentContribution[]
}

export type PublicMemberProfileResponse =
  | { data: PublicMemberProfileData }
  | { visible: false; reason: string }

export interface MemberSearchResult {
  id: number
  nickname: string
  display_name: string
}

export interface MemberClaimRow {
  id: number
  app_user_id: number
  member_id: number
  member_nickname: string
  claim_status: 'pending' | 'verified' | 'rejected'
  note?: string | null
  created_at: string
}

export interface GenerateClaimInvitationResponse {
  id: number
  member_id: number
  fansub_group_id: number
  status: string
  expires_at: string
  invite_link: string
}

export interface MemberClaimInvitationResponse {
  id: number
  member_id: number
  fansub_group_id: number
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  expires_at: string
  created_at: string
}

export interface MemberRequestRow {
  id: number
  app_user_id: number
  claim_status: 'pending' | 'verified' | 'rejected'
  note?: string | null
  created_at: string
}
