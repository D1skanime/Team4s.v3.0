import type {
  MemberClaimRow,
  MemberProfileResponse,
  MemberRequestRow,
  PublicMemberProfileResponse,
  PublicMemberProjectsResponse,
  PublicMemberViewer,
  UpdateMemberProfileRequest,
} from "@/types/profile";
import type { DefaultCrewEntry } from "@/types/fansub";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
} from "./client";

export async function getOwnProfile(
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/profile`, {
    cache: "no-store",
    authToken,
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

  return response.json() as Promise<MemberProfileResponse>;
}

export async function getMemberProfile(
  slug: string,
  signal?: AbortSignal,
): Promise<PublicMemberProfileResponse> {
  const encodedSlug = encodeURIComponent(slug);
  const response = await apiClientFetch(
    `/api/v1/members/${encodedSlug}`,
    { cache: "no-store", signal },
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

  return response.json() as Promise<PublicMemberProfileResponse>;
}

export async function getMemberViewerAccess(
  slug: string,
  signal?: AbortSignal,
): Promise<{ viewer: PublicMemberViewer }> {
  const encodedSlug = encodeURIComponent(slug);
  const response = await apiClientFetch(
    `/api/v1/members/${encodedSlug}/viewer`,
    { cache: "no-store", signal },
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

  return response.json() as Promise<{ viewer: PublicMemberViewer }>;
}

export async function getMemberProjects(
  slug: string,
  limit = 6,
  offset = 0,
  signal?: AbortSignal,
): Promise<PublicMemberProjectsResponse> {
  const encodedSlug = encodeURIComponent(slug);
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await apiClientFetch(
    `/api/v1/members/${encodedSlug}/projects?${params.toString()}`,
    { cache: "no-store", signal },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<PublicMemberProjectsResponse>;
}

export async function getMyMemberClaim(
  authToken?: string,
): Promise<MemberClaimRow | null> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-claim`,
    {
      cache: "no-store",
      authToken,
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

  const payload = (await response.json()) as { data: MemberClaimRow };
  return payload.data;
}

export async function submitMemberClaim(
  payload: { member_id: number; note?: string },
  authToken?: string,
): Promise<MemberClaimRow> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-claims`,
    {
      method: "POST",
      authToken,
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

  const body = (await response.json()) as { data: MemberClaimRow };
  return body.data;
}

export async function submitMemberRequest(
  payload: { note?: string },
  authToken?: string,
): Promise<MemberRequestRow> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-requests`,
    {
      method: "POST",
      authToken,
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

  const body = (await response.json()) as { data: MemberRequestRow };
  return body.data;
}

export async function updateOwnProfile(
  payload: UpdateMemberProfileRequest,
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/profile`, {
    method: "PUT",
    authToken,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

  return response.json() as Promise<MemberProfileResponse>;
}

export async function listDefaultCrew(
  fansubId: number,
  authToken?: string,
): Promise<DefaultCrewEntry[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew`,
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

  const body = await response.json() as { data: DefaultCrewEntry[] };
  return body.data;
}

export async function upsertDefaultCrewEntry(
  fansubId: number,
  memberID: number,
  roleCode: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew`,
    {
      method: "PUT",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberID, role_code: roleCode }),
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

export async function deleteDefaultCrewEntry(
  fansubId: number,
  memberID: number,
  roleCode: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew/${memberID}/${roleCode}`,
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

export async function applyDefaultCrew(
  fansubId: number,
  animeIds?: number[],
  authToken?: string,
): Promise<{ applied_count: number }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew/apply`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_ids: animeIds ?? [] }),
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

  return response.json() as Promise<{ applied_count: number }>;
}

export async function setMemberMemorial(
  memberId: number,
  authToken?: string,
): Promise<{ member_id: number; profile_status: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/members/${memberId}/memorial`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  const body = (await response.json()) as {
    data: { member_id: number; profile_status: string };
  };
  return body.data;
}
