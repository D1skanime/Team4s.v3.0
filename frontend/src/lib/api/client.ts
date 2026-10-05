import type {
  AdminAnimeAniSearchEditConflictResult,
  AdminAnimeAniSearchCreateConflictResult,
} from "@/types/admin";
import type {
  AuthRefreshRequest,
  AuthTokenData,
  AuthTokenResponse,
  CurrentUserResponse,
} from "@/types/auth";
import {
  isKeycloakEnabled,
  refreshKeycloakToken,
  type KeycloakTokenBundle,
} from "@/lib/keycloakAuth";
import { getBrowserApiBaseUrl, resolvePublicApiUrl } from "@/lib/publicApiUrl";

// Browser requests can use the same-origin /api/v1 proxy. This keeps Docker
// live frontends from depending on a directly reachable host backend port.
const API_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();

/**
 * Normalisiert die interne API-URL für Docker-Umgebungen.
 * Falls der Hostname "backend" lautet (alter Docker-Compose-Name), wird er auf
 * "team4sv30-backend" umgeschrieben, damit Server-seitige Fetches den richtigen
 * Container erreichen. Außerhalb von Docker bleibt die URL unverändert.
 */
function normalizeInternalApiBaseUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    if (parsed.hostname === "backend") {
      parsed.hostname = "team4sv30-backend";
      return parsed.toString().replace(/\/$/, "");
    }
    return value;
  } catch {
    return value;
  }
}

const API_INTERNAL_BASE_URL =
  normalizeInternalApiBaseUrl(process.env.API_INTERNAL_URL || "") ||
  API_PUBLIC_BASE_URL;
const AUTH_BYPASS_LOCAL =
  (
    (process.env.NEXT_PUBLIC_AUTH_BYPASS_LOCAL || "").trim() || "false"
  ).toLowerCase() === "true";
const AUTH_BYPASS_DISPLAY_NAME = "LocalAdmin";
export const API_AUTH_SESSION_TOKEN = "__team4s_runtime_auth__";
const NETWORK_RETRY_DELAYS_MS = [300];
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD"]);

/**
 * Gibt die richtige API-Basis-URL zurück — je nachdem ob der Code im Browser
 * oder auf dem Next.js-Server (SSR/RSC) ausgeführt wird.
 * - Browser → öffentliche URL (vom Client erreichbar)
 * - Server  → interne Docker-URL (schneller, kein Umweg über Host)
 */
export function getApiBaseUrl(): string {
  return typeof window === "undefined"
    ? API_INTERNAL_BASE_URL
    : getBrowserApiBaseUrl();
}

function waitForNetworkRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isIdempotentRequest(init: RequestInit): boolean {
  const method = init.method?.toUpperCase() ?? "GET";
  return IDEMPOTENT_METHODS.has(method);
}

function isFetchNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === "fetch failed";
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function resolveLoopbackMediaUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (!isLoopbackHost(parsed.hostname)) return null;
    if (!parsed.pathname.startsWith("/api/") && !parsed.pathname.startsWith("/media/")) return null;

    return resolvePublicApiUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`);
  } catch {
    return null;
  }
}

/**
 * Löst eine relative oder absolute Media-URL zu einer vollständig qualifizierten URL auf.
 * - Absolute externe URLs (http/https) → unverändert zurückgeben
 * - Absolute lokale API-/Media-URLs → auf den aktuellen Browser-API-Pfad normalisieren
 * - Pfade die mit /api/ beginnen → an die öffentliche API-Base anhängen
 * - Alle anderen Werte (z.B. /media/...) → unverändert zurückgeben
 * Wird für Cover-, Banner- und Backdrop-Pfade aus der API genutzt.
 */
export function resolveApiUrl(value?: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const loopbackMediaUrl = resolveLoopbackMediaUrl(trimmed);
    if (loopbackMediaUrl) {
      return loopbackMediaUrl;
    }

    return trimmed;
  }

  if (trimmed.startsWith("/api/")) {
    return resolvePublicApiUrl(trimmed);
  }

  return trimmed;
}

export const AUTH_BEARER_TOKEN = (
  process.env.NEXT_PUBLIC_AUTH_TOKEN || ""
).trim();
export const AUTH_DISPLAY_NAME =
  (process.env.NEXT_PUBLIC_AUTH_DISPLAY_NAME || "").trim() ||
  (AUTH_BYPASS_LOCAL ? AUTH_BYPASS_DISPLAY_NAME : "");
export const HAS_AUTH_TOKEN = AUTH_BEARER_TOKEN.length > 0 || AUTH_BYPASS_LOCAL;

export const AUTH_TOKEN_COOKIE_NAME = "team4s_access_token";
export const AUTH_REFRESH_COOKIE_NAME = "team4s_refresh_token";
export const AUTH_DISPLAY_NAME_COOKIE_NAME = "team4s_display_name";
const AUTH_TOKEN_STORAGE_KEY = "team4s.auth.access_token";
const AUTH_REFRESH_STORAGE_KEY = "team4s.auth.refresh_token";
const AUTH_DISPLAY_NAME_STORAGE_KEY = "team4s.auth.display_name";
const AUTH_SESSION_META_STORAGE_KEY = "team4s.auth.session_meta";
export const AUTH_SESSION_EVENT_STORAGE_KEY = "team4s.auth.session_event";
export const AUTH_SESSION_CHANGED_EVENT = "team4s:auth-session-changed";
export const AUTH_SESSION_SWITCH_EVENT = "team4s:auth-session-switch";
export const AUTH_SESSION_SWITCH_CHANNEL_NAME = "team4s.auth.session_switch";
const AUTH_SESSION_PRIVATE_META_STORAGE_KEY =
  "team4s.auth.private_session_meta";
const AUTH_REFRESH_BUFFER_SECONDS = 60;

/**
 * Strukturierter API-Fehler — enthält HTTP-Statuscode, Fehlermeldung und
 * optionale Zusatzinfos wie Retry-Delay, Fehler-Code und Konflikt-Details.
 * Wird von allen API-Funktionen geworfen wenn der Server einen Fehler zurückgibt,
 * damit Aufrufer gezielt auf z.B. 401, 409 oder 429 reagieren können.
 */
export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;
  code: string | null;
  details: string | null;
  conflict:
    | AdminAnimeAniSearchEditConflictResult
    | AdminAnimeAniSearchCreateConflictResult
    | null;

  constructor(
    status: number,
    message: string,
    retryAfterSeconds: number | null = null,
    code: string | null = null,
    details: string | null = null,
    conflict:
      | AdminAnimeAniSearchEditConflictResult
      | AdminAnimeAniSearchCreateConflictResult
      | null = null,
  ) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.code = code;
    this.details = details;
    this.conflict = conflict;
  }
}

interface ParsedApiErrorPayload {
  message: string;
  code: string | null;
  details: string | null;
}

export interface AuthorizedRequestOptions extends Omit<RequestInit, "headers"> {
  authToken?: string;
  headers?: Record<string, string>;
  skipAuthPreflight?: boolean;
  retryAuth401?: boolean;
}

export interface RuntimeSessionMeta {
  app_user_id: number;
  user_id: number;
  display_name: string;
  session_id: string | null;
}

export interface RuntimeSessionSwitchEvent {
  type: "session-switch";
  timestamp: number;
  previous_app_user_id: number;
  next_app_user_id: number;
}

interface RuntimeSessionPrivateMeta {
  access_token_expires_at: number;
  refresh_token_expires_at: number;
}

/**
 * Liest einen Cookie-Wert aus document.cookie (nur im Browser verfügbar).
 * Gibt einen leeren String zurück wenn der Cookie nicht existiert oder
 * der Code serverseitig ausgeführt wird.
 */
export function readBrowserCookie(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  if (!cookie) {
    return "";
  }

  const value = cookie.slice(prefix.length);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Ermittelt, ob der aktuelle Browser-Kontext über HTTPS läuft. Nur dann darf
 * ein Cookie das `Secure`-Attribut tragen — sonst funktioniert lokale
 * Entwicklung über `http://127.0.0.1` nicht mehr, da Browser `Secure`-Cookies
 * über Klartext-HTTP verwerfen.
 */
function isSecureBrowserContext(): boolean {
  if (typeof window === "undefined" || !window.location) {
    return false;
  }

  return window.location.protocol === "https:";
}

