import { AnimeStatus, ContentType, EpisodeStatus } from "@/types/anime";

/** Moegliche Anime-Format-Typen fuer die Kategorisierung eines Eintrags. */
export type AnimeType = "tv" | "film" | "ova" | "ona" | "special" | "bonus";

/** Kompakte Anime-Datendarstellung fuer die Admin-Listensicht. */
export interface AdminAnimeItem {
  id: number;
  title: string;
  title_de?: string;
  title_en?: string;
  type: AnimeType;
  content_type: ContentType;
  status: AnimeStatus;
  year?: number;
  max_episodes?: number;
  genre?: string;
  description?: string;
  cover_image?: string;
}

/** Kompakte Episoden-Datendarstellung fuer die Admin-Listensicht. */
export interface AdminEpisodeItem {
  id: number;
  anime_id: number;
  episode_number: string;
  title?: string;
  status: EpisodeStatus;
  stream_link?: string;
}

/** Request-Payload zum Erstellen eines neuen Anime-Eintrags im Admin-Bereich. */
export interface AdminAnimeCreateRequest {
  title: string;
  type: AnimeType;
  content_type: ContentType;
  status: AnimeStatus;
  title_de?: string;
  title_en?: string;
  year?: number;
  max_episodes?: number;
  genre?: string;
  tags?: string[];
  description?: string;
  cover_image?: string;
  banner_image?: string;
  logo_image?: string;
  background_video_url?: string;
  background_image_urls?: string[];
  source?: string;
  source_links?: string[];
  folder_name?: string;
  relations?: AdminAnimeRelation[];
}

/** Vorgeschlagene Asset-URLs fuer einen Anime-Erstellungs-Draft (Cover, Banner, Logo usw.). */
export interface AdminAnimeCreateDraftAssetSuggestions {
  cover?: string;
  banner?: string;
  logo?: string;
  backgrounds?: string[];
  background_video?: string;
}

/** Alternativer Titel eines Anime mit optionaler Sprache und Art-Kennzeichnung. */
export interface AdminAnimeAltTitle {
  language?: string;
  kind?: string;
  title: string;
}

/** Vollstaendiger Payload-Typ fuer einen Anime-Erstellungs-Draft inkl. Alt-Titeln und Asset-Vorschlaegen. */
export interface AdminAnimeCreateDraftPayload {
  title: string;
  title_de?: string;
  title_en?: string;
  type: AnimeType;
  content_type: ContentType;
  status: AnimeStatus;
  year?: number;
  max_episodes?: number;
  genre?: string;
  description?: string;
  cover_image?: string;
  source?: string;
  folder_name?: string;
  alt_titles?: AdminAnimeAltTitle[];
  tags?: string[];
  relations?: AdminAnimeRelation[];
  asset_suggestions?: AdminAnimeCreateDraftAssetSuggestions;
}

/** Partieller Request-Payload zum Aktualisieren eines bestehenden Anime-Eintrags. */
export interface AdminAnimePatchRequest {
  title?: string;
  title_de?: string | null;
  title_en?: string | null;
  type?: AnimeType;
  content_type?: ContentType;
  status?: AnimeStatus;
  year?: number | null;
  max_episodes?: number | null;
  genre?: string | null;
  tags?: string[] | null;
  description?: string | null;
  cover_image?: string | null;
  source?: string | null;
  folder_name?: string | null;
}

/** Partieller Draft-Payload fuer die Bearbeitung eines bestehenden Anime-Eintrags. */
export interface AdminAnimeEditDraftPayload {
  title?: string | null;
  title_de?: string | null;
  title_en?: string | null;
  type?: AnimeType;
  content_type?: ContentType;
  status?: AnimeStatus;
  year?: number | null;
  max_episodes?: number | null;
  genre?: string | null;
  tags?: string[] | null;
  description?: string | null;
  cover_image?: string | null;
  source?: string | null;
  folder_name?: string | null;
}

/** Request zum Anreichern eines bestehenden Anime-Eintrags mit AniSearch-Daten. */
export interface AdminAnimeAniSearchEditRequest {
  anisearch_id: string;
  draft: AdminAnimeEditDraftPayload;
  protected_fields?: string[];
}

/** Ergebnis einer AniSearch-Anreicherung im Draft-Modus mit Feldstatus und Relationsstatistiken. */
export interface AdminAnimeAniSearchEditResult {
  mode: "draft";
  anisearch_id: string;
  source: string;
  draft: AdminAnimeEditDraftPayload;
  updated_fields?: string[];
  relations_applied: number;
  relations_skipped_existing: number;
  skipped_protected_fields?: string[];
}

