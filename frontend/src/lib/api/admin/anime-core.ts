import type {
  AdminAnimeAniSearchEditRequest,
  AdminAnimeAniSearchEditResult,
  AdminAnimeAniSearchEditConflictResult,
  AdminAnimeAniSearchCreateConflictResult,
  AdminAnimeCreateRequest,
  AdminAnimeDeleteResponse,
  AdminAnimePatchRequest,
  AdminAnimeUpsertResponse,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  parsePayloadApiError,
  withAuthHeader,
} from "../client";

function parseAniSearchEditConflictPayload(
  payload: unknown,
): AdminAnimeAniSearchEditConflictResult | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = (payload as { data?: Record<string, unknown> }).data;
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.mode !== "conflict") {
    return null;
  }

  if (
    typeof data.anisearch_id !== "string" ||
    typeof data.existing_anime_id !== "number" ||
    typeof data.existing_title !== "string" ||
    typeof data.redirect_path !== "string"
  ) {
    return null;
  }

  return {
    mode: "conflict",
    anisearch_id: data.anisearch_id,
    existing_anime_id: data.existing_anime_id,
    existing_title: data.existing_title,
    redirect_path: data.redirect_path,
  };
}

/**
 * Parst das 409-Konfliktergebnis des save-time AniSearch-Dublettenchecks
 * (165-03/D-20) auf `POST /api/v1/admin/anime` — Form gleich dem
 * Enrich()-Redirect-Ergebnis, aber mit `mode: "redirect"` statt `"conflict"`.
 */
function parseAniSearchCreateConflictPayload(
  payload: unknown,
): AdminAnimeAniSearchCreateConflictResult | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = (payload as { data?: Record<string, unknown> }).data;
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.mode !== "redirect") {
    return null;
  }

  if (
    typeof data.anisearch_id !== "string" ||
    typeof data.existing_anime_id !== "number" ||
    typeof data.existing_title !== "string" ||
    typeof data.redirect_path !== "string"
  ) {
    return null;
  }

  return {
    mode: "redirect",
    anisearch_id: data.anisearch_id,
    existing_anime_id: data.existing_anime_id,
    existing_title: data.existing_title,
    redirect_path: data.redirect_path,
  };
}

/**
 * Baut aus einer nicht-ok `POST /api/v1/admin/anime`-Antwort einen ApiError,
 * der bei einem 409 des save-time AniSearch-Dublettenchecks (165-03/D-20)
 * das geparste Konfliktergebnis mitfuehrt (`error.conflict`), statt es wie
 * die generische Fehlerbehandlung stillschweigend zu verwerfen. Wird sowohl
 * von `createAdminAnime` (hier) als auch von `createAdminAnimeFromJellyfinDraft`
 * (`lib/api/admin-anime-intake.ts`) verwendet, da beide denselben Endpunkt
 * ansprechen und derselbe save-time Guard fuer beide gilt.
 */
export async function buildCreateAnimeConflictAwareApiError(
  response: Response,
): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as unknown;
  const parsed = parsePayloadApiError(
    body,
    `API request failed: ${response.status}`,
  );
  const conflict =
    response.status === 409 ? parseAniSearchCreateConflictPayload(body) : null;

  return new ApiError(
    response.status,
    parsed.message,
    null,
    parsed.code,
    parsed.details,
    conflict,
  );
}

export async function createAdminAnime(
  payload: AdminAnimeCreateRequest,
  authToken?: string,
): Promise<AdminAnimeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/admin/anime`, {
    method: "POST",
    authToken,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildCreateAnimeConflictAwareApiError(response);
  }

  return response.json() as Promise<AdminAnimeUpsertResponse>;
}

export async function updateAdminAnime(
  animeID: number,
  payload: AdminAnimePatchRequest,
  authToken?: string,
): Promise<AdminAnimeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}`,
    {
      method: "PATCH",
      authToken,
      headers: {
        "Content-Type": "application/json",
      },
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

  return response.json() as Promise<AdminAnimeUpsertResponse>;
}

export async function loadAdminAnimeEditAniSearchEnrichment(
  animeID: number,
  payload: AdminAnimeAniSearchEditRequest,
  authToken?: string,
): Promise<{ data: AdminAnimeAniSearchEditResult }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/enrichment/anisearch`,
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
    const body = (await response.json().catch(() => null)) as unknown;
    const parsed = parsePayloadApiError(
      body,
      `API request failed: ${response.status}`,
    );
    const conflict =
      response.status === 409 ? parseAniSearchEditConflictPayload(body) : null;
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
      conflict,
    );
  }

  return response.json() as Promise<{ data: AdminAnimeAniSearchEditResult }>;
}

export async function deleteAdminAnime(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeDeleteResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}`,
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

  return response.json() as Promise<AdminAnimeDeleteResponse>;
}
