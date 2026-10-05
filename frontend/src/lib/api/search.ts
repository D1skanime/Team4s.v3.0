import { MemberSearchResult } from "@/types/profile";
import { type SearchParams, type SearchResponse, type SearchSuggestionsResponse } from "@/types/search";
import { ApiError, authorizedFetch, getApiBaseUrl, parseApiErrorPayload } from "./client";

/**
 * Baut den URL-Query-String für die globale Suche.
 * Nur gesetzte Parameter werden angehängt — leere/undefined-Werte bleiben weg,
 * damit die URL als Source of Truth (D-08) sauber und teilbar bleibt.
 */
export function buildSearchQuery(params: SearchParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.type) query.set("type", params.type);
  if (typeof params.year_from === "number")
    query.set("year_from", String(params.year_from));
  if (typeof params.year_to === "number")
    query.set("year_to", String(params.year_to));
  if (params.genre) query.set("genre", params.genre);
  if (params.tag) query.set("tag", params.tag);
  if (params.format) query.set("format", params.format);
  if (params.status) query.set("status", params.status);
  if (typeof params.fansub_group === "number" && params.fansub_group > 0)
    query.set("fansub_group", String(params.fansub_group));
  if (params.fansub_group_query)
    query.set("fansub_group_query", params.fansub_group_query);
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.sort) query.set("sort", params.sort);
  if (typeof params.include_disabled === "boolean")
    query.set("include_disabled", String(params.include_disabled));

  return query.toString();
}

/**
 * Globale Suche über Anime und Fansubgruppen (öffentlich, unauthentifiziert).
 * Reicht ein optionales AbortController-`signal` durch, damit veraltete Requests
 * bei Search-as-you-type abgebrochen werden können. Wirft `ApiError` bei !ok.
 */
export async function getSearch(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildSearchQuery(params);
  const url = `${API_BASE_URL}/api/v1/search${query ? `?${query}` : ""}`;
  const response = await fetch(url, { cache: "no-store", signal });

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      "Die Suche konnte nicht geladen werden.",
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<SearchResponse>;
}

/**
 * Gruppierte Autocomplete-Vorschläge (Anime/Fansubgruppen) für Search-as-you-type.
 * Der Suchbegriff muss serverseitig mindestens 2 Zeichen lang sein; das `signal`
 * bricht veraltete Vorschlags-Requests ab. Wirft `ApiError` bei !ok.
 */
export async function getSearchSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<SearchSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  query.set("q", q);
  const url = `${API_BASE_URL}/api/v1/search/suggestions?${query.toString()}`;
  const response = await fetch(url, { cache: "no-store", signal });

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      "Die Vorschläge konnten nicht geladen werden.",
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<SearchSuggestionsResponse>;
}

export async function searchHistoricalMembers(
  q: string,
  authToken?: string,
): Promise<MemberSearchResult[]> {
  const API_BASE_URL = getApiBaseUrl();
  const query = encodeURIComponent(q);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-search?q=${query}`,
    {
      cache: "no-store",
      authToken,
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const payload = (await response.json()) as { data: MemberSearchResult[] };
  return payload.data;
}
