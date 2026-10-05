import type { OwnDashboardResponse } from "@/types/dashboard";
import type { MeProjectDetailResponse } from "@/types/contributions";
import type {
  ProjectMemberMediaItem,
  ProjectMemberNote,
  ProjectMemberSummary,
} from "@/types/projectMember";
import type { CursorPage } from "@/types/releaseDetail";
import type {
  AnimeFansubProjectTimeline,
  UpdateAnimeFansubProjectTimelineRequest,
} from "@/types/fansubNotes";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
} from "./client";

export async function getOwnDashboard(
  authToken?: string,
): Promise<OwnDashboardResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/dashboard`,
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

  return response.json() as Promise<OwnDashboardResponse>;
}

export async function getMyProjectDetail(
  animeId: number,
  fansubGroupId: number,
): Promise<MeProjectDetailResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/projects/${animeId}?fansub_group_id=${fansubGroupId}`,
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

  return response.json() as Promise<MeProjectDetailResponse>;
}

// --- Phase 122: Oeffentliche Projekt-Member-Seite (Member × Fansubgruppe × Anime) ---
// Summary und cursor-faehige, abbrechbare Notizen-/Medien-Helper ueber den zentralen API-Client.

export interface ProjectMemberListOpts {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

function buildProjectMemberListURL(
  base: string,
  animeID: number,
  groupID: number,
  memberSlug: string,
  sub: "notes" | "media",
  opts: ProjectMemberListOpts,
): string {
  const query = new URLSearchParams();
  if (opts.cursor) query.set("cursor", opts.cursor);
  if (opts.limit) query.set("limit", String(opts.limit));
  const qs = query.toString();
  return `${base}/api/v1/anime/${animeID}/group/${groupID}/members/${encodeURIComponent(memberSlug)}/${sub}${qs ? `?${qs}` : ""}`;
}

export async function getProjectMemberSummary(
  animeID: number,
  groupID: number,
  memberSlug: string,
  signal?: AbortSignal,
): Promise<ProjectMemberSummary> {
  const url = `/api/v1/anime/${animeID}/group/${groupID}/members/${encodeURIComponent(memberSlug)}`;
  const response = await apiClientFetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<ProjectMemberSummary>;
}

export async function getProjectMemberNotes(
  animeID: number,
  groupID: number,
  memberSlug: string,
  opts: ProjectMemberListOpts = {},
): Promise<CursorPage<ProjectMemberNote>> {
  const url = buildProjectMemberListURL("", animeID, groupID, memberSlug, "notes", opts);
  const response = await apiClientFetch(url, { cache: "no-store", signal: opts.signal });
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<CursorPage<ProjectMemberNote>>;
}

export async function getProjectMemberMedia(
  animeID: number,
  groupID: number,
  memberSlug: string,
  opts: ProjectMemberListOpts = {},
): Promise<CursorPage<ProjectMemberMediaItem>> {
  const url = buildProjectMemberListURL("", animeID, groupID, memberSlug, "media", opts);
  const response = await apiClientFetch(url, { cache: "no-store", signal: opts.signal });
  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<CursorPage<ProjectMemberMediaItem>>;
}

type RawAnimeFansubProjectTimeline = {
  anime_id: number;
  fansub_group_id: number;
  production_started_on: string | null;
  production_completed_on: string | null;
};

function mapAnimeFansubProjectTimeline(raw: RawAnimeFansubProjectTimeline): AnimeFansubProjectTimeline {
  return {
    animeId: raw.anime_id,
    fansubGroupId: raw.fansub_group_id,
    productionStartedOn: raw.production_started_on,
    productionCompletedOn: raw.production_completed_on,
  };
}

export async function getAnimeFansubProjectTimeline(
  fansubId: number,
  animeId: number,
): Promise<AnimeFansubProjectTimeline> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/timeline`,
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  const json = (await response.json()) as { data: RawAnimeFansubProjectTimeline };
  return mapAnimeFansubProjectTimeline(json.data);
}

export async function updateAnimeFansubProjectTimeline(
  fansubId: number,
  animeId: number,
  data: UpdateAnimeFansubProjectTimelineRequest,
): Promise<AnimeFansubProjectTimeline> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/timeline`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        production_started_on: data.productionStartedOn,
        production_completed_on: data.productionCompletedOn,
      }),
    },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  const json = (await response.json()) as { data: RawAnimeFansubProjectTimeline };
  return mapAnimeFansubProjectTimeline(json.data);
}