/**
 * Schreibt einen Cookie mit SameSite=Lax und konfigurierbarer Lebensdauer.
 * Wird für Auth-Tokens genutzt damit der Token beim Seitenaufruf direkt
 * verfügbar ist — ohne Roundtrip über localStorage. Das `Secure`-Attribut
 * wird protokoll-abhängig angehängt: HTTPS-Kontexte erhalten es immer,
 * Klartext-HTTP (inkl. `http://127.0.0.1` für lokale Entwicklung) nie.
 * Dies ist die einzige Stelle, die Browser-Auth-Cookies schreibt oder löscht
 * (auch Löschungen via Max-Age=0 laufen hier durch) — Seiten/Komponenten
 * greifen nie direkt auf document.cookie zu.
 */
function writeBrowserCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  if (typeof document === "undefined") {
    return;
  }

  const maxAge =
    Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0
      ? Math.floor(maxAgeSeconds)
      : 0;
  const encodedValue = encodeURIComponent(value);
  const secureSuffix = isSecureBrowserContext() ? "; Secure" : "";
  document.cookie = `${name}=${encodedValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureSuffix}`;
}

/**
 * Liest einen Wert aus localStorage (nur im Browser verfügbar).
 * Fallback wenn Cookies nicht gelesen werden können (z.B. httpOnly-Einschränkungen).
 */
function readBrowserStorage(name: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return (window.localStorage.getItem(name) || "").trim();
  } catch {
    return "";
  }
}

/**
 * Schreibt einen Wert in localStorage oder löscht den Eintrag bei leerem Wert.
 * Fehler werden stillschweigend ignoriert — Cookies bleiben der primäre Speicher.
 */
function writeBrowserStorage(name: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value.trim()) {
      window.localStorage.setItem(name, value);
    } else {
      window.localStorage.removeItem(name);
    }
  } catch {
    // Ignore storage write failures and rely on cookies only.
  }
}

export function clearLegacyTokenStorage(): void {
  writeBrowserStorage(AUTH_TOKEN_STORAGE_KEY, "");
  writeBrowserStorage(AUTH_REFRESH_STORAGE_KEY, "");
  writeBrowserStorage(AUTH_DISPLAY_NAME_STORAGE_KEY, "");
}

export function getRuntimeSessionMeta(): RuntimeSessionMeta | null {
  const raw = readBrowserStorage(AUTH_SESSION_META_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeSessionMeta>;
    const appUserId = Number(parsed.app_user_id || 0);
    if (!Number.isFinite(appUserId) || appUserId <= 0) {
      return null;
    }

    return {
      app_user_id: appUserId,
      user_id: Number(parsed.user_id || 0),
      display_name:
        typeof parsed.display_name === "string" ? parsed.display_name : "",
      session_id:
        typeof parsed.session_id === "string" ? parsed.session_id : null,
    };
  } catch {
    return null;
  }
}

function writeRuntimeSessionMeta(authData: AuthTokenData): void {
  const appUserId = Number(authData.app_user_id || 0);
  if (!Number.isFinite(appUserId) || appUserId <= 0) {
    writeBrowserStorage(AUTH_SESSION_META_STORAGE_KEY, "");
    return;
  }

  writeBrowserStorage(
    AUTH_SESSION_META_STORAGE_KEY,
    JSON.stringify({
      app_user_id: appUserId,
      user_id: Number(authData.user_id || 0),
      display_name: authData.display_name || "",
      session_id:
        typeof authData.session_id === "string" ? authData.session_id : null,
    } satisfies RuntimeSessionMeta),
  );
}

function readRuntimeSessionPrivateMeta(): RuntimeSessionPrivateMeta | null {
  const raw = readBrowserStorage(AUTH_SESSION_PRIVATE_META_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeSessionPrivateMeta>;
    const accessExpiresAt = Number(parsed.access_token_expires_at || 0);
    const refreshExpiresAt = Number(parsed.refresh_token_expires_at || 0);
    if (!Number.isFinite(accessExpiresAt) || accessExpiresAt <= 0) {
      return null;
    }

    return {
      access_token_expires_at: accessExpiresAt,
      refresh_token_expires_at:
        Number.isFinite(refreshExpiresAt) && refreshExpiresAt > 0
          ? refreshExpiresAt
          : 0,
    };
  } catch {
    return null;
  }
}

