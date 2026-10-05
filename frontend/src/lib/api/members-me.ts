// 174-07: self-service "/me" member functions triaged out of api.ts's
// "other/unclear" bucket. Split from members.ts (public/admin member reads
// and member-claim workflow) to stay under the 450-line budget -- this file
// is the authenticated member's own badges/memberships/profile-settings/
// correction-report surface, confirmed via grep call-site evidence
// (frontend/src/app/me/profile/page.tsx, frontend/src/app/me/dashboard/
// components/DashboardMetrics.tsx, frontend/src/app/me/contributions/
// page.tsx, frontend/src/components/profile/CorrectionReportModal.tsx).
import type {
  MemberBadgesResponse,
  MembershipsResponse,
} from "@/types/contributions";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
} from "./client";

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
