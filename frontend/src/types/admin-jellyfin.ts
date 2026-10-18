import { AnimeStatus, ContentType, EpisodeStatus } from "@/types/anime";
import type { AnimeType } from './admin-anime-core';

export interface GenreToken {
  name: string;
  count: number;
}

export interface AdminGenreTokensResponse {
  data: GenreToken[];
}

// TagToken is a normalized tag value with its usage count across all anime.
// Mirrors GenreToken so frontend state management stays parallel.
export interface TagToken {
  name: string;
  count: number;
}

export interface AdminTagTokensResponse {
  data: TagToken[];
}

// AdminTagNameRow/AdminGenreNameRow back the German tag/genre maintenance
// page (D-04/D-07): id + base name + usage count + current German name
// (null when not yet set). Distinct from TagToken/GenreToken above, which
// lack id/name_de and are consumed by other autocomplete-style surfaces.
export interface AdminTagNameRow {
  id: number;
  name: string;
  count: number;
  name_de: string | null;
}

export interface AdminTagNamesResponse {
  data: AdminTagNameRow[];
}

export interface AdminGenreNameRow {
  id: number;
  name: string;
  count: number;
  name_de: string | null;
}

export interface AdminGenreNamesResponse {
  data: AdminGenreNameRow[];
}

// AdminUpsertNameResponse is the shared response shape for both
// PATCH .../:id/names/de endpoints (tags and genres).
export interface AdminUpsertNameResponse {
  data: {
    id: number;
    name_de: string;
  };
}

export interface AdminAnimeJellyfinSyncResult {
  anime_id: number;
  jellyfin_series_id: string;
  jellyfin_series_name: string;
  jellyfin_series_path?: string;
  applied_path_prefix?: string;
  season_number: number;
  scanned_episodes: number;
  path_filtered_episodes: number;
  accepted_unique_episodes: number;
  imported_episodes: number;
  updated_episodes: number;
  imported_versions: number;
  updated_versions: number;
  skipped_episodes: number;
  deleted_versions?: number;
  applied_episode_status: EpisodeStatus;
  overwrite_episode_titles: boolean;
  overwrite_version_titles: boolean;
}

export interface AdminAnimeJellyfinSyncResponse {
  data: AdminAnimeJellyfinSyncResult;
}

export interface AdminJellyfinSeriesSearchItem {
  jellyfin_series_id: string;
  name: string;
  production_year?: number;
  path?: string;
}

export interface AdminJellyfinSeriesSearchResponse {
  data: AdminJellyfinSeriesSearchItem[];
}

export type JellyfinIntakeConfidence = "high" | "medium" | "low";

export interface AdminJellyfinIntakeTypeHint {
  suggested_type?: AnimeType;
  confidence: JellyfinIntakeConfidence;
  reasons: string[];
}

export interface AdminJellyfinIntakeSearchItem extends AdminJellyfinSeriesSearchItem {
  parent_context?: string;
  library_context?: string;
  confidence: JellyfinIntakeConfidence;
  type_hint: AdminJellyfinIntakeTypeHint;
  poster_url?: string;
  banner_url?: string;
  logo_url?: string;
  background_url?: string;
  already_imported: boolean;
  existing_anime_id?: number;
  existing_title?: string;
}

export interface AdminJellyfinIntakeSearchResponse {
  data: AdminJellyfinIntakeSearchItem[];
}

/**
 * Discovery-Status-Werte, wie sie tatsächlich im `status`-Feld von
 * AdminJellyfinDiscoveryItem stehen (165-06, resolveDiscoveryItemStatus /
 * jellyfin_discovery_status.go). Bewusst englisch, NICHT die deutsche
 * `filter`-Query-Parameter-Vokabular ("offen"/"bereits_vorhanden"/…) — beide
 * Vokabulare existieren parallel im Backend, siehe 165-09-SUMMARY.md.
 */
export type AdminJellyfinDiscoveryStatus = "open" | "existing" | "ignored" | "partial";

