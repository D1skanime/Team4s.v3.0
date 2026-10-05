// D-24 cohesion exception: this file is ~600 lines, above the project's 450-line
// guideline. The plan (174-05-PLAN.md) locks "permissions/rights/roles/capabilities/
// overrides" as a single artifact (frontend/src/lib/api/permissions.ts, 17 re-verified
// functions) and explicitly permits exceeding 450 lines rather than artificially
// fragmenting this bucket (mirrors 174-03's fansub-members.ts D-24 exception, which
// cites the same 174-02 client.ts precedent). All functions here share one cohesive
// domain — role/capability CRUD, effective-rights inspection, and capability-override
// mutation/audit — against the same `/api/v1/admin/...` permission surface.
import { HistGroupMemberRole, HistGroupMemberRoleListResponse, HistGroupMemberRoleResponse, CreateMemberRoleRequest, UpdateMemberRoleRequest, FansubGroupRoleItem } from "@/types/fansub";
import { ReleaseVersionCapabilitiesResponse } from "@/types/releaseVersionMedia";
import { MemberRoleForVersion } from "@/types/releaseVersionNotes";
import { type CapabilityOverrideAuditItem, type CapabilityOverrideMutationRequest, type CapabilityOverrideMutationResult, type EffectiveRightState, type PublicRoleDefinitionOption, type RoleCapabilityMatrix, type RoleCapabilityMutationResult, type RoleDefinitionContext, type RoleDefinitionOption, type RoleHolderEntry } from "@/types/admin-capability";
import { ApiError, apiClientFetch, authorizedFetch, getApiBaseUrl, parseApiErrorPayload, withAuthHeader } from "./client";

export async function getReleaseVersionCapabilities(
  versionId: number,
  authToken?: string,
): Promise<ReleaseVersionCapabilitiesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/capabilities`,
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

  return response.json() as Promise<ReleaseVersionCapabilitiesResponse>;
}

type RawMemberRoleForVersion = {
  MemberID: number;
  MemberName: string;
  RoleID: number;
  RoleCode: string;
  RoleName: string;
  RoleLabel: string;
  CanEdit?: boolean;
};

function mapMemberRoleForVersion(
  raw: RawMemberRoleForVersion,
): MemberRoleForVersion {
  return {
    memberId: raw.MemberID,
    memberName: raw.MemberName,
    roleId: raw.RoleID,
    roleCode: raw.RoleCode,
    roleName: raw.RoleName ?? raw.RoleCode,
    roleLabel: raw.RoleLabel,
    canEdit: raw.CanEdit ?? true,
  };
}

export async function getMemberRolesForVersion(
  versionId: number,
  authToken?: string,
): Promise<MemberRoleForVersion[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/member-roles`,
    {
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

  const json = (await response.json()) as { data: RawMemberRoleForVersion[] };
  return json.data.map(mapMemberRoleForVersion);
}

// --- Gruppen-Mitglieder ---

// --- Mitglieder-Rollen ---

function normalizeHistGroupMemberRole(raw: Record<string, unknown>): HistGroupMemberRole {
  return {
    id: Number(raw.id ?? raw.ID),
    fansub_group_member_id: Number(
      raw.fansub_group_member_id ?? raw.HistFansubGroupMemberID,
    ),
    member_display_name: String(raw.member_display_name ?? raw.MemberDisplayName ?? ""),
    role_code: String(raw.role_code ?? raw.RoleCode ?? ""),
    role_label: (raw.role_label ?? raw.RoleLabel ?? null) as string | null,
    started_date: (raw.started_date ?? raw.StartedDate ?? null) as string | null,
    ended_date: (raw.ended_date ?? raw.EndedDate ?? null) as string | null,
    note: (raw.note ?? raw.SourceNote ?? null) as string | null,
    status: (raw.status ?? raw.Status) as HistGroupMemberRole["status"],
    created_at: String(raw.created_at ?? raw.CreatedAt ?? ""),
  };
}

export async function listMemberRoles(
  fansubId: number,
  memberId: number,
  authToken?: string,
): Promise<HistGroupMemberRoleListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-roles?member_id=${memberId}`,
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

  const payload = (await response.json()) as { data?: Record<string, unknown>[] };
  return {
    data: (payload.data ?? []).map(normalizeHistGroupMemberRole),
  };
}

export async function createMemberRole(
  fansubId: number,
  body: CreateMemberRoleRequest,
  authToken?: string,
): Promise<HistGroupMemberRoleResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-roles`,
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

  const payload = (await response.json()) as { data: Record<string, unknown> };
  return {
    data: normalizeHistGroupMemberRole(payload.data),
  };
}

