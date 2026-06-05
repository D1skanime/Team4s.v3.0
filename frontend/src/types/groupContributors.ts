// Matches backend group_contributors_repository.go DTOs (snake_case JSON tags)

export interface GroupTeamMember {
  member_id: number
  member_display_name: string
  member_slug: string | null
  role_labels: string[]
}

export interface GroupExternalContributor {
  member_display_name: string
  member_slug: string | null
  role_labels: string[]
  is_verified: boolean
}

export interface GroupContributorsResponse {
  team_members: GroupTeamMember[]
  external_contributors: GroupExternalContributor[]
}

export interface PublicThemeAsset {
  id: number
  thumbnail_url: string | null
}

export interface PublicGroupTheme {
  id: number
  type: string
  title: string
  assets: PublicThemeAsset[]
}

export interface GroupThemesResponse {
  themes: PublicGroupTheme[]
}

export interface PublicReleaseMediaItem {
  id: number
  thumbnail_url: string | null
  caption: string | null
  media_type: string
}

export interface GroupReleaseMediaResponse {
  items: PublicReleaseMediaItem[]
}