/** Konflikt-Ergebnis einer AniSearch-Anreicherung: der Eintrag existiert bereits. */
export interface AdminAnimeAniSearchEditConflictResult {
  mode: "conflict";
  anisearch_id: string;
  existing_anime_id: number;
  existing_title: string;
  redirect_path: string;
}

/** Request zum Erstellen eines neuen Anime-Eintrags auf Basis von AniSearch-Daten. */
export interface AdminAnimeAniSearchCreateRequest {
  anisearch_id: string;
  draft: AdminAnimeCreateDraftPayload;
}

/** Suchkandidat aus der AniSearch-Suche mit Basis-Metadaten. */
export interface AdminAnimeAniSearchSearchCandidate {
  anisearch_id: string;
  title: string;
  type: string;
  year?: number;
}

/** Zusammenfassung der Provider-Ergebnisse nach einer AniSearch-basierten Erstellung. */
export interface AdminAnimeAniSearchCreateProviderSummary {
  anisearch_id: string;
  jellysync_applied: boolean;
  relation_candidates: number;
  relation_matches: number;
}

/** Draft-Ergebnis nach einer AniSearch-basierten Anime-Erstellung mit gefuellten Feldern. */
export interface AdminAnimeAniSearchCreateDraftResult {
  mode: "draft";
  anisearch_id: string;
  source: string;
  draft: AdminAnimeCreateDraftPayload;
  manual_fields_kept?: string[];
  filled_fields?: string[];
  filled_assets?: string[];
  provider: AdminAnimeAniSearchCreateProviderSummary;
}

/** Weiterleitungs-Ergebnis wenn der AniSearch-Eintrag bereits als Anime existiert. */
export interface AdminAnimeAniSearchCreateConflictResult {
  mode: "redirect";
  anisearch_id: string;
  existing_anime_id: number;
  existing_title: string;
  redirect_path: string;
}

/** Union-Typ fuer das Ergebnis einer AniSearch-basierten Anime-Erstellung (Draft oder Weiterleitung). */
export type AdminAnimeAniSearchCreateResult =
  | AdminAnimeAniSearchCreateDraftResult
  | AdminAnimeAniSearchCreateConflictResult;

/** API-Antwort fuer eine AniSearch-basierte Anime-Erstellung. */
export interface AdminAnimeAniSearchCreateResponse {
  data: AdminAnimeAniSearchCreateResult;
}

/** API-Antwort fuer eine AniSearch-Suche mit einer Liste von Kandidaten. */
export interface AdminAnimeAniSearchSearchResponse {
  data: AdminAnimeAniSearchSearchCandidate[];
  filtered_existing_count?: number;
}

/** Unterstuetzte Bild-Quell-Provider fuer die Asset-Suche. */
export type AdminAnimeAssetSearchSource =
  | "tmdb"
  | "fanart.tv"
  | "zerochan"
  | "konachan"
  | "anilist"
  | "safebooru";

/** Einzelner Bildkandidat aus der provider-uebergreifenden Asset-Suche. */
export interface AdminAnimeAssetSearchCandidate {
  id: string;
  asset_kind: AdminAnimeAssetKind;
  source: AdminAnimeAssetSearchSource;
  title?: string;
  preview_url: string;
  image_url: string;
  source_url?: string;
  width?: number;
  height?: number;
  year?: number;
}

/** Request-Payload fuer eine provider-uebergreifende Asset-Bildsuche. */
export interface AdminAnimeAssetSearchRequest {
  asset_kind: AdminAnimeAssetKind;
  query: string;
  limit?: number;
  page?: number;
  sources?: AdminAnimeAssetSearchSource[];
}

/** API-Antwort fuer eine Asset-Bildsuche mit Liste von Kandidaten. */
export interface AdminAnimeAssetSearchResponse {
  data: AdminAnimeAssetSearchCandidate[];
}

/** Zusammenfassung der AniSearch-Verarbeitungsschritte beim Erstellen eines Anime. */
export interface AdminAnimeCreateAniSearchSummary {
  source?: string;
  relations_attempted: number;
  relations_applied: number;
  relations_skipped_existing: number;
  warnings?: string[];
}

/** Request-Payload zum Erstellen einer neuen Episode im Admin-Bereich. */
export interface AdminEpisodeCreateRequest {
  anime_id: number;
  episode_number: string;
  status: EpisodeStatus;
  title?: string;
  stream_link?: string;
}

/** Partieller Request-Payload zum Aktualisieren einer bestehenden Episode. */
export interface AdminEpisodePatchRequest {
  episode_number?: string;
  title?: string | null;
  status?: EpisodeStatus;
  stream_link?: string | null;
}