export async function updateMemberRole(
  fansubId: number,
  roleId: number,
  body: UpdateMemberRoleRequest,
  authToken?: string,
): Promise<HistGroupMemberRoleResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-roles/${roleId}`,
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

  const payload = (await response.json()) as { data: Record<string, unknown> };
  return {
    data: normalizeHistGroupMemberRole(payload.data),
  };
}

export async function deleteMemberRole(
  fansubId: number,
  roleId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-roles/${roleId}`,
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

// --- Capability-Verwaltung (Phase 87) ---

/**
 * Lädt die vollständige Rollen×Actions-Capability-Matrix.
 * GET /api/v1/admin/role-capabilities
 */
export async function listRoleCapabilities(): Promise<RoleCapabilityMatrix> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/role-capabilities`,
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

  // Der Endpunkt liefert die Matrix gemäß Contract direkt (kein data-Envelope).
  const body = (await response.json()) as RoleCapabilityMatrix
  return body
}

/**
 * Lädt alle gruppen-skopierten Inhaber einer echten Gruppenrolle (Plan 138-01, D-07):
 * "wer besitzt diese Rolle?" für role_definitions-Gruppenrollen (fansub_lead, co_leader,
 * encoder, ...). Globale App-Rollen (platform_admin/content_admin/user) werden hier NICHT
 * unterstützt — sie haben bereits eine funktionierende Antwort über
 * `/admin/users?role=<code>`.
 * GET /api/v1/admin/role-holders/:roleCode
 */
export async function listRoleHolders(roleCode: string): Promise<RoleHolderEntry[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/role-holders/${encodeURIComponent(roleCode)}`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    )
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: RoleHolderEntry[] }
  return resp.data as RoleHolderEntry[]
}

/**
 * Vergibt eine Capability an eine Rolle.
 * PUT /api/v1/admin/role-capabilities/:roleCode/:actionCode
 */
export async function grantRoleCapability(
  roleCode: string,
  actionCode: string,
): Promise<RoleCapabilityMutationResult> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/role-capabilities/${encodeURIComponent(roleCode)}/${encodeURIComponent(actionCode)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
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

  return response.json() as Promise<RoleCapabilityMutationResult>
}

/**
 * Entzieht einer Rolle eine Capability.
 * DELETE /api/v1/admin/role-capabilities/:roleCode/:actionCode
 * Bei 409 (Lockout-Guard): wirft ApiError mit status=409 und code="lockout_guard".
 */
export async function revokeRoleCapability(
  roleCode: string,
  actionCode: string,
): Promise<RoleCapabilityMutationResult> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/role-capabilities/${encodeURIComponent(roleCode)}/${encodeURIComponent(actionCode)}`,
    { method: 'DELETE' },
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

  return response.json() as Promise<RoleCapabilityMutationResult>
}

/**
 * Lädt den vollständigen provenienzfähigen Effective-Rights-Katalog eines Nutzers in EINER
 * Fansub-Gruppe (Phase 137 Resolver, Plan 138-06/UADM-01). Ersetzt das alte zwei-Boolean-
 * Heuristik-Endpoint für die Rechte-Inspektion vollständig.
 * GET /api/v1/admin/fansubs/:id/app-members/:appUserId/effective-rights
 */
export async function getEffectiveRights(
  fansubGroupId: number,
  appUserId: number,
): Promise<EffectiveRightState[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/effective-rights`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    )
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: EffectiveRightState[] }
  return resp.data
}

/**
 * Setzt/entfernt einen persönlichen Capability-Override für einen Nutzer in einer Fansub-
 * Gruppe (Phase 137 EffectiveRightsService.MutateOverride, Plan 138-06/UADM-01).
 * PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/capability-overrides
 */
export async function mutateCapabilityOverride(
  fansubGroupId: number,
  appUserId: number,
  body: CapabilityOverrideMutationRequest,
): Promise<CapabilityOverrideMutationResult> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/capability-overrides`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    )
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: CapabilityOverrideMutationResult }
  return resp.data
}

/**
 * Lädt die Override-Historie eines Nutzers in einer Fansub-Gruppe (Phase 137 append-only
 * Audit-Trail, Plan 138-06/UADM-01).
 * GET /api/v1/admin/fansubs/:id/app-members/:appUserId/capability-overrides/history?limit=&offset=
 */
export async function listOverrideHistory(
  fansubGroupId: number,
  appUserId: number,
  limit = 25,
  offset = 0,
): Promise<CapabilityOverrideAuditItem[]> {
  const response = await apiClientFetch(
    `/api/v1/admin/fansubs/${fansubGroupId}/app-members/${appUserId}/capability-overrides/history?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    )
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const resp = (await response.json()) as { data: CapabilityOverrideAuditItem[] }
  return resp.data
}

