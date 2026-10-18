import type { AnimeType } from './admin-anime-core';
import type { AdminAnimePersistedBackgroundState } from './admin-jellyfin';

export interface AdminMediaUploadResponse {
  id: string;
  status: string;
  url: string;
  provisioning?: {
    entity_type: string;
    entity_id: number;
    requested_asset_type: string;
    root_path: string;
    statuses: Array<{
      folder: string;
      state: string;
    }>;
  };
  files: Array<{
    variant: string;
    path: string;
    width: number;
    height: number;
  }>;
}

export interface AdminAnimeBackgroundAssetResponse {
  data: AdminAnimePersistedBackgroundState;
}

// --- OP/ED Theme types (Phase 23) ---

export interface AdminThemeType {
  id: number
  name: string
}

export interface AdminAnimeTheme {
  id: number
  anime_id: number
  theme_type_id: number
  theme_type_name: string
  title: string | null
  created_at: string
}

export interface AdminAnimeThemeSegment {
  id: number
  theme_id: number
  anime_id?: number
  theme_title?: string | null
  theme_type_name?: string
  fansub_group_id?: number | null
  version?: string
  start_episode?: number | null
  end_episode?: number | null
  start_episode_id: number | null
  end_episode_id: number | null
  start_episode_number: string | null
  end_episode_number: string | null
  start_time?: string | null
  end_time?: string | null
  source_jellyfin_item_id?: string | null
  source_type?: 'none' | 'jellyfin_theme' | 'release_asset' | string | null
  source_ref?: string | null
  source_label?: string | null
  playback_source_kind?: string | null
  playback_duration_seconds?: number | null
  created_at: string
}

export interface AdminAnimeThemeCreateRequest {
  theme_type_id: number
  title?: string
}

export interface AdminAnimeThemePatchRequest {
  theme_type_id?: number
  title?: string
}

export interface AdminAnimeThemeSegmentCreateRequest {
  start_episode_id?: number | null
  end_episode_id?: number | null
}

export interface AdminThemeTypesResponse {
  data: AdminThemeType[]
}

export interface AdminAnimeThemesResponse {
  data: AdminAnimeTheme[]
}

export interface AdminAnimeThemeCreateResponse {
  data: AdminAnimeTheme
}

export interface AdminAnimeThemeSegmentsResponse {
  data: AdminAnimeThemeSegment[]
}

export interface AdminAnimeThemeSegmentCreateResponse {
  data: AdminAnimeThemeSegment
}

// --- Release Theme Assets (Phase 23 Plan 03) ---

export interface AdminFansubAnimeEntry {
  id: number
  title: string
  type: AnimeType
  header_image?: string | null
  cover_image?: string | null
}

export interface AdminFansubAnimeListResponse {
  data: AdminFansubAnimeEntry[]
}

export interface AdminReleaseThemeAsset {
  release_id: number
  theme_id: number
  theme_type_name: string
  theme_title: string | null
  media_id: number
  public_url: string
  mime_type: string
  size_bytes: number
  created_at: string
}

export interface AdminReleaseThemeAssetsResponse {
  data: AdminReleaseThemeAsset[]
}

export interface AdminReleaseThemeAssetCreateResponse {
  data: AdminReleaseThemeAsset
}

export interface AdminFansubAnimeThemeAssetsResponse {
  release_id: number | null
  data: AdminReleaseThemeAsset[]
}

// --- Release-Segmente (OP/ED Timing) (Phase 24+) ---

/** Expliziter Quelltyp eines Segments: none = manuell, jellyfin_theme = Jellyfin-Theme-Video, release_asset = Release-Asset. */
export type AdminSegmentSourceType = 'none' | 'jellyfin_theme' | 'release_asset'

