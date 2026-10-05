import {
  AdminAnimeBackgroundAssetResponse,
  AdminAnimeAssetKind,
  AdminAnimeUploadAssetType,
  AdminMediaUploadResponse,
  AdminSegmentLibraryAttachRequest,
  AdminSegmentLibraryCandidatesResponse,
  AdminSegmentPreviewImageCandidatesResponse,
  AdminSegmentSuggestionsResponse,
  AdminThemeSegment,
  AdminThemeSegmentRenderResponse,
} from "@/types/admin";
import {
  MemberProfileResponse,
  MemberSearchResult,
} from "@/types/profile";
import {
  CommentCreateRequest,
  CommentCreateResponse,
} from "@/types/comment";
import {
  FansubGroupListResponse,
  FansubMediaKind,
  FansubMediaUploadResponse,
  ReplaceReleaseCrewRequest,
  ReplaceReleaseCrewResponse,
} from "@/types/fansub";
import {
  PaginatedWatchlistResponse,
  WatchlistCreateResponse,
} from "@/types/watchlist";
import {
  ReleaseVersionMediaCategory,
  ReleaseVersionMediaListResponse,
  ReleaseVersionMediaPatchRequest,
  ReleaseVersionMediaReorderRequest,
  ReleaseVersionMediaHighlightRequest,
  ReleaseVersionMediaHighlightReorderRequest,
  ReleaseVersionMediaUploadResponse,
  ReleaseVersionMediaItem,
} from "@/types/releaseVersionMedia";
import {
  EpisodeReleaseSummary,
} from "@/types/group";
import { ReleaseAssetsResponse } from "@/types/mediaAsset";
import {
  FansubGroupNote,
  MemberGroupStory,
  MemberStoryContext,
  MemberStoryContextMember,
  MemberStoryContextRole,
  AnimeFansubProjectNote,
  CreateFansubGroupNoteRequest,
  UpdateFansubGroupNoteRequest,
  CreateMemberGroupStoryRequest,
  UpdateMemberGroupStoryRequest,
  UpsertAnimeFansubProjectNoteRequest,
} from "@/types/fansubNotes";
import {
  ReleaseVersionNote,
  BulkUpsertReleaseVersionNotesRequest,
} from "@/types/releaseVersionNotes";
import type {
  MemberBadgesResponse,
  MembershipsResponse,
  FansubAnimeReleaseVersionsResponse,
} from "@/types/contributions";
import type { DomainProjectionResponse } from "@/types/domain-projection";
import type { MediaOwnershipProjectionResponse } from "@/types/media-ownership";
import type {
  AdminClaimsListParams,
  AdminClaimsListResponse,
  AdminChangesListParams,
  AdminChangesListResponse,
} from "@/types/admin-users";
import type {
  GroupProjectNoteResponse,
  GroupReleaseMediaResponse,
} from "@/types/groupContributors";
import type {
  ReleaseDetailResponse,
  CursorPage,
  ReleaseImagesCursorPage,
  PublicReleaseNote,
} from "@/types/releaseDetail";
import type { CapabilityOverrideImpactPreview, RoleAssignmentImpactPreview } from "@/types/admin-capability";
import type { ReviewDelegationMutationRequest, ReviewDelegationMutationResult, ReviewDelegationRow } from "@/types/admin-review-delegation";
import type {
  ReleaseReviewCountParams,
  ReleaseReviewCountsResponse,
  ReleaseReviewDecisionRequest,
  ReleaseReviewDecisionResponse,
  ReleaseReviewDetailResponse,
  ReleaseReviewListParams,
  ReleaseReviewNextResponse,
  ReleaseReviewQueueResponse,
} from "@/types/releaseReviews";
import type {
  SearchParams,
  SearchResponse,
  SearchSuggestionsResponse,
} from "@/types/search";
import {
  ApiError,
  apiClientFetch,
  authorizedFetch,
  authorizedUploadXhr,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
  withAuthHeader,
} from "./api/client";
import { getFansubList } from "./api/fansubs-core";

export * from "./api/client";
export * from "./api/admin/anime-core";
export * from "./api/admin/anime-jellyfin";
export * from "./api/admin/anime-relations";
export * from "./api/admin/anime-themes";
export * from "./api/admin/anime-taxonomy";
export * from "./api/admin/anime-release-assets";
export * from "./api/admin/segments";
export * from "./api/admin/episodes";
export * from "./api/admin/users";
export * from "./api/admin/fansub-members";
export * from "./api/fansubs-core";
export * from "./api/fansubs-aliases";
export * from "./api/fansubs-members";
export * from "./api/fansubs-groups";
export * from "./api/episodes";
export * from "./api/members";
export * from "./api/projects";
export * from "./api/contributions-admin";
export * from "./api/contributions-me";
export * from "./api/auth";
export * from "./api/permissions";

interface WatchlistListParams {
  page?: number;
  per_page?: number;
}

/** Baut den Query-String für paginierte Watchlist-Abfragen (page + per_page). */
function buildWatchlistQuery(params: WatchlistListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));

  return query.toString();
}

