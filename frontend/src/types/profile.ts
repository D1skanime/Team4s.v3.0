export type ProfileVisibility = 'public' | 'private'
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
  /** Laufende Mitgliedschaft (hist left_date IS NULL); trennt current von historical (PMDA-02). */
  is_current?: boolean
  /** Alle freigegebenen historischen Rollen als serverautoritative Code+Label-Paare (D-04/D-06). */
  roles?: PublicMemberRole[]
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
  caption?: string | null
  thumbnail_url?: string | null
  anime_title: string
  release_version_id: number
  release_version_label: string
}

export interface MemberProfileRecentContribution {
  id: number
  anime_title: string
  anime_id: number
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_names?: string[]
  role_name: string
  role_names?: string[]
  role_label: string
  role_labels?: string[]
  release_version_count?: number
  episode_count?: number
  worked_release_version_count?: number
  total_release_version_count?: number
}

export interface MemberProfileData {
  member_id: number
  has_member_profile: boolean
  /**
   * Authoritative project-eligibility signal (D-06/D-09). True only when the account has a
   * verified member profile AND at least one real confirmed anime/group contribution or
   * historical release credit. Never inferable from has_member_profile alone — gates the
   * "Meine Projekte" navigation entry and direct /me/contributions access.
   */
  has_project_assignments: boolean
  app_user_id: number
  legacy_user_id?: number | null
  display_name: string
  fansub_name: string
  slug: string
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

export type MemberProfileStatus = 'active' | 'historical' | 'memorial'

export interface PublicMemberBadge {
  id: number
  badge_code: string
  badge_category: string
  current_count?: number | null
  current_tier?: 'entry' | 'bronze' | 'silver' | 'gold' | 'platinum' | null
  next_threshold?: number | null
  remaining_count?: number | null
  next_tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
}

export interface PublicMemberBadgeProgress {
  family: string
  current_count: number
  next_threshold: number | null
  remaining_count: number | null
  next_tier: string | null
  complete: boolean
}

/** Stabiles Rollen-Code+Label-Paar (D-06): code steuert Styling, label_de ist serverautoritativ. */
export interface PublicMemberRole {
  code: string
  label_de: string
}

export interface PublicMemberProjectReleaseVersion {
  release_version_id: number
  release_version_label: string
  version: string
  title?: string | null
  episode_number: string
  episode_title?: string | null
  roles: PublicMemberRole[]
}

export interface PublicMemberCurrentProject {
  anime_id: number
  anime_title: string
  cover_url?: string | null
  fansub_group_id: number
  fansub_group_name: string
  roles: PublicMemberRole[]
  release_versions: PublicMemberProjectReleaseVersion[]
  is_project_level: boolean
  contribution_status: 'confirmed'
  started_year?: number | null
  ended_year?: number | null
}

export type PublicMemberLatestContributionType = 'text' | 'media'

export interface PublicMemberLatestContribution {
  type: PublicMemberLatestContributionType
  id: number
  occurred_at: string
  anime_id: number
  anime_title: string
  release_version_id: number
  release_version_label: string
  title?: string | null
  text_preview?: string | null
  body_html?: string | null
  image_url?: string | null
  thumbnail_url?: string | null
  media_category?: string | null
}

export interface PublicMemberPreviousContribution {
  anime_id: number
  anime_title: string
  fansub_group_id: number
  fansub_group_name: string
  roles: PublicMemberRole[]
  started_year?: number | null
  ended_year: number
}

/** Public group membership (allow-list, D-01): ohne interne app_member_status/app_member_roles/historical_member_status. */
export interface PublicMemberMembership {
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_slug: string
  logo_url?: string | null
  group_status: string
  joined_year?: number | null
  left_year?: number | null
  is_current: boolean
  roles: PublicMemberRole[]
  has_historical_link: boolean
}

/** Public background image (allow-list, D-01): nur Anzeige-URL, keine source_original_url. */
export interface PublicMemberProfileBackgroundImage {
  public_url: string
}

/** Standardisierter Fehler-Envelope (D-04); eine Form fuer alle 404/500-Antworten. */
export interface ApiErrorEnvelope {
  error: {
    message: string
    code?: string
    details?: string
  }
}

export interface PublicMemberProfileData {
  member_id: number
  fansub_name: string
  bio?: string | null
  slug: string
  member_story_html?: string | null
  active_from_date?: string | null
  active_until_date?: string | null
  /** Jahr-genaue Aktivperiode (D-02): gesetzt nur bei fehlendem vollem Datum. */
  active_from_year?: number | null
  active_until_year?: number | null
  is_currently_active: boolean
  noindex: boolean
  is_verified: boolean
  /** Statuswert des Member-Profils (D-09/D-10). claimed/unclaimed sind derived, nicht im DTO. */
  profile_status: MemberProfileStatus
  profile_visibility: ProfileVisibility
  avatar?: {
    public_url: string
  } | null
  background_image?: PublicMemberProfileBackgroundImage | null
  memberships: PublicMemberMembership[]
  /** Eingebettete öffentliche Badges des angezeigten Members (Badges-13). Nur visibility='public' AND status='active'. */
  public_badges: PublicMemberBadge[]
  /** Autoritative Rohwerte der sechs Badge-Familien; nur in sichtbaren Profilantworten. */
  badge_progress: PublicMemberBadgeProgress[]
  /** Gesamtpunktzahl aus member_point_totals, nie im Frontend neu aggregiert (D-02/Phase 110-02). */
  total_points: number
  current_projects?: PublicMemberCurrentProject[]
  current_projects_count?: number
  latest_contributions?: PublicMemberLatestContribution[]
  previous_contributions?: PublicMemberPreviousContribution[]
  previous_contributions_count?: number
}

export interface PublicMemberProjectsPage {
  items: PublicMemberCurrentProject[]
  total: number
  limit: number
  offset: number
}

export interface PublicMemberViewer {
  is_owner: boolean
  is_private_preview: boolean
}

export interface PublicMemberProjectsResponse {
  data: PublicMemberProjectsPage
}

export interface PublicMemberProfileResponse {
  data: PublicMemberProfileData
  viewer: PublicMemberViewer
}

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
