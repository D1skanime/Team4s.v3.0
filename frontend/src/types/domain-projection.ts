// Phase-72-Typ-Stubs — werden durch Phase-72-Ausführung (frontend/Phase-72-Plan-04) drop-in überschrieben.
// Shapes sind identisch zu den finalen Phase-72-Definitionen (73-RESEARCH.md §Phase-72-Contract).

export interface DomainMemberRow {
  member_display_name: string
  member_slug: string | null
  roles: string[]
  role_labels: string[]
  profile_status: 'active' | 'historical' | 'memorial'
  claimed: boolean
}

export interface DomainHistoricalRow {
  member_display_name: string
  member_slug: string | null
  roles: string[]
  role_labels: string[]
  profile_status: 'active' | 'historical' | 'memorial'
  claimed: boolean
}

export interface DomainContributorRow {
  member_display_name: string
  member_slug: string | null
  roles: string[]
  role_labels: string[]
  dispute_state: 'none' | 'open' | 'resolved'
  visibility: string
  review_status: string
}

export interface DomainProjectionResponse {
  members: DomainMemberRow[]
  historical: DomainHistoricalRow[]
  contributors: DomainContributorRow[]
}
