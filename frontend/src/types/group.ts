import { FansubGroupSummary } from '@/types/fansub'
import { PaginationMeta } from '@/types/anime'
import { MediaAsset } from '@/types/mediaAsset'

export interface GroupPeriod {
  start?: string | null
  end?: string | null
}

export interface GroupStats {
  member_count: number
  episode_count: number
}

export interface GroupDetail {
  id: number
  anime_id: number
  fansub_id: number
  fansub: FansubGroupSummary & {
    logo_url?: string | null
  }
  story?: string | null
  period?: GroupPeriod | null
  stats: GroupStats
  created_at: string
  updated_at: string
}

export interface GroupDetailResponse {
  data: GroupDetail
}

export interface EpisodeReleaseSummary {
  id: number
  episode_id?: number | null
  episode_number: number
  title?: string | null
  has_op: boolean
  has_ed: boolean
  karaoke_count: number
  insert_count: number
  screenshot_count: number
  thumbnail_url?: string | null
  released_at?: string | null
}

export interface GroupReleasesData {
  group: GroupDetail
  episodes: EpisodeReleaseSummary[]
  other_groups: FansubGroupSummary[]
}

export interface GroupReleasesResponse {
  data: GroupReleasesData
  meta: PaginationMeta
}

export interface GroupReleasesParams {
  page?: number
  per_page?: number
  has_op?: boolean
  has_ed?: boolean
  has_karaoke?: boolean
  q?: string
}

export interface GroupAssetHero {
  backdrop_url?: string | null
  primary_url?: string | null
  poster_url?: string | null
  folder_found?: boolean
}

export interface GroupAssetScreenshot {
  id: string
  title: string
  image_url: string
  thumbnail_url?: string | null
}

export interface GroupEpisodeAssets {
  episode_number: number
  title: string
  screenshots: GroupAssetScreenshot[]
  media_assets: MediaAsset[]
}

export interface GroupAssetsData {
  anime_id: number
  group_id: number
  folder_name: string
  hero: GroupAssetHero
  episodes: GroupEpisodeAssets[]
}

export interface GroupAssetsResponse {
  data: GroupAssetsData
}
