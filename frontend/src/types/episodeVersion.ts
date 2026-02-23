import { FansubGroupSummary } from '@/types/fansub'

export type SubtitleType = 'hardsub' | 'softsub'

export interface EpisodeVersion {
  id: number
  anime_id: number
  episode_number: number
  title?: string | null
  fansub_group?: FansubGroupSummary | null
  media_provider: string
  media_item_id: string
  video_quality?: string | null
  subtitle_type?: SubtitleType | null
  release_date?: string | null
  stream_url?: string | null
  created_at: string
  updated_at: string
}

export interface GroupedEpisode {
  episode_number: number
  episode_title?: string | null
  default_version_id?: number | null
  version_count: number
  versions: EpisodeVersion[]
}

export interface GroupedEpisodesPayload {
  anime_id: number
  episodes: GroupedEpisode[]
}

export interface GroupedEpisodesResponse {
  data: GroupedEpisodesPayload
}

export interface EpisodeVersionResponse {
  data: EpisodeVersion
}

export interface EpisodeVersionCreateRequest {
  title?: string | null
  fansub_group_id?: number | null
  media_provider: string
  media_item_id: string
  video_quality?: string | null
  subtitle_type?: SubtitleType | null
  release_date?: string | null
  stream_url?: string | null
}

export interface EpisodeVersionPatchRequest {
  title?: string | null
  fansub_group_id?: number | null
  media_provider?: string | null
  media_item_id?: string | null
  video_quality?: string | null
  subtitle_type?: SubtitleType | null
  release_date?: string | null
  stream_url?: string | null
}
