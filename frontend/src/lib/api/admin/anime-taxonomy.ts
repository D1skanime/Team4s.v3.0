import type {
  AdminGenreNamesResponse,
  AdminGenreTokensResponse,
  AdminTagNamesResponse,
  AdminTagTokensResponse,
  AdminUpsertNameResponse,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
} from "../client";

export async function getAdminGenreTokens(
  params: { q?: string; query?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminGenreTokensResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  const genreQuery = (params.query || params.q || "").trim();
  if (genreQuery) query.set("query", genreQuery);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    query.set("limit", String(params.limit));
  const url = `${API_BASE_URL}/api/v1/genres${query.toString() ? `?${query.toString()}` : ""}`;
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

  return response.json() as Promise<AdminGenreTokensResponse>;
}

export async function getAdminTagTokens(
  params: { query?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminTagTokensResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  const tagQuery = (params.query || "").trim();
  if (tagQuery) query.set("query", tagQuery);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    query.set("limit", String(params.limit));
  const url = `${API_BASE_URL}/api/v1/admin/tags${query.toString() ? `?${query.toString()}` : ""}`;
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

  return response.json() as Promise<AdminTagTokensResponse>;
}

export async function getAdminTagNames(
  authToken?: string,
): Promise<AdminTagNamesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const url = `${API_BASE_URL}/api/v1/admin/tags/names`;
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

  return response.json() as Promise<AdminTagNamesResponse>;
}

export async function updateAdminTagName(
  tagId: number,
  name: string,
  authToken?: string,
): Promise<AdminUpsertNameResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const url = `${API_BASE_URL}/api/v1/admin/tags/${tagId}/names/de`;
  const response = await authorizedFetch(url, {
    authToken,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AdminUpsertNameResponse>;
}

export async function getAdminGenreNames(
  authToken?: string,
): Promise<AdminGenreNamesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const url = `${API_BASE_URL}/api/v1/admin/genres/names`;
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

  return response.json() as Promise<AdminGenreNamesResponse>;
}

export async function updateAdminGenreName(
  genreId: number,
  name: string,
  authToken?: string,
): Promise<AdminUpsertNameResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const url = `${API_BASE_URL}/api/v1/admin/genres/${genreId}/names/de`;
  const response = await authorizedFetch(url, {
    authToken,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AdminUpsertNameResponse>;
}
