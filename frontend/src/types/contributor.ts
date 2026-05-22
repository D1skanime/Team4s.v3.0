export interface ContributorGroupCapabilities {
  can_open_contributor_group: boolean
  can_edit_group: boolean
  can_view_group_media: boolean
  can_upload_group_media: boolean
  can_view_releases: boolean
  can_edit_release_descriptions: boolean
  can_upload_release_media: boolean
  can_manage_members: boolean
}

export interface ContributorGroupOverview {
  id: number
  slug: string
  name: string
  status: string
  group_type: string
  logo_url?: string | null
  banner_url?: string | null
  fansub_name: string
  membership_status: 'app_member' | 'historical' | 'platform_admin' | 'none'
  app_member_status?: string | null
  app_member_roles: string[]
  joined_year?: number | null
  left_year?: number | null
  active_from?: string | null
  active_until?: string | null
  has_historical_link: boolean
  anime_count: number
  release_count: number
  release_version_count: number
  group_media_count: number
  capabilities: ContributorGroupCapabilities
}

export interface ContributorReleaseVersionSummary {
  release_id: number
  release_version_id: number
  version: string
  anime_id: number
  anime_title: string
  episode_id: number
  episode_number: string
  episode_title?: string | null
  release_date?: string | null
  duration_seconds?: number | null
  media_count: number
  has_theme_assets: boolean
  is_coop: boolean
}

export interface ContributorAnimeSummary {
  id: number
  title: string
  type: string
  header_image?: string | null
  cover_image?: string | null
  release_count: number
  release_version_count: number
  releases: ContributorReleaseVersionSummary[]
}

export interface ContributorContributionSummary {
  fansub_group_id: number
  fansub_group_name: string
  role_name: string
  role_label: string
  release_count: number
}

export interface ContributorGroupDetail {
  group: ContributorGroupOverview
  anime: ContributorAnimeSummary[]
  contributions: ContributorContributionSummary[]
}

export interface ContributorGroupsResponse {
  data: ContributorGroupOverview[]
}

export interface ContributorGroupDetailResponse {
  data: ContributorGroupDetail
}
