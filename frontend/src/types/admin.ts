import { AnimeStatus, ContentType, EpisodeStatus } from '@/types/anime'

export type AnimeType = 'tv' | 'film' | 'ova' | 'ona' | 'special' | 'bonus'

export interface AdminAnimeItem {
  id: number
  title: string
  title_de?: string
  title_en?: string
  type: AnimeType
  content_type: ContentType
  status: AnimeStatus
  year?: number
  max_episodes?: number
  genre?: string
  description?: string
  cover_image?: string
}

export interface AdminEpisodeItem {
  id: number
  anime_id: number
  episode_number: string
  title?: string
  status: EpisodeStatus
  stream_link?: string
}

export interface AdminAnimeCreateRequest {
  title: string
  type: AnimeType
  content_type: ContentType
  status: AnimeStatus
  title_de?: string
  title_en?: string
  year?: number
  max_episodes?: number
  genre?: string
  description?: string
  cover_image?: string
  source?: string
  folder_name?: string
}

export interface AdminAnimePatchRequest {
  title?: string
  title_de?: string | null
  title_en?: string | null
  type?: AnimeType
  content_type?: ContentType
  status?: AnimeStatus
  year?: number | null
  max_episodes?: number | null
  genre?: string | null
  description?: string | null
  cover_image?: string | null
}

export interface AdminEpisodeCreateRequest {
  anime_id: number
  episode_number: string
  status: EpisodeStatus
  title?: string
  stream_link?: string
}

export interface AdminEpisodePatchRequest {
  episode_number?: string
  title?: string | null
  status?: EpisodeStatus
  stream_link?: string | null
}

export interface AdminAnimeJellyfinSyncRequest {
  jellyfin_series_id?: string
  season_number?: number
  episode_status?: EpisodeStatus
  overwrite_episode_titles?: boolean
  overwrite_version_titles?: boolean
  cleanup_provider_versions?: boolean
  allow_mismatch?: boolean
}

export interface AdminAnimeUpsertResponse {
  data: AdminAnimeItem
}

export interface AdminEpisodeUpsertResponse {
  data: AdminEpisodeItem
}

export interface AdminEpisodeDeleteResult {
  episode_id: number
  anime_id: number
  episode_number: string
  deleted_episode_versions: number
}

export interface AdminEpisodeDeleteResponse {
  data: AdminEpisodeDeleteResult
}

export interface GenreToken {
  name: string
  count: number
}

export interface AdminGenreTokensResponse {
  data: GenreToken[]
}

export interface AdminAnimeJellyfinSyncResult {
  anime_id: number
  jellyfin_series_id: string
  jellyfin_series_name: string
  jellyfin_series_path?: string
  applied_path_prefix?: string
  season_number: number
  scanned_episodes: number
  path_filtered_episodes: number
  accepted_unique_episodes: number
  imported_episodes: number
  updated_episodes: number
  imported_versions: number
  updated_versions: number
  skipped_episodes: number
  deleted_versions?: number
  applied_episode_status: EpisodeStatus
  overwrite_episode_titles: boolean
  overwrite_version_titles: boolean
}

export interface AdminAnimeJellyfinSyncResponse {
  data: AdminAnimeJellyfinSyncResult
}

export interface AdminJellyfinSeriesSearchItem {
  jellyfin_series_id: string
  name: string
  production_year?: number
  path?: string
}

export interface AdminJellyfinSeriesSearchResponse {
  data: AdminJellyfinSeriesSearchItem[]
}

export type JellyfinIntakeConfidence = 'high' | 'medium' | 'low'

export interface AdminJellyfinIntakeTypeHint {
  suggested_type?: AnimeType
  confidence: JellyfinIntakeConfidence
  reasons: string[]
}

export interface AdminJellyfinIntakeSearchItem extends AdminJellyfinSeriesSearchItem {
  parent_context?: string
  library_context?: string
  confidence: JellyfinIntakeConfidence
  type_hint: AdminJellyfinIntakeTypeHint
  poster_url?: string
  banner_url?: string
  logo_url?: string
  background_url?: string
}

export interface AdminJellyfinIntakeSearchResponse {
  data: AdminJellyfinIntakeSearchItem[]
}

export interface AdminAnimeJellyfinIntakePreviewRequest {
  jellyfin_series_id: string
}

export interface AdminJellyfinIntakeAssetSlot {
  present: boolean
  kind: 'cover' | 'logo' | 'banner' | 'background' | 'background_video'
  source: 'jellyfin'
  index?: number
  url?: string
}

export interface AdminJellyfinIntakeAssetSlots {
  cover: AdminJellyfinIntakeAssetSlot
  logo: AdminJellyfinIntakeAssetSlot
  banner: AdminJellyfinIntakeAssetSlot
  backgrounds: AdminJellyfinIntakeAssetSlot[]
  background_video: AdminJellyfinIntakeAssetSlot
}

