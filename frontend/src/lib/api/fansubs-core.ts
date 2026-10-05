// D-24 sub-split: the 174-04 "fansubs/groups" bucket (39 functions) would
// exceed the 450-line budget as a single fansubs.ts, so it is split by
// sub-concern (core/aliases-links/members/groups). This file holds the core
// anime+fansub reads: anime list/detail/backdrops/relations, fansub
// list/detail/slug/public-profile/project-resolution.
import type { FansubStatus, FansubGroupListResponse, FansubGroupResponse, PublicFansubProfileResponse, FansubProjectResolutionResponse } from "@/types/fansub";
import type {
  AnimeBackdropResponse,
  AnimeDetail,
  AnimeListParams,
  AnimeRelationsResponse,
  PaginatedAnimeResponse,
} from "@/types/anime";
import type { DomainProjectionResponse } from "@/types/domain-projection";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
} from "./client";
import type { AuthorizedRequestOptions } from "./client";

interface FansubListParams {
  q?: string;
  status?: FansubStatus;
  page?: number;
  per_page?: number;
}

/**
 * Baut den URL-Query-String für die Anime-Listenabfrage.
 * Nur gesetzte Parameter werden angehängt — undefined/null-Werte werden
 * weggelassen damit die URL sauber bleibt. Boolean-Felder (has_cover,
 * include_disabled) werden nur bei explizitem true/false übergeben.
 */
function buildQuery(params: AnimeListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.q) query.set("q", params.q);
  if (params.letter) query.set("letter", params.letter);
  if (params.content_type) query.set("content_type", params.content_type);
  if (params.status) query.set("status", params.status);
  if (typeof params.fansub_id === "number" && params.fansub_id > 0)
    query.set("fansub_id", String(params.fansub_id));
  if (typeof params.has_cover === "boolean")
    query.set("has_cover", String(params.has_cover));
  if (typeof params.include_disabled === "boolean")
    query.set("include_disabled", String(params.include_disabled));

  return query.toString();
}

/** Baut den Query-String für Fansub-Listenabfragen (Suche, Status, Pagination). */
function buildFansubListQuery(params: FansubListParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));

  return query.toString();
}

interface AnimeListRequestOptions {
  signal?: AbortSignal;
  cache?: RequestCache;
  revalidate?: number;
}

export async function getAnimeList(
  params: AnimeListParams,
  options: AnimeListRequestOptions = {},
): Promise<PaginatedAnimeResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildQuery(params);
  const path =
    params.include_disabled === true ? "/api/v1/admin/anime" : "/api/v1/anime";
  const url = `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;
  const requestInit: AuthorizedRequestOptions & {
    next?: { revalidate: number };
  } = {};
  if (options.signal) {
    requestInit.signal = options.signal;
  }
  if (options.cache) {
    requestInit.cache = options.cache;
  }
  if (typeof options.revalidate === "number") {
    requestInit.next = { revalidate: options.revalidate };
  } else if (options.cache !== "no-store") {
    requestInit.next = { revalidate: 30 };
  }

  const response =
    params.include_disabled === true
      ? await authorizedFetch(url, requestInit)
      : await fetch(url, requestInit);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<PaginatedAnimeResponse>;
}

export async function getAnimeByID(
  id: number,
  options: { include_disabled?: boolean } = {},
): Promise<{ data: AnimeDetail }> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  if (typeof options.include_disabled === "boolean")
    query.set("include_disabled", String(options.include_disabled));
  const path =
    options.include_disabled === true
      ? `/api/v1/admin/anime/${id}`
      : `/api/v1/anime/${id}`;
  const url = `${API_BASE_URL}${path}${query.toString() ? `?${query.toString()}` : ""}`;
  const requestInit = {
    next: { revalidate: 30 },
  };
  const response =
    options.include_disabled === true
      ? await authorizedFetch(url, requestInit)
      : await fetch(url, requestInit);

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

  return response.json() as Promise<{ data: AnimeDetail }>;
}

export async function getAnimeBackdrops(
  id: number,
  options: { signal?: AbortSignal } = {},
): Promise<AnimeBackdropResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${id}/backdrops`,
    {
      cache: "no-store",
      signal: options.signal,
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

  return response.json() as Promise<AnimeBackdropResponse>;
}

export async function getAnimeRelations(
  id: number,
): Promise<AnimeRelationsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${id}/relations`,
    {
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { data: [] };
    }
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AnimeRelationsResponse>;
}

export async function getFansubList(
  params: FansubListParams = {},
): Promise<FansubGroupListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildFansubListQuery(params);
  const url = `${API_BASE_URL}/api/v1/fansubs${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    cache: "no-store",
  });

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

  return response.json() as Promise<FansubGroupListResponse>;
}

/**
 * Gibt alle Fansub-Gruppen für den Gruppen-Filter der Archiv-Seite zurück.
 * Kein Auth erforderlich (GET /api/v1/fansubs ist öffentlich, D-14).
 * Alias für getFansubList ohne Parameter für den Gruppen-Filter-Dropdown.
 */
export async function getFansubs(): Promise<FansubGroupListResponse> {
  return getFansubList()
}

export async function getFansubByID(id: number): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${id}`,
    {
      cache: "no-store",
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

  return response.json() as Promise<FansubGroupResponse>;
}

export async function getFansubBySlug(
  slug: string,
): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}`,
    {
      cache: "no-store",
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

  return response.json() as Promise<FansubGroupResponse>;
}

export async function getPublicFansubProfileBySlug(
  slug: string,
): Promise<PublicFansubProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}/public-profile`,
    {
      cache: "no-store",
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

  return response.json() as Promise<PublicFansubProfileResponse>;
}

// resolveFansubProject (Plan 155-01) resolves groupSlug+animeSlug to the
// project's narrow numeric identity plus a bounded sibling-project
// navigation list, WITHOUT loading the full public fansub profile. No
// frontend page calls this yet -- that wiring is 155-06's job.

export async function resolveFansubProject(
  groupSlug: string,
  animeSlug: string,
): Promise<FansubProjectResolutionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedGroupSlug = encodeURIComponent(groupSlug);
  const encodedAnimeSlug = encodeURIComponent(animeSlug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedGroupSlug}/projects/${encodedAnimeSlug}/resolve`,
    {
      cache: "no-store",
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

  return response.json() as Promise<FansubProjectResolutionResponse>;
}

export async function getFansubGroupDomainProjection(
  groupID: number,
): Promise<DomainProjectionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await apiClientFetch(
    `${API_BASE_URL}/api/v1/fansubs/${groupID}/domain-projection`,
    { cache: "no-store" },
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

  return response.json() as Promise<DomainProjectionResponse>;
}
