import type {
  AdminEpisodeCreateRequest,
  AdminEpisodeDeleteResponse,
  AdminEpisodePatchRequest,
  AdminEpisodeUpsertResponse,
} from "@/types/admin";
import type {
  EpisodeClassificationListResponse,
  EpisodeClassificationOptionsResponse,
} from "@/types/episodeClassification";
import type {
  EpisodeImportApplyInput,
  EpisodeImportApplyResponse,
  EpisodeImportContextResponse,
  EpisodeImportPreviewResponse,
} from "@/types/episodeImport";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function createAdminEpisode(
  payload: AdminEpisodeCreateRequest,
  authToken?: string,
): Promise<AdminEpisodeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episodes`,
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
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AdminEpisodeUpsertResponse>;
}

export async function getAdminEpisodeClassifications(
  animeID: number,
  authToken?: string,
): Promise<EpisodeClassificationListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-classifications`,
    {
      cache: "no-store",
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

  return response.json() as Promise<EpisodeClassificationListResponse>;
}

export async function getAdminEpisodeClassificationOptions(
  authToken?: string,
): Promise<EpisodeClassificationOptionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episode-classification-options`,
    {
      cache: "no-store",
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

  return response.json() as Promise<EpisodeClassificationOptionsResponse>;
}

export async function updateAdminEpisode(
  episodeID: number,
  payload: AdminEpisodePatchRequest,
  authToken?: string,
): Promise<AdminEpisodeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episodes/${episodeID}`,
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
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AdminEpisodeUpsertResponse>;
}

export async function deleteAdminEpisode(
  episodeID: number,
  authToken?: string,
): Promise<AdminEpisodeDeleteResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episodes/${episodeID}`,
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

  return response.json() as Promise<AdminEpisodeDeleteResponse>;
}

export async function getEpisodeImportContext(
  animeID: number,
  authToken?: string,
): Promise<EpisodeImportContextResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/context`,
    {
      authToken,
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

  return response.json() as Promise<EpisodeImportContextResponse>;
}

export async function previewEpisodeImport(
  animeID: number,
  payload: {
    anisearch_id?: string;
    jellyfin_series_id?: string;
    season_offset?: number;
  },
  authToken?: string,
): Promise<EpisodeImportPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/preview`,
    {
      method: "POST",
      authToken,
      headers: {
        "Content-Type": "application/json",
      },
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

  return response.json() as Promise<EpisodeImportPreviewResponse>;
}

export async function applyEpisodeImport(
  animeID: number,
  payload: EpisodeImportApplyInput,
  authToken?: string,
): Promise<EpisodeImportApplyResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/apply`,
    {
      method: "POST",
      authToken,
      headers: {
        "Content-Type": "application/json",
      },
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

  return response.json() as Promise<EpisodeImportApplyResponse>;
}
