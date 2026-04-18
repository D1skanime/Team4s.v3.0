export type EpisodeImportMappingStatus = 'suggested' | 'confirmed' | 'conflict' | 'skipped'

export interface EpisodeImportCanonicalEpisode {
  episode_number: number
  title?: string | null
  anisearch_episode_id?: string | null
  existing_episode_id?: number | null
  existing_title?: string | null
}

export interface EpisodeImportMediaCandidate {
  media_item_id: string
  file_name: string
  path: string
  jellyfin_season_number?: number | null
  jellyfin_episode_number?: number | null
  stream_url?: string | null
  video_quality?: string | null
}

export interface EpisodeImportMappingRow {
  media_item_id: string
  target_episode_numbers: number[]
  suggested_episode_numbers: number[]
  status: EpisodeImportMappingStatus
}

export interface EpisodeImportPreviewResult {
  anime_id: number
  anime_title: string
  anisearch_id?: string | null
  jellyfin_series_id?: string | null
  folder_path?: string | null
  canonical_episodes: EpisodeImportCanonicalEpisode[]
  media_candidates: EpisodeImportMediaCandidate[]
  mappings: EpisodeImportMappingRow[]
  unmapped_episodes?: number[]
  unmapped_media_item_ids?: string[]
}

export interface EpisodeImportContextResult {
  anime_id: number
  anime_title: string
  anisearch_id?: string | null
  jellyfin_series_id?: string | null
  folder_path?: string | null
  source?: string | null
}

export interface EpisodeImportApplyInput {
  anime_id: number
  canonical_episodes: EpisodeImportCanonicalEpisode[]
  media_candidates?: EpisodeImportMediaCandidate[]
  mappings: EpisodeImportMappingRow[]
}

export interface EpisodeImportApplyResult {
  anime_id: number
  episodes_created: number
  episodes_existing: number
  versions_created: number
  versions_updated: number
  mappings_applied: number
  skipped: number
  conflicts: number
}

export interface EpisodeImportContextResponse {
  data: EpisodeImportContextResult
}

export interface EpisodeImportPreviewResponse {
  data: EpisodeImportPreviewResult
}

export interface EpisodeImportApplyResponse {
  data: EpisodeImportApplyResult
}

export interface EpisodeImportPreviewSummary {
  canonical_episode_count: number
  media_candidate_count: number
  suggested_count: number
  confirmed_count: number
  conflict_count: number
  skipped_count: number
  unmapped_episode_count: number
  unmapped_media_count: number
}