function writeRuntimeSessionPrivateMeta(authData: AuthTokenData): void {
  const accessExpiresAt = Number(authData.access_token_expires_at || 0);
  const refreshExpiresAt = Number(authData.refresh_token_expires_at || 0);
  if (!Number.isFinite(accessExpiresAt) || accessExpiresAt <= 0) {
    writeBrowserStorage(AUTH_SESSION_PRIVATE_META_STORAGE_KEY, "");
    return;
  }

  writeBrowserStorage(
    AUTH_SESSION_PRIVATE_META_STORAGE_KEY,
    JSON.stringify({
      access_token_expires_at: accessExpiresAt,
      refresh_token_expires_at:
        Number.isFinite(refreshExpiresAt) && refreshExpiresAt > 0
          ? refreshExpiresAt
          : 0,
    } satisfies RuntimeSessionPrivateMeta),
  );
}

function shouldRefreshRuntimeSession(): boolean {
  const refreshToken = getRuntimeRefreshToken();
  if (!refreshToken.trim()) {
    return false;
  }

  const accessToken = resolveAuthToken();
  if (!accessToken.trim()) {
    return true;
  }

  const privateMeta = readRuntimeSessionPrivateMeta();
  if (!privateMeta) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return (
    privateMeta.access_token_expires_at <=
    nowSeconds + AUTH_REFRESH_BUFFER_SECONDS
  );
}

function publishRuntimeSessionSwitch(
  previous: RuntimeSessionMeta,
  next: AuthTokenData,
): void {
  const nextAppUserId = Number(next.app_user_id || 0);
  if (
    typeof window === "undefined" ||
    !Number.isFinite(nextAppUserId) ||
    nextAppUserId <= 0
  ) {
    return;
  }

  const payload: RuntimeSessionSwitchEvent = {
    type: "session-switch",
    timestamp: Date.now(),
    previous_app_user_id: previous.app_user_id,
    next_app_user_id: nextAppUserId,
  };

  try {
    window.localStorage.setItem(
      AUTH_SESSION_EVENT_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Ignore cross-tab event storage write failures.
  }

  try {
    window.dispatchEvent(
      new CustomEvent(AUTH_SESSION_SWITCH_EVENT, { detail: payload }),
    );
  } catch {
    // Ignore event dispatch issues; storage remains the source of truth.
  }

  try {
    const channel = new BroadcastChannel(AUTH_SESSION_SWITCH_CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Ignore BroadcastChannel failures and rely on storage/custom events.
  }
}

function dispatchAuthSessionChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT));
  } catch {
    // Ignore event dispatch issues; cookies/storage remain the source of truth.
  }
}

/**
 * Ermittelt den aktiven Auth-Token mit folgendem Vorrang:
 * 1. Browser-Runtime-Token aus Cookie/localStorage
 * 2. Explizit übergebener Token (z.B. von Server-Komponenten oder SSR)
 * 4. Build-time Env-Variable NEXT_PUBLIC_AUTH_TOKEN
 * Lokaler Bypass wird nicht als Browser-Bearer-Token gesendet.
 */
export function resolveAuthToken(authToken?: string): string {
  if (typeof window !== "undefined") {
    const runtimeToken = readBrowserCookie(AUTH_TOKEN_COOKIE_NAME).trim();
    if (runtimeToken) {
      return runtimeToken;
    }

    clearLegacyTokenStorage();
  }

  const explicitToken = (authToken || "").trim();
  if (explicitToken) {
    return explicitToken === API_AUTH_SESSION_TOKEN ? "" : explicitToken;
  }

  if (AUTH_BEARER_TOKEN) {
    return AUTH_BEARER_TOKEN;
  }

  return "";
}

/**
 * Fügt den Authorization-Header (Bearer-Token) zu einem Header-Objekt hinzu.
 * Gibt die Headers unverändert zurück wenn kein Token verfügbar ist.
 */
export function withAuthHeader(
  headers: Record<string, string>,
  authToken?: string,
): Record<string, string> {
  const token = resolveAuthToken(authToken);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Liest den strukturierten Fehler-Payload aus einer API-Response.
 * Erwartet JSON mit { error: { message, code?, details? } }.
 * Bei Parse-Fehlern oder fehlendem message-Feld wird der fallback-Text verwendet.
 */
export async function parseApiErrorPayload(
  response: Response,
  fallback: string,
): Promise<ParsedApiErrorPayload> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string; code?: string; details?: string };
    };
    if (body.error?.message) {
      return {
        message: body.error.message,
        code:
          typeof body.error.code === "string" && body.error.code.trim()
            ? body.error.code
            : null,
        details:
          typeof body.error.details === "string" && body.error.details.trim()
            ? body.error.details
            : null,
      };
    }
  } catch {
    // Keep fallback message.
  }

  return {
    message: fallback,
    code: null,
    details: null,
  };
}

