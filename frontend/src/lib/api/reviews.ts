import { type CapabilityOverrideImpactPreview, type RoleAssignmentImpactPreview } from "@/types/admin-capability";
import { type ReviewDelegationMutationRequest, type ReviewDelegationMutationResult, type ReviewDelegationRow } from "@/types/admin-review-delegation";
import { type ReleaseReviewCountParams, type ReleaseReviewCountsResponse, type ReleaseReviewDecisionRequest, type ReleaseReviewDecisionResponse, type ReleaseReviewDetailResponse, type ReleaseReviewListParams, type ReleaseReviewNextResponse, type ReleaseReviewQueueResponse } from "@/types/releaseReviews";
import { ApiError, apiClientFetch, authorizedFetch, getApiBaseUrl, parseApiErrorPayload } from "./client";

// ---------------------------------------------------------------------------
// Phase 80: Admin-User-Verwaltung + Rechte-Zentrale
// Alle Helper nutzen apiClientFetch (zentraler Auth-Refresh-Seam, Lock K).
// ---------------------------------------------------------------------------

/**
 * Phase 138 (D-22, CAP-09): read-only Vorschau der Rechte-Auswirkung einer hypothetischen
 * Rollenzuweisung/-entziehung für EIN Zielmitglied über ALLE Aktionen -- steht vor der
 * bestehenden Rollenzuweisungs-Mutation (setFansubGroupMemberRole). Persistiert nichts.
 */
export async function getRoleAssignmentImpactPreview(
  fansubGroupId: number,
  appUserId: number,
  roleCode: string,
  change: "assign" | "revoke",
): Promise<RoleAssignmentImpactPreview> {
  const query = new URLSearchParams({ role_code: roleCode, change });
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/role-assignment-impact?${query.toString()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  const payload = (await response.json()) as { data: RoleAssignmentImpactPreview };
  return payload.data;
}

/**
 * Read-only Vorschau der Rechte-Auswirkung einer hypothetischen Capability-Vergabe/-Entziehung
 * für EINE Aktion auf EINER Rolle, über ALLE aktuellen echten Rolleninhaber dieser Rolle hinweg
 * (Plan 138-07 Backend / Plan 138-13 Frontend-Verdrahtung, CAP-09). Persistiert nichts und steht
 * vor grantRoleCapability/revokeRoleCapability -- D-18/D-20: keine Mutation ohne berechnete
 * Vorschau. `authorizedFetch`-Konvention (matcht grantRoleCapability/revokeRoleCapability in
 * diesem 9700er-Block, 138-PATTERNS.md).
 * GET /api/v1/admin/role-capabilities/:roleCode/:actionCode/impact-preview?add=true|false
 */
export async function getRoleCapabilityImpactPreview(
  roleCode: string,
  actionCode: string,
  add: boolean,
): Promise<CapabilityOverrideImpactPreview> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/role-capabilities/${encodeURIComponent(roleCode)}/${encodeURIComponent(actionCode)}/impact-preview?add=${add}`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    )
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    )
  }

  const payload = (await response.json()) as { data: CapabilityOverrideImpactPreview }
  return payload.data
}

/** Lädt die drei spezialisierten Prüf-/Freigabe-Rechte einer Gruppenmitgliedschaft. */
export async function getReviewDelegations(
  fansubGroupId: number,
  appUserId: number,
): Promise<ReviewDelegationRow[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/review-delegations`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: ReviewDelegationRow[] }
  return resp.data
}

/** Setzt den gewünschten Grant-Status für ein spezialisiertes Prüf-/Freigabe-Recht. */
export async function mutateReviewDelegation(
  fansubGroupId: number,
  appUserId: number,
  body: ReviewDelegationMutationRequest,
): Promise<ReviewDelegationMutationResult> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/review-delegations`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: ReviewDelegationMutationResult }
  return resp.data
}

// ─── Release-Review-Workspace (Phase 107.1) ────────────────────────────────

function buildReleaseReviewQuery(
  params: ReleaseReviewListParams | ReleaseReviewCountParams,
  includePage: boolean,
): string {
  const query = new URLSearchParams();
  query.set("view", params.view ?? "open");
  if (params.animeId != null && params.animeId > 0) {
    query.set("anime_id", String(params.animeId));
  }
  if (params.releaseVersionId != null && params.releaseVersionId > 0) {
    query.set("release_version_id", String(params.releaseVersionId));
  }
  const search = params.search?.trim();
  if (search) query.set("search", search);

  if (includePage) {
    const page = params as ReleaseReviewListParams;
    if (page.type) query.set("type", page.type);
    if (page.category) query.set("category", page.category);
    if (page.cursor) query.set("cursor", page.cursor);
    query.set("limit", String(Math.min(50, Math.max(1, page.limit ?? 50))));
  }

  return query.toString();
}

async function parseReleaseReviewResponse<T>(
  response: Response,
): Promise<T> {
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
  return response.json() as Promise<T>;
}

export async function listReleaseReviews(
  fansubId: number,
  params: ReleaseReviewListParams = {},
): Promise<ReleaseReviewQueueResponse> {
  const query = buildReleaseReviewQuery(params, true);
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews?${query}`,
    { cache: "no-store", signal: params.signal },
  );
  return parseReleaseReviewResponse<ReleaseReviewQueueResponse>(response);
}

export async function getReleaseReviewCounts(
  fansubId: number,
  params: ReleaseReviewCountParams = {},
): Promise<ReleaseReviewCountsResponse> {
  const query = buildReleaseReviewQuery(params, false);
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/counts?${query}`,
    { cache: "no-store", signal: params.signal },
  );
  return parseReleaseReviewResponse<ReleaseReviewCountsResponse>(response);
}

export async function getReleaseReview(
  fansubId: number,
  reviewId: string,
  signal?: AbortSignal,
): Promise<ReleaseReviewDetailResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/${encodeURIComponent(reviewId)}`,
    { cache: "no-store", signal },
  );
  return parseReleaseReviewResponse<ReleaseReviewDetailResponse>(response);
}

export async function getNextReleaseReview(
  fansubId: number,
  reviewId: string,
): Promise<ReleaseReviewNextResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/${encodeURIComponent(reviewId)}/next`,
    { cache: "no-store" },
  );
  return parseReleaseReviewResponse<ReleaseReviewNextResponse>(response);
}

export async function decideReleaseReview(
  fansubId: number,
  reviewId: string,
  request: ReleaseReviewDecisionRequest,
): Promise<ReleaseReviewDecisionResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubId}/release-reviews/${encodeURIComponent(reviewId)}/decision`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return parseReleaseReviewResponse<ReleaseReviewDecisionResponse>(response);
}