/** Ein Release-Segment (OP/ED Timing) für eine Fansub-Gruppe und Version. */
export interface AdminThemeSegment {
  id: number
  theme_id: number
  anime_id: number
  theme_title: string | null
  theme_type_name: string
  /** Feste Kurzform (OP/ED/IN/OUT) aus theme_types.kuerzel (D-01, Migration 0179) --
   *  maßgeblich für Badge-Label/Farbe/Upper-Spur-Klassifizierung, ersetzt Name-Guessing
   *  auf theme_type_name. */
  theme_type_kuerzel: string
  fansub_group_id: number | null
  version: string
  start_episode: number | null
  end_episode: number | null
  start_time: string | null    // "HH:MM:SS" oder null
  end_time: string | null      // "HH:MM:SS" oder null
  /** @deprecated Für Rueckwaertskompatibilitaet; neues Frontend soll source_type/source_ref/source_label verwenden */
  source_jellyfin_item_id: string | null
  /** Expliziter Quelltyp (Phase 25+). */
  source_type?: AdminSegmentSourceType | null
  /** Referenz auf die Quell-Ressource (z.B. Jellyfin-Item-ID oder Media-Asset-ID). */
  source_ref?: string | null
  /** Lesbares Label der Quelle für die UI-Anzeige. */
  source_label?: string | null
  playback_source_id?: number | null
  playback_source_kind?: 'episode_version' | 'jellyfin_theme' | 'uploaded_asset' | null
  playback_release_variant_id?: number | null
  playback_jellyfin_item_id?: string | null
  playback_media_asset_id?: number | null
  playback_source_label?: string | null
  playback_start_offset_seconds?: number | null
  playback_end_offset_seconds?: number | null
  playback_duration_seconds?: number | null
  render_cache_id?: number | null
  render_cache_key?: string | null
  render_status?: 'queued' | 'rendering' | 'ready' | 'failed' | 'stale' | string | null
  render_error_message?: string | null
  render_duration_seconds?: number | null
  render_completed_at?: string | null
  can_retry_render?: boolean
  library_definition_id?: number | null
  library_asset_id?: number | null
  library_segment_kind?: string | null
  library_segment_name?: string | null
  library_anime_source_provider?: string | null
  library_anime_source_external_id?: string | null
  library_identity_status?: string | null
  library_ownership_scope?: string | null
  library_attach_source?: string | null
  /** Alle Release-Versionen, denen dieses (potenziell geteilte) Segment aktuell zugewiesen ist. */
  assigned_release_version_ids?: number[]
  /** true, wenn das Segment mehr als einer Release-Version zugewiesen ist (D-03). */
  is_shared?: boolean
  /**
   * Aktuelle Origin-Release-Version des Segments (Phase 156, P156-06/P156-18) -- bestimmt, aus
   * welcher zugewiesenen Folge die oeffentlichen Credits dieses Segments stammen. `null`/`undefined`
   * vor dem ersten Setzen, admin-korrigierbar ueber `PUT .../segments/:segmentId/origin`.
   */
  origin_release_version_id?: number | null
  /** true, wenn mindestens eine zugewiesene Folge einen Zeit-Override hat (D-01/D-02). */
  has_episode_override?: boolean
  /**
   * ECHTE Episodennummer je Zuweisung (Backend-Spiegel aus Plan 117-03 Task 2, B3-Fix).
   * has_override (Quick-Task 260819-lm5, Runde 5 Korrektheits-Fix): PRO-FOLGE-Flag, ob GENAU
   * DIESE Zuweisung einen Zeit-Override hat -- im Gegensatz zum segmentweiten
   * has_episode_override (true, sobald IRGENDEINE Folge ueberschrieben ist). Muss fuer den
   * "verschoben"-Chip pro Folge verwendet werden, nicht has_episode_override.
   */
  assigned_episodes?: {
    release_version_id: number
    episode_number: string
    has_override: boolean
    override_start_time?: string | null
    override_end_time?: string | null
  }[]
  /**
   * Serverseitig aufgelöste Vorschaubild-URL des Segments (Phase 172, D-09) -- Rangfolge
   * manuell > automatisch > Ersatzbild. `null`, wenn (noch) kein Vorschaubild existiert.
   */
  preview_url?: string | null
  /** Herkunft der aufgelösten `preview_url` (Phase 172, D-08/D-09). */
  preview_source?: 'manual' | 'auto' | 'fallback' | null
  created_at: string
}

/** Authoritative result of a segment save and its range assignment reconciliation. */
export interface AdminThemeSegmentMutationResponse {
  data: AdminThemeSegment
  range_sync?: {
    added: number[]
    removed: number[]
    protected_by_override: number[]
    skipped_conflicts?: {
      release_version_id: number
      episode_number: string
      existing_segment_id: number
    }[]
  } | null
}

/** API-Response für Segment-Listen. */
export interface AdminAnimeSegmentsResponse {
  data: AdminThemeSegment[]
}

