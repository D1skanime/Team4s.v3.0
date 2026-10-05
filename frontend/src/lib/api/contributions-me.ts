// D-24 sub-split (see contributions-admin.ts): member-authored contribution
// mutations, suggestions, proposals, and public anime/fansub contribution
// reads.
import type {
  MeAnimeContributionsResponse,
  MeSuggestionsResponse,
  ProposalFormData,
  PublicAnimeContributionsResponse,
  PublicGroupContributionsResponse,
} from "@/types/contributions";
import type { PaginatedAnimeResponse } from "@/types/anime";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  authorizedUploadXhr,
  getApiBaseUrl,
  parseApiErrorPayload,
} from "./client";
import { getAnimeList } from "./fansubs-core";

export async function getMyAnimeContributions(): Promise<MeAnimeContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions`,
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

  return response.json() as Promise<MeAnimeContributionsResponse>;
}

export async function patchAnimeContributionVisibility(
  contributionId: number,
  isPublic: boolean,
  roleCode?: string,
): Promise<{ contribution_id: number }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/visibility`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_public_on_member_profile: isPublic,
        ...(roleCode ? { role_code: roleCode } : {}),
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

  return response.json() as Promise<{ contribution_id: number }>;
}

export async function confirmAnimeContribution(
  contributionId: number,
): Promise<void> {
  // Bestätigen setzt den Status der Contribution auf 'confirmed' (Backend aktiviert
  // zusätzlich die Profil-Sichtbarkeit).
  const response = await apiClientFetch(
    `/api/v1/me/anime-contributions/${contributionId}/confirm`,
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

export async function rejectAnimeContribution(
  contributionId: number,
): Promise<void> {
  // Ablehnen setzt den Status auf 'disputed' und entzieht die Profil-Sichtbarkeit
  // (Eintrag bleibt intern erhalten).
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/reject`,
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

export async function rejectAnimeContributionWithReason(
  contributionId: number,
  memberReason: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_reason: memberReason }),
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

export interface SubmitSuggestionBody {
  suggestion_type: "error_report" | "story" | "media";
  target_type: "anime" | "contribution" | "fansub_group" | "member";
  target_id: number;
  content_text?: string | null;
}

export async function submitSuggestion(
  body: SubmitSuggestionBody,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/suggestions`,
    {
      method: "POST",
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

export async function getMySuggestions(): Promise<MeSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/suggestions`,
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

  return response.json() as Promise<MeSuggestionsResponse>;
}

// 174-06: relocated from api.ts's media/assets bucket (not a generic
// "media.ts" upload -- target_type/target_id/category are member-suggestion
// fields, same shape as submitSuggestion/getMySuggestions above, and its
// sole call site is ReportFormMedia.tsx's member-authored report flow).
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

export async function searchAnimeForProposal(
  query: string,
): Promise<PaginatedAnimeResponse> {
  return getAnimeList(
    { q: query, per_page: 8 },
    { cache: "no-store" },
  );
}

export async function createContributionProposal(
  body: ProposalFormData,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/contribution-proposals`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

export async function selfPublishContribution(
  contributionId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/self-publish`,
    { method: "POST", authToken },
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

export async function getFansubContributions(
  fansubID: number,
): Promise<PublicGroupContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/contributions`,
    { next: { revalidate: 60 } },
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

  return response.json() as Promise<PublicGroupContributionsResponse>;
}

export async function getAnimeContributions(
  animeID: number,
): Promise<PublicAnimeContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/contributions`,
    { next: { revalidate: 60 } },
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

  return response.json() as Promise<PublicAnimeContributionsResponse>;
}
