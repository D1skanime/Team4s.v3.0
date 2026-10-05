import type {
  AdminFansubAnimeListResponse,
  AdminFansubAnimeThemeAssetsResponse,
  AdminReleaseThemeAssetCreateResponse,
  AdminReleaseThemeAssetsResponse,
} from "@/types/admin";
import type {
  AdminCanonicalFansubAnimeReleaseResponse,
  AdminFansubAnimeReleasesResponse,
  AdminReleaseResponse,
} from "@/types/fansub";
import {
  ApiError,
  authorizedFetch,
  authorizedUploadXhr,
  getApiBaseUrl,
  parseApiErrorPayload,
} from "../client";

export async function getAdminFansubAnime(
  fansubID: number,
  authToken?: string,
): Promise<AdminFansubAnimeListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime`,
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

  return response.json() as Promise<AdminFansubAnimeListResponse>;
}

export async function getAdminReleaseThemeAssets(
  releaseID: number,
  authToken?: string,
): Promise<AdminReleaseThemeAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/releases/${releaseID}/theme-assets`,
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

  return response.json() as Promise<AdminReleaseThemeAssetsResponse>;
}

export async function getAdminFansubAnimeThemeAssets(
  fansubID: number,
  animeID: number,
  authToken?: string,
): Promise<AdminFansubAnimeThemeAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/theme-assets`,
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

  return response.json() as Promise<AdminFansubAnimeThemeAssetsResponse>;
}

interface AdminReleaseThemeAssetUploadOptions {
  fansubID: number;
  animeID: number;
  themeID: number;
  file: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

interface AdminReleaseThemeAssetUploadForReleaseOptions {
  releaseID: number;
  themeID: number;
  file: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

export async function uploadAdminReleaseThemeAsset(
  options: AdminReleaseThemeAssetUploadOptions,
): Promise<AdminReleaseThemeAssetCreateResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/anime/${options.animeID}/theme-assets`;
  return authorizedUploadXhr<AdminReleaseThemeAssetCreateResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("theme_id", String(options.themeID));
      body.set("file", options.file);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}

export async function uploadAdminReleaseThemeAssetForRelease(
  options: AdminReleaseThemeAssetUploadForReleaseOptions,
): Promise<AdminReleaseThemeAssetCreateResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/releases/${options.releaseID}/theme-assets`;
  return authorizedUploadXhr<AdminReleaseThemeAssetCreateResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("theme_id", String(options.themeID));
      body.set("file", options.file);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}

export async function deleteAdminReleaseThemeAsset(
  releaseID: number,
  themeID: number,
  mediaID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/releases/${releaseID}/theme-assets/${themeID}/${mediaID}`,
    {
      method: "DELETE",
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
}

export async function getAdminFansubAnimeReleases(
  fansubID: number,
  animeID: number,
  params: { page?: number; per_page?: number } = {},
  authToken?: string,
): Promise<AdminFansubAnimeReleasesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  if (params.page && Number.isFinite(params.page) && params.page > 0) {
    query.set("page", String(params.page));
  }
  if (params.per_page && Number.isFinite(params.per_page) && params.per_page > 0) {
    query.set("per_page", String(params.per_page));
  }
  const queryString = query.toString();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/releases${queryString ? `?${queryString}` : ""}`,
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

  return response.json() as Promise<AdminFansubAnimeReleasesResponse>;
}

export async function getAdminCanonicalFansubRelease(
  fansubID: number,
  animeID: number,
  authToken?: string,
): Promise<AdminCanonicalFansubAnimeReleaseResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/releases/canonical`,
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

  return response.json() as Promise<AdminCanonicalFansubAnimeReleaseResponse>;
}

export async function getAdminRelease(
  releaseID: number,
  authToken?: string,
): Promise<AdminReleaseResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/releases/${releaseID}`,
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

  return response.json() as Promise<AdminReleaseResponse>;
}
