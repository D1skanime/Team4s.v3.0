import { FansubGroupSummary } from '@/types/fansub'
import type { SelectedFansubGroupInput } from '@/types/episodeImport'

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

export interface EpisodeVersionEditorContext {
  version: EpisodeVersion
  anime_title: string
  anime_folder_path?: string | null
  collaboration_group_id?: number | null
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
  release_date?: string | null
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
  release_date?: string | null
  stream_url?: string | null
}