/**
 * Baut den URL-Query-String für die globale Suche.
 * Nur gesetzte Parameter werden angehängt — leere/undefined-Werte bleiben weg,
 * damit die URL als Source of Truth (D-08) sauber und teilbar bleibt.
 */
export function buildSearchQuery(params: SearchParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.type) query.set("type", params.type);
  if (typeof params.year_from === "number")
    query.set("year_from", String(params.year_from));
  if (typeof params.year_to === "number")
    query.set("year_to", String(params.year_to));
  if (params.genre) query.set("genre", params.genre);
  if (params.tag) query.set("tag", params.tag);
  if (params.format) query.set("format", params.format);
  if (params.status) query.set("status", params.status);
  if (typeof params.fansub_group === "number" && params.fansub_group > 0)
    query.set("fansub_group", String(params.fansub_group));
  if (params.fansub_group_query)
    query.set("fansub_group_query", params.fansub_group_query);
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.sort) query.set("sort", params.sort);
  if (typeof params.include_disabled === "boolean")
    query.set("include_disabled", String(params.include_disabled));

  return query.toString();
}

/**
 * Globale Suche über Anime und Fansubgruppen (öffentlich, unauthentifiziert).
 * Reicht ein optionales AbortController-`signal` durch, damit veraltete Requests
 * bei Search-as-you-type abgebrochen werden können. Wirft `ApiError` bei !ok.
 */
export async function getSearch(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildSearchQuery(params);
  const url = `${API_BASE_URL}/api/v1/search${query ? `?${query}` : ""}`;
  const response = await fetch(url, { cache: "no-store", signal });

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      "Die Suche konnte nicht geladen werden.",
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<SearchResponse>;
}

/**
 * Gruppierte Autocomplete-Vorschläge (Anime/Fansubgruppen) für Search-as-you-type.
 * Der Suchbegriff muss serverseitig mindestens 2 Zeichen lang sein; das `signal`
 * bricht veraltete Vorschlags-Requests ab. Wirft `ApiError` bei !ok.
 */
export async function getSearchSuggestions(
  q: string,
  signal?: AbortSignal,
): Promise<SearchSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  query.set("q", q);
  const url = `${API_BASE_URL}/api/v1/search/suggestions?${query.toString()}`;
  const response = await fetch(url, { cache: "no-store", signal });

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      "Die Vorschläge konnten nicht geladen werden.",
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<SearchSuggestionsResponse>;
}

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

// UploadRetryEligibility/AuthorizedUploadXhrOptions/UploadXhrResult/
// parseUploadXhrPayload/sendAuthorizedUploadXhrOnce/authorizedUploadXhr moved
// to ./api/client (174-03): shared infra used by functions across multiple
// buckets (this file's uploadFansubMedia/uploadGroupMedia/etc. AND
// admin/anime-release-assets.ts's uploadAdminReleaseThemeAsset*) — D-09, not
// duplicated.

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

export async function createAnimeComment(
  id: number,
  payload: CommentCreateRequest,
  authToken?: string,
): Promise<CommentCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const headers = withAuthHeader(
    {
      "Content-Type": "application/json",
    },
    authToken,
  );

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${id}/comments`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : Number.NaN;
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      message,
      Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds,
    );
  }

  return response.json() as Promise<CommentCreateResponse>;
}

export async function getWatchlist(
  params: WatchlistListParams = {},
  authToken?: string,
): Promise<PaginatedWatchlistResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildWatchlistQuery(params);
  const url = `${API_BASE_URL}/api/v1/watchlist${query ? `?${query}` : ""}`;
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

  return response.json() as Promise<PaginatedWatchlistResponse>;
}

export async function addWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/watchlist`, {
    method: "POST",
    headers: withAuthHeader(
      {
        "Content-Type": "application/json",
      },
      authToken,
    ),
    body: JSON.stringify({ anime_id: animeID }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<WatchlistCreateResponse>;
}

export async function getWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/watchlist/${animeID}`,
    {
      headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<WatchlistCreateResponse>;
}

export async function removeWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/watchlist/${animeID}`,
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

/**
 * Fordert nur die schlanke Viewer-/Owner-Entscheidung an (RCA-08 / P154-08..10), ohne das
 * volle öffentliche Profil zu laden -- für Konsumenten wie OwnProfileEditLink, die
 * ausschließlich `is_owner`/`is_private_preview` brauchen. Spiegelt getMemberProjects'
 * Signal-Weiterleitung.
 */

/**
 * Fordert eine Continuation-Seite der Current-Projects an (D-03, OpenAPI getMemberProjects).
 * `limit` defaultet auf die dokumentierte Initialgröße 6 (serverseitiges Maximum 24);
 * `offset` ist 0-basiert (serverseitiges Maximum 10000). Der Aufrufer treibt "Mehr anzeigen"
 * über das ehrliche `data.total` (D-04) und `data.offset` der Antwort — kein clientseitiger
 * Wiederaufbau des Profils. `signal` (Phase 132 D-03) erlaubt echten Request-Abbruch bei
 * veralteten Continuation-Anfragen, analog zu getSearch.
 */

export async function searchHistoricalMembers(
  q: string,
  authToken?: string,
): Promise<MemberSearchResult[]> {
  const API_BASE_URL = getApiBaseUrl();
  const query = encodeURIComponent(q);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-search?q=${query}`,
    {
      cache: "no-store",
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

  const payload = (await response.json()) as { data: MemberSearchResult[] };
  return payload.data;
}

export async function submitMemberCorrection(
  memberId: number,
  payload: { targetType: string; targetId?: number | null; reasonText: string },
  authToken?: string,
): Promise<{ id: number; status: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/members/${memberId}/correction`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: payload.targetType,
        target_id: payload.targetId ?? null,
        reason_text: payload.reasonText,
      }),
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

  const body = (await response.json()) as { data: { id: number; status: string } };
  return body.data;
}

