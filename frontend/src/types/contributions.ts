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

// Versions-Detailebene (Phase 67-04): pro Release-Version eine Aufschlüsselung
// der versions-spezifischen Beiträge einer Gruppe (Spiegel zu
// ReleaseVersionBreakdownGroup im Backend).
export interface ReleaseVersionBreakdown {
  release_version_id: number
  episode_number: string
  version: string
  contributors: PublicAnimeContribution[]
}

export interface AnimeContributionGroup {
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_slug: string
  active_from_year: number | null
  active_until_year: number | null
  contributors: PublicAnimeContribution[]
  hidden_contributor_count: number
  // Versions-spezifische Beiträge (anime-weite Beiträge bleiben in contributors).
  // Leer/undefined wenn keine versions-spezifischen Beiträge existieren.
  version_breakdown?: ReleaseVersionBreakdown[]
}

// Eine Dropdown-Option für das gruppen-gefilterte Release-Version-Select
// im Leader-Contribution-Formular (Spiegel zu GroupReleaseVersionOption im Backend).
export interface FansubAnimeReleaseVersionOption {
  release_version_id: number
  episode_number: string
  version: string
}

export interface FansubAnimeReleaseVersionsResponse {
  data: FansubAnimeReleaseVersionOption[]
}

export interface PublicAnimeContributionsResponse {
  groups: AnimeContributionGroup[]
}

// Typen für eigene Contributions des eingeloggten Members (Me-Routen)

export interface MeAnimeContribution {
  id: number
  anime_id: number
  anime_title?: string
  fansub_group_id: number
  fansub_group_member_id: number
  status: 'confirmed' | 'proposed' | 'draft' | 'disputed' | 'hidden'
  role_codes: string[]
  role_labels?: string[]
  started_year: number | null
  ended_year: number | null
  is_public_on_anime_page: boolean
  is_public_on_member_profile: boolean
  note: string | null
  review_note?: string | null
  can_self_publish?: boolean
  release_version_id: number | null
  /** Phase 76: Gruppen-Name für Gruppen-Filter (D-12) */
  fansub_group_name?: string
  /** Phase 76: Vom Backend berechnet — true wenn der eingeloggte User selbst der Ersteller ist (D-03a) */
  is_own_proposal: boolean
  /** Phase 76: Eigene Dispute-Begründung (D-09 "Das war ich nicht") */
  member_reason?: string | null
  /** Episodennummer aus episodes.episode_number (null = anime-weit) */
  episode_number?: string | null
  /** Sortier-Index aus episodes.sort_index für Bereichsbildung (null = anime-weit) */
  episode_sort_index?: number | null
}

/** Phase 76: Einzelner Vorschlag des eingeloggten Members (Decision 6) */
export interface MeSuggestion {
  id: number
  suggestion_type: 'error_report' | 'story' | 'media'
  target_type: 'anime' | 'contribution' | 'fansub_group' | 'member'
  target_id: number
  content_text: string | null
  status: 'pending' | 'in_review' | 'approved' | 'rejected'
  review_note: string | null
  created_at: string
}

/** Phase 76: Response-Envelope für GET /me/suggestions */
export interface MeSuggestionsResponse {
  data: MeSuggestion[]
}

export interface ProposalFormData {
  fansub_group_id: number
  anime_id: number
  fansub_group_member_id: number
  role_codes: string[]
  note?: string | null
  started_year?: number | null
  ended_year?: number | null
  release_version_id?: number | null
}

export interface GroupProposalRow {
  id: number
  fansub_group_member_id: number
  member_display_name: string
  anime_id: number
  anime_title: string
  role_codes: string[]
  note: string | null
  created_at: string
}

export interface GroupProposalsResponse {
  data: GroupProposalRow[]
}

export interface MembershipEntry {
  fansub_group_member_id: number
  fansub_group_id: number
  group_name: string
}

export interface MembershipsResponse {
  data: MembershipEntry[]
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

// Typen für öffentliche Member-Rollen-Timeline (Public Member-Profil)

export interface PublicMemberRoleEntry {
  fansub_group_name: string
  fansub_group_slug: string
  role_code: string
  role_label: string
  context: 'group_history' | 'anime_contribution'
  anime_title: string | null
  anime_id: number | null
  started_year: number | null
  ended_year: number | null
  status: string
  notes: string | null
}

export interface PublicMemberContributionsResponse {
  role_timeline: PublicMemberRoleEntry[]
  has_unverified: boolean
}

export interface MemberBadge {
  id: number
  badge_code: string
  badge_category: string
  visibility: 'public' | 'internal' | 'hidden'
  awarded_at: string
}

export interface MemberBadgesResponse {
  badges: MemberBadge[]
}
