import type {
  AdminAnimeJellyfinContextResponse,
  AdminAnimeJellyfinMetadataApplyRequest,
  AdminAnimeJellyfinMetadataApplyResponse,
  AdminAnimeJellyfinMetadataPreviewRequest,
  AdminAnimeJellyfinMetadataPreviewResponse,
  AdminAnimeJellyfinPreviewResponse,
  AdminAnimeJellyfinSyncRequest,
  AdminAnimeJellyfinSyncResponse,
  AdminJellyfinDiscoveryPageResponse,
  AdminJellyfinSeriesSearchResponse,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function syncAdminAnimeFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinSyncRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinSyncResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/sync`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify(payload),
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

  return response.json() as Promise<AdminAnimeJellyfinSyncResponse>;
}

export async function searchAdminJellyfinSeries(
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminJellyfinSeriesSearchResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const search = new URLSearchParams();
  search.set("q", query);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    search.set("limit", String(params.limit));

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/jellyfin/series?${search.toString()}`,
    {
      headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<AdminJellyfinSeriesSearchResponse>;
}

export async function previewAdminAnimeFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinSyncRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/preview`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify(payload),
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

  return response.json() as Promise<AdminAnimeJellyfinPreviewResponse>;
}

export async function getAdminAnimeJellyfinContext(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeJellyfinContextResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/context`,
    {
      headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<AdminAnimeJellyfinContextResponse>;
}

export async function previewAdminAnimeMetadataFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinMetadataPreviewRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinMetadataPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/metadata/preview`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify(payload),
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

  return response.json() as Promise<AdminAnimeJellyfinMetadataPreviewResponse>;
}

export async function applyAdminAnimeMetadataFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinMetadataApplyRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinMetadataApplyResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/metadata/apply`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify(payload),
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

  return response.json() as Promise<AdminAnimeJellyfinMetadataApplyResponse>;
}

export async function removeAdminAnimeJellyfinFolder(
  animeID: number,
  source: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/folders/${encodeURIComponent(source)}`,
    {
      method: "DELETE",
      headers: withAuthHeader({}, authToken),
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
}

export interface ListAdminJellyfinDiscoveryParams {
  filter?: string;
  q?: string;
  cursor?: string;
  refresh?: boolean;
}

export async function listAdminJellyfinDiscovery(
  params: ListAdminJellyfinDiscoveryParams = {},
  authToken?: string,
): Promise<AdminJellyfinDiscoveryPageResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  if (params.filter) query.set("filter", params.filter);
  if (params.q) query.set("q", params.q);
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.refresh) query.set("refresh", "true");

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/jellyfin/discovery?${query.toString()}`,
    {
      headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<AdminJellyfinDiscoveryPageResponse>;
}

export async function ignoreAdminJellyfinDiscoveryItem(
  jellyfinItemID: string,
  authToken?: string,
): Promise<{ message: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/jellyfin/discovery/ignore`,
    {
      method: "POST",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      body: JSON.stringify({ jellyfin_item_id: jellyfinItemID }),
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

  return response.json() as Promise<{ message: string }>;
}

export async function unignoreAdminJellyfinDiscoveryItem(
  jellyfinItemID: string,
  authToken?: string,
): Promise<{ message: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/jellyfin/discovery/ignore/${encodeURIComponent(jellyfinItemID)}`,
    {
      method: "DELETE",
      headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<{ message: string }>;
}