export async function patchNoindex(
  noindex: boolean,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/profile/noindex`,
    {
      method: "PATCH",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noindex }),
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
// Phase 80: Admin-User-Verwaltung + Rechte-Zentrale
// Alle Helper nutzen apiClientFetch (zentraler Auth-Refresh-Seam, Lock K).
// ---------------------------------------------------------------------------

/**
 * Phase 138 (D-22, CAP-09): read-only Vorschau der Rechte-Auswirkung einer hypothetischen
 * Rollenzuweisung/-entziehung für EIN Zielmitglied über ALLE Aktionen -- steht vor der
 * bestehenden Rollenzuweisungs-Mutation (setFansubGroupMemberRole). Persistiert nichts.
 */
export async function getRoleAssignmentImpactPreview(
  fansubGroupId: number,
  appUserId: number,
  roleCode: string,
  change: "assign" | "revoke",
): Promise<RoleAssignmentImpactPreview> {
  const query = new URLSearchParams({ role_code: roleCode, change });
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/role-assignment-impact?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  const payload = (await response.json()) as { data: RoleAssignmentImpactPreview };
  return payload.data;
}

/**
 * D-23: zentrale, gruppenuebergreifende Claims-Arbeitsqueue.
 * Platform-admin-only (requirePlatformAdminIdentity im Backend).
 */
export async function listClaims(
  params: AdminClaimsListParams = {},
): Promise<AdminClaimsListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.claim_type) query.set("claim_type", params.claim_type);
  if (params.fansub_group_id != null) query.set("fansub_group_id", String(params.fansub_group_id));
  if (params.app_user_id != null) query.set("app_user_id", String(params.app_user_id));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const response = await apiClientFetch(
    `/api/v1/admin/claims?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminClaimsListResponse>;
}

/**
 * D-25/D-28: zentrale, gruppenuebergreifende Aenderungen/Audit-Arbeitsqueue.
 * Platform-admin-only (requirePlatformAdminIdentity im Backend).
 */
export async function listChanges(
  params: AdminChangesListParams = {},
): Promise<AdminChangesListResponse> {
  const query = new URLSearchParams();
  if (params.benutzer != null) query.set("benutzer", String(params.benutzer));
  if (params.akteur != null) query.set("akteur", String(params.akteur));
  if (params.gruppe != null) query.set("gruppe", String(params.gruppe));
  if (params.target_type) query.set("target_type", params.target_type);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const response = await apiClientFetch(
    `/api/v1/admin/changes?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminChangesListResponse>;
}

export async function activateClaimedMember(
  fansubId: number,
  memberId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/historical-members/${memberId}/activate`,
    {
      method: "POST",
      authToken,
    },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code);
  }
}

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

// Fansub merge operations

// Group operations

// --- Öffentliche Gruppen-Projektions-Endpunkte (Phase 75) ---

export async function getGroupReleaseMedia(
  animeID: number,
  groupID: number,
): Promise<GroupReleaseMediaResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/release-media`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupReleaseMediaResponse>;
}

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

// --- Cursor-Pagination (AO4-03/AO4-24) — ausschliesslich fuer die drei
// nachladenden Listen (vollstaendige Release-Liste, Bildergalerie, Textliste).
// Die Offset-Funktionen getGroupReleases/getGroupReleaseDetail bleiben unveraendert. ---

interface CursorQueryOpts {
  cursor?: string;
  limit?: number;
  sort?: "activity" | "release_date";
  exclude_release_version_id?: number;
  category?: ReleaseVersionMediaCategory;
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

function buildCursorQuery(opts: CursorQueryOpts): string {
  const query = new URLSearchParams();
  if (opts.cursor) query.set("cursor", opts.cursor);
  if (opts.limit) query.set("limit", String(opts.limit));
  if (opts.sort) query.set("sort", opts.sort);
  if (opts.exclude_release_version_id) query.set("exclude_release_version_id", String(opts.exclude_release_version_id));
  if (opts.category) query.set("category", opts.category);
  return query.toString();
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

export async function getGroupReleaseNotes(
  animeID: number,
  groupID: number,
  releaseVersionID: number,
  opts: CursorQueryOpts = {},
): Promise<CursorPage<PublicReleaseNote>> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildCursorQuery(opts);
  const url = `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/releases/${releaseVersionID}/notes${query ? `?${query}` : ""}`;
  const response = await authorizedFetch(url, { cache: "no-store" });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<CursorPage<PublicReleaseNote>>;
}

export async function getGroupProjectNote(
  animeID: number,
  groupID: number,
): Promise<GroupProjectNoteResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/project-note`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupProjectNoteResponse>;
}

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

