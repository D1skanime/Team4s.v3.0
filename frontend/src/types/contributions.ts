// Typen für öffentliche Contributions (Public-Routen)

export interface PublicAnimeContribution {
  member_display_name: string
  member_slug: string | null
  roles: string[]
  role_labels: string[]
  started_year: number | null
  ended_year: number | null
  is_verified: boolean
}

export interface PublicFansubContributionsResponse {
  contributions: PublicAnimeContribution[]
  total_hidden_count: number
}

export interface PublicFansubLeaderEntry {
  member_display_name: string
  member_slug: string | null
  role_code: string
  role_label: string
  started_year: number | null
  ended_year: number | null
  status: string
}

export interface PublicGroupContributionsResponse {
  leader_timeline: PublicFansubLeaderEntry[]
  anime_count: number
  member_count: number
}

export interface AnimeContributionGroup {
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_slug: string
  active_from_year: number | null
  active_until_year: number | null
  contributors: PublicAnimeContribution[]
  hidden_contributor_count: number
}

export interface PublicAnimeContributionsResponse {
  groups: AnimeContributionGroup[]
}

// Typen für eigene Contributions des eingeloggten Members (Me-Routen)

export interface MeAnimeContribution {
  id: number
  anime_id: number
  fansub_group_id: number
  fansub_group_member_id: number
  status: 'confirmed' | 'proposed' | 'draft' | 'disputed' | 'hidden'
  role_codes: string[]
  started_year: number | null
  ended_year: number | null
  is_public_on_anime_page: boolean
  is_public_on_member_profile: boolean
  note: string | null
}

export interface MeGroupContribution {
  id: number
  fansub_group_id: number
  hist_fansub_group_member_id: number
  role_code: string
  started_year: number | null
  ended_year: number | null
  visibility: string
  status: string
}

export interface MeAnimeContributionsResponse {
  data: MeAnimeContribution[]
}

export interface MeGroupContributionsResponse {
  data: MeGroupContribution[]
}
