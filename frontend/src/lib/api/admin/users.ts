import type {
  AdminUserAuditResponse,
  AdminUserContributionsPage,
  AdminUserContributionsParams,
  AdminUserGlobalRolesResponse,
  AdminUserGroupMembershipsResponse,
  AdminUserGroupRightsResponse,
  AdminUserListParams,
  AdminUserListResponse,
  AdminUserMediaPage,
  AdminUserMediaParams,
  AdminUserMemberClaimsResponse,
  AdminUserOverviewResponse,
  AdminUserRightsSummaryPage,
} from "@/types/admin-users";
import type { AppUserListResponse } from "@/types/fansub";
import {
  apiClientFetch,
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function listAdminUsers(
  authToken?: string,
): Promise<AppUserListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/admin/users`, {
    headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<AppUserListResponse>;
}

export async function listAdminUsersPage(
  params: AdminUserListParams,
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.global_role) query.set("global_role", params.global_role);
  if (params.has_conflicts) query.set("has_conflicts", "true");
  if (params.sort) query.set("sort", params.sort);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const response = await apiClientFetch(
    `/api/v1/admin/users?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserListResponse>;
}

export async function getAdminUserOverview(
  userId: number,
): Promise<AdminUserOverviewResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/overview`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserOverviewResponse>;
}

export async function getAdminUserGlobalRoles(
  userId: number,
): Promise<AdminUserGlobalRolesResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/global-roles`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserGlobalRolesResponse>;
}

export async function assignAdminUserGlobalRole(
  userId: number,
  role: string,
): Promise<void> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/global-roles/${encodeURIComponent(role)}`,
    { method: "PUT", cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
}

export async function revokeAdminUserGlobalRole(
  userId: number,
  role: string,
): Promise<void> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/global-roles/${encodeURIComponent(role)}`,
    { method: "DELETE", cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
}

export async function updateAdminUserStatus(
  userId: number,
  status: "active" | "disabled",
): Promise<void> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/status`,
    {
      method: "PUT",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
}

export async function getAdminUserMemberClaims(
  userId: number,
): Promise<AdminUserMemberClaimsResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/member-claims`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserMemberClaimsResponse>;
}

export async function getAdminUserGroupMemberships(
  userId: number,
  limit?: number,
  offset?: number,
): Promise<AdminUserGroupMembershipsResponse> {
  const query = new URLSearchParams();
  if (limit != null) query.set("limit", String(limit));
  if (offset != null) query.set("offset", String(offset));
  const queryString = query.toString();
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/group-memberships${queryString ? `?${queryString}` : ""}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserGroupMembershipsResponse>;
}

export async function getAdminUserRightsSummary(
  userId: number,
  limit?: number,
  offset?: number,
): Promise<AdminUserRightsSummaryPage> {
  const query = new URLSearchParams();
  if (limit != null) query.set("limit", String(limit));
  if (offset != null) query.set("offset", String(offset));
  const queryString = query.toString();
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/rights-summary${queryString ? `?${queryString}` : ""}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserRightsSummaryPage>;
}

export async function getAdminUserGroupRights(
  userId: number,
): Promise<AdminUserGroupRightsResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/group-rights`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserGroupRightsResponse>;
}

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toRangeStartRFC3339(value: string): string {
  return ISO_DATE_ONLY_PATTERN.test(value) ? `${value}T00:00:00Z` : value;
}

function toRangeEndRFC3339(value: string): string {
  return ISO_DATE_ONLY_PATTERN.test(value) ? `${value}T23:59:59.999Z` : value;
}

export async function getAdminUserContributions(
  userId: number,
  params: AdminUserContributionsParams = {},
): Promise<AdminUserContributionsPage> {
  const query = new URLSearchParams();
  if (params.anime_id != null) query.set("anime_id", String(params.anime_id));
  if (params.fansub_group_id != null) query.set("fansub_group_id", String(params.fansub_group_id));
  if (params.role_code) query.set("role_code", params.role_code);
  if (params.only_deviations) query.set("only_deviations", "true");
  if (params.from) query.set("from", toRangeStartRFC3339(params.from));
  if (params.to) query.set("to", toRangeEndRFC3339(params.to));
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/contributions?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserContributionsPage>;
}

export async function getAdminUserMedia(
  userId: number,
  params: AdminUserMediaParams = {},
): Promise<AdminUserMediaPage> {
  const query = new URLSearchParams();
  if (params.anime_id != null) query.set("anime_id", String(params.anime_id));
  if (params.fansub_group_id != null) query.set("fansub_group_id", String(params.fansub_group_id));
  if (params.release_version_id != null) {
    query.set("release_version_id", String(params.release_version_id));
  }
  if (params.media_type) query.set("media_type", params.media_type);
  if (params.from) query.set("from", toRangeStartRFC3339(params.from));
  if (params.to) query.set("to", toRangeEndRFC3339(params.to));
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/media?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserMediaPage>;
}

export async function getAdminUserAudit(
  userId: number,
): Promise<AdminUserAuditResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/audit`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserAuditResponse>;
}
