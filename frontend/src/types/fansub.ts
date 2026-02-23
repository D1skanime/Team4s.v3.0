import { PaginationMeta } from '@/types/anime'

export type FansubStatus = 'active' | 'inactive' | 'dissolved'

export interface FansubGroup {
  id: number
  slug: string
  name: string
  description?: string | null
  history?: string | null
  logo_url?: string | null
  banner_url?: string | null
  founded_year?: number | null
  dissolved_year?: number | null
  status: FansubStatus
  website_url?: string | null
  discord_url?: string | null
  irc_url?: string | null
  country?: string | null
  created_at: string
  updated_at: string
}

export interface FansubGroupSummary {
  id: number
  slug: string
  name: string
  logo_url?: string | null
}

export interface FansubMember {
  id: number
  fansub_group_id: number
  handle: string
  role: string
  since_year?: number | null
  until_year?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface AnimeFansubRelation {
  anime_id: number
  fansub_group_id: number
  is_primary: boolean
  notes?: string | null
  created_at: string
  fansub_group?: FansubGroupSummary | null
}

export interface FansubGroupListResponse {
  data: FansubGroup[]
  meta: PaginationMeta
}

export interface FansubGroupResponse {
  data: FansubGroup
}

export interface FansubMemberListResponse {
  data: FansubMember[]
}

export interface FansubMemberResponse {
  data: FansubMember
}

export interface AnimeFansubListResponse {
  data: AnimeFansubRelation[]
}

export interface FansubGroupCreateRequest {
  slug: string
  name: string
  description?: string | null
  history?: string | null
  logo_url?: string | null
  banner_url?: string | null
  founded_year?: number | null
  dissolved_year?: number | null
  status: FansubStatus
  website_url?: string | null
  discord_url?: string | null
  irc_url?: string | null
  country?: string | null
}

export interface FansubGroupPatchRequest {
  slug?: string | null
  name?: string | null
  description?: string | null
  history?: string | null
  logo_url?: string | null
  banner_url?: string | null
  founded_year?: number | null
  dissolved_year?: number | null
  status?: FansubStatus | null
  website_url?: string | null
  discord_url?: string | null
  irc_url?: string | null
  country?: string | null
}

export interface FansubMemberCreateRequest {
  handle: string
  role: string
  since_year?: number | null
  until_year?: number | null
  notes?: string | null
}

export interface FansubMemberPatchRequest {
  handle?: string | null
  role?: string | null
  since_year?: number | null
  until_year?: number | null
  notes?: string | null
}
