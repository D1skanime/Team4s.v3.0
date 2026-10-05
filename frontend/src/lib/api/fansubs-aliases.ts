// D-24 sub-split (see fansubs-core.ts): fansub alias and external-link CRUD.
import type {
  FansubAliasCreateRequest,
  FansubAliasListResponse,
  FansubAliasReassignRequest,
  FansubAliasResponse,
  FansubGroupLinkCreateRequest,
  FansubGroupLinkListResponse,
  FansubGroupLinkPatchRequest,
  FansubGroupLinkResponse,
} from "@/types/fansub";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
  withAuthHeader,
} from "./client";

export async function getFansubAliases(
  fansubID: number,
): Promise<FansubAliasListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases`,
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

  return response.json() as Promise<FansubAliasListResponse>;
}

export async function createFansubAlias(
  fansubID: number,
  payload: FansubAliasCreateRequest,
  authToken?: string,
): Promise<FansubAliasResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases`,
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

  return response.json() as Promise<FansubAliasResponse>;
}

export async function deleteFansubAlias(
  fansubID: number,
  aliasID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases/${aliasID}`,
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

export async function reassignFansubAlias(
  fansubID: number,
  aliasID: number,
  payload: FansubAliasReassignRequest,
  authToken?: string,
): Promise<FansubAliasResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases/${aliasID}/reassign`,
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

  return response.json() as Promise<FansubAliasResponse>;
}

export async function getFansubLinks(
  fansubID: number,
  authToken?: string,
): Promise<FansubGroupLinkListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/links`,
    {
      headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<FansubGroupLinkListResponse>;
}

export async function createFansubLink(
  fansubID: number,
  payload: FansubGroupLinkCreateRequest,
  authToken?: string,
): Promise<FansubGroupLinkResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/links`,
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

  return response.json() as Promise<FansubGroupLinkResponse>;
}

export async function updateFansubLink(
  fansubID: number,
  linkID: number,
  payload: FansubGroupLinkPatchRequest,
  authToken?: string,
): Promise<FansubGroupLinkResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/links/${linkID}`,
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

  return response.json() as Promise<FansubGroupLinkResponse>;
}

export async function deleteFansubLink(
  fansubID: number,
  linkID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/links/${linkID}`,
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
