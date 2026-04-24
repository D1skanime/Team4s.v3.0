export type AnimeStatus = 'disabled' | 'ongoing' | 'done' | 'aborted' | 'licensed'
export type ContentType = 'anime' | 'hentai'

export interface AnimeListItem {
  id: number
  title: string
  type: string
  status: AnimeStatus
  year?: number
  cover_image?: string
  max_episodes?: number
}

export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface PaginatedAnimeResponse {
  data: AnimeListItem[]
  meta: PaginationMeta
}

export interface AnimeListParams {
  page?: number
  per_page?: number
  q?: string
  letter?: string
  content_type?: ContentType
  status?: AnimeStatus
  fansub_id?: number
  has_cover?: boolean
  include_disabled?: boolean
}

export type EpisodeStatus = 'disabled' | 'private' | 'public'

export interface EpisodeListItem {
  id: number
  episode_number: string
  title?: string
  status: EpisodeStatus
  view_count: number
  download_count: number
  stream_links?: string[]
}

export interface AnimeDetail {
  id: number
  title: string
  title_de?: string
  title_en?: string
  type: string
  content_type: ContentType
  status: AnimeStatus
  year?: number
  max_episodes?: number
  genre?: string
  genres?: string[]
  tags?: string[]
  description?: string
  cover_image?: string
  source?: string
  folder_name?: string
  jellyfin_series_id?: string
  jellyfin_series_path?: string
  view_count: number
  episodes: EpisodeListItem[]
}

export interface EpisodeDetail {
  id: number
  anime_id: number
  anime_title: string
  episode_number: string
  title?: string
  status: EpisodeStatus
  view_count: number
  download_count: number
  stream_links?: string[]
  previous_episode_id?: number
  next_episode_id?: number
}

export interface AnimeBackdropManifest {
  anime_id: number
  provider: string
  media_item_id?: string
  theme_videos: string[]
  backdrops: string[]
  banner_url?: string
  logo_url?: string
}

export interface AnimeBackdropResponse {
  data: AnimeBackdropManifest
}

export interface AnimeRelation {
  anime_id: number
  title: string
  relation_type: string
  cover_image: string | null
  year: number | null
  type: string
}

export interface AnimeRelationsResponse {
  data: AnimeRelation[]
}
