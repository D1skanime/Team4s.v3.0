// 174-07: watchlist cluster triaged out of api.ts's "other/unclear" bucket.
// addWatchlistEntry/getWatchlist/getWatchlistEntry/removeWatchlistEntry form a
// cohesive CRUD set over /api/v1/watchlist(/:animeID), confirmed via grep
// call-site evidence (frontend/src/components/watchlist/*, frontend/src/app/
// watchlist/page.tsx) -- a dedicated small module, not a fit for any existing
// domain file (D-02: a legitimate new module is not artificial fragmentation).
import type {
  PaginatedWatchlistResponse,
  WatchlistCreateResponse,
} from "@/types/watchlist";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  withAuthHeader,
} from "./client";

interface WatchlistListParams {
  page?: number;
  per_page?: number;
}

/** Baut den Query-String für paginierte Watchlist-Abfragen (page + per_page). */
function buildWatchlistQuery(params: WatchlistListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));

  return query.toString();
}

export async function getWatchlist(
  params: WatchlistListParams = {},
  authToken?: string,
): Promise<PaginatedWatchlistResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildWatchlistQuery(params);
  const url = `${API_BASE_URL}/api/v1/watchlist${query ? `?${query}` : ""}`;
  const response = await authorizedFetch(url, {
    authToken,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<PaginatedWatchlistResponse>;
}

export async function addWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/watchlist`, {
    method: "POST",
    headers: withAuthHeader(
      {
        "Content-Type": "application/json",
      },
      authToken,
    ),
    body: JSON.stringify({ anime_id: animeID }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<WatchlistCreateResponse>;
}

export async function getWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/watchlist/${animeID}`,
    {
      headers: withAuthHeader({}, authToken),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<WatchlistCreateResponse>;
}

export async function removeWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/watchlist/${animeID}`,
    {
      method: "DELETE",
      headers: withAuthHeader({}, authToken),
    },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }
}
