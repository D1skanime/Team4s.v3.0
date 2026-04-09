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
  tags?: string[]
  description?: string
  cover_image?: string
  source?: string
  folder_name?: string
}

export interface AdminAnimeCreateDraftAssetSuggestions {
  cover?: string
  banner?: string
  logo?: string
  backgrounds?: string[]
  background_video?: string
}

export interface AdminAnimeAltTitle {
  language?: string
  kind?: string
  title: string
}

export interface AdminAnimeCreateDraftPayload {
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
  source?: string
  folder_name?: string
  alt_titles?: AdminAnimeAltTitle[]
  tags?: string[]
  relations?: AdminAnimeRelation[]
  asset_suggestions?: AdminAnimeCreateDraftAssetSuggestions
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
  tags?: string[] | null
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

export interface AdminAnimeDeleteResult {
  anime_id: number
  title: string
  orphaned_local_cover_image?: string
}

export interface AdminAnimeDeleteResponse {
  data: AdminAnimeDeleteResult
}

export type AdminAnimeRelationLabel =
  | 'Hauptgeschichte'
  | 'Nebengeschichte'
  | 'Fortsetzung'
  | 'Zusammenfassung'

export interface AdminAnimeRelation {
  target_anime_id: number
  relation_label: AdminAnimeRelationLabel
  target_title: string
  target_type: string
  target_status: AnimeStatus
  target_year?: number
  target_cover_url?: string
}

export interface AdminAnimeRelationTarget {
  anime_id: number
  title: string
  type: string
  status: AnimeStatus
  year?: number
  cover_url?: string
}

export interface AdminAnimeRelationsResponse {
  data: AdminAnimeRelation[]
}

export interface AdminAnimeRelationTargetsResponse {
  data: AdminAnimeRelationTarget[]
}

export interface AdminAnimeRelationCreateRequest {
  target_anime_id: number
  relation_label: AdminAnimeRelationLabel
}

export interface AdminAnimeRelationUpdateRequest {
  relation_label: AdminAnimeRelationLabel
}

export interface GenreToken {
  name: string
  count: number
}

export interface AdminGenreTokensResponse {
  data: GenreToken[]
}

// TagToken is a normalized tag value with its usage count across all anime.
// Mirrors GenreToken so frontend state management stays parallel.
export interface TagToken {
  name: string
  count: number
}

export interface AdminTagTokensResponse {
  data: TagToken[]
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
  already_imported: boolean
  existing_anime_id?: number
  existing_title?: string
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
  folder_name_title_seed?: string
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

export type AdminAnimeAssetKind = 'cover' | 'banner' | 'logo' | 'background' | 'background_video'

export type AdminAnimeUploadAssetType = 'poster' | 'banner' | 'logo' | 'background' | 'background_video'

export interface AdminAnimePersistedAssets {
  cover?: AdminAnimePersistedAssetState
  banner?: AdminAnimePersistedAssetState
  logo?: AdminAnimePersistedAssetState
  backgrounds: AdminAnimePersistedBackgroundState[]
  background_video?: AdminAnimePersistedAssetState
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
  provisioning?: {
    entity_type: string
    entity_id: number
    requested_asset_type: string
    root_path: string
    statuses: Array<{
      folder: string
      state: string
    }>
  }
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
