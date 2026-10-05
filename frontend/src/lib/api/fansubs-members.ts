// D-24 sub-split (see fansubs-core.ts): fansub member CRUD, including the
// unified/hist group-member listing and generic group-member CRUD.
import type {
  CreateGroupMemberRequest,
  FansubMemberCreateRequest,
  FansubMemberListResponse,
  FansubMemberPatchRequest,
  FansubMemberResponse,
  HistFansubGroupMemberListResponse,
  HistFansubGroupMemberResponse,
  UnifiedGroupMember,
  UpdateGroupMemberRequest,
} from "@/types/fansub";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
  withAuthHeader,
} from "./client";

export async function getFansubMembers(
  fansubID: number,
): Promise<FansubMemberListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/members`,
    {
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

  return response.json() as Promise<FansubMemberListResponse>;
}

export async function createFansubMember(
  fansubID: number,
  payload: FansubMemberCreateRequest,
  authToken?: string,
): Promise<FansubMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/members`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<FansubMemberResponse>;
}

export async function updateFansubMember(
  fansubID: number,
  memberID: number,
  payload: FansubMemberPatchRequest,
  authToken?: string,
): Promise<FansubMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/members/${memberID}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<FansubMemberResponse>;
}

export async function deleteFansubMember(
  fansubID: number,
  memberID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/members/${memberID}`,
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

export async function listGroupMembers(
  fansubId: number,
  authToken?: string,
): Promise<HistFansubGroupMemberListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members`,
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

  return response.json() as Promise<HistFansubGroupMemberListResponse>;
}

export async function listUnifiedGroupMembers(
  fansubId: number,
  authToken?: string,
): Promise<UnifiedGroupMember[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/unified-members`,
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

  const body = await response.json() as { data: UnifiedGroupMember[] };
  return body.data;
}

export async function createGroupMember(
  fansubId: number,
  body: CreateGroupMemberRequest,
  authToken?: string,
): Promise<HistFansubGroupMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members`,
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

  return response.json() as Promise<HistFansubGroupMemberResponse>;
}

export async function updateGroupMember(
  fansubId: number,
  memberId: number,
  body: UpdateGroupMemberRequest,
  authToken?: string,
): Promise<HistFansubGroupMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}`,
    {
      method: "PATCH",
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

  return response.json() as Promise<HistFansubGroupMemberResponse>;
}

export async function deleteGroupMember(
  fansubId: number,
  memberId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}`,
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
