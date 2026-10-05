import {
  CommentCreateRequest,
  CommentCreateResponse,
} from "@/types/comment";
import {
  FansubGroupListResponse,
} from "@/types/fansub";
import {
  PaginatedWatchlistResponse,
  WatchlistCreateResponse,
} from "@/types/watchlist";
import {
  EpisodeReleaseSummary,
} from "@/types/group";
import {
  MemberGroupStory,
} from "@/types/fansubNotes";
import type {
  MemberBadgesResponse,
  MembershipsResponse,
  FansubAnimeReleaseVersionsResponse,
} from "@/types/contributions";
import type { DomainProjectionResponse } from "@/types/domain-projection";
import type {
  AdminClaimsListParams,
  AdminClaimsListResponse,
  AdminChangesListParams,
  AdminChangesListResponse,
} from "@/types/admin-users";
import type {
  ReleaseDetailResponse,
  CursorPage,
  ReleaseImagesCursorPage,
} from "@/types/releaseDetail";
import {
  ApiError,
  apiClientFetch,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
  withAuthHeader,
} from "./api/client";
import { getFansubList } from "./api/fansubs-core";
import { buildCursorQuery, mapMemberGroupStory } from "./api/history";
import type { CursorQueryOpts, RawMemberGroupStory } from "./api/history";

export * from "./api/client";
export * from "./api/admin/anime-core";
export * from "./api/admin/anime-jellyfin";
export * from "./api/admin/anime-relations";
export * from "./api/admin/anime-themes";
export * from "./api/admin/anime-taxonomy";
export * from "./api/admin/anime-release-assets";
export * from "./api/admin/anime-assets";
export * from "./api/admin/fansub-media";
export * from "./api/admin/segment-assets";
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
export * from "./api/members-media";
export * from "./api/projects";
export * from "./api/contributions-admin";
export * from "./api/contributions-me";
export * from "./api/releases";
export * from "./api/media";
export * from "./api/auth";
export * from "./api/permissions";
export * from "./api/reviews";
export * from "./api/history";
export * from "./api/search";

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
