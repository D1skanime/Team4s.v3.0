import { AnimeStatus, PaginationMeta } from '@/types/anime'

export interface WatchlistItem {
  anime_id: number
  title: string
  type: string
  status: AnimeStatus
  year?: number
  cover_image?: string
  max_episodes?: number
  added_at: string
}

export interface PaginatedWatchlistResponse {
  data: WatchlistItem[]
  meta: PaginationMeta
}

export interface WatchlistCreateRequest {
  anime_id: number
}

export interface WatchlistCreateResponse {
  data: WatchlistItem
}
