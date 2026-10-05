import { AuthIssueRequest, AuthRevokeRequest, AuthTokenData, AuthTokenResponse, CurrentUserResponse } from "@/types/auth";
import { exchangeKeycloakCode, isKeycloakEnabled, logoutFromKeycloak } from "@/lib/keycloakAuth";
import { ApiError, authorizedFetch, clearAuthSession, clearLegacyTokenStorage, getApiBaseUrl, getCurrentUserWithBearerToken, getRuntimeRefreshToken, getRuntimeSessionMeta, normalizeCurrentUserResponse, parseApiError, parseApiErrorPayload, persistAuthSession, readBrowserCookie, resolveAuthToken, refreshRuntimeSession, toRuntimeAuthData, withAuthHeader, AUTH_DISPLAY_NAME, AUTH_DISPLAY_NAME_COOKIE_NAME, type RuntimeSessionSwitchEvent } from "./client";

export interface AuthSessionSnapshot {
  accountIdentity: number | null;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  displayName: string;
}

export function parseRuntimeSessionSwitchEvent(
  raw: string,
): RuntimeSessionSwitchEvent | null {
  if (!raw.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeSessionSwitchEvent>;
    if (
      parsed.type !== "session-switch" ||
      !Number.isFinite(parsed.timestamp) ||
      !Number.isFinite(parsed.previous_app_user_id) ||
      !Number.isFinite(parsed.next_app_user_id) ||
      Number(parsed.previous_app_user_id) <= 0 ||
      Number(parsed.next_app_user_id) <= 0
    ) {
      return null;
    }

    return {
      type: "session-switch",
      timestamp: Number(parsed.timestamp),
      previous_app_user_id: Number(parsed.previous_app_user_id),
      next_app_user_id: Number(parsed.next_app_user_id),
    };
  } catch {
    return null;
  }
}

// parsePayloadApiError moved to ./api/client (174-03): shared infra used both
// here (authorizedUploadXhr, also relocated) and by admin/anime-core.ts's
// buildCreateAnimeConflictAwareApiError — D-09, not duplicated.
// parseAniSearchEditConflictPayload, parseAniSearchCreateConflictPayload, and
// buildCreateAnimeConflictAwareApiError moved to ./api/admin/anime-core.ts
// (174-03), alongside createAdminAnime/updateAdminAnime, their only callers.

export function getRuntimeAuthToken(): string {
  const runtimeToken = resolveAuthToken();
  return runtimeToken.trim();
}

export function getRuntimeDisplayName(): string {
  if (typeof window === "undefined") {
    return AUTH_DISPLAY_NAME;
  }

  clearLegacyTokenStorage();
  const displayName = readBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME).trim();
  return displayName || AUTH_DISPLAY_NAME;
}

export function hasRuntimeAuthToken(): boolean {
  return getRuntimeAuthToken().length > 0;
}

export function getAuthSessionSnapshot(): AuthSessionSnapshot {
  const accessToken = getRuntimeAuthToken();
  const refreshToken = getRuntimeRefreshToken();

  return {
    hasAccessToken: accessToken.length > 0,
    hasRefreshToken: refreshToken.length > 0,
    displayName: getRuntimeDisplayName(),
    accountIdentity: getRuntimeSessionMeta()?.app_user_id ?? null,
  };
}

async function revokePreviousRuntimeSession(
  refreshToken: string,
): Promise<void> {
  const trimmedRefreshToken = refreshToken.trim();
  if (!trimmedRefreshToken) {
    return;
  }

  try {
    if (isKeycloakEnabled()) {
      await logoutFromKeycloak(trimmedRefreshToken);
    } else {
      await revokeAuthToken({ refresh_token: trimmedRefreshToken });
    }
  } catch {
    // Best effort only; local session has already moved on.
  }
}

async function prepareRuntimeSessionSwitch(
  nextAuthData: AuthTokenData,
): Promise<void> {
  const previousSession = getRuntimeSessionMeta();
  const previousRefreshToken = getRuntimeRefreshToken();
  const nextAppUserId = Number(nextAuthData.app_user_id || 0);

  if (
    !previousSession ||
    previousSession.app_user_id <= 0 ||
    nextAppUserId <= 0 ||
    previousSession.app_user_id === nextAppUserId
  ) {
    return;
  }

  clearAuthSession({ broadcast: false });
  await revokePreviousRuntimeSession(previousRefreshToken);
}

export async function persistResolvedAuthSession(
  authData: AuthTokenData,
): Promise<void> {
  await prepareRuntimeSessionSwitch(authData);
  persistAuthSession(authData);
}

export async function resolveCurrentUserFromAuthSession(): Promise<CurrentUserResponse> {
  return getCurrentUser();
}

export async function completeKeycloakAuthCallback(
  code: string,
  state: string,
): Promise<CurrentUserResponse> {
  const tokenBundle = await exchangeKeycloakCode(code, state);
  const me = await getCurrentUserWithBearerToken(tokenBundle.accessToken);
  await persistResolvedAuthSession(toRuntimeAuthData(tokenBundle, me.data));
  return me;
}

export async function refreshActiveAuthSession(): Promise<CurrentUserResponse | null> {
  const refreshedToken = await refreshRuntimeSession();

  if (isKeycloakEnabled()) {
    return getCurrentUserWithBearerToken(refreshedToken);
  }

  return null;
}

export async function logoutActiveAuthSession(): Promise<void> {
  const refreshToken = getRuntimeRefreshToken();
  clearAuthSession();

  try {
    if (isKeycloakEnabled()) {
      await logoutFromKeycloak(refreshToken || undefined);
    } else {
      await revokeAuthToken(refreshToken ? { refresh_token: refreshToken } : {});
    }
  } catch {
    // Remote revocation is best effort; the local browser session is already gone.
  }
}

export async function issueAuthToken(
  payload: AuthIssueRequest = {},
  authToken?: string | null,
): Promise<AuthTokenResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const issueKey = (payload.issue_key || "").trim();
  const headers =
    authToken === null ? {} : withAuthHeader({}, authToken || undefined);
  if (issueKey) {
    headers["X-Auth-Issue-Key"] = issueKey;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/issue`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AuthTokenResponse>;
}

export async function revokeAuthToken(
  payload: AuthRevokeRequest = {},
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const headers = withAuthHeader(
    {
      "Content-Type": "application/json",
    },
    authToken,
  );

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/revoke`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }
}

export async function getCurrentUser(
  authToken?: string,
): Promise<CurrentUserResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me`, {
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

  const payload = (await response.json()) as CurrentUserResponse;
  return normalizeCurrentUserResponse(payload);
}
