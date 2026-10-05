// D-24 sub-split (174-06): own-profile media upload functions triaged out
// of the media/assets cross-cutting bucket in api.ts -- avatar/background
// (uploadOwnProfileAvatar/uploadOwnProfileBackground) and story-image
// (uploadOwnProfileStoryImage) uploads, all consumed exclusively from
// me/profile/page.tsx. Kept in a separate file from members.ts (174-04)
// rather than appended to it because members.ts is already at the 450-line
// CLAUDE.md budget; this file is the profile-consuming sibling.
import type { MemberProfileResponse } from "@/types/profile";
import {
  ApiError,
  authorizedFetch,
  authorizedUploadXhr,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "./client";

type OwnProfileAvatarUploadInput = File | {
  sourceFile: File;
  croppedFile: File;
  visibilityCode?: string;
  reviewStatusCode?: string;
};

export async function uploadOwnProfileAvatar(
  input: OwnProfileAvatarUploadInput,
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const body = new FormData();
  if (input instanceof File) {
    body.append("file", input);
  } else {
    body.append("source_file", input.sourceFile);
    body.append("cropped_file", input.croppedFile);
    if (input.visibilityCode) body.set("visibility_code", input.visibilityCode);
    if (input.reviewStatusCode) body.set("review_status_code", input.reviewStatusCode);
  }

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/profile/avatar`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body,
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

  return response.json() as Promise<MemberProfileResponse>;
}

type OwnProfileBackgroundUploadInput = File | {
  sourceFile?: File;
  croppedFile: File;
  visibilityCode?: string;
  reviewStatusCode?: string;
};

export async function uploadOwnProfileBackground(
  input: OwnProfileBackgroundUploadInput,
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const body = new FormData();
  if (input instanceof File) {
    body.append("file", input);
  } else {
    if (input.sourceFile) {
      body.append("source_file", input.sourceFile);
    }
    body.append("cropped_file", input.croppedFile);
    if (input.visibilityCode) body.set("visibility_code", input.visibilityCode);
    if (input.reviewStatusCode) body.set("review_status_code", input.reviewStatusCode);
  }

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/profile/background`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body,
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

  return response.json() as Promise<MemberProfileResponse>;
}

// ---------------------------------------------------------------------------
// Story-Bild-Upload (Phase 70 — D-01..D-23)
// ---------------------------------------------------------------------------

export interface StoryImageUploadResponse {
  media_asset_id: number
  public_url: string
}

/**
 * Laedt ein einzelnes Story-Bild fuer das eigene Profil hoch.
 * Endpoint: POST /api/v1/me/profile/story-images (field "image")
 * retryEligibility: 'never' — Upload nicht idempotent.
 * Server-Side-Guard: wirft 500 wenn kein Browser-Kontext.
 */
interface OwnProfileStoryImageUploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

export async function uploadOwnProfileStoryImage(
  fileOrOptions: File | OwnProfileStoryImageUploadOptions,
  onProgress?: (percent: number) => void,
): Promise<StoryImageUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }
  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/me/profile/story-images`;

  const opts: OwnProfileStoryImageUploadOptions =
    fileOrOptions instanceof File
      ? { file: fileOrOptions, onProgress }
      : fileOrOptions;

  return authorizedUploadXhr<StoryImageUploadResponse>({
    endpoint,
    onProgress: opts.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("image", opts.file);
      if (opts.visibilityCode) body.set("visibility_code", opts.visibilityCode);
      if (opts.reviewStatusCode) body.set("review_status_code", opts.reviewStatusCode);
      return body;
    },
    parsePayload: (payload) => {
      const data = (payload as { data: StoryImageUploadResponse }).data;
      return data;
    },
  });
}