export interface AdminAnimeJellyfinIntakePreviewResult {
  jellyfin_series_id: string
  jellyfin_series_name: string
  jellyfin_series_path?: string
  parent_context?: string
  library_context?: string
  description?: string
  year?: number
  genre?: string
  tags: string[]
  anidb_id?: string
  type_hint: AdminJellyfinIntakeTypeHint
  asset_slots: AdminJellyfinIntakeAssetSlots
}

export interface AdminAnimeJellyfinIntakePreviewResponse {
  data: AdminAnimeJellyfinIntakePreviewResult
}

export interface AdminAnimeJellyfinPreviewEpisode {
  jellyfin_item_id: string
  episode_number: number
  title?: string
  premiere_date?: string
  video_quality?: string
}

export interface AdminAnimeJellyfinPreviewResult {
  anime_id: number
  jellyfin_series_id: string
  jellyfin_series_name: string
  jellyfin_series_path?: string
  applied_path_prefix?: string
  season_number: number
  scanned_episodes: number
  matched_episodes: number
  path_filtered_episodes: number
  accepted_unique_episodes: number
  mismatch_detected: boolean
  mismatch_reason?: string
  skipped_episodes: number
  existing_jellyfin_versions: number
  existing_episodes: number
  applied_episode_status: EpisodeStatus
  overwrite_episode_titles: boolean
  overwrite_version_titles: boolean
  episodes: AdminAnimeJellyfinPreviewEpisode[]
}

export interface AdminAnimeJellyfinPreviewResponse {
  data: AdminAnimeJellyfinPreviewResult
}

export interface AdminAnimeJellyfinMetadataFieldPreview {
  field: 'source' | 'folder_name' | 'year' | 'description'
  label: string
  current_value?: string
  incoming_value?: string
  action: 'fill' | 'keep' | 'protect'
  apply: boolean
  reason?: string
}

export interface AdminAnimeJellyfinCoverPreview {
  current_image?: string
  current_source: 'none' | 'manual' | 'provider'
  incoming_image?: string
  incoming_available: boolean
  can_apply: boolean
  will_apply_by_default: boolean
  reason?: string
}

export interface AdminAnimePersistedAssetState {
  media_id?: string
  url: string
  ownership: 'manual' | 'provider'
}

export interface AdminAnimePersistedBackgroundState extends AdminAnimePersistedAssetState {
  id: number
  sort_order: number
}

export interface AdminAnimePersistedAssets {
  cover?: AdminAnimePersistedAssetState
  banner?: AdminAnimePersistedAssetState
  backgrounds: AdminAnimePersistedBackgroundState[]
}

export interface AdminAnimeJellyfinContext {
  anime_id: number
  linked: boolean
  source?: string
  source_kind: 'manual' | 'jellyfin'
  jellyfin_series_id?: string
  jellyfin_series_name?: string
  jellyfin_series_path?: string
  folder_name?: string
  cover: AdminAnimeJellyfinCoverPreview
  asset_slots?: AdminJellyfinIntakeAssetSlots
  persisted_assets: AdminAnimePersistedAssets
}

export interface AdminAnimeJellyfinContextResponse {
  data: AdminAnimeJellyfinContext
}

export interface AdminAnimeJellyfinMetadataPreviewRequest {
  jellyfin_series_id?: string
}

export interface AdminAnimeJellyfinMetadataPreviewResult {
  anime_id: number
  linked: boolean
  jellyfin_series_id: string
  jellyfin_series_name: string
  jellyfin_series_path?: string
  diff: AdminAnimeJellyfinMetadataFieldPreview[]
  cover: AdminAnimeJellyfinCoverPreview
  asset_slots: AdminJellyfinIntakeAssetSlots
}

export interface AdminAnimeJellyfinMetadataPreviewResponse {
  data: AdminAnimeJellyfinMetadataPreviewResult
}

export interface AdminAnimeJellyfinMetadataApplyRequest {
  jellyfin_series_id?: string
  apply_cover?: boolean
  apply_banner?: boolean
  apply_backgrounds?: boolean
}

export interface AdminAnimeJellyfinMetadataApplyResult {
  anime_id: number
  jellyfin_series_id: string
  jellyfin_series_name: string
  applied_fields: AdminAnimeJellyfinMetadataFieldPreview[]
  cover: AdminAnimeJellyfinCoverPreview
}

export interface AdminAnimeJellyfinMetadataApplyResponse {
  data: AdminAnimeJellyfinMetadataApplyResult
}

export interface AdminMediaUploadResponse {
  id: string
  status: string
  url: string
  files: Array<{
    variant: string
    path: string
    width: number
    height: number
  }>
}

export interface AdminAnimeBackgroundAssetResponse {
  data: AdminAnimePersistedBackgroundState
}