/** Kurzform von parseApiErrorPayload — gibt nur die Fehlermeldung als String zurück. */
export async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const parsed = await parseApiErrorPayload(response, fallback);
  return parsed.message;
}

/**
 * Synchrone Variante von parseApiErrorPayload fuer bereits geparste Payloads
 * (z. B. XHR-Upload-Responses, die schon als `unknown` vorliegen statt als
 * `Response`). Wird sowohl von `authorizedUploadXhr` (hier, Upload-Retry-Pfad)
 * als auch von conflict-aware Error-Buildern in Domaenen-Modulen verwendet
 * (z. B. `admin/anime-core.ts`s `buildCreateAnimeConflictAwareApiError`) — D-09:
 * genau einmal zentral, nicht dupliziert.
 */
export function parsePayloadApiError(
  payload: unknown,
  fallback: string,
): ParsedApiErrorPayload {
  if (!payload || typeof payload !== "object") {
    return {
      message: fallback,
      code: null,
      details: null,
    };
  }

  const error = (
    payload as {
      error?: { message?: unknown; code?: unknown; details?: unknown };
    }
  ).error;
  const message =
    typeof error?.message === "string" && error.message.trim()
      ? error.message
      : fallback;
  const code =
    typeof error?.code === "string" && error.code.trim() ? error.code : null;
  const details =
    typeof error?.details === "string" && error.details.trim()
      ? error.details
      : null;

  return { message, code, details };
}

export function getRuntimeRefreshToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  clearLegacyTokenStorage();
  return readBrowserCookie(AUTH_REFRESH_COOKIE_NAME).trim();
}

export function persistAuthSession(authData: AuthTokenData): void {
  const previousSession = getRuntimeSessionMeta();
  writeBrowserCookie(
    AUTH_TOKEN_COOKIE_NAME,
    authData.access_token,
    authData.access_token_expires_in,
  );
  writeBrowserCookie(
    AUTH_REFRESH_COOKIE_NAME,
    authData.refresh_token,
    authData.refresh_token_expires_in,
  );
  writeBrowserCookie(
    AUTH_DISPLAY_NAME_COOKIE_NAME,
    authData.display_name,
    authData.refresh_token_expires_in,
  );
  clearLegacyTokenStorage();
  writeRuntimeSessionMeta(authData);
  writeRuntimeSessionPrivateMeta(authData);
  if (
    previousSession &&
    previousSession.app_user_id > 0 &&
    authData.app_user_id &&
    previousSession.app_user_id !== authData.app_user_id
  ) {
    publishRuntimeSessionSwitch(previousSession, authData);
  }
  dispatchAuthSessionChanged();
}

export function clearAuthSession(options: { broadcast?: boolean } = {}): void {
  const { broadcast = true } = options;
  writeBrowserCookie(AUTH_TOKEN_COOKIE_NAME, "", 0);
  writeBrowserCookie(AUTH_REFRESH_COOKIE_NAME, "", 0);
  writeBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME, "", 0);
  writeBrowserStorage(AUTH_TOKEN_STORAGE_KEY, "");
  writeBrowserStorage(AUTH_REFRESH_STORAGE_KEY, "");
  writeBrowserStorage(AUTH_DISPLAY_NAME_STORAGE_KEY, "");
  writeBrowserStorage(AUTH_SESSION_META_STORAGE_KEY, "");
  writeBrowserStorage(AUTH_SESSION_PRIVATE_META_STORAGE_KEY, "");
  if (broadcast) {
    dispatchAuthSessionChanged();
    return;
  }
}

export function toRuntimeAuthData(
  accessTokenData: KeycloakTokenBundle,
  currentUser: CurrentUserResponse["data"],
): AuthTokenData {
  return {
    token_type: accessTokenData.tokenType,
    access_token: accessTokenData.accessToken,
    access_token_expires_at: accessTokenData.accessTokenExpiresAt,
    access_token_expires_in: accessTokenData.accessTokenExpiresIn,
    refresh_token: accessTokenData.refreshToken,
    refresh_token_expires_at: accessTokenData.refreshTokenExpiresAt,
    refresh_token_expires_in: accessTokenData.refreshTokenExpiresIn,
    user_id: currentUser.legacy_user_id || 0,
    app_user_id: currentUser.app_user_id || 0,
    display_name: currentUser.display_name,
    session_id: currentUser.session_id ?? null,
  };
}