/**
 * Lädt die Rollenliste für historische Mitgliedsfunktionen einer Fansub-Gruppe.
 * GET /api/v1/admin/fansubs/:fansubId/role-definitions?context=group_history
 * Gibt historische Funktionsrollen wie Übersetzung, Timing und Encoding zurück.
 * Diese Auswahl dokumentiert Archivdaten und vergibt keine aktiven App-Rechte.
 */
export async function listGroupHistoryRoleDefinitions(
  fansubId: number | string,
): Promise<RoleDefinitionOption[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${encodeURIComponent(String(fansubId))}/role-definitions?context=group_history`,
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

  const payload = (await response.json()) as { data?: RoleDefinitionOption[] }
  return payload.data ?? []
}

/**
 * listFansubGroupRoleDefinitions lädt die zuweisbaren Gruppenrollen (Kontext fansub_group)
 * eines Fansubs — Quelle für den App-Mitglied-Add-Flow (Gap G1, D-12).
 * GET /api/v1/admin/fansubs/:fansubId/role-definitions?context=fansub_group
 * Member-scoped (ActionFansubGroupMembersView): für Fansub-Leitungen erreichbar und liefert
 * techadmin, gfxler und die übrigen zuweisbaren Gruppenrollen inklusive Label und Sortierung.
 */
export async function listFansubGroupRoleDefinitions(
  fansubId: number | string,
): Promise<RoleDefinitionOption[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${encodeURIComponent(String(fansubId))}/role-definitions?context=fansub_group`,
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

  const payload = (await response.json()) as { data?: RoleDefinitionOption[] }
  return payload.data ?? []
}

/** Public presentation-only role catalog. Authorization remains backend-owned. */
const ROLE_DEFINITION_CONTEXTS = new Set<RoleDefinitionContext>([
  'fansub_group',
  'anime_contribution',
  'group_history',
])

function parsePublicRoleDefinitions(
  payload: unknown,
  requestedContext: RoleDefinitionContext,
): PublicRoleDefinitionOption[] {
  const isCompleteRole = (row: unknown): row is PublicRoleDefinitionOption => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return false

    const candidate = row as Record<string, unknown>
    const contexts = candidate.contexts
    return typeof candidate.code === 'string'
      && candidate.code.length > 0
      && typeof candidate.label_de === 'string'
      && candidate.label_de.length > 0
      && Array.isArray(contexts)
      && contexts.length > 0
      && contexts.every((item) => typeof item === 'string' && ROLE_DEFINITION_CONTEXTS.has(item as RoleDefinitionContext))
      && contexts.includes(requestedContext)
      && typeof candidate.sort_order === 'number'
      && Number.isInteger(candidate.sort_order)
      && typeof candidate.assignable === 'boolean'
      && typeof candidate.color_key === 'string'
      && candidate.color_key.length > 0
      && typeof candidate.icon_key === 'string'
      && candidate.icon_key.length > 0
      && typeof candidate.operative_capability_count === 'number'
      && Number.isInteger(candidate.operative_capability_count)
      && candidate.operative_capability_count >= 0
      && typeof candidate.has_operative_capabilities === 'boolean'
  }

  if (!Array.isArray(payload) || !payload.every(isCompleteRole)) {
    throw new ApiError(502, 'Rollenkatalog konnte nicht geladen werden.', null, 'ROLE_CATALOG_CONTRACT_ERROR')
  }
  return payload
}

export async function listRoleDefinitions(
  context: RoleDefinitionContext,
): Promise<PublicRoleDefinitionOption[]> {
  const response = await apiClientFetch(
    `/api/v1/role-definitions?context=${encodeURIComponent(context)}`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const payload = (await response.json()) as unknown
  return parsePublicRoleDefinitions(payload, context)
}

/**
 * listFansubGroupRoles lädt alle zuweisbaren Gruppenrollen vom Backend.
 * GET /api/v1/admin/fansub-group-roles
 * Erfordert Platform-Admin-Identität. Liefert techadmin, gfxler und alle
 * anderen assignable role_definitions.
 */
export async function listFansubGroupRoles(): Promise<FansubGroupRoleItem[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansub-group-roles`,
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

  const payload = (await response.json()) as { data?: FansubGroupRoleItem[] }
  return payload.data ?? []
}
