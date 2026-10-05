// D-24 sub-split (174-06): release-version-media/notes/crew bucket triaged
// out of the media/assets cross-cutting bucket in api.ts (174-CONTEXT.md's
// explicitly-flagged hardest Welle-2 decision point). getReleaseAssets
// (public release asset reads), the 8-function release-version-media
// CRUD/reorder/highlight bucket (admin/episode-versions and
// admin/fansubs/[id]/edit release-version-media review flows), and
// replaceReleaseCrew (the separate 1-function release-crew bucket, locked
// to this file regardless of triage per this plan's interfaces) -- all
// confirmed release-consuming via grep call-site triage.
import type {
  ReleaseVersionMediaCategory,
  ReleaseVersionMediaHighlightReorderRequest,
  ReleaseVersionMediaHighlightRequest,
  ReleaseVersionMediaItem,
  ReleaseVersionMediaListResponse,
  ReleaseVersionMediaPatchRequest,
  ReleaseVersionMediaReorderRequest,
  ReleaseVersionMediaUploadResponse,
} from "@/types/releaseVersionMedia";
import type { ReleaseAssetsResponse } from "@/types/mediaAsset";
import type {
  ReplaceReleaseCrewRequest,
  ReplaceReleaseCrewResponse,
} from "@/types/fansub";
import type {
  ReleaseDetailResponse,
  CursorPage,
  ReleaseImagesCursorPage,
} from "@/types/releaseDetail";
import type { EpisodeReleaseSummary } from "@/types/group";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  authorizedUploadXhr,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
} from "./client";
import { buildCursorQuery } from "./history";
import type { CursorQueryOpts } from "./history";

export async function getReleaseAssets(
  releaseID: number,
): Promise<ReleaseAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/releases/${releaseID}/assets`,
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

  return response.json() as Promise<ReleaseAssetsResponse>;
}

// --- Public Group Release Reads (174-07) ---
// getGroupReleaseDetail/getGroupReleaseImages/getGroupReleaseListCursor/
// getReleasePlaybackAccess triaged out of api.ts's "other/unclear" bucket --
// all hit /api/v1/.../releases/... or /release-versions/... endpoints,
// confirmed release-consuming via grep call-site evidence (anime/[id]/group/
// [groupId]/... release detail/gallery/list pages, ReleaseEpisodePlayer.tsx).

export async function getGroupReleaseDetail(
  animeID: number,
  groupID: number,
  releaseVersionID: number,
): Promise<ReleaseDetailResponse> {
  const API_BASE_URL = getApiBaseUrl();
  // Public release story and Karaoke data must not depend on auth preflight.
  const response = await fetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/releases/${releaseVersionID}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<ReleaseDetailResponse>;
}

export interface ReleasePlaybackAccess {
  can_play: boolean;
  stream_ready: boolean;
}

export async function getReleasePlaybackAccess(releaseVersionID: number): Promise<ReleasePlaybackAccess> {
  const response = await apiClientFetch(`/api/v1/release-versions/${releaseVersionID}/playback-access`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }
  const payload = await response.json() as { data: ReleasePlaybackAccess };
  return payload.data;
}

export async function getGroupReleaseListCursor(
  animeID: number,
  groupID: number,
  opts: CursorQueryOpts = {},
): Promise<CursorPage<EpisodeReleaseSummary>> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildCursorQuery(opts);
  const url = `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/release-list${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<CursorPage<EpisodeReleaseSummary>>;
}

export async function getGroupReleaseImages(
  animeID: number,
  groupID: number,
  releaseVersionID: number,
  opts: CursorQueryOpts = {},
): Promise<ReleaseImagesCursorPage> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildCursorQuery(opts);
  const url = `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/releases/${releaseVersionID}/images${query ? `?${query}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<ReleaseImagesCursorPage>;
}

// --- Release-Version Media ---
// Reorder accepts the canonical mixed media/Kara story order; auth remains centralized in authorizedFetch.