export async function renderAnimeSegment(
  segmentId: number,
  releaseVersionId?: number | null,
  authToken?: string,
): Promise<AdminThemeSegmentRenderResponse> {
  const API_BASE_URL = getApiBaseUrl();
  // release_version_id ist backend-seitig der Diskriminator fuer die release-version-scoped
  // Render-Quelle; ohne ihn liefert der Endpoint 404 (segment nicht gefunden).
  const query =
    releaseVersionId != null ? `?release_version_id=${releaseVersionId}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/segments/${segmentId}/render${query}`,
    {
      method: "POST",
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

  return response.json() as Promise<AdminThemeSegmentRenderResponse>;
}

/**
 * Laedt Segment-Vorschläge für einen Anime und eine Episodennummer aus anderen Releases.
 * Optional kann die aktuelle (excludeGroupId, excludeVersion)-Kombination ausgeschlossen werden.
 */
export async function getAnimeSegmentSuggestions(
  animeId: number,
  episode: number,
  excludeGroupId?: number | null,
  excludeVersion?: string | null,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminSegmentSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("episode", String(episode));
  if (excludeGroupId) params.set("exclude_group_id", String(excludeGroupId));
  if (excludeVersion) params.set("exclude_version", excludeVersion);
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/suggestions?${params.toString()}`,
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

  return response.json() as Promise<AdminSegmentSuggestionsResponse>;
}

export async function getSegmentLibraryCandidates(
  animeId: number,
  groupId: number,
  kind: string,
  name?: string | null,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminSegmentLibraryCandidatesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("group_id", String(groupId));
  params.set("kind", kind);
  if (name?.trim()) params.set("name", name.trim());
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/library-candidates?${params.toString()}`,
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

  return response.json() as Promise<AdminSegmentLibraryCandidatesResponse>;
}

export async function attachSegmentLibraryAsset(
  animeId: number,
  segmentId: number,
  payload: AdminSegmentLibraryAttachRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/reuse${qs}`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Laedt eine Videodatei als Segment-Asset hoch und aktualisiert die Source-Felder des Segments.
 * Sendet multipart/form-data mit dem Feld "file".
 * Gibt das aktualisierte Segment zurück.
 */
export async function uploadSegmentAsset(
  animeId: number,
  segmentId: number,
  file: File,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset${qs}`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body: formData,
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

/**
 * Loescht das Segment-Asset: leert Source-Felder, loescht Datei und media_assets-Eintrag.
 */
export async function deleteSegmentAsset(
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
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset${qs}`,
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

/**
 * Ordnet ein ueber den globalen Uploader (uploadAdminAnimeMedia, assetType "segment_preview")
 * hochgeladenes Bild als manuelles Segment-Vorschaubild zu (Phase 172, D-11) -- analog zur
 * Cover-Zuordnung. Gibt das aktualisierte Segment mit neu aufgelöster
 * `preview_url`/`preview_source` zurück.
 */
export async function assignSegmentPreviewImage(
  animeId: number,
  segmentId: number,
  mediaId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image${qs}`,
    {
      method: "PUT",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      retryAuth401: false,
      body: JSON.stringify({ media_id: mediaId }),
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

/**
 * Laedt die waehlbaren Release-Bilder fuer den "Aus Release-Bildern wählen"-Picker des
 * Segment-Vorschaubilds (Phase 172, D-11).
 */
export async function getSegmentPreviewImageCandidates(
  animeId: number,
  segmentId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminSegmentPreviewImageCandidatesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image/candidates${qs}`,
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

  return response.json() as Promise<AdminSegmentPreviewImageCandidatesResponse>;
}

/**
 * Uebernimmt ein bereits oeffentliches, freigegebenes Release-Bild als neues manuelles
 * Segment-Vorschaubild (Phase 172, D-11 "Aus Release-Bildern wählen"). Gibt das
 * aktualisierte Segment zurück.
 */
export async function attachSegmentPreviewImage(
  animeId: number,
  segmentId: number,
  payload: { media_asset_id: number },
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image/attach${qs}`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Entfernt die manuelle Wahl des Segment-Vorschaubilds (Phase 172, D-11 "Automatisches Bild
 * verwenden") -- das Segment faellt danach auf die Rangfolge automatisch > Ersatzbild zurück.
 */
export async function resetSegmentPreviewImage(
  animeId: number,
  segmentId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image/reset${qs}`,
    {
      method: "POST",
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

 // ---- Fansub Group Notes ----

type RawFansubGroupNote = {
  ID: number;
  FansubGroupID: number;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawMemberGroupStory = {
  ID: number;
  FansubGroupID: number;
  MemberID: number;
  RoleID: number | null;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawAnimeFansubProjectNote = {
  ID: number;
  AnimeID: number;
  FansubGroupID: number;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawMemberStoryContextMember = {
  ID: number;
  Nickname: string;
};

type RawMemberStoryContextRole = {
  ID: number;
  Name: string;
  Label: string;
};

function mapFansubGroupNote(raw: RawFansubGroupNote): FansubGroupNote {
  return {
    id: raw.ID,
    fansubGroupId: raw.FansubGroupID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapMemberGroupStory(raw: RawMemberGroupStory): MemberGroupStory {
  return {
    id: raw.ID,
    fansubGroupId: raw.FansubGroupID,
    memberId: raw.MemberID,
    roleId: raw.RoleID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapAnimeFansubProjectNote(
  raw: RawAnimeFansubProjectNote,
): AnimeFansubProjectNote {
  return {
    id: raw.ID,
    animeId: raw.AnimeID,
    fansubGroupId: raw.FansubGroupID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapMemberStoryContextMember(
  raw: RawMemberStoryContextMember,
): MemberStoryContextMember {
  return {
    id: raw.ID,
    nickname: raw.Nickname,
  };
}

function mapMemberStoryContextRole(
  raw: RawMemberStoryContextRole,
): MemberStoryContextRole {
  return {
    id: raw.ID,
    name: raw.Name,
    label: raw.Label,
  };
}

export async function listFansubGroupNotes(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes`,
    {
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

  const json = (await response.json()) as { data: RawFansubGroupNote[] };
  return json.data.map(mapFansubGroupNote);
}

export async function createFansubGroupNote(
  fansubId: number,
  data: CreateFansubGroupNoteRequest,
  authToken?: string,
): Promise<FansubGroupNote> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawFansubGroupNote };
  return mapFansubGroupNote(json.data);
}

export async function updateFansubGroupNote(
  fansubId: number,
  noteId: number,
  data: UpdateFansubGroupNoteRequest,
  authToken?: string,
): Promise<FansubGroupNote> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes/${noteId}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawFansubGroupNote };
  return mapFansubGroupNote(json.data);
}

export async function deleteFansubGroupNote(
  fansubId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes/${noteId}`,
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

// ---- Member Group Stories ----

export async function listMemberGroupStories(
  fansubId: number,
  authToken?: string,
): Promise<MemberGroupStory[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories`,
    {
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

  const json = (await response.json()) as { data: RawMemberGroupStory[] };
  return json.data.map(mapMemberGroupStory);
}

export async function getMemberGroupStoryContext(
  fansubId: number,
  authToken?: string,
): Promise<MemberStoryContext> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/context`,
    {
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

  const json = (await response.json()) as {
    data: {
      members: RawMemberStoryContextMember[];
      roles: RawMemberStoryContextRole[];
    };
  };

  return {
    members: json.data.members.map(mapMemberStoryContextMember),
    roles: json.data.roles.map(mapMemberStoryContextRole),
  };
}

export async function createMemberGroupStory(
  fansubId: number,
  data: CreateMemberGroupStoryRequest,
  authToken?: string,
): Promise<MemberGroupStory> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    member_id: data.memberId,
    role_id: data.roleId ?? null,
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawMemberGroupStory };
  return mapMemberGroupStory(json.data);
}

export async function updateMemberGroupStory(
  fansubId: number,
  storyId: number,
  data: UpdateMemberGroupStoryRequest,
  authToken?: string,
): Promise<MemberGroupStory> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/${storyId}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawMemberGroupStory };
  return mapMemberGroupStory(json.data);
}

export async function deleteMemberGroupStory(
  fansubId: number,
  storyId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/${storyId}`,
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

// ---- Anime Fansub Project Notes ----

export async function getAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  authToken?: string,
): Promise<AnimeFansubProjectNote | null> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes`,
    {
      headers: withAuthHeader({}, authToken),
    },
  );

  if (response.status === 404) {
    return null;
  }

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

  const json = (await response.json()) as { data: RawAnimeFansubProjectNote | null };
  if (!json.data) {
    return null;
  }
  return mapAnimeFansubProjectNote(json.data);
}

export async function upsertAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  data: UpsertAnimeFansubProjectNoteRequest,
): Promise<AnimeFansubProjectNote> {
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawAnimeFansubProjectNote };
  return mapAnimeFansubProjectNote(json.data);
}

export async function deleteAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes/${noteId}`,
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

// ---- Release Version Notes ----

type RawReleaseVersionNote = {
  ID: number;
  ReleaseVersionID: number;
  FansubGroupID: number | null;
  MemberID: number;
  RoleID: number;
  Title: string | null;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
  SourceRevision?: number | null;
  ReviewState?: "pending" | "confirmed" | "rejected" | "tombstoned" | null;
  LastActivityAt?: string | null;
  RejectionCategory?: ReleaseVersionNote["rejectionCategory"];
  RejectionReason?: string | null;
};

function decodeReleaseVersionBodyJson(value: unknown): unknown | null {
  if (value == null) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Some backend responses currently serialize []byte JSONB as base64 text.
  }

  try {
    const decoded =
      typeof atob === "function"
        ? new TextDecoder().decode(
            Uint8Array.from(atob(trimmed), (char) => char.charCodeAt(0)),
          )
        : Buffer.from(trimmed, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return value;
  }
}

function mapReleaseVersionNote(raw: RawReleaseVersionNote): ReleaseVersionNote {
  return {
    id: raw.ID,
    releaseVersionId: raw.ReleaseVersionID,
    fansubGroupId: raw.FansubGroupID,
    memberId: raw.MemberID,
    roleId: raw.RoleID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
    sourceRevision: raw.SourceRevision ?? null,
    reviewState: raw.ReviewState ?? null,
    lastActivityAt: raw.LastActivityAt ?? null,
    rejectionCategory: raw.RejectionCategory ?? null,
    rejectionReason: raw.RejectionReason ?? null,
  };
}

export async function listReleaseVersionNotes(
  versionId: number,
  authToken?: string,
): Promise<ReleaseVersionNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes`,
    {
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

  const json = (await response.json()) as { data: RawReleaseVersionNote[] };
  return json.data.map(mapReleaseVersionNote);
}

export async function bulkUpsertReleaseVersionNotes(
  versionId: number,
  data: BulkUpsertReleaseVersionNotesRequest,
  authToken?: string,
): Promise<ReleaseVersionNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    notes: data.notes.map((note) => ({
      id: note.id,
      ...(note.sourceRevision != null
        ? { source_revision: note.sourceRevision }
        : {}),
      role_code: note.roleCode,
      title: note.title ?? null,
      body_json: note.bodyJson,
      sort_order: note.sortOrder ?? 0,
    })),
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawReleaseVersionNote[] };
  return json.data.map(mapReleaseVersionNote);
}

export async function deleteReleaseVersionNote(
  versionId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes/${noteId}`,
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

// --- Anime-Contributions ---

/** Lädt die gruppen-gefilterten Release-Versionen eines Anime für das optionale
 * Release-Version-Dropdown im Leader-Contribution-Formular (Phase 67-04).
 * Serverseitig gefiltert (release_version_groups) — kein Client-Filter. */
export async function getFansubAnimeReleaseVersions(
  fansubId: number,
  animeId: number,
  authToken?: string,
): Promise<FansubAnimeReleaseVersionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/release-versions`,
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

  return response.json() as Promise<FansubAnimeReleaseVersionsResponse>;
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

// ─── Me-Contributions ─────────────────────────────────────────────────────────

// === Phase 76: neue Me-Suggestion-Helfer ===

export interface UploadMediaSuggestionOptions {
  file: File;
  fields: {
    target_type: string;
    target_id: string;
    category: string;
  };
  onProgress?: (percent: number) => void;
}

export async function uploadMediaSuggestion(
  options: UploadMediaSuggestionOptions,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  return authorizedUploadXhr<void>({
    endpoint: `${API_BASE_URL}/api/v1/me/suggestions/media`,
    retryEligibility: "never",
    onProgress: options.onProgress,
    buildBody: () => {
      const body = new FormData();
      body.set("file", options.file);
      body.set("target_type", options.fields.target_type);
      body.set("target_id", options.fields.target_id);
      body.set("category", options.fields.category);
      return body;
    },
  });
}

// ─── Contribution Proposals (Member) ─────────────────────────────────────────

export async function getMyMemberships(
  authToken?: string,
): Promise<MembershipsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/memberships`,
    { cache: "no-store", authToken },
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

  return response.json() as Promise<MembershipsResponse>;
}

// ─── Contribution Proposals (Admin/Review) ────────────────────────────────────

// ─── Public Contributions ────────────────────────────────────────────────────

export async function getFansubGroupDomainProjection(
  groupID: number,
): Promise<DomainProjectionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await apiClientFetch(
    `${API_BASE_URL}/api/v1/fansubs/${groupID}/domain-projection`,
    { cache: "no-store" },
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

  return response.json() as Promise<DomainProjectionResponse>;
}

export async function getMediaOwnershipProjection(
  ownerType: string,
  ownerID: number,
): Promise<MediaOwnershipProjectionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedOwnerType = encodeURIComponent(ownerType);
  const response = await apiClientFetch(
    `${API_BASE_URL}/api/v1/media-ownership/${encodedOwnerType}/${ownerID}`,
    { cache: "no-store" },
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

  return response.json() as Promise<MediaOwnershipProjectionResponse>;
}

export async function getMyBadges(
  authToken?: string,
): Promise<MemberBadgesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/badges`, {
    cache: "no-store",
    authToken,
  });
  if (!response.ok) {
    // 404 (Route nicht vorhanden) tolerieren, alle anderen Fehler propagieren.
    if (response.status === 404) {
      return { badges: [] };
    }
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
  return response.json() as Promise<MemberBadgesResponse>;
}

export async function patchMyBadgeVisibility(
  badgeId: number,
  visibility: string,
): Promise<void>
export async function patchMyBadgeVisibility(
  authToken: string | undefined,
  badgeId: number,
  visibility: string,
): Promise<void>
export async function patchMyBadgeVisibility(
  first: number | string | undefined,
  second: number | string,
  third?: string,
): Promise<void> {
  const authToken = typeof first === "number" ? undefined : first
  const badgeId = typeof first === "number" ? first : Number(second)
  const visibility = typeof first === "number" ? String(second) : String(third ?? "")
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/badges/${badgeId}/visibility`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
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

// ---------------------------------------------------------------------------
// Phase 68 — Gruppen-Meilenstein-CRUD (fansub_group_history)
// ---------------------------------------------------------------------------

export interface GroupHistoryRow {
  id: number
  fansub_group_id: number
  year: number | null
  event_type: string
  title: string | null
  note: string | null
  status: string
  created_by: number | null
  created_at: string
}

export interface GroupHistoryCreateRequest {
  event_type: string
  title: string
  year: number
  note?: string | null
  status?: string
}

export interface GroupHistoryUpdateRequest {
  event_type?: string
  title?: string | null
  year?: number
  note?: string | null
  status?: string
}

export async function listGroupHistory(
  fansubGroupId: number,
  authToken?: string,
): Promise<GroupHistoryRow[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history`,
    {
      headers: withAuthHeader({}, authToken),
      cache: 'no-store',
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow[] }
  return body.data
}

export async function createGroupHistory(
  fansubGroupId: number,
  payload: GroupHistoryCreateRequest,
  authToken?: string,
): Promise<GroupHistoryRow> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history`,
    {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow }
  return body.data
}

export async function updateGroupHistory(
  fansubGroupId: number,
  historyId: number,
  payload: GroupHistoryUpdateRequest,
  authToken?: string,
): Promise<GroupHistoryRow> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history/${historyId}`,
    {
      method: 'PATCH',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow }
  return body.data
}

export async function deleteGroupHistory(
  fansubGroupId: number,
  historyId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history/${historyId}`,
    {
      method: 'DELETE',
      headers: withAuthHeader({}, authToken),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gelöscht werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

// ---------------------------------------------------------------------------
// Phase 68 — Öffentliche Archiv-Suche (/archiv)
// ---------------------------------------------------------------------------

export interface ArchiveMemberRow {
  id: number
  nickname: string
  display_name: string
  slug: string | null
  avatar_path: string | null
  is_verified: boolean
  top_roles: string[]
  groups: string[]
}

export interface ArchiveSearchResponse {
  data: ArchiveMemberRow[]
  total: number
  page: number
}

/**
 * Sucht öffentliche Member im Archiv nach optionalen Filtern.
 * Keine Auth erforderlich — öffentlicher Endpunkt (D-15, D-13).
 * KEIN { next: { revalidate } } — die Seite nutzt export const dynamic = 'force-dynamic'
 * was revalidate wirkungslos macht; live fetch ohne Cache-Hint.
 */
export async function searchArchive(params: {
  rolle?: string
  gruppe?: string
  von?: string | number
  bis?: string | number
  page?: number
}): Promise<ArchiveSearchResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (params.rolle) query.set('rolle', params.rolle)
  if (params.gruppe) query.set('gruppe', String(params.gruppe))
  if (params.von) query.set('von', String(params.von))
  if (params.bis) query.set('bis', String(params.bis))
  if (params.page && params.page > 1) query.set('page', String(params.page))

  const response = await fetch(
    `${API_BASE_URL}/api/v1/archiv${query.toString() ? `?${query.toString()}` : ''}`,
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<ArchiveSearchResponse>
}

/**
 * Gibt alle Fansub-Gruppen für den Gruppen-Filter der Archiv-Seite zurück.
 * Kein Auth erforderlich (GET /api/v1/fansubs ist öffentlich, D-14).
 * Alias für getFansubList ohne Parameter für den Gruppen-Filter-Dropdown.
 */
export async function getFansubs(): Promise<FansubGroupListResponse> {
  return getFansubList()
}

// ---------------------------------------------------------------------------
// Phase 109 — Punkte-Rangliste (member-point-ranking)
// ---------------------------------------------------------------------------

export interface MemberPointRankingRow {
  member_id: number
  display_name: string
  slug: string | null
  total_points: number
}

export interface MemberPointRankingResponse {
  data: MemberPointRankingRow[]
  total: number
  page: number
}

/**
 * Liest die persistierte Punkte-Rangliste (Member -> Netto-Gesamtpunkte,
 * absteigend sortiert, seitenweise). Keine Auth erforderlich — oeffentlicher
 * Endpunkt (analog searchArchive). Kein UI-Konsument in
 * Phase 109 (D-03/D-04, deferred nach Phase 110).
 */
export async function getMemberPointRanking(page?: number): Promise<MemberPointRankingResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (page && page > 1) query.set('page', String(page))

  const response = await fetch(
    `${API_BASE_URL}/api/v1/member-point-ranking${query.toString() ? `?${query.toString()}` : ''}`,
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<MemberPointRankingResponse>
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

/**
 * Read-only Vorschau der Rechte-Auswirkung einer hypothetischen Capability-Vergabe/-Entziehung
 * für EINE Aktion auf EINER Rolle, über ALLE aktuellen echten Rolleninhaber dieser Rolle hinweg
 * (Plan 138-07 Backend / Plan 138-13 Frontend-Verdrahtung, CAP-09). Persistiert nichts und steht
 * vor grantRoleCapability/revokeRoleCapability -- D-18/D-20: keine Mutation ohne berechnete
 * Vorschau. `authorizedFetch`-Konvention (matcht grantRoleCapability/revokeRoleCapability in
 * diesem 9700er-Block, 138-PATTERNS.md).
 * GET /api/v1/admin/role-capabilities/:roleCode/:actionCode/impact-preview?add=true|false
 */
export async function getRoleCapabilityImpactPreview(
  roleCode: string,
  actionCode: string,
  add: boolean,
): Promise<CapabilityOverrideImpactPreview> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/role-capabilities/${encodeURIComponent(roleCode)}/${encodeURIComponent(actionCode)}/impact-preview?add=${add}`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    )
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    )
  }

  const payload = (await response.json()) as { data: CapabilityOverrideImpactPreview }
  return payload.data
}

/** Lädt die drei spezialisierten Prüf-/Freigabe-Rechte einer Gruppenmitgliedschaft. */
export async function getReviewDelegations(
  fansubGroupId: number,
  appUserId: number,
): Promise<ReviewDelegationRow[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/review-delegations`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: ReviewDelegationRow[] }
  return resp.data
}

/** Setzt den gewünschten Grant-Status für ein spezialisiertes Prüf-/Freigabe-Recht. */
export async function mutateReviewDelegation(
  fansubGroupId: number,
  appUserId: number,
  body: ReviewDelegationMutationRequest,
): Promise<ReviewDelegationMutationResult> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/review-delegations`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: ReviewDelegationMutationResult }
  return resp.data
}

// setMemberMemorial markiert ein Member-Profil als Gedenkprofil (profile_status='memorial').
// Nur Global Admin. Analoges Muster zu submitMemberClaim (authorizedFetch).
// POST /api/v1/admin/members/:id/memorial

// ─── Release-Review-Workspace (Phase 107.1) ────────────────────────────────

function buildReleaseReviewQuery(
  params: ReleaseReviewListParams | ReleaseReviewCountParams,
  includePage: boolean,
): string {
  const query = new URLSearchParams();
  query.set("view", params.view ?? "open");
  if (params.animeId != null && params.animeId > 0) {
    query.set("anime_id", String(params.animeId));
  }
  if (params.releaseVersionId != null && params.releaseVersionId > 0) {
    query.set("release_version_id", String(params.releaseVersionId));
  }
  const search = params.search?.trim();
  if (search) query.set("search", search);

  if (includePage) {
    const page = params as ReleaseReviewListParams;
    if (page.type) query.set("type", page.type);
    if (page.category) query.set("category", page.category);
    if (page.cursor) query.set("cursor", page.cursor);
    query.set("limit", String(Math.min(50, Math.max(1, page.limit ?? 50))));
  }

  return query.toString();
}

async function parseReleaseReviewResponse<T>(
  response: Response,
): Promise<T> {
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
  return response.json() as Promise<T>;
}

export async function listReleaseReviews(
  fansubId: number,
  params: ReleaseReviewListParams = {},
): Promise<ReleaseReviewQueueResponse> {
  const query = buildReleaseReviewQuery(params, true);
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews?${query}`,
    { cache: "no-store", signal: params.signal },
  );
  return parseReleaseReviewResponse<ReleaseReviewQueueResponse>(response);
}

