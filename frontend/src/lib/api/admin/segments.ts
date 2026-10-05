import type {
  AdminAnimeSegmentsResponse,
  AdminThemeSegment,
  AdminThemeSegmentCreateRequest,
  AdminThemeSegmentMutationResponse,
  AdminThemeSegmentOverrideRequest,
  AdminThemeSegmentPatchRequest,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function getAnimeSegments(
  animeId: number,
  groupId: number | null,
  version: string | null,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminAnimeSegmentsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (groupId) params.set("group_id", String(groupId));
  if (version) params.set("version", version);
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments${qs}`,
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

  return response.json() as Promise<AdminAnimeSegmentsResponse>;
}

export async function createAnimeSegment(
  animeId: number,
  input: AdminThemeSegmentCreateRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminThemeSegmentMutationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments${qs}`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(input),
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

  return response.json() as Promise<AdminThemeSegmentMutationResponse>;
}

export async function updateAnimeSegment(
  animeId: number,
  segmentId: number,
  input: AdminThemeSegmentPatchRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminThemeSegmentMutationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}${qs}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(input),
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

  return response.json() as Promise<AdminThemeSegmentMutationResponse>;
}

export async function deleteAnimeSegment(
  animeId: number,
  segmentId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}${qs}`,
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

export async function assignAnimeSegment(
  animeId: number,
  segmentId: number,
  releaseVersionId: number,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/assignments`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify({ release_version_id: releaseVersionId }),
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

export async function setAnimeSegmentOrigin(
  animeId: number,
  segmentId: number,
  releaseVersionId: number,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/origin`,
    {
      method: "PUT",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify({ release_version_id: releaseVersionId }),
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

export async function unassignAnimeSegment(
  animeId: number,
  segmentId: number,
  releaseVersionId: number,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/assignments/${releaseVersionId}`,
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

export async function upsertAnimeSegmentEpisodeOverride(
  animeId: number,
  segmentId: number,
  releaseVersionId: number,
  input: AdminThemeSegmentOverrideRequest,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/assignments/${releaseVersionId}/override`,
    {
      method: "PUT",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(input),
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

export async function deleteAnimeSegmentEpisodeOverride(
  animeId: number,
  segmentId: number,
  releaseVersionId: number,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/assignments/${releaseVersionId}/override`,
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}
