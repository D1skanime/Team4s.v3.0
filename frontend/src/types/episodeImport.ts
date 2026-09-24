export type EpisodeImportMappingStatus = 'suggested' | 'confirmed' | 'conflict' | 'skipped'

export interface EpisodeImportCanonicalEpisode {
  episode_number: number
  title?: string | null
  /** Multilingual title map keyed by language code, e.g. { "de": "...", "en": "..." }. */
  titles_by_language?: Record<string, string> | null
  /** Filler classification: "unknown" | "canon" | "filler" | "mixed" | "recap" */
  filler_type?: string | null
  filler_source?: string | null
  filler_note?: string | null
  anisearch_episode_id?: string | null
  existing_episode_id?: number | null
  existing_title?: string | null
}

/** Private admin source tracks. Unknown provider language stays null. */
export interface JellyfinAudioTrack {
  index: number
  codec: string
  language: string | null
  default: boolean
}

export interface JellyfinSubtitleTrack {
  index: number
  codec: string
  language: string | null
  display_title: string
  default: boolean
  forced: boolean
}

/** One independently importable physical source. Item IDs may repeat with distinct source IDs. */
export interface EpisodeImportMediaCandidate {
  media_item_id: string
  media_source_id?: string | null
  container?: string | null
  /** Omitted/false means incomplete; [] means known-empty only with true. */
  streams_complete?: boolean
  selected_audio_index?: number | null
  audio_tracks?: JellyfinAudioTrack[] | null
  subtitle_tracks?: JellyfinSubtitleTrack[] | null
  file_name: string
  path: string
  jellyfin_season_number?: number | null
  jellyfin_episode_number?: number | null
  stream_url?: string | null
  video_quality?: string | null
  video_codec?: string | null
  audio_codec?: string | null
  duration_seconds?: number | null
}

export interface EpisodeImportSelectedFansubGroup {
  id?: number | null
  name?: string | null
  slug?: string | null
}

export type SelectedFansubGroupInput = EpisodeImportSelectedFansubGroup

export interface EpisodeImportMappingRow {
  media_item_id: string
  /** Together with media_item_id this is the row identity; optional only for unresolved/skipped rows. */
  media_source_id?: string | null
  /** Readable Jellyfin file name derived from the full path (e.g. "Bleach S03E11.mkv"). */
  file_name?: string
  /** Short folder-context label to distinguish releases (e.g. "[SubGroup]/Season 01"). */
  display_path?: string
  target_episode_numbers: number[]
  suggested_episode_numbers: number[]
  status: EpisodeImportMappingStatus
  fansub_groups?: EpisodeImportSelectedFansubGroup[]
  /** Optional operator override: ID of the fansub group responsible for this release. */
  fansub_group_id?: number | null
  /** Backend-detected or operator-supplied fansub group name for display and lookup. */
  fansub_group_name?: string | null
  /** Operator-supplied release version label, e.g. "v2", "BD", "720p". */
  release_version?: string | null
  /** Display-only: how the backend matched the raw fansub tag (kuerzel/alias/name/slug), never sent back on apply. */
  fansub_group_match_origin?: {
    raw: string
    matched_via: 'alias' | 'name' | 'slug' | 'kuerzel'
    group_id: number
    group_name: string
    /** Present only when matched_via === 'alias'; needed to call reassignFansubAlias. */
    alias_id?: number | null
  } | null
  /** Display-only: up to 3 candidate groups when no exact match was found, never sent back on apply. */
  fansub_group_suggestions?: Array<{ id: number; name: string; slug: string }>
  /** Display-only: whether release_version was backend-detected or operator-edited, never sent back on apply. */
  release_version_source?: 'detected' | 'manual'
  /** Display-only: why this row's Status became "suggested" beyond the usual matcher, never sent back on apply. */
  suggestion_reason?: string | null
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
  /** Diagnostic Item IDs; not row keys or a count of unmapped physical sources. */
  unmapped_media_item_ids?: string[]
}

/** One jellyfin: folder connected to an anime (D-05: an anime can have more than one). */
export interface JellyfinFolderOption {
  jellyfin_item_id: string
  is_main: boolean
  /** Best-effort, backend-hydrated display label/path (GAP-01); absent when Jellyfin is unreachable. */
  folder_display_name?: string | null
  folder_path?: string | null
}

export interface EpisodeImportContextResult {
  anime_id: number
  anime_title: string
  anisearch_id?: string | null
  jellyfin_series_id?: string | null
  folder_path?: string | null
  source?: string | null
  /** Only present when the anime has more than one connected Jellyfin folder (D-14). */
  jellyfin_folders?: JellyfinFolderOption[] | null
}

/** Confirmed commands require the exact reviewed pair; skipped unresolved rows never persist. */
export type EpisodeImportApplyMappingRow = Omit<EpisodeImportMappingRow, 'status'> & (
  | { status: 'confirmed'; media_source_id: string }
  | { status: 'skipped' }
)

export interface EpisodeImportApplyInput {
  anime_id: number
  canonical_episodes: EpisodeImportCanonicalEpisode[]
  media_candidates?: EpisodeImportMediaCandidate[]
  mappings: EpisodeImportApplyMappingRow[]
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
