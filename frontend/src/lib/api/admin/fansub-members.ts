// D-24 cohesion exception: this file is ~750 lines, above the project's 450-line
// guideline. The plan (174-03-PLAN.md) locks "admin fansub app members/invitations/
// claims" as a single artifact (frontend/src/lib/api/admin/fansub-members.ts) rather
// than offering a sub-split option (unlike the admin-anime bucket in the same plan).
// The 23 functions here form one cohesive domain — the fansub-app-member lifecycle
// (membership, role/status/media-permission updates, invitations, member-claim
// verification) — that all share the same `/api/v1/admin/fansubs/:id/...` resource
// family and the same verbatim-relocation discipline 174-02 established for client.ts.
import type { ClaimActivationImpactPreview } from "@/types/admin-capability";
import type {
  AcceptFansubInvitationRequest,
  AcceptFansubInvitationResponse,
  FansubAppMemberCandidateSearchResponse,
  FansubAppMemberCreateRequest,
  FansubAppMemberListResponse,
  FansubAppMemberMediaPermissionsUpdateRequest,
  FansubAppMemberResponse,
  FansubAppMemberRoleUpdateRequest,
  FansubAppMemberStatusUpdateRequest,
  FansubGroupCapabilitiesResponse,
  FansubGroupInvitationCreateRequest,
  FansubGroupInvitationCreateResponse,
  FansubGroupInvitationListResponse,
  FansubGroupInvitationResponse,
  FansubLeadUpdateRequest,
} from "@/types/fansub";
import type {
  GenerateClaimInvitationResponse,
  MemberClaimInvitationResponse,
  MemberClaimRow,
  MemberRequestRow,
} from "@/types/profile";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function getClaimActivationImpactPreview(
  fansubGroupId: number,
  memberId: number,
): Promise<ClaimActivationImpactPreview> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/historical-members/${memberId}/claim-activation-impact`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  const payload = (await response.json()) as { data: ClaimActivationImpactPreview };
  return payload.data;
}

export async function listFansubAppMembers(
  fansubId: number,
  authToken?: string,
): Promise<FansubAppMemberListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members`,
    {
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

  return response.json() as Promise<FansubAppMemberListResponse>;
}

export async function searchFansubAppMemberCandidates(
  fansubId: number,
  query: string,
  authToken?: string,
): Promise<FansubAppMemberCandidateSearchResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("q", query);

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-member-candidates?${params.toString()}`,
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

  return response.json() as Promise<FansubAppMemberCandidateSearchResponse>;
}

export async function getFansubGroupCapabilities(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupCapabilitiesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/capabilities`,
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

  return response.json() as Promise<FansubGroupCapabilitiesResponse>;
}

export async function createFansubAppMember(
  fansubId: number,
  payload: FansubAppMemberCreateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members`,
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function listFansubGroupInvitations(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupInvitationListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/invitations`,
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

  return response.json() as Promise<FansubGroupInvitationListResponse>;
}

export async function createFansubGroupInvitation(
  fansubId: number,
  payload: FansubGroupInvitationCreateRequest,
  authToken?: string,
): Promise<FansubGroupInvitationCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/invitations`,
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

  return response.json() as Promise<FansubGroupInvitationCreateResponse>;
}

export async function cancelFansubGroupInvitation(
  fansubId: number,
  invitationId: number,
  authToken?: string,
): Promise<FansubGroupInvitationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/invitations/${invitationId}/cancel`,
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
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<FansubGroupInvitationResponse>;
}

export async function acceptFansubInvitation(
  payload: AcceptFansubInvitationRequest,
  authToken?: string,
): Promise<AcceptFansubInvitationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/invitations/accept`,
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

  return response.json() as Promise<AcceptFansubInvitationResponse>;
}

export async function acceptClaimInvitation(
  payload: { token: string },
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/claim-invitations/accept`,
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
}

export async function generateClaimInvitation(
  fansubId: number,
  memberId: number,
  authToken?: string,
): Promise<GenerateClaimInvitationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}/claim-invitations`,
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
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const payload = (await response.json()) as {
    data: GenerateClaimInvitationResponse;
  };
  return payload.data;
}

export async function listClaimInvitations(
  fansubId: number,
  memberId: number,
  authToken?: string,
): Promise<MemberClaimInvitationResponse[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}/claim-invitations`,
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

  const payload = (await response.json()) as {
    data: MemberClaimInvitationResponse[];
  };
  return payload.data;
}

export async function cancelClaimInvitation(
  fansubId: number,
  memberId: number,
  invitationId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}/claim-invitations/${invitationId}/cancel`,
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
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

export async function listPendingMemberClaims(
  fansubId: number,
  authToken?: string,
): Promise<MemberClaimRow[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-claims`,
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

  const payload = (await response.json()) as { data: MemberClaimRow[] };
  return payload.data;
}

export async function verifyMemberClaim(
  fansubId: number,
  claimId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-claims/${claimId}/verify`,
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
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

export async function rejectMemberClaim(
  fansubId: number,
  claimId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-claims/${claimId}/reject`,
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
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

export async function listMemberRequests(
  authToken?: string,
): Promise<MemberRequestRow[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/member-requests`,
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

  const payload = (await response.json()) as { data: MemberRequestRow[] };
  return payload.data;
}

export async function approveMemberRequest(
  requestId: number,
  payload: { nickname: string },
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/member-requests/${requestId}/approve`,
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
}

export async function rejectMemberRequest(
  requestId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/member-requests/${requestId}/reject`,
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
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

export async function updateFansubLeadRole(
  fansubId: number,
  appUserId: number,
  payload: FansubLeadUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/roles/fansub-lead`,
    {
      method: "PUT",
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function updateFansubAppMemberRole(
  fansubId: number,
  appUserId: number,
  payload: FansubAppMemberRoleUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/roles`,
    {
      method: "PUT",
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function updateFansubAppMemberStatus(
  fansubId: number,
  appUserId: number,
  payload: FansubAppMemberStatusUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/status`,
    {
      method: "PUT",
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function updateFansubAppMemberMediaPermissions(
  fansubId: number,
  appUserId: number,
  payload: FansubAppMemberMediaPermissionsUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/media-permissions`,
    {
      method: "PUT",
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

  return response.json() as Promise<FansubAppMemberResponse>;
}
