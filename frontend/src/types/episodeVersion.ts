import { FansubGroupSummary } from '@/types/fansub'
import type { SelectedFansubGroupInput } from '@/types/episodeImport'

export type SubtitleType = 'hardsub' | 'softsub'

export interface EpisodeVersion {
  /** Legacy alias for variant_id. */
  id: number
  variant_id: number
  release_version_id: number
  anime_id: number
  episode_number: number
  title?: string | null
  release_version?: string | null
  fansub_groups?: FansubGroupSummary[]
  media_provider: string
  media_item_id: string
  covered_episode_numbers?: number[]
  video_quality?: string | null
  subtitle_type?: SubtitleType | null
  production_started_on?: string | null
  release_date?: string | null
  crc32?: string | null
  stream_url?: string | null
  segment_count: number
  has_segment_asset: boolean
  duration_seconds?: number | null
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

export interface EpisodeVersionEditorContext {
  version: EpisodeVersion
  anime_title: string
  anime_folder_path?: string | null
  selected_groups: FansubGroupSummary[]
}

export interface EpisodeVersionEditorContextResponse {
  data: EpisodeVersionEditorContext
}

export interface EpisodeVersionMediaFile {
  file_name: string
  path: string
  media_item_id: string
  stream_url?: string | null
  video_quality?: string | null
  file_size_bytes?: number | null
  last_modified?: string | null
  detected_episode_number?: number | null
  release_name?: string | null
}

export interface EpisodeVersionFolderScanResult {
  version_id: number
  anime_id: number
  anime_folder_path?: string | null
  files: EpisodeVersionMediaFile[]
}

export interface EpisodeVersionFolderScanResponse {
  data: EpisodeVersionFolderScanResult
}

export interface EpisodeVersionCreateRequest {
  title?: string | null
  fansub_groups?: SelectedFansubGroupInput[]
  fansub_group_id?: number | null
  media_provider: string
  media_item_id: string
  video_quality?: string | null
  subtitle_type?: SubtitleType | null
  production_started_on?: string | null
  release_date?: string | null
  crc32?: string | null
  stream_url?: string | null
}

export interface EpisodeVersionPatchRequest {
  title?: string | null
  fansub_groups?: SelectedFansubGroupInput[]
  fansub_group_id?: number | null
  media_provider?: string | null
  media_item_id?: string | null
  video_quality?: string | null
  subtitle_type?: SubtitleType | null
  production_started_on?: string | null
  release_date?: string | null
  crc32?: string | null
  stream_url?: string | null
  duration_seconds?: number | null
}

/** Public display metadata; media and segment fields belong to the full contract. */
export type PublicEpisodeVersion = Pick<EpisodeVersion,
  'id' | 'variant_id' | 'release_version_id' | 'anime_id' | 'episode_number' |
  'title' | 'release_version' | 'video_quality' | 'subtitle_type' | 'release_date'
> & { fansub_groups: FansubGroupSummary[] }

export interface PublicGroupedEpisode {
  episode_id: number
  episode_number: number
  episode_title?: string | null
  /** Variant alias, optional for neutral episodes. */
  default_version_id?: number | null
  /** Complete variant count, including variants outside this page. */
  version_count: number
  versions: PublicEpisodeVersion[]
}

export interface PublicGroupedEpisodesResponse {
  data: {
    anime_id: number
    episodes: PublicGroupedEpisode[]
    pagination: { has_more: boolean; next_cursor: string | null; row_limit: number }
  }
}

export interface PublicGroupedEpisodesOptions {
  projection: 'public'
  limit?: number
  cursor?: string
  signal?: AbortSignal
}