function isAuthRelatedError(parsed: ParsedApiErrorPayload): boolean {
  const haystack = [parsed.message, parsed.code, parsed.details]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .join(" ")
    .toLowerCase();

  if (!haystack) {
    return true;
  }

  return [
    "zugriffstoken",
    "access token",
    "refresh",
    "session",
    "anmeldung",
    "auth",
    "bearer",
    "token",
    "unauthorized",
    "invalid",
    "ungültig",
    "ungueltig",
  ].some((needle) => haystack.includes(needle));
}

export async function getCurrentUserWithBearerToken(
  authToken: string,
): Promise<CurrentUserResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${authToken.trim()}` },
    skipAuthPreflight: true,
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

let runtimeSessionRefreshPromise: Promise<string> | null = null;

export async function refreshRuntimeSession(): Promise<string> {
  if (runtimeSessionRefreshPromise) {
    return runtimeSessionRefreshPromise;
  }

  runtimeSessionRefreshPromise = (async () => {
    const refreshToken = getRuntimeRefreshToken();
    if (!refreshToken.trim()) {
      throw new ApiError(
        401,
        "Anmeldung erforderlich. Bitte erneut einloggen.",
      );
    }

    try {
      if (isKeycloakEnabled()) {
        const tokenBundle = await refreshKeycloakToken(refreshToken);
        const me = await getCurrentUserWithBearerToken(tokenBundle.accessToken);
        persistAuthSession(toRuntimeAuthData(tokenBundle, me.data));
        return tokenBundle.accessToken;
      }

      const response = await refreshAuthToken({ refresh_token: refreshToken });
      persistAuthSession(response.data);
      return response.data.access_token;
    } catch (error) {
      clearAuthSession();
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error && error.message.trim()) {
        throw new ApiError(401, error.message);
      }
      throw new ApiError(
        401,
        "Session konnte nicht aktualisiert werden. Bitte erneut einloggen.",
      );
    } finally {
      runtimeSessionRefreshPromise = null;
    }
  })();

  return runtimeSessionRefreshPromise;
}

async function ensureFreshRuntimeSession(): Promise<string> {
  if (!shouldRefreshRuntimeSession()) {
    return resolveAuthToken();
  }

  return refreshRuntimeSession();
}

export async function authorizedFetch(
  input: string,
  options: AuthorizedRequestOptions = {},
): Promise<Response> {
  const {
    authToken,
    headers = {},
    skipAuthPreflight = false,
    retryAuth401 = true,
    ...init
  } = options;

  const send = async (token?: string) => {
    const requestHeaders = { ...headers };
    if (token || !requestHeaders.Authorization) {
      withAuthHeader(requestHeaders, token);
    }
    const requestInit = {
      ...init,
      headers: requestHeaders,
    };

    for (let attempt = 0; attempt <= NETWORK_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await fetch(input, requestInit);
      } catch (error) {
        const canRetry =
          attempt < NETWORK_RETRY_DELAYS_MS.length &&
          isIdempotentRequest(requestInit) &&
          isFetchNetworkError(error);
        if (!canRetry) {
          throw error;
        }
        await waitForNetworkRetry(NETWORK_RETRY_DELAYS_MS[attempt]);
      }
    }

    throw new TypeError("fetch failed");
  };

  if (!skipAuthPreflight) {
    await ensureFreshRuntimeSession();
  }
  const initialToken =
    skipAuthPreflight && headers.Authorization
      ? undefined
      : resolveAuthToken(authToken);
  let response = await send(initialToken);
  if (response.status !== 401) {
    return response;
  }

  const parsed = await parseApiErrorPayload(
    response.clone(),
    `API request failed: ${response.status}`,
  );
  if (
    !retryAuth401 ||
    !isAuthRelatedError(parsed) ||
    !getRuntimeRefreshToken().trim()
  ) {
    return response;
  }

  const refreshedToken = await refreshRuntimeSession();
  response = await send(refreshedToken);
  return response;
}

export async function apiClientFetch(
  pathOrUrl: string,
  options: AuthorizedRequestOptions = {},
): Promise<Response> {
  const input =
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : `${getApiBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  return authorizedFetch(input, options);
}

