import type {
  AdminAnimeRelationCreateRequest,
  AdminAnimeRelationTargetsResponse,
  AdminAnimeRelationUpdateRequest,
  AdminAnimeRelationsResponse,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function getAdminAnimeRelations(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeRelationsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations`,
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

  return response.json() as Promise<AdminAnimeRelationsResponse>;
}

export async function searchAdminAnimeRelationTargets(
  animeID: number,
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminAnimeRelationTargetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const search = new URLSearchParams();
  search.set("q", query);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    search.set("limit", String(params.limit));

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relation-targets?${search.toString()}`,
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

  return response.json() as Promise<AdminAnimeRelationTargetsResponse>;
}

export async function createAdminAnimeRelation(
  animeID: number,
  payload: AdminAnimeRelationCreateRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations`,
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
}

export async function updateAdminAnimeRelation(
  animeID: number,
  targetAnimeID: number,
  payload: AdminAnimeRelationUpdateRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations/${targetAnimeID}`,
    {
      method: "PATCH",
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
}

export async function deleteAdminAnimeRelation(
  animeID: number,
  targetAnimeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations/${targetAnimeID}`,
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
