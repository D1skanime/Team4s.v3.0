import { PaginationMeta } from "@/types/anime";

/** Entitäts-Diskriminator eines einzelnen Suchtreffers. */
export type SearchEntityType = "anime" | "fansub";

/** Entitäts-Filter der globalen Suche (Backend-Default "alle"). */
export type SearchType = "alle" | "anime" | "fansub";

/** Sortierung. In v1 serverseitig nur "relevance" (deterministisches D-05-Ranking). */
export type SearchSort = "relevance";

/**
 * Query-Parameter der globalen Suche.
 * Spiegelt 1:1 die Parameter des OpenAPI-Kontrakts `/api/v1/search`.
 * Nur gesetzte Felder werden in den Query-String übernommen (URL = Source of Truth).
 */
export interface SearchParams {
  q: string;
  type?: SearchType;
  year_from?: number;
  year_to?: number;
  genre?: string;
  tag?: string;
  format?: string;
  status?: string;
  fansub_group?: number;
  page?: number;
  per_page?: number;
  sort?: SearchSort;
  include_disabled?: boolean;
}

/**
 * Ein einzelner Suchtreffer (Anime oder Fansubgruppe).
 * Entspricht dem OpenAPI-Schema `SearchResultItem`.
 */
export interface SearchResultItem {
  type: SearchEntityType;
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  year?: number | null;
  format?: string | null;
  status?: string | null;
  image_url?: string | null;
}

/** Gruppen-Alias: ein Vorschlag hat dieselbe Form wie ein Suchtreffer. */
export type SearchSuggestion = SearchResultItem;

/**
 * Trefferliste einer einzelnen Entität samt Gesamtzahl.
 * Entspricht dem OpenAPI-Schema `SearchEntityResult` (unabhängige Pagination pro Entität).
 */
export interface SearchEntityResult {
  items: SearchResultItem[];
  total: number;
}

/**
 * Gruppiertes Suchergebnis über beide Entitäten.
 * Entspricht dem OpenAPI-Schema `SearchResult` — `data` ist strukturiert
 * (`{ anime: { items, total }, fansub: { items, total } }`), nicht flach.
 */
export interface SearchResult {
  anime: SearchEntityResult;
  fansub: SearchEntityResult;
}

/**
 * Antwort von `GET /api/v1/search`.
 * Entspricht dem OpenAPI-Schema `PaginatedSearchResponse` ({ data, meta }).
 */
export interface SearchResponse {
  data: SearchResult;
  meta: PaginationMeta;
}

/**
 * Antwort von `GET /api/v1/search/suggestions`.
 * Entspricht dem OpenAPI-Schema `SearchSuggestionsResponse` — je Gruppe
 * serverseitig auf max. 5 Einträge begrenzt (D-09), ohne Pagination-Metadaten.
 */
export interface SearchSuggestionsResponse {
  data: SearchResult;
}