export function normalizeCurrentUserResponse(
  payload: CurrentUserResponse,
): CurrentUserResponse {
  const data = payload?.data;
  const globalRoles = Array.isArray(data?.global_roles)
    ? data.global_roles.filter(
        (role): role is string => typeof role === "string",
      )
    : [];

  return {
    data: {
      app_user_id: Number(data?.app_user_id || 0),
      legacy_user_id: Number(data?.legacy_user_id || 0),
      display_name:
        typeof data?.display_name === "string" ? data.display_name : "",
      email: typeof data?.email === "string" ? data.email : "",
      keycloak_subject:
        typeof data?.keycloak_subject === "string" ? data.keycloak_subject : "",
      status:
        data?.status === "active" || data?.status === "disabled"
          ? data.status
          : "pending",
      global_roles: globalRoles,
      is_platform_admin: Boolean(data?.is_platform_admin),
      session_id: typeof data?.session_id === "string" ? data.session_id : null,
    },
  };
}

export async function refreshAuthToken(
  payload: AuthRefreshRequest,
): Promise<AuthTokenResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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

type UploadRetryEligibility =
  | "never"
  | "auth-before-persistence"
  | "idempotent";

interface AuthorizedUploadXhrOptions<T> {
  endpoint: string;
  method?: "POST" | "PUT";
  buildBody: () => FormData;
  onProgress?: (percent: number) => void;
  retryEligibility: UploadRetryEligibility;
  parsePayload?: (payload: unknown) => T;
}

interface UploadXhrResult {
  status: number;
  payload: unknown;
}

function parseUploadXhrPayload(responseText: string): unknown {
  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

function sendAuthorizedUploadXhrOnce<T>(
  options: AuthorizedUploadXhrOptions<T>,
  token: string,
): Promise<UploadXhrResult> {
  return new Promise<UploadXhrResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? "POST", options.endpoint, true);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress || !event.lengthComputable) return;
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
      options.onProgress(percent);
    };

    xhr.onerror = () => {
      reject(new ApiError(0, "Netzwerkfehler beim Upload."));
    };

    xhr.onload = () => {
      resolve({
        status: xhr.status,
        payload: parseUploadXhrPayload(xhr.responseText),
      });
    };

    options.onProgress?.(0);
    xhr.send(options.buildBody());
  });
}

/**
 * Zentraler XHR-Upload-Wrapper mit Auth-Refresh-on-401-Retry (gleiches Muster
 * wie `authorizedFetch`). Wird von mehreren Domaenen-Modulen verwendet (admin
 * anime/release-theme-assets, fansub media, release version media, story
 * images, suggestions) — D-09: genau einmal zentral, nicht dupliziert.
 */
export async function authorizedUploadXhr<T>(
  options: AuthorizedUploadXhrOptions<T>,
): Promise<T> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  await ensureFreshRuntimeSession();
  const initialToken = resolveAuthToken();
  const initialResult = await sendAuthorizedUploadXhrOnce(
    options,
    initialToken,
  );
  if (initialResult.status >= 200 && initialResult.status < 300) {
    options.onProgress?.(100);
    return options.parsePayload
      ? options.parsePayload(initialResult.payload)
      : (initialResult.payload as T);
  }

  const parsed = parsePayloadApiError(
    initialResult.payload,
    `API request failed: ${initialResult.status}`,
  );
  const canRetry =
    initialResult.status === 401 &&
    isAuthRelatedError(parsed) &&
    options.retryEligibility !== "never" &&
    getRuntimeRefreshToken().trim().length > 0;

  if (!canRetry) {
    if (initialResult.status === 401 && options.retryEligibility === "never") {
      throw new ApiError(
        initialResult.status,
        "Anmeldung abgelaufen. Bitte erneut anmelden und den Upload wiederholen.",
        null,
        parsed.code,
        parsed.details,
      );
    }
    throw new ApiError(
      initialResult.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  const refreshedToken = await refreshRuntimeSession();
  const retryResult = await sendAuthorizedUploadXhrOnce(
    options,
    refreshedToken,
  );
  if (retryResult.status >= 200 && retryResult.status < 300) {
    options.onProgress?.(100);
    return options.parsePayload
      ? options.parsePayload(retryResult.payload)
      : (retryResult.payload as T);
  }

  const retryParsed = parsePayloadApiError(
    retryResult.payload,
    `API request failed: ${retryResult.status}`,
  );
  throw new ApiError(
    retryResult.status,
    retryParsed.message,
    null,
    retryParsed.code,
    retryParsed.details,
  );
}