export async function getReleaseVersionMedia(
  versionId: number,
  authToken?: string,
): Promise<ReleaseVersionMediaListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media`,
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

  return response.json() as Promise<ReleaseVersionMediaListResponse>;
}

export interface UploadReleaseVersionMediaOptions {
  versionId: number;
  category: ReleaseVersionMediaCategory;
  files: File[];
  onProgress?: (fileIndex: number, percent: number) => void;
}

export async function uploadReleaseVersionMedia(
  options: UploadReleaseVersionMediaOptions,
): Promise<ReleaseVersionMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/release-versions/${options.versionId}/media`;
  return authorizedUploadXhr<ReleaseVersionMediaUploadResponse>({
    endpoint,
    retryEligibility: "never",
    onProgress: options.onProgress
      ? (percent) => options.onProgress?.(0, percent)
      : undefined,
    buildBody: () => {
      const body = new FormData();
      body.set("category", options.category);
      for (const file of options.files) {
        body.append("files[]", file);
      }
      return body;
    },
  });
}
export async function patchReleaseVersionMediaItem(
  versionId: number,
  mediaId: number,
  patch: ReleaseVersionMediaPatchRequest,
  authToken?: string,
): Promise<ReleaseVersionMediaItem> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/${mediaId}`,
    {
      method: "PATCH",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
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

  return response.json() as Promise<ReleaseVersionMediaItem>;
}

export interface ReplaceReleaseVersionMediaFileOptions {
  versionId: number;
  relationId: number;
  file: File;
  category?: ReleaseVersionMediaCategory;
  title?: string | null;
  caption?: string | null;
  isPreviewCandidate?: boolean;
  sourceRevision?: number;
  onProgress?: (percent: number) => void;
}

export async function replaceReleaseVersionMediaFile(
  options: ReplaceReleaseVersionMediaFileOptions,
): Promise<ReleaseVersionMediaItem> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/release-versions/${options.versionId}/media/${options.relationId}/file`;
  return authorizedUploadXhr<ReleaseVersionMediaItem>({
    endpoint,
    method: "PUT",
    retryEligibility: "never",
    onProgress: options.onProgress,
    buildBody: () => {
      const body = new FormData();
      body.set("file", options.file);
      if (options.category !== undefined) {
        body.set("category", options.category);
      }
      if (options.title !== undefined) {
        body.set("title", options.title ?? "");
      }
      if (options.caption !== undefined) {
        body.set("caption", options.caption ?? "");
      }
      if (options.isPreviewCandidate !== undefined) {
        body.set("is_preview_candidate", String(options.isPreviewCandidate));
      }
      if (options.sourceRevision !== undefined) {
        body.set("source_revision", String(options.sourceRevision));
      }
      return body;
    },
  });
}

export async function deleteReleaseVersionMediaItem(
  versionId: number,
  mediaId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/${mediaId}`,
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

export async function reorderReleaseVersionMedia(
  versionId: number,
  body: ReleaseVersionMediaReorderRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/reorder`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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
}

export async function setReleaseVersionMediaHighlight(
  versionId: number,
  mediaId: number,
  body: ReleaseVersionMediaHighlightRequest,
  authToken?: string,
): Promise<{ status: string; is_highlight: boolean; highlight_order: number | null }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/${mediaId}/highlight`,
    {
      method: "PUT",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<{ status: string; is_highlight: boolean; highlight_order: number | null }>;
}

export async function reorderReleaseVersionMediaHighlights(
  versionId: number,
  body: ReleaseVersionMediaHighlightReorderRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/highlights/reorder`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
}

/** Vollständiger gespeicherter Mitwirkenden-Satz einer Release-Version ohne Projektteam-Fallback.
 * Endpoint: GET /api/v1/admin/release-versions/:versionId/contributions/effective */

export async function replaceReleaseCrew(
  releaseVersionId: number,
  fansubGroupId: number,
  body: ReplaceReleaseCrewRequest,
): Promise<ReplaceReleaseCrewResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/release-versions/${releaseVersionId}/contributions/effective?fansub_group_id=${fansubGroupId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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

  return response.json() as Promise<ReplaceReleaseCrewResponse>;
}
