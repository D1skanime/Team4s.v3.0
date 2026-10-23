// Sieben dedizierte, schmal benannte API-Client-Funktionen statt eines generischen
// REST-Clients: jede der drei unabhängigen UI-Konsumenten (Mitglied-Formular zum
// Absenden eines Hinweises, gruppen-gescopte Leader-Review-Liste, plattform-weite
// Admin-Liste für fansub_lead-Mitgliedschaftsanfragen, D-01/D-07) braucht eine
// eigene, vertraglich festgelegte Request-/Response-Form aus
// shared/contracts/fansub-group-hints.yaml (Plan 191-05). Ein generischer Client
// würde diese Pro-Endpunkt-Typsicherheit wieder aufgeben und genau das
// Ad-hoc-Response-Form-Problem erneut öffnen, das die Typdatei
// (frontend/src/types/fansub-group-hints.ts) eigentlich schließt.
import type {
  AdminFansubGroupHintListParams,
  AdminFansubGroupHintListResponse,
  CreateFansubGroupHintRequest,
  FansubGroupHint,
  FansubGroupHintListResponse,
} from "@/types/fansub-group-hints";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
} from "./client";

/**
 * Legt einen neuen Hinweis an eine beliebige Fansub-Gruppe an (eigene ODER
 * fremde, D-02) — reine Information ohne automatische Mitgliedschaft (D-03).
 */
export async function createFansubGroupHint(
  body: CreateFansubGroupHintRequest,
): Promise<{ data: FansubGroupHint }> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/me/fansub-group-hints`,
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
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<{ data: FansubGroupHint }>;
}

/**
 * Liste der eingehenden Hinweise an die ZIELGRUPPE für den Leader der
 * Zielgruppe (nicht die Gruppe des Absenders) — fansub_lead-Mitgliedschafts-
 * anfragen sind hier serverseitig ausgefiltert (D-01, siehe Plattform-Admin-
 * Liste unten).
 */
export async function listGroupHints(
  fansubId: number,
): Promise<FansubGroupHintListResponse> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/admin/fansubs/${fansubId}/group-hints`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<FansubGroupHintListResponse>;
}

/** Bestätigt einen offenen Hinweis als Leader der Zielgruppe (status='acknowledged'). */
export async function confirmGroupHint(
  fansubId: number,
  hintId: number,
): Promise<{ message: string }> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/admin/fansubs/${fansubId}/group-hints/${hintId}/confirm`,
    { method: "POST" },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<{ message: string }>;
}

/** Lehnt einen offenen Hinweis als Leader der Zielgruppe ab (status='rejected', kein Hard-Delete, D-04(3)). */
export async function rejectGroupHint(
  fansubId: number,
  hintId: number,
  decisionNote?: string,
): Promise<{ message: string }> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/admin/fansubs/${fansubId}/group-hints/${hintId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision_note: decisionNote ?? null }),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<{ message: string }>;
}

/**
 * Plattform-weite Liste AUSSCHLIESSLICH der fansub_lead-Mitgliedschaftsanfragen
 * (D-01/D-07) — Autorisierung unabhängig von jeder gruppenbezogenen Berechtigung
 * des Aufrufers, strukturell analog zu listClaims.
 */
export async function listAdminFansubGroupHints(
  params: AdminFansubGroupHintListParams = {},
): Promise<AdminFansubGroupHintListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.fansub_group_id != null) {
    query.set("fansub_group_id", String(params.fansub_group_id));
  }
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));

  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/admin/fansub-group-hints?${query.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<AdminFansubGroupHintListResponse>;
}

/** Bestätigt eine fansub_lead-Mitgliedschaftsanfrage als Plattform-Admin (status='acknowledged'). */
export async function confirmAdminFansubGroupHint(
  hintId: number,
): Promise<{ message: string }> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/admin/fansub-group-hints/${hintId}/confirm`,
    { method: "POST" },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<{ message: string }>;
}

/** Lehnt eine fansub_lead-Mitgliedschaftsanfrage als Plattform-Admin ab (status='rejected'). */
export async function rejectAdminFansubGroupHint(
  hintId: number,
  decisionNote?: string,
): Promise<{ message: string }> {
  const response = await authorizedFetch(
    `${getApiBaseUrl()}/api/v1/admin/fansub-group-hints/${hintId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision_note: decisionNote ?? null }),
    },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }

  return response.json() as Promise<{ message: string }>;
}
