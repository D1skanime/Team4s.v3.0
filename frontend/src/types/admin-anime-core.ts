import { AnimeStatus, ContentType, EpisodeStatus } from "@/types/anime";
import type { EpisodeFillerType, EpisodeType } from './episodeClassification';

/** Mögliche Anime-Format-Typen für die Kategorisierung eines Eintrags. */
export type AnimeType = "tv" | "film" | "ova" | "ona" | "special" | "bonus" | "web";

/** Kompakte Anime-Datendarstellung für die Admin-Listensicht. */
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
  source?: string;
  source_links?: string[];
  folder_name?: string;
  anisearch_id?: string;
  jellyfin_series_id?: string;
}

/** Kompakte Episoden-Datendarstellung für die Admin-Listensicht. */
export interface AdminEpisodeItem {
  id: number;
  anime_id: number;
  episode_number: string;
  title?: string;
  status: EpisodeStatus;
  stream_link?: string;
  /** Episode-eigene Einstufung; nur in PATCH-Antworten enthalten. */
  filler_type?: EpisodeFillerType;
  filler_type_source?: string;
  episode_type?: EpisodeType;
  episode_type_source?: string;
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

/** Vorgeschlagene Asset-URLs für einen Anime-Erstellungs-Draft (Cover, Banner, Logo usw.). */
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

/** Vollstaendiger Payload-Typ für einen Anime-Erstellungs-Draft inkl. Alt-Titeln und Asset-Vorschlägen. */
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

/** Partieller Draft-Payload für die Bearbeitung eines bestehenden Anime-Eintrags. */
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

/**
 * Request fuer den additiven "nur verknuepfen"-Endpunkt
 * (POST /admin/anime/:id/anisearch/link, quick-261018-l5r Task 1) -- bewusst schmal, da dieser
 * Endpunkt nur eine AniSearch-ID verknuepft, nie Felder uebernimmt (anders als
 * AdminAnimeAniSearchEditRequest/-Result oben).
 */
export interface AdminAnimeAniSearchLinkRequest {
  anisearch_id: string;
}

/** Erfolgs-Ergebnis des additiven "nur verknuepfen"-Endpunkts. */
export interface AdminAnimeAniSearchLinkResult {
  mode: "linked";
  anisearch_id: string;
  source: string;
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
  /** D-31: gesetzt, wenn dieser Kandidat bereits zu einem bestehenden Team4s-Anime gehört. */
  existing_anime_id?: number;
  existing_title?: string;
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

/** Union-Typ für das Ergebnis einer AniSearch-basierten Anime-Erstellung (Draft oder Weiterleitung). */
export type AdminAnimeAniSearchCreateResult =
  | AdminAnimeAniSearchCreateDraftResult
  | AdminAnimeAniSearchCreateConflictResult;

/** API-Antwort für eine AniSearch-basierte Anime-Erstellung. */
export interface AdminAnimeAniSearchCreateResponse {
  data: AdminAnimeAniSearchCreateResult;
}

/** API-Antwort für eine AniSearch-Suche mit einer Liste von Kandidaten. */
export interface AdminAnimeAniSearchSearchResponse {
  data: AdminAnimeAniSearchSearchCandidate[];
}

/** Unterstützte Bild-Quell-Provider für die Asset-Suche. */
export type AdminAnimeAssetSearchSource =
  | "tmdb"
  | "fanart.tv"
  | "zerochan"
  | "konachan"
  | "anilist"
  | "safebooru";

/** Erlaubte Zielarten für Anime-Asset-Bilder (Cover, Banner, Logo, Hintergründe). */
export type AdminAnimeAssetKind =
  | "cover"
  | "banner"
  | "logo"
  | "background"
  | "background_video";

/** Einzelner Bildkandidat aus der provider-übergreifenden Asset-Suche. */
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

/** Request-Payload für eine provider-übergreifende Asset-Bildsuche. */
export interface AdminAnimeAssetSearchRequest {
  asset_kind: AdminAnimeAssetKind;
  query: string;
  limit?: number;
  page?: number;
  sources?: AdminAnimeAssetSearchSource[];
}

/** API-Antwort für eine Asset-Bildsuche mit Liste von Kandidaten. */
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
  filler_type?: EpisodeFillerType;
  episode_type?: EpisodeType;
}

/** Request-Parameter für den Jellyfin-Sync eines Anime inkl. Steuerungsoptionen. */
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

/** Ergebnis-Daten nach dem Löschen einer Episode (inkl. Anzahl gelöschter Versionen). */
export interface AdminEpisodeDeleteResult {
  episode_id: number;
  anime_id: number;
  episode_number: string;
  deleted_release_variants: number;
}

/** API-Antwort nach dem Löschen einer Episode. */
export interface AdminEpisodeDeleteResponse {
  data: AdminEpisodeDeleteResult;
}

/** Ergebnis-Daten nach dem Löschen eines Anime-Eintrags. */
export interface AdminAnimeDeleteResult {
  anime_id: number;
  title: string;
  orphaned_local_cover_image?: string;
}

/** API-Antwort nach dem Löschen eines Anime-Eintrags. */
export interface AdminAnimeDeleteResponse {
  data: AdminAnimeDeleteResult;
}

/** Erlaubte Beziehungslabels zwischen zwei Anime-Einträgen (auf vier Typen limitiert). */
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

/** Ziel-Anime für eine Relation-Auswahl im Admin-Bereich. */
export interface AdminAnimeRelationTarget {
  anime_id: number;
  title: string;
  type: string;
  status: AnimeStatus;
  year?: number;
  cover_url?: string;
}

/** API-Antwort für die Liste aller Relationen eines Anime. */
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
