import type { EpisodeDetail } from "@/types/anime";
import type {
  EpisodeVersionCreateRequest,
  EpisodeVersionEditorContextResponse,
  EpisodeVersionFolderScanResponse,
  EpisodeVersionPatchRequest,
  EpisodeVersionResponse,
  GroupedEpisodesResponse,
  PublicGroupedEpisodesOptions,
  PublicGroupedEpisodesResponse,
} from "@/types/episodeVersion";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  withAuthHeader,
} from "./client";

export async function getEpisodeByID(
  id: number,
): Promise<{ data: EpisodeDetail }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episodes/${id}`,
    {
      next: { revalidate: 30 },
    },
  );

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<{ data: EpisodeDetail }>;
}

export function getGroupedEpisodes(
  animeID: number,
  options: PublicGroupedEpisodesOptions,
): Promise<PublicGroupedEpisodesResponse>;
export function getGroupedEpisodes(animeID: number): Promise<GroupedEpisodesResponse>;
export async function getGroupedEpisodes(
  animeID: number,
  options?: PublicGroupedEpisodesOptions,
): Promise<GroupedEpisodesResponse | PublicGroupedEpisodesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  if (options) {
    query.set("projection", options.projection);
    if (options.limit !== undefined) query.set("limit", String(options.limit));
    if (options.cursor !== undefined) query.set("cursor", options.cursor);
    if (options.fansub !== undefined) query.set("fansub", options.fansub);
  }
  const suffix = query.size ? `?${query}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/episodes${suffix}`,
    {
      cache: "no-store",
      ...(options?.signal ? { signal: options.signal } : {}),
    },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupedEpisodesResponse | PublicGroupedEpisodesResponse>;
}

export async function getEpisodeVersionByID(
  versionID: number,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episode-versions/${versionID}`,
    {
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

  return response.json() as Promise<EpisodeVersionResponse>;
}

export async function getEpisodeVersionEditorContext(
  versionID: number,
  authToken?: string,
): Promise<EpisodeVersionEditorContextResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episode-versions/${versionID}/editor-context`,
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

  return response.json() as Promise<EpisodeVersionEditorContextResponse>;
}

export async function scanEpisodeVersionFolder(
  versionID: number,
  authToken?: string,
): Promise<EpisodeVersionFolderScanResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episode-versions/${versionID}/folder-scan`,
    {
      method: "POST",
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

  return response.json() as Promise<EpisodeVersionFolderScanResponse>;
}

export async function createEpisodeVersion(
  animeID: number,
  episodeNumber: number,
  payload: EpisodeVersionCreateRequest,
  authToken?: string,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/episodes/${episodeNumber}/versions`,
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

  return response.json() as Promise<EpisodeVersionResponse>;
}

export async function updateEpisodeVersion(
  versionID: number,
  payload: EpisodeVersionPatchRequest,
  authToken?: string,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episode-versions/${versionID}`,
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

  return response.json() as Promise<EpisodeVersionResponse>;
}

export async function deleteEpisodeVersion(
  versionID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episode-versions/${versionID}`,
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

export async function syncEpisode(
  animeID: number,
  episodeID: number,
  authToken?: string,
): Promise<{ data: { success: boolean; message?: string } }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episodes/${episodeID}/sync`,
    {
      method: "POST",
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

  return response.json() as Promise<{
    data: { success: boolean; message?: string };
  }>;
}