/** Eine einzelne Zeile der Discovery-Bibliotheksliste (GET /admin/jellyfin/discovery, 165-06/165-09). */
export interface AdminJellyfinDiscoveryItem {
  jellyfin_item_id: string;
  name: string;
  year?: number;
  path?: string;
  parent_context?: string;
  library_context?: string;
  type_hint: AdminJellyfinIntakeTypeHint;
  poster_url?: string;
  banner_url?: string;
  status: AdminJellyfinDiscoveryStatus;
  existing_anime_id?: number;
  existing_title?: string;
}

/** Cursor-paginierte Antwort-Hülle der Discovery-Liste. */
export interface AdminJellyfinDiscoveryPage {
  items: AdminJellyfinDiscoveryItem[];
  has_more: boolean;
  next_cursor?: string;
  total_snapshot_count: number;
}

export interface AdminJellyfinDiscoveryPageResponse {
  data: AdminJellyfinDiscoveryPage;
}

export interface AdminAnimeJellyfinIntakePreviewRequest {
  jellyfin_series_id: string;
}

export interface AdminJellyfinIntakeAssetSlot {
  present: boolean;
  kind: "cover" | "logo" | "banner" | "background" | "background_video";
  source: "jellyfin";
  index?: number;
  url?: string;
}

export interface AdminJellyfinIntakeAssetSlots {
  cover: AdminJellyfinIntakeAssetSlot;
  logo: AdminJellyfinIntakeAssetSlot;
  banner: AdminJellyfinIntakeAssetSlot;
  backgrounds: AdminJellyfinIntakeAssetSlot[];
  background_video: AdminJellyfinIntakeAssetSlot;
}

export interface AdminAnimeJellyfinIntakePreviewResult {
  jellyfin_series_id: string;
  jellyfin_series_name: string;
  jellyfin_series_path?: string;
  folder_name_title_seed?: string;
  parent_context?: string;
  library_context?: string;
  description?: string;
  year?: number;
  genre?: string;
  tags: string[];
  anidb_id?: string;
  type_hint: AdminJellyfinIntakeTypeHint;
  asset_slots: AdminJellyfinIntakeAssetSlots;
}

export interface AdminAnimeJellyfinIntakePreviewResponse {
  data: AdminAnimeJellyfinIntakePreviewResult;
}

export interface AdminAnimeJellyfinPreviewEpisode {
  jellyfin_item_id: string;
  episode_number: number;
  title?: string;
  premiere_date?: string;
  video_quality?: string;
}

export interface AdminAnimeJellyfinPreviewResult {
  anime_id: number;
  jellyfin_series_id: string;
  jellyfin_series_name: string;
  jellyfin_series_path?: string;
  applied_path_prefix?: string;
  season_number: number;
  scanned_episodes: number;
  matched_episodes: number;
  path_filtered_episodes: number;
  accepted_unique_episodes: number;
  mismatch_detected: boolean;
  mismatch_reason?: string;
  skipped_episodes: number;
  existing_jellyfin_versions: number;
  existing_episodes: number;
  applied_episode_status: EpisodeStatus;
  overwrite_episode_titles: boolean;
  overwrite_version_titles: boolean;
  episodes: AdminAnimeJellyfinPreviewEpisode[];
}

export interface AdminAnimeJellyfinPreviewResponse {
  data: AdminAnimeJellyfinPreviewResult;
}

export interface AdminAnimeJellyfinMetadataFieldPreview {
  field: "source" | "folder_name" | "year" | "description";
  label: string;
  current_value?: string;
  incoming_value?: string;
  action: "fill" | "keep" | "protect";
  apply: boolean;
  reason?: string;
}

export interface AdminAnimeJellyfinCoverPreview {
  current_image?: string;
  current_source: "none" | "manual" | "provider";
  incoming_image?: string;
  incoming_available: boolean;
  can_apply: boolean;
  will_apply_by_default: boolean;
  reason?: string;
}

export interface AdminAnimePersistedAssetState {
  media_id?: string;
  url: string;
  ownership: "manual" | "provider";
  provider?: string;
}

