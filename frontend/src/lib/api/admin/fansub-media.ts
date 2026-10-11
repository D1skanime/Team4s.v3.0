// D-24 sub-split (174-06): admin/fansubs/** asset-upload flows triaged out
// of the media/assets cross-cutting bucket in api.ts (174-CONTEXT.md's
// explicitly-flagged hardest Welle-2 decision point). Covers both the
// fansub entity's own media (logo/banner, uploadFansubMedia/deleteFansubMedia)
// and the fansub group's community-submitted media review workflow
// (uploadFansubGroupMedia/deleteFansubGroupMedia/listFansubGroupMedia/
// patchFansubMediaReview/reorderFansubGroupMedia, Phase 78 Lock K). Grouped
// together because both are consumed exclusively from
// admin/fansubs/[id]/edit/** (GroupMediaReviewSection.tsx / MediaUpload.tsx),
// confirmed via grep call-site triage — not a generic "media.ts" catch-all.
import type {
  FansubMediaKind,
  FansubMediaUploadResponse,
} from "@/types/fansub";
import {
  ApiError,
  authorizedFetch,
  authorizedUploadXhr,
  getApiBaseUrl,
  parseApiError,
  withAuthHeader,
} from "../client";

interface FansubMediaUploadOptions {
  fansubID: number;
  kind: FansubMediaKind;
  file: File;
  sourceFile?: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

export async function uploadFansubMedia(
  options: FansubMediaUploadOptions,
): Promise<FansubMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/media`;
  return authorizedUploadXhr<FansubMediaUploadResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("kind", options.kind);
      body.set("file", options.file);
      if (options.sourceFile) body.set("source_file", options.sourceFile);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}

export async function uploadFansubGroupMedia(options: {
  fansubID: number;
  files: File[];
  category: FansubGroupMediaCategory;
  visibilityCode?: string;
  reviewStatusCode?: string;
  onProgress?: (progress: number) => void;
}): Promise<FansubGroupMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/media`;
  return authorizedUploadXhr<FansubGroupMediaUploadResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("kind", "image");
      body.set("category", options.category);
      for (const file of options.files) {
        body.append("files[]", file);
      }
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}

export async function deleteFansubMedia(
  fansubID: number,
  kind: FansubMediaKind,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/media/${kind}`,
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

export async function deleteFansubGroupMedia(
  fansubID: number,
  mediaId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/media/${mediaId}`,
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

// --- Phase 78: Gruppenmedien-Review (Lock K, D-05/D-06/D-08/D-09) ---

/**
 * Kanonische Sichtbarkeitswerte für Gruppenmedien.
 * Quelle: 78-RESEARCH.md "Offene Fragen (RESOLVED)"
 */
export type FansubMediaVisibility = "intern" | "oeffentlich";

/**
 * Kanonische Prüfstatuswerte für Gruppenmedien.
 * Quelle: 78-RESEARCH.md "Offene Fragen (RESOLVED)"
 */
export type FansubMediaReviewStatus =
  | "in_pruefung"
  | "freigegeben"
  | "abgelehnt"
  | "archiviert"
  | "entfernt";

export type FansubGroupMediaCategory =
  | "gallery"
  | "history_screenshot"
  | "old_website"
  | "forum"
  | "irc_chat"
  | "event_meeting"
  | "artwork_fanart"
  | "other";

export interface FansubGroupMediaUploadResult {
  client_file_name: string;
  status: "ready" | "failed";
  media_asset_id?: number;
  fansub_group_media_id?: number;
  preview_url?: string;
  thumbnail_url?: string;
  original_url?: string;
  error_code?: string;
  message?: string;
}

export interface FansubGroupMediaUploadResponse {
  results: FansubGroupMediaUploadResult[];
}

/**
 * Ein Medieneintrag einer Fansub-Gruppe mit Sichtbarkeit, Prüfstatus und Owner-Konsistenz-Flag.
 * Entspricht FansubGroupMediaItem im Contract admin-content.yaml (Phase 78, Lock K).
 * owner_consistent zeigt NUR an, ob das Medium korrekt zur Gruppe gehört — kein Setter (D-05).
 */
export interface FansubGroupMediaItem {
  id: number;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  original_url?: string | null;
  visibility: FansubMediaVisibility | null;
  review_status: FansubMediaReviewStatus | null;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  category: FansubGroupMediaCategory;
  sort_order: number;
  uploaded_by_display_name?: string | null;
  uploaded_by_current_user?: boolean;
  created_at: string;
  updated_at?: string | null;
  owner_type: string;
  owner_id: number;
  owner_consistent: boolean;
}

/**
 * Listenantwort für Gruppenmedien-Review.
 * Entspricht FansubGroupMediaListResponse im Contract admin-content.yaml (Phase 78, Lock K).
 */
export interface FansubGroupMediaListResponse {
  data: FansubGroupMediaItem[];
}

/**
 * Patch-Body für Gruppenmedien-Review.
 * Mindestens eines der Felder muss angegeben werden.
 */
export interface FansubMediaReviewPatch {
  visibility?: FansubMediaVisibility;
  review_status?: FansubMediaReviewStatus;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  category?: FansubGroupMediaCategory;
  sort_order?: number;
}

export interface FansubGroupMediaReorderRequest {
  mediaIds: number[];
}

/**
 * Liest alle Gruppenmedien einer Fansub-Gruppe für den Review-Tab.
 * GET /api/v1/admin/fansubs/{fansubId}/media
 *
 * Lese-Quelle für GroupMediaReviewSection (78-04). Gegated (ActionFansubGroupEdit, D-08).
 * Scoped strikt auf fansubId (D-04).
 */
export async function listFansubGroupMedia(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupMediaItem[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/media`,
    {
      method: "GET",
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

  const body: FansubGroupMediaListResponse = await response.json();
  return body.data;
}

/**
 * Setzt Sichtbarkeit und/oder Prüfstatus eines Gruppenmediums.
 * PATCH /api/v1/admin/fansubs/{fansubId}/media/{mediaId}
 *
 * Mutation für GroupMediaReviewSection (78-04). Gegated (ActionFansubGroupEdit, D-08).
 * Ungültige Enum-Werte werden serverseitig mit 400 abgelehnt (V5).
 */
export async function patchFansubMediaReview(
  fansubId: number,
  mediaId: number,
  patch: FansubMediaReviewPatch,
  authToken?: string,
): Promise<{ message: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/media/${mediaId}`,
    {
      method: "PATCH",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      body: JSON.stringify(patch),
    },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json();
}

/**
 * Persistiert die globale Reihenfolge aller Gruppenmedien einer Fansub-Gruppe.
 * PATCH /api/v1/admin/fansubs/{fansubId}/media/reorder
 *
 * Frontend sendet nur Medien-IDs; das Backend normalisiert sort_order.
 */
export async function reorderFansubGroupMedia(
  fansubId: number,
  body: FansubGroupMediaReorderRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/media/reorder`,
    {
      method: "PATCH",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      body: JSON.stringify(body),
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

// --- Ende Phase 78 Gruppenmedien-Review ---
