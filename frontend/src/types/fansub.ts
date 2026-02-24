import { PaginationMeta } from '@/types/anime'

export type FansubStatus = 'active' | 'inactive' | 'dissolved'
export type FansubGroupType = 'group' | 'collaboration'

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
  group_type: FansubGroupType
  website_url?: string | null
  discord_url?: string | null
  irc_url?: string | null
  country?: string | null
  created_at: string
  updated_at: string
  collaboration_members?: FansubGroupSummary[]
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

export interface FansubAlias {
  id: number
  fansub_group_id: number
  alias: string
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

export interface FansubAliasListResponse {
  data: FansubAlias[]
}

export interface FansubAliasResponse {
  data: FansubAlias
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
  group_type?: FansubGroupType
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
  group_type?: FansubGroupType
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

export interface FansubAliasCreateRequest {
  alias: string
}

// Merge types
export interface MergeFansubsRequest {
  target_id: number
  source_ids: number[]
}

export interface MergeFansubsResult {
  merged_count: number
  versions_migrated: number
  members_migrated: number
  relations_migrated: number
  aliases_added: string[]
}

export interface MergeFansubsResponse {
  data: MergeFansubsResult
}

// Collaboration member types
export interface CollaborationMember {
  collaboration_id: number
  member_group_id: number
  added_at: string
  member_group?: FansubGroupSummary
}

export interface CollaborationMemberListResponse {
  data: CollaborationMember[]
}

export interface CollaborationMemberResponse {
  data: CollaborationMember
}

export interface AddCollaborationMemberRequest {
  member_group_id: number
}