export async function getReleaseReviewCounts(
  fansubId: number,
  params: ReleaseReviewCountParams = {},
): Promise<ReleaseReviewCountsResponse> {
  const query = buildReleaseReviewQuery(params, false);
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/counts?${query}`,
    { cache: "no-store", signal: params.signal },
  );
  return parseReleaseReviewResponse<ReleaseReviewCountsResponse>(response);
}

export async function getReleaseReview(
  fansubId: number,
  reviewId: string,
  signal?: AbortSignal,
): Promise<ReleaseReviewDetailResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/${encodeURIComponent(reviewId)}`,
    { cache: "no-store", signal },
  );
  return parseReleaseReviewResponse<ReleaseReviewDetailResponse>(response);
}

export async function getNextReleaseReview(
  fansubId: number,
  reviewId: string,
): Promise<ReleaseReviewNextResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/${encodeURIComponent(reviewId)}/next`,
    { cache: "no-store" },
  );
  return parseReleaseReviewResponse<ReleaseReviewNextResponse>(response);
}

export async function decideReleaseReview(
  fansubId: number,
  reviewId: string,
  request: ReleaseReviewDecisionRequest,
): Promise<ReleaseReviewDecisionResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/${encodeURIComponent(reviewId)}/decision`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return parseReleaseReviewResponse<ReleaseReviewDecisionResponse>(response);
}