/** Request-Parameter fuer den Jellyfin-Sync eines Anime inkl. Steuerungsoptionen. */
export interface AdminAnimeJellyfinSyncRequest {
  jellyfin_series_id?: string;
  season_number?: number;
  episode_status?: EpisodeStatus;
  overwrite_episode_titles?: boolean;
  overwrite_version_titles?: boolean;
  cleanup_provider_versions?: boolean;
  allow_mismatch?: boolean;
}

/** API-Antwort nach dem Erstellen oder Aktualisieren eines Anime. */
export interface AdminAnimeUpsertResponse {
  data: AdminAnimeItem;
  anisearch?: AdminAnimeCreateAniSearchSummary;
}

/** API-Antwort nach dem Erstellen oder Aktualisieren einer Episode. */
export interface AdminEpisodeUpsertResponse {
  data: AdminEpisodeItem;
}

/** Ergebnis-Daten nach dem Loeschen einer Episode (inkl. Anzahl geloeschter Versionen). */
export interface AdminEpisodeDeleteResult {
  episode_id: number;
  anime_id: number;
  episode_number: string;
  deleted_release_variants: number;
}

/** API-Antwort nach dem Loeschen einer Episode. */
export interface AdminEpisodeDeleteResponse {
  data: AdminEpisodeDeleteResult;
}

/** Ergebnis-Daten nach dem Loeschen eines Anime-Eintrags. */
export interface AdminAnimeDeleteResult {
  anime_id: number;
  title: string;
  orphaned_local_cover_image?: string;
}

/** API-Antwort nach dem Loeschen eines Anime-Eintrags. */
export interface AdminAnimeDeleteResponse {
  data: AdminAnimeDeleteResult;
}

/** Erlaubte Beziehungslabels zwischen zwei Anime-Eintraegen (auf vier Typen limitiert). */
export type AdminAnimeRelationLabel =
  | "Hauptgeschichte"
  | "Nebengeschichte"
  | "Fortsetzung"
  | "Zusammenfassung";

/** Eine Anime-Relation mit Ziel-Anime-Daten und dem Beziehungslabel. */
export interface AdminAnimeRelation {
  target_anime_id: number;
  relation_label: AdminAnimeRelationLabel;
  target_title: string;
  target_type: string;
  target_status: AnimeStatus;
  target_year?: number;
  target_cover_url?: string;
}

/** Ziel-Anime fuer eine Relation-Auswahl im Admin-Bereich. */
export interface AdminAnimeRelationTarget {
  anime_id: number;
  title: string;
  type: string;
  status: AnimeStatus;
  year?: number;
  cover_url?: string;
}

/** API-Antwort fuer die Liste aller Relationen eines Anime. */
export interface AdminAnimeRelationsResponse {
  data: AdminAnimeRelation[];
}

export interface AdminAnimeRelationTargetsResponse {
  data: AdminAnimeRelationTarget[];
}

export interface AdminAnimeRelationCreateRequest {
  target_anime_id: number;
  relation_label: AdminAnimeRelationLabel;
}

export interface AdminAnimeRelationUpdateRequest {
  relation_label: AdminAnimeRelationLabel;
}

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
}

export interface AdminAnimePersistedBackgroundState extends AdminAnimePersistedAssetState {
  id: number;
  sort_order: number;
}

export type AdminAnimeAssetKind =
  | "cover"
  | "banner"
  | "logo"
  | "background"
  | "background_video";

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
  apply_backgrounds?: boolean;
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
  start_episode_id: number | null
  end_episode_id: number | null
  start_episode_number: string | null
  end_episode_number: string | null
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

/** Ein Release-Segment (OP/ED Timing) fuer eine Fansub-Gruppe und Version. */
export interface AdminThemeSegment {
  id: number
  theme_id: number
  anime_id: number
  theme_title: string | null
  theme_type_name: string
  fansub_group_id: number | null
  version: string
  start_episode: number | null
  end_episode: number | null
  start_time: string | null    // "HH:MM:SS" oder null
  end_time: string | null      // "HH:MM:SS" oder null
  /** @deprecated Fuer Rueckwaertskompatibilitaet; neues Frontend soll source_type/source_ref/source_label verwenden */
  source_jellyfin_item_id: string | null
  /** Expliziter Quelltyp (Phase 25+). */
  source_type?: AdminSegmentSourceType | null
  /** Referenz auf die Quell-Ressource (z.B. Jellyfin-Item-ID oder Media-Asset-ID). */
  source_ref?: string | null
  /** Lesbares Label der Quelle fuer die UI-Anzeige. */
  source_label?: string | null
  created_at: string
}

/** API-Response fuer Segment-Listen. */
export interface AdminAnimeSegmentsResponse {
  data: AdminThemeSegment[]
}

/** API-Response fuer Segment-Vorschlaege aus anderen Releases. */
export interface AdminSegmentSuggestionsResponse {
  data: AdminThemeSegment[]
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
}