export interface AdminAnimePersistedBackgroundState extends AdminAnimePersistedAssetState {
  id: number;
  sort_order: number;
}

export type AdminAnimeUploadAssetType =
  | "poster"
  | "banner"
  | "logo"
  | "background"
  | "background_video";

export interface AdminAnimePersistedAssets {
  cover?: AdminAnimePersistedAssetState;
  banner?: AdminAnimePersistedAssetState;
  logo?: AdminAnimePersistedAssetState;
  backgrounds: AdminAnimePersistedBackgroundState[];
  background_video?: AdminAnimePersistedAssetState;
}

export type AdminAnimeEditorMode = "create" | "edit";

export interface AdminAnimeEditorDraftValues {
  title: string;
  type: AnimeType;
  contentType: ContentType;
  status: AnimeStatus;
  year: string;
  maxEpisodes: string;
  titleDE: string;
  titleEN: string;
  genreTokens: string[];
  tagTokens: string[];
  description: string;
  coverImage: string;
  source: string;
  folderName: string;
}

export interface AdminAnimeEditorHydrationInput {
  title: string;
  title_de?: string | null;
  title_en?: string | null;
  type?: AnimeType | string | null;
  content_type?: ContentType | null;
  status?: AnimeStatus | null;
  year?: number | null;
  max_episodes?: number | null;
  genre?: string | null;
  genres?: string[] | null;
  tags?: string[] | null;
  description?: string | null;
  cover_image?: string | null;
  source?: string | null;
  folder_name?: string | null;
  persisted_assets?: Partial<AdminAnimePersistedAssets> | null;
}

export interface AdminAnimeEditorHydratedState {
  values: AdminAnimeEditorDraftValues;
  persistedAssets: AdminAnimePersistedAssets;
}

export interface AdminAnimeJellyfinFolderOption {
  jellyfin_item_id: string;
  is_main: boolean;
}

export interface AdminAnimeJellyfinContext {
  anime_id: number;
  linked: boolean;
  source?: string;
  source_kind: "manual" | "jellyfin";
  jellyfin_series_id?: string;
  jellyfin_series_name?: string;
  jellyfin_series_path?: string;
  folder_name?: string;
  cover: AdminAnimeJellyfinCoverPreview;
  asset_slots?: AdminJellyfinIntakeAssetSlots;
  persisted_assets: AdminAnimePersistedAssets;
  folders?: AdminAnimeJellyfinFolderOption[];
}

export interface AdminAnimeJellyfinContextResponse {
  data: AdminAnimeJellyfinContext;
}

export interface AdminAnimeJellyfinMetadataPreviewRequest {
  jellyfin_series_id?: string;
}

export interface AdminAnimeJellyfinMetadataPreviewResult {
  anime_id: number;
  linked: boolean;
  jellyfin_series_id: string;
  jellyfin_series_name: string;
  jellyfin_series_path?: string;
  diff: AdminAnimeJellyfinMetadataFieldPreview[];
  cover: AdminAnimeJellyfinCoverPreview;
  asset_slots: AdminJellyfinIntakeAssetSlots;
}

export interface AdminAnimeJellyfinMetadataPreviewResponse {
  data: AdminAnimeJellyfinMetadataPreviewResult;
}

export interface AdminAnimeJellyfinMetadataApplyRequest {
  jellyfin_series_id?: string;
  apply_cover?: boolean;
  apply_banner?: boolean;
  apply_logo?: boolean;
  apply_backgrounds?: boolean;
  apply_background_video?: boolean;
  /** 165-17: signals an explicit "Verbinden" action (GAP-05/GAP-13) — never sent by the routine edit-page resync. */
  connect?: boolean;
}

export interface AdminAnimeJellyfinMetadataApplyResult {
  anime_id: number;
  jellyfin_series_id: string;
  jellyfin_series_name: string;
  applied_fields: AdminAnimeJellyfinMetadataFieldPreview[];
  cover: AdminAnimeJellyfinCoverPreview;
}

export interface AdminAnimeJellyfinMetadataApplyResponse {
  data: AdminAnimeJellyfinMetadataApplyResult;
}
