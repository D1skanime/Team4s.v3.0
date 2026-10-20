// D-24 sub-split (see fansubs-core.ts): fansub group CRUD, merge, group
// detail/releases/assets/themes projections, and anime<->fansub attach/detach.
import type {
  AnimeFansubListResponse,
  FansubGroupCreateRequest,
  FansubGroupPatchRequest,
  FansubGroupResponse,
} from "@/types/fansub";
import type {
  GroupAssetsResponse,
} from "@/types/groupAsset";
import type {
  GroupReleaseMediaResponse,
  GroupThemesResponse,
} from "@/types/groupContributors";
import type {
  GroupDetailResponse,
  GroupReleaseCountResponse,
  GroupReleasesParams,
  GroupReleasesResponse,
} from "@/types/group";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  parseApiErrorPayload,
  withAuthHeader,
} from "./client";

export async function createFansubGroup(
  payload: FansubGroupCreateRequest,
  authToken?: string,
): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/fansubs`, {
    method: "POST",
    authToken,
    headers: {
      "Content-Type": "application/json",
    },
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

  return response.json() as Promise<FansubGroupResponse>;
}

export async function updateFansubGroup(
  fansubID: number,
  payload: FansubGroupPatchRequest,
  authToken?: string,
): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}`,
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

  return response.json() as Promise<FansubGroupResponse>;
}

export async function deleteFansubGroup(
  fansubID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}`,
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

export async function getGroupDetail(
  animeID: number,
  groupID: number,
): Promise<GroupDetailResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}`,
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

  return response.json() as Promise<GroupDetailResponse>;
}

function buildGroupReleasesQuery(params: GroupReleasesParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (typeof params.has_op === "boolean")
    query.set("has_op", String(params.has_op));
  if (typeof params.has_ed === "boolean")
    query.set("has_ed", String(params.has_ed));
  if (typeof params.has_karaoke === "boolean")
    query.set("has_karaoke", String(params.has_karaoke));
  if (params.q) query.set("q", params.q);

  return query.toString();
}

export async function getGroupReleases(
  animeID: number,
  groupID: number,
  params: GroupReleasesParams = {},
): Promise<GroupReleasesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildGroupReleasesQuery(params);
  const url = `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/releases${query ? `?${query}` : ""}`;
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

  return response.json() as Promise<GroupReleasesResponse>;
}

export async function getGroupReleaseCount(
  animeID: number,
  groupID: number,
): Promise<GroupReleaseCountResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/releases/count`,
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

  return response.json() as Promise<GroupReleaseCountResponse>;
}

export async function getGroupAssets(
  animeID: number,
  groupID: number,
): Promise<GroupAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/assets`,
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

  return response.json() as Promise<GroupAssetsResponse>;
}

export async function getGroupThemes(
  animeID: number,
  groupID: number,
): Promise<GroupThemesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/themes`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupThemesResponse>;
}

export async function getAnimeFansubs(
  animeID: number,
): Promise<AnimeFansubListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/fansubs`,
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

  return response.json() as Promise<AnimeFansubListResponse>;
}

export async function attachAnimeFansub(
  animeID: number,
  fansubID: number,
  authToken?: string,
): Promise<{ data: { anime_id: number; fansub_group_id: number } }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/fansubs/${fansubID}`,
    {
      method: "POST",
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

  return response.json() as Promise<{
    data: { anime_id: number; fansub_group_id: number };
  }>;
}

export async function detachAnimeFansub(
  animeID: number,
  fansubID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/fansubs/${fansubID}`,
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

// --- Öffentliche Gruppen-Projektions-Endpunkte (Phase 75) ---
// 174-06: relocated from api.ts's media/assets bucket (zero production call
// sites -- its sibling getGroupThemes/getGroupReleases/getGroupAssets are
// also projection endpoints in this file; projectPageData.test.ts asserts it
// is intentionally never called from the group project page per Phase 155's
// dead-fetch cleanup, D-01 behavior-preservation keeps the function itself).

export async function getGroupReleaseMedia(
  animeID: number,
  groupID: number,
): Promise<GroupReleaseMediaResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/release-media`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupReleaseMediaResponse>;
}
