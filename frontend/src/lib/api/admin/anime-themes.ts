import type {
  AdminAnimeThemeCreateRequest,
  AdminAnimeThemeCreateResponse,
  AdminAnimeThemePatchRequest,
  AdminAnimeThemeSegmentCreateRequest,
  AdminAnimeThemeSegmentCreateResponse,
  AdminAnimeThemeSegmentsResponse,
  AdminAnimeThemesResponse,
  AdminThemeTypesResponse,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function getAdminThemeTypes(
  authToken?: string,
): Promise<AdminThemeTypesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/theme-types`,
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

  return response.json() as Promise<AdminThemeTypesResponse>;
}

export async function getAdminAnimeThemes(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeThemesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes`,
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

  return response.json() as Promise<AdminAnimeThemesResponse>;
}

export async function createAdminAnimeTheme(
  animeID: number,
  payload: AdminAnimeThemeCreateRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminAnimeThemeCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = releaseVariantId ? `?release_variant_id=${releaseVariantId}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes${query}`,
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

  return response.json() as Promise<AdminAnimeThemeCreateResponse>;
}

export async function updateAdminAnimeTheme(
  animeID: number,
  themeID: number,
  payload: AdminAnimeThemePatchRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}`,
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

export async function deleteAdminAnimeTheme(
  animeID: number,
  themeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}`,
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

export async function getAdminAnimeThemeSegments(
  animeID: number,
  themeID: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminAnimeThemeSegmentsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/segments${qs}`,
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

  const payload = (await response.json()) as AdminAnimeThemeSegmentsResponse;
  return {
    data: payload.data.filter((segment) => segment.theme_id === themeID),
  };
}

export async function createAdminAnimeThemeSegment(
  animeID: number,
  themeID: number,
  payload: AdminAnimeThemeSegmentCreateRequest,
  authToken?: string,
): Promise<AdminAnimeThemeSegmentCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/segments`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify({ ...payload, theme_id: themeID }),
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

  return response.json() as Promise<AdminAnimeThemeSegmentCreateResponse>;
}

export async function deleteAdminAnimeThemeSegment(
  animeID: number,
  themeID: number,
  segmentID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/segments/${segmentID}`,
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
