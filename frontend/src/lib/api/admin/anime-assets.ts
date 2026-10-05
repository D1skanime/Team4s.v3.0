// D-24 sub-split (174-06): the 13 general admin-anime asset-management
// functions triaged out of the media/assets cross-cutting bucket in api.ts
// -- banner/cover/logo/background-video assign/delete, the generic
// uploadAdminAnimeMedia uploader, and the legacy deleteUploadedCoverFile
// create-flow helper. Siblings of anime-core.ts/anime-release-assets.ts
// (174-03) but a distinct sub-concern (own-display assets vs. fansub
// release/theme assets) -- confirmed via grep call-site triage against
// AnimeEditWorkspace.tsx/AnimeJellyfinAssetUploadControls.tsx/
// useAnimePatchMutations.ts/createAssetUploadPlan.ts.
import {
  AdminAnimeAssetKind,
  AdminAnimeBackgroundAssetResponse,
  AdminAnimeUploadAssetType,
  AdminMediaUploadResponse,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  authorizedUploadXhr,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

interface AdminAnimeMediaUploadOptions {
  animeID: number;
  /** "segment_preview": Kara-Vorschaubild (Phase 172), erfordert segmentID. */
  assetType: AdminAnimeUploadAssetType | "segment_preview";
  file: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
  /** Nur fuer assetType "segment_preview": Rechtepruefung ueber das Segment statt Plattform-Admin. */
  segmentID?: number;
  releaseVariantID?: number | null;
}

export async function uploadAdminAnimeMedia(
  options: AdminAnimeMediaUploadOptions,
): Promise<AdminMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/upload`;
  return authorizedUploadXhr<AdminMediaUploadResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("entity_type", "anime");
      body.set("entity_id", String(options.animeID));
      body.set("asset_type", options.assetType);
      body.set("file", options.file);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      if (options.segmentID != null) body.set("segment_id", String(options.segmentID));
      if (options.releaseVariantID != null) body.set("release_variant_id", String(options.releaseVariantID));
      return body;
    },
  });
}
export async function assignAdminAnimeBannerAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, "banner", mediaID, authToken);
}

export async function assignAdminAnimeCoverAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, "cover", mediaID, authToken);
}

export async function assignAdminAnimeLogoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, "logo", mediaID, authToken);
}

export async function assignAdminAnimeBackgroundVideoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(
    animeID,
    "background_video",
    mediaID,
    authToken,
  );
}

export async function addAdminAnimeBackgroundVideoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/background_videos`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify({ media_id: mediaID }),
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

// --- Explicit release context helpers (Phase 30) ---
// These helpers load release identity directly from the dedicated release endpoints
// so callers do not have to infer release_id from theme-asset helper responses.

async function assignAdminAnimeSingularAsset(
  animeID: number,
  assetKind: Exclude<AdminAnimeAssetKind, "background">,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/${assetKind}`,
    {
      method: "PUT",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify({ media_id: mediaID }),
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

export async function deleteAdminAnimeCoverAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/cover`,
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

export async function deleteAdminAnimeBannerAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, "banner", authToken);
}

export async function deleteAdminAnimeLogoAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, "logo", authToken);
}

export async function deleteAdminAnimeBackgroundVideoAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, "background_video", authToken);
}

async function deleteAdminAnimeSingularAsset(
  animeID: number,
  assetKind: Exclude<AdminAnimeAssetKind, "background">,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/${assetKind}`,
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

export async function addAdminAnimeBackgroundAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
  providerKey?: string,
): Promise<AdminAnimeBackgroundAssetResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const body: Record<string, string> = { media_id: mediaID };
  if (providerKey) body.provider_key = providerKey;
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/backgrounds`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify(body),
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

  return response.json() as Promise<AdminAnimeBackgroundAssetResponse>;
}

export async function deleteAdminAnimeBackgroundAsset(
  animeID: number,
  backgroundID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/backgrounds/${backgroundID}`,
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

export async function deleteUploadedCoverFile(fileName: string): Promise<void> {
  const response = await fetch("/api/admin/upload-cover", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_name: fileName }),
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
}