export interface AdminThemeSegmentRenderCache {
  id: number
  theme_segment_id: number
  playback_source_id?: number | null
  cache_key: string
  source_kind: string
  source_fingerprint: string
  render_profile: string
  status: 'queued' | 'rendering' | 'ready' | 'failed' | 'stale' | string
  output_path?: string | null
  mime_type?: string | null
  duration_seconds?: number | null
  video_codec?: string | null
  audio_codec?: string | null
  subtitle_stream_index?: number | null
  subtitle_codec?: string | null
  error_code?: string | null
  error_message?: string | null
  attempts: number
  queued_at: string
  started_at?: string | null
  completed_at?: string | null
  invalidated_at?: string | null
  created_at: string
  updated_at: string
}

export interface AdminThemeSegmentRenderResponse {
  data: AdminThemeSegmentRenderCache
}

/** API-Response für Segment-Vorschläge aus anderen Releases. */
export interface AdminSegmentSuggestionsResponse {
  data: AdminThemeSegment[]
}

/**
 * Ein Kandidat der Segment-Contributor-Auswahl (Phase 156, Plan 156-12/156-13/156-14,
 * GAP-01): jede Person, die aktuell effektiver Beitragender der Origin-Release-Version
 * des Segments ist (ungefiltert nach Rollen-Relevanz -- auch ein reiner Encoder ist
 * referenzierbar), mit `selected` je nach aktuellem `theme_segment_contributors`-Eintrag.
 * Der Admin waehlt NUR Personen, niemals deren Rolle -- die kommt live aus dem
 * Origin-Release (156-UAT.md Auftragspunkt 6/7/20).
 */
export interface AdminThemeSegmentContributorCandidate {
  member_id: number
  name: string
  avatar_url: string | null
  role_label: string
  role_codes: string[]
  member_slug: string | null
  selected: boolean
}

/** API-Response für GET .../segments/:segmentId/contributors. */
export interface AdminThemeSegmentContributorCandidatesResponse {
  data: AdminThemeSegmentContributorCandidate[]
  origin_release_version_id: number | null
}

/** API-Response für PUT .../segments/:segmentId/contributors. */
export interface AdminThemeSegmentContributorsSetResponse {
  data: AdminThemeSegment
  contributors: AdminThemeSegmentContributorCandidate[]
}

/** Request zum Anlegen eines neuen Segments. */
export interface AdminThemeSegmentCreateRequest {
  theme_id: number
  fansub_group_id?: number | null
  version: string
  start_episode?: number | null
  end_episode?: number | null
  start_time?: string | null
  end_time?: string | null
  source_jellyfin_item_id?: string | null
  source_type?: AdminSegmentSourceType | null
  source_ref?: string | null
  source_label?: string | null
}

/** Request zum partiellen Aktualisieren eines Segments. */
export interface AdminThemeSegmentPatchRequest {
  theme_id?: number
  fansub_group_id?: number | null
  version?: string
  start_episode?: number | null
  end_episode?: number | null
  start_time?: string | null
  end_time?: string | null
  source_jellyfin_item_id?: string | null
  source_type?: AdminSegmentSourceType | null
  source_ref?: string | null
  source_label?: string | null
}

/** Request zum Setzen/Aktualisieren eines Per-Release-Version-Zeit-Overrides (D-01, Plan 117-06). */
export interface AdminThemeSegmentOverrideRequest {
  start_time: string
  end_time: string
}

export interface AdminSegmentLibraryCandidate {
  definition_id: number
  asset_id: number
  media_asset_id?: number | null
  anime_source_provider: string
  anime_source_external_id: string
  fansub_group_id: number
  segment_kind: string
  segment_name?: string | null
  identity_status: 'verified' | 'legacy_unverified'
  ownership_scope: 'reusable' | 'local_only'
  source_ref: string
  source_label?: string | null
  asset_attach_source: string
  current_attach_source?: string | null
  active_assignment_count: number
  last_attached_at?: string | null
}

export interface AdminSegmentLibraryCandidatesResponse {
  data: AdminSegmentLibraryCandidate[]
}

/**
 * Ein waehlbares Release-Bild fuer den "Aus Release-Bildern wählen"-Picker des
 * Segment-Vorschaubilds (Phase 172, D-11). Nur bereits oeffentliche, freigegebene Bilder
 * zugewiesener Release-Versionen werden gelistet.
 */
export interface AdminSegmentPreviewImageCandidate {
  media_asset_id: number
  thumbnail_url: string
  release_version_label: string
}

/** API-Response für GET .../segments/:segmentId/preview-image/candidates. */
export interface AdminSegmentPreviewImageCandidatesResponse {
  data: AdminSegmentPreviewImageCandidate[]
}

export interface AdminSegmentLibraryAttachRequest {
  asset_id: number
}
