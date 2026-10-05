// D-24 sub-split: the 174-04 "contributions/suggestions/proposals" bucket
// (21 functions) would exceed the 450-line budget as a single
// contributions.ts, so it is split by sub-concern (admin-side CRUD/proposal
// review vs. me-side/public reads, see contributions-me.ts).
import type { GroupContributorsResponse } from "@/types/groupContributors";
import type {
  AnimeContributionListResponse,
  AnimeContributionResponse,
  EffectiveContributionsResponse,
  UpsertAnimeContributionRequest,
} from "@/types/fansub";
import type {
  FansubAnimeReleaseVersionsResponse,
  GroupProposalsResponse,
} from "@/types/contributions";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
} from "./client";

export async function getGroupContributors(
  animeID: number,
  groupID: number,
): Promise<GroupContributorsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/contributors`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupContributorsResponse>;
}

// --- Anime-Coverage-Aggregat ---

/** Aggregationsdaten für ein einzelnes Anime einer Fansub-Gruppe:
 * Anzahl DISTINCT Mitwirkender und abgedeckte Rollencodes (Gap-82-07). */
export interface AnimeCoverage {
  anime_id: number
  member_count: number
  covered_role_codes: string[]
  has_project_note: boolean
  has_first_release: boolean
  qualified_release_count: number
  has_completed_project: boolean
  has_collaboration: boolean
}

export interface AnimeCoverageListResponse {
  data: AnimeCoverage[]
}

/** Lädt das Coverage-Aggregat für alle Anime einer Fansub-Gruppe (ein Call, kein N+1).
 * Verwendet authorizedFetch (D-14). */

export async function getAnimeCoverage(
  fansubId: number,
  authToken?: string,
): Promise<AnimeCoverageListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime-coverage`,
    { authToken },
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

  return response.json() as Promise<AnimeCoverageListResponse>;
}

export async function listAnimeContributions(
  fansubId: number,
  animeId: number,
  authToken?: string,
): Promise<AnimeContributionListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/contributions`,
    { authToken },
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

  return response.json() as Promise<AnimeContributionListResponse>;
}

export async function upsertAnimeContribution(
  fansubId: number,
  animeId: number,
  body: UpsertAnimeContributionRequest,
  authToken?: string,
): Promise<AnimeContributionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/contributions`,
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

  return response.json() as Promise<AnimeContributionResponse>;
}

export async function deleteAnimeContribution(
  fansubId: number,
  animeId: number,
  contributionId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/contributions/${contributionId}`,
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

export async function listEffectiveContributionsForVersion(
  releaseVersionId: number,
  fansubGroupId: number,
  authToken?: string,
): Promise<EffectiveContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${releaseVersionId}/contributions/effective?fansub_group_id=${fansubGroupId}`,
    { authToken },
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

  return response.json() as Promise<EffectiveContributionsResponse>;
}

export async function listGroupProposals(
  fansubId: number,
  authToken?: string,
): Promise<GroupProposalsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/contribution-proposals`,
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

  return response.json() as Promise<GroupProposalsResponse>;
}

export async function confirmProposal(
  fansubId: number,
  cid: number,
): Promise<void> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/contribution-proposals/${cid}/confirm`,
    { method: "POST" },
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

export async function rejectProposal(
  fansubId: number,
  cid: number,
  note?: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/contribution-proposals/${cid}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_note: note ?? null }),
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
