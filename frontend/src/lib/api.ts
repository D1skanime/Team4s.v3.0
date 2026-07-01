import {
  AdminAnimeAniSearchEditRequest,
  AdminAnimeAniSearchEditConflictResult,
  AdminAnimeAniSearchEditResult,
  AdminAnimeRelationCreateRequest,
  AdminAnimeThemeCreateRequest,
  AdminAnimeThemeCreateResponse,
  AdminAnimeThemePatchRequest,
  AdminAnimeThemeSegmentCreateRequest,
  AdminAnimeThemeSegmentCreateResponse,
  AdminAnimeThemeSegmentsResponse,
  AdminAnimeThemesResponse,
  AdminFansubAnimeListResponse,
  AdminFansubAnimeThemeAssetsResponse,
  AdminReleaseThemeAssetCreateResponse,
  AdminReleaseThemeAssetsResponse,
  AdminThemeTypesResponse,
  AdminAnimeRelationTargetsResponse,
  AdminAnimeRelationUpdateRequest,
  AdminAnimeRelationsResponse,
  AdminAnimeJellyfinPreviewResponse,
  AdminAnimeJellyfinContextResponse,
  AdminAnimeJellyfinMetadataApplyRequest,
  AdminAnimeJellyfinMetadataApplyResponse,
  AdminAnimeJellyfinMetadataPreviewRequest,
  AdminAnimeJellyfinMetadataPreviewResponse,
  AdminAnimeBackgroundAssetResponse,
  AdminAnimeJellyfinSyncRequest,
  AdminAnimeJellyfinSyncResponse,
  AdminAnimeAssetKind,
  AdminAnimeUploadAssetType,
  AdminMediaUploadResponse,
  AdminJellyfinSeriesSearchResponse,
  AdminAnimeCreateRequest,
  AdminAnimeDeleteResponse,
  AdminAnimePatchRequest,
  AdminAnimeUpsertResponse,
  AdminGenreTokensResponse,
  AdminTagTokensResponse,
  AdminEpisodeCreateRequest,
  AdminEpisodeDeleteResponse,
  AdminEpisodePatchRequest,
  AdminEpisodeUpsertResponse,
  AdminAnimeSegmentsResponse,
  AdminSegmentLibraryAttachRequest,
  AdminSegmentLibraryCandidatesResponse,
  AdminSegmentSuggestionsResponse,
  AdminThemeSegment,
  AdminThemeSegmentCreateRequest,
  AdminThemeSegmentPatchRequest,
} from "@/types/admin";
import {
  AnimeBackdropResponse,
  AnimeDetail,
  AnimeListParams,
  AnimeRelationsResponse,
  EpisodeDetail,
  PaginatedAnimeResponse,
} from "@/types/anime";
import {
  AuthIssueRequest,
  AuthRefreshRequest,
  AuthRevokeRequest,
  AuthTokenData,
  AuthTokenResponse,
  CurrentUserResponse,
} from "@/types/auth";
import {
  ContributorGroupDetailResponse,
  ContributorGroupsResponse,
} from "@/types/contributor";
import {
  GenerateClaimInvitationResponse,
  MemberClaimInvitationResponse,
  MemberClaimRow,
  MemberProfileResponse,
  MemberRequestRow,
  MemberSearchResult,
  PublicMemberProfileResponse,
  UpdateMemberProfileRequest,
} from "@/types/profile";
import {
  CommentCreateRequest,
  CommentCreateResponse,
  PaginatedCommentResponse,
} from "@/types/comment";
import {
  GroupedEpisodesResponse,
  EpisodeVersionCreateRequest,
  EpisodeVersionEditorContextResponse,
  EpisodeVersionFolderScanResponse,
  EpisodeVersionPatchRequest,
  EpisodeVersionResponse,
} from "@/types/episodeVersion";
import {
  EpisodeImportApplyInput,
  EpisodeImportApplyResponse,
  EpisodeImportContextResponse,
  EpisodeImportPreviewResponse,
} from "@/types/episodeImport";
import {
  AnimeFansubListResponse,
  FansubGroupCreateRequest,
  FansubGroupLinkCreateRequest,
  FansubGroupLinkListResponse,
  FansubGroupLinkPatchRequest,
  FansubGroupLinkResponse,
  FansubGroupListResponse,
  FansubGroupPatchRequest,
  FansubGroupResponse,
  FansubMemberResponse,
  FansubMemberCreateRequest,
  FansubMemberListResponse,
  FansubMemberPatchRequest,
  FansubAppMemberCreateRequest,
  FansubAppMemberCandidateSearchResponse,
  FansubGroupInvitationListResponse,
  FansubGroupInvitationCreateRequest,
  FansubGroupInvitationCreateResponse,
  FansubGroupInvitationResponse,
  AcceptFansubInvitationRequest,
  AcceptFansubInvitationResponse,
  FansubAppMemberListResponse,
  FansubAppMemberResponse,
  FansubAppMemberRoleUpdateRequest,
  FansubAppMemberStatusUpdateRequest,
  FansubAppMemberMediaPermissionsUpdateRequest,
  FansubGroupCapabilitiesResponse,
  FansubLeadUpdateRequest,
  AppUserListResponse,
  FansubAliasListResponse,
  FansubAliasResponse,
  FansubAliasCreateRequest,
  FansubStatus,
  MergeFansubsRequest,
  MergeFansubsPreviewResponse,
  MergeFansubsResponse,
  PublicFansubProfileResponse,
  FansubMediaKind,
  FansubMediaUploadResponse,
  AdminFansubAnimeReleasesResponse,
  AdminCanonicalFansubAnimeReleaseResponse,
  AdminReleaseResponse,
  HistFansubGroupMemberListResponse,
  HistFansubGroupMemberResponse,
  CreateGroupMemberRequest,
  UpdateGroupMemberRequest,
  HistGroupMemberRole,
  HistGroupMemberRoleListResponse,
  HistGroupMemberRoleResponse,
  CreateMemberRoleRequest,
  UpdateMemberRoleRequest,
  AnimeContributionListResponse,
  AnimeContributionResponse,
  UpsertAnimeContributionRequest,
  UnifiedGroupMember,
  DefaultCrewEntry,
  EffectiveContributionsResponse,
  FansubGroupRoleItem,
} from "@/types/fansub";
import {
  PaginatedWatchlistResponse,
  WatchlistCreateResponse,
} from "@/types/watchlist";
import {
  ReleaseVersionMediaCategory,
  ReleaseVersionMediaListResponse,
  ReleaseVersionMediaPatchRequest,
  ReleaseVersionMediaReorderRequest,
  ReleaseVersionMediaUploadResponse,
  ReleaseVersionMediaItem,
  ReleaseVersionCapabilitiesResponse,
} from "@/types/releaseVersionMedia";
import {
  GroupDetailResponse,
  GroupReleasesResponse,
  GroupReleasesParams,
} from "@/types/group";
import { GroupAssetsResponse } from "@/types/groupAsset";
import { ReleaseAssetsResponse } from "@/types/mediaAsset";
import {
  FansubGroupNote,
  MemberGroupStory,
  MemberStoryContext,
  MemberStoryContextMember,
  MemberStoryContextRole,
  AnimeFansubProjectNote,
  CreateFansubGroupNoteRequest,
  UpdateFansubGroupNoteRequest,
  CreateMemberGroupStoryRequest,
  UpdateMemberGroupStoryRequest,
  UpsertAnimeFansubProjectNoteRequest,
} from "@/types/fansubNotes";
import {
  ReleaseVersionNote,
  MemberRoleForVersion,
  BulkUpsertReleaseVersionNotesRequest,
} from "@/types/releaseVersionNotes";
import {
  exchangeKeycloakCode,
  isKeycloakEnabled,
  logoutFromKeycloak,
  refreshKeycloakToken,
  type KeycloakTokenBundle,
} from "@/lib/keycloakAuth";
import { getBrowserApiBaseUrl, resolvePublicApiUrl } from "@/lib/publicApiUrl";
import type {
  MeAnimeContributionsResponse,
  MeProjectDetailResponse,
  MeSuggestionsResponse,
  PublicGroupContributionsResponse,
  PublicAnimeContributionsResponse,
  PublicMemberContributionsResponse,
  MemberBadgesResponse,
  MembershipsResponse,
  ProposalFormData,
  GroupProposalsResponse,
  FansubAnimeReleaseVersionsResponse,
} from "@/types/contributions";
import type { DomainProjectionResponse } from "@/types/domain-projection";
import type { MediaOwnershipProjectionResponse } from "@/types/media-ownership";
import type {
  AdminUserListParams,
  AdminUserListResponse,
  AdminUserOverviewResponse,
  AdminUserGlobalRolesResponse,
  AdminUserMemberClaimsResponse,
  AdminUserGroupMembershipsResponse,
  AdminUserGroupRightsResponse,
  AdminUserContributionsResponse,
  AdminUserMediaResponse,
  AdminUserAuditResponse,
} from "@/types/admin-users";
import type {
  GroupContributorsResponse,
  GroupProjectNoteResponse,
  GroupThemesResponse,
  GroupReleaseMediaResponse,
} from "@/types/groupContributors";
import type { RoleCapabilityMatrix, RoleDefinitionOption } from "@/types/admin-capability";

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

/**
 * Gibt die richtige API-Basis-URL zurück — je nachdem ob der Code im Browser
 * oder auf dem Next.js-Server (SSR/RSC) ausgeführt wird.
 * - Browser → öffentliche URL (vom Client erreichbar)
 * - Server  → interne Docker-URL (schneller, kein Umweg über Host)
 */
function getApiBaseUrl(): string {
  return typeof window === "undefined"
    ? API_INTERNAL_BASE_URL
    : getBrowserApiBaseUrl();
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
  conflict: AdminAnimeAniSearchEditConflictResult | null;

  constructor(
    status: number,
    message: string,
    retryAfterSeconds: number | null = null,
    code: string | null = null,
    details: string | null = null,
    conflict: AdminAnimeAniSearchEditConflictResult | null = null,
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

interface AuthorizedRequestOptions extends Omit<RequestInit, "headers"> {
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

export interface AuthSessionSnapshot {
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  displayName: string;
}

interface RuntimeSessionPrivateMeta {
  access_token_expires_at: number;
  refresh_token_expires_at: number;
}

interface CommentListParams {
  page?: number;
  per_page?: number;
}

interface WatchlistListParams {
  page?: number;
  per_page?: number;
}

interface FansubListParams {
  q?: string;
  status?: FansubStatus;
  page?: number;
  per_page?: number;
}

/**
 * Baut den URL-Query-String für die Anime-Listenabfrage.
 * Nur gesetzte Parameter werden angehängt — undefined/null-Werte werden
 * weggelassen damit die URL sauber bleibt. Boolean-Felder (has_cover,
 * include_disabled) werden nur bei explizitem true/false übergeben.
 */
function buildQuery(params: AnimeListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.q) query.set("q", params.q);
  if (params.letter) query.set("letter", params.letter);
  if (params.content_type) query.set("content_type", params.content_type);
  if (params.status) query.set("status", params.status);
  if (typeof params.fansub_id === "number" && params.fansub_id > 0)
    query.set("fansub_id", String(params.fansub_id));
  if (typeof params.has_cover === "boolean")
    query.set("has_cover", String(params.has_cover));
  if (typeof params.include_disabled === "boolean")
    query.set("include_disabled", String(params.include_disabled));

  return query.toString();
}

/** Baut den Query-String für paginierte Kommentar-Abfragen (page + per_page). */
function buildCommentQuery(params: CommentListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));

  return query.toString();
}

/** Baut den Query-String für paginierte Watchlist-Abfragen (page + per_page). */
function buildWatchlistQuery(params: WatchlistListParams): string {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));

  return query.toString();
}

/** Baut den Query-String für Fansub-Listenabfragen (Suche, Status, Pagination). */
function buildFansubListQuery(params: FansubListParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));

  return query.toString();
}

/**
 * Liest einen Cookie-Wert aus document.cookie (nur im Browser verfügbar).
 * Gibt einen leeren String zurück wenn der Cookie nicht existiert oder
 * der Code serverseitig ausgeführt wird.
 */
function readBrowserCookie(name: string): string {
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
 * Schreibt einen Cookie mit SameSite=Lax und konfigurierbarer Lebensdauer.
 * Wird für Auth-Tokens genutzt damit der Token beim Seitenaufruf direkt
 * verfügbar ist — ohne Roundtrip über localStorage.
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
  document.cookie = `${name}=${encodedValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
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

function clearLegacyTokenStorage(): void {
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
    if (
      !Number.isFinite(parsed.app_user_id) ||
      Number(parsed.app_user_id) <= 0
    ) {
      return null;
    }

    return {
      app_user_id: Number(parsed.app_user_id),
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
function resolveAuthToken(authToken?: string): string {
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
function withAuthHeader(
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
async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const parsed = await parseApiErrorPayload(response, fallback);
  return parsed.message;
}

function parsePayloadApiError(
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

export function getRuntimeAuthToken(): string {
  const runtimeToken = resolveAuthToken();
  return runtimeToken.trim();
}

export function getRuntimeRefreshToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  clearLegacyTokenStorage();
  return readBrowserCookie(AUTH_REFRESH_COOKIE_NAME).trim();
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
  };
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

function toRuntimeAuthData(
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

async function getCurrentUserWithBearerToken(
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

export async function resolveCurrentUserFromAuthSession(): Promise<CurrentUserResponse> {
  return getCurrentUser();
}

let runtimeSessionRefreshPromise: Promise<string> | null = null;

async function refreshRuntimeSession(): Promise<string> {
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
  try {
    if (isKeycloakEnabled()) {
      await logoutFromKeycloak(refreshToken || undefined);
    } else {
      await revokeAuthToken(refreshToken ? { refresh_token: refreshToken } : {});
    }
  } finally {
    clearAuthSession();
  }
}

async function authorizedFetch(
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

  const send = (token?: string) => {
    const requestHeaders = { ...headers };
    if (token || !requestHeaders.Authorization) {
      withAuthHeader(requestHeaders, token);
    }
    return fetch(input, {
      ...init,
      headers: requestHeaders,
    });
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

function normalizeCurrentUserResponse(
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

interface AnimeListRequestOptions {
  cache?: RequestCache;
  revalidate?: number;
}

export async function getAnimeList(
  params: AnimeListParams,
  options: AnimeListRequestOptions = {},
): Promise<PaginatedAnimeResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildQuery(params);
  const path =
    params.include_disabled === true ? "/api/v1/admin/anime" : "/api/v1/anime";
  const url = `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;
  const requestInit: AuthorizedRequestOptions & {
    next?: { revalidate: number };
  } = {};
  if (options.cache) {
    requestInit.cache = options.cache;
  }
  if (typeof options.revalidate === "number") {
    requestInit.next = { revalidate: options.revalidate };
  } else if (options.cache !== "no-store") {
    requestInit.next = { revalidate: 30 };
  }

  const response =
    params.include_disabled === true
      ? await authorizedFetch(url, requestInit)
      : await fetch(url, requestInit);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<PaginatedAnimeResponse>;
}

export async function getAnimeByID(
  id: number,
  options: { include_disabled?: boolean } = {},
): Promise<{ data: AnimeDetail }> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  if (typeof options.include_disabled === "boolean")
    query.set("include_disabled", String(options.include_disabled));
  const path =
    options.include_disabled === true
      ? `/api/v1/admin/anime/${id}`
      : `/api/v1/anime/${id}`;
  const url = `${API_BASE_URL}${path}${query.toString() ? `?${query.toString()}` : ""}`;
  const requestInit = {
    next: { revalidate: 30 },
  };
  const response =
    options.include_disabled === true
      ? await authorizedFetch(url, requestInit)
      : await fetch(url, requestInit);

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

  return response.json() as Promise<{ data: AnimeDetail }>;
}

export async function getAnimeBackdrops(
  id: number,
): Promise<AnimeBackdropResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${id}/backdrops`,
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

  return response.json() as Promise<AnimeBackdropResponse>;
}

export async function getAnimeRelations(
  id: number,
): Promise<AnimeRelationsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${id}/relations`,
    {
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { data: [] };
    }
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AnimeRelationsResponse>;
}

export async function getEpisodeByID(
  id: number,
): Promise<{ data: EpisodeDetail }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episodes/${id}`,
    {
      next: { revalidate: 30 },
    },
  );

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<{ data: EpisodeDetail }>;
}

export async function getFansubList(
  params: FansubListParams = {},
): Promise<FansubGroupListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildFansubListQuery(params);
  const url = `${API_BASE_URL}/api/v1/fansubs${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    cache: "no-store",
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

  return response.json() as Promise<FansubGroupListResponse>;
}

export async function getFansubByID(id: number): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansubs/${id}`,
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

  return response.json() as Promise<FansubGroupResponse>;
}

export async function getFansubBySlug(
  slug: string,
): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}`,
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

  return response.json() as Promise<FansubGroupResponse>;
}

export async function getPublicFansubProfileBySlug(
  slug: string,
): Promise<PublicFansubProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}/public-profile`,
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

  return response.json() as Promise<PublicFansubProfileResponse>;
}

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

export async function getGroupedEpisodes(
  animeID: number,
): Promise<GroupedEpisodesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/episodes`,
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

  return response.json() as Promise<GroupedEpisodesResponse>;
}

export async function getEpisodeVersionByID(
  versionID: number,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episode-versions/${versionID}`,
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

  return response.json() as Promise<EpisodeVersionResponse>;
}

export async function getEpisodeVersionEditorContext(
  versionID: number,
  authToken?: string,
): Promise<EpisodeVersionEditorContextResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episode-versions/${versionID}/editor-context`,
    {
      cache: "no-store",
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

  return response.json() as Promise<EpisodeVersionEditorContextResponse>;
}

export async function scanEpisodeVersionFolder(
  versionID: number,
  authToken?: string,
): Promise<EpisodeVersionFolderScanResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episode-versions/${versionID}/folder-scan`,
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

  return response.json() as Promise<EpisodeVersionFolderScanResponse>;
}

export async function createEpisodeVersion(
  animeID: number,
  episodeNumber: number,
  payload: EpisodeVersionCreateRequest,
  authToken?: string,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/episodes/${episodeNumber}/versions`,
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

  return response.json() as Promise<EpisodeVersionResponse>;
}

export async function updateEpisodeVersion(
  versionID: number,
  payload: EpisodeVersionPatchRequest,
  authToken?: string,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episode-versions/${versionID}`,
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

  return response.json() as Promise<EpisodeVersionResponse>;
}

export async function deleteEpisodeVersion(
  versionID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/episode-versions/${versionID}`,
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

interface FansubMediaUploadOptions {
  fansubID: number;
  kind: FansubMediaKind;
  file: File;
  sourceFile?: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

type UploadRetryEligibility =
  | "never"
  | "auth-before-persistence"
  | "idempotent";

interface AuthorizedUploadXhrOptions<T> {
  endpoint: string;
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
    xhr.open("POST", options.endpoint, true);
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

async function authorizedUploadXhr<T>(
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

export async function uploadFansubMedia(
  options: FansubMediaUploadOptions,
): Promise<FansubMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/media`;
  return authorizedUploadXhr<FansubMediaUploadResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("kind", options.kind);
      body.set("file", options.file);
      if (options.sourceFile) body.set("source_file", options.sourceFile);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}

export async function uploadFansubGroupMedia(options: {
  fansubID: number;
  files: File[];
  category: FansubGroupMediaCategory;
  visibilityCode?: string;
  reviewStatusCode?: string;
  onProgress?: (progress: number) => void;
}): Promise<FansubGroupMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/media`;
  return authorizedUploadXhr<FansubGroupMediaUploadResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("kind", "image");
      body.set("category", options.category);
      for (const file of options.files) {
        body.append("files[]", file);
      }
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}

export async function deleteFansubMedia(
  fansubID: number,
  kind: FansubMediaKind,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/media/${kind}`,
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

export async function deleteFansubGroupMedia(
  fansubID: number,
  mediaId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/media/${mediaId}`,
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

// --- Phase 78: Gruppenmedien-Review (Lock K, D-05/D-06/D-08/D-09) ---

/**
 * Kanonische Sichtbarkeitswerte für Gruppenmedien.
 * Quelle: 78-RESEARCH.md "Offene Fragen (RESOLVED)"
 */
export type FansubMediaVisibility = "intern" | "oeffentlich";

/**
 * Kanonische Prüfstatuswerte für Gruppenmedien.
 * Quelle: 78-RESEARCH.md "Offene Fragen (RESOLVED)"
 */
export type FansubMediaReviewStatus =
  | "in_pruefung"
  | "freigegeben"
  | "abgelehnt"
  | "archiviert"
  | "entfernt";

export type FansubGroupMediaCategory =
  | "gallery"
  | "history_screenshot"
  | "old_website"
  | "forum"
  | "irc_chat"
  | "event_meeting"
  | "artwork_fanart"
  | "other";

export interface FansubGroupMediaUploadResult {
  client_file_name: string;
  status: "ready" | "failed";
  media_asset_id?: number;
  preview_url?: string;
  thumbnail_url?: string;
  original_url?: string;
  error_code?: string;
  message?: string;
}

export interface FansubGroupMediaUploadResponse {
  results: FansubGroupMediaUploadResult[];
}

/**
 * Ein Medieneintrag einer Fansub-Gruppe mit Sichtbarkeit, Prüfstatus und Owner-Konsistenz-Flag.
 * Entspricht FansubGroupMediaItem im Contract admin-content.yaml (Phase 78, Lock K).
 * owner_consistent zeigt NUR an, ob das Medium korrekt zur Gruppe gehört — kein Setter (D-05).
 */
export interface FansubGroupMediaItem {
  id: number;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  original_url?: string | null;
  visibility: FansubMediaVisibility | null;
  review_status: FansubMediaReviewStatus | null;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  category: FansubGroupMediaCategory;
  sort_order: number;
  uploaded_by_display_name?: string | null;
  uploaded_by_current_user?: boolean;
  created_at: string;
  updated_at?: string | null;
  owner_type: string;
  owner_id: number;
  owner_consistent: boolean;
}

/**
 * Listenantwort für Gruppenmedien-Review.
 * Entspricht FansubGroupMediaListResponse im Contract admin-content.yaml (Phase 78, Lock K).
 */
export interface FansubGroupMediaListResponse {
  data: FansubGroupMediaItem[];
}

/**
 * Patch-Body für Gruppenmedien-Review.
 * Mindestens eines der Felder muss angegeben werden.
 */
export interface FansubMediaReviewPatch {
  visibility?: FansubMediaVisibility;
  review_status?: FansubMediaReviewStatus;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  category?: FansubGroupMediaCategory;
  sort_order?: number;
}

export interface FansubGroupMediaReorderRequest {
  mediaIds: number[];
}

/**
 * Liest alle Gruppenmedien einer Fansub-Gruppe für den Review-Tab.
 * GET /api/v1/admin/fansubs/{fansubId}/media
 *
 * Lese-Quelle für GroupMediaReviewSection (78-04). Gegated (ActionFansubGroupEdit, D-08).
 * Scoped strikt auf fansubId (D-04).
 */
export async function listFansubGroupMedia(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupMediaItem[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/media`,
    {
      method: "GET",
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

  const body: FansubGroupMediaListResponse = await response.json();
  return body.data;
}

/**
 * Setzt Sichtbarkeit und/oder Prüfstatus eines Gruppenmediums.
 * PATCH /api/v1/admin/fansubs/{fansubId}/media/{mediaId}
 *
 * Mutation für GroupMediaReviewSection (78-04). Gegated (ActionFansubGroupEdit, D-08).
 * Ungültige Enum-Werte werden serverseitig mit 400 abgelehnt (V5).
 */
export async function patchFansubMediaReview(
  fansubId: number,
  mediaId: number,
  patch: FansubMediaReviewPatch,
  authToken?: string,
): Promise<{ message: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/media/${mediaId}`,
    {
      method: "PATCH",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      body: JSON.stringify(patch),
    },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json();
}

/**
 * Persistiert die globale Reihenfolge aller Gruppenmedien einer Fansub-Gruppe.
 * PATCH /api/v1/admin/fansubs/{fansubId}/media/reorder
 *
 * Frontend sendet nur Medien-IDs; das Backend normalisiert sort_order.
 */
export async function reorderFansubGroupMedia(
  fansubId: number,
  body: FansubGroupMediaReorderRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/media/reorder`,
    {
      method: "PATCH",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      body: JSON.stringify(body),
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

// --- Ende Phase 78 Gruppenmedien-Review ---

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

export async function getAnimeComments(
  id: number,
  params: CommentListParams = {},
): Promise<PaginatedCommentResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildCommentQuery(params);
  const url = `${API_BASE_URL}/api/v1/anime/${id}/comments${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<PaginatedCommentResponse>;
}

export async function createAnimeComment(
  id: number,
  payload: CommentCreateRequest,
  authToken?: string,
): Promise<CommentCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const headers = withAuthHeader(
    {
      "Content-Type": "application/json",
    },
    authToken,
  );

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${id}/comments`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : Number.NaN;
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      message,
      Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds,
    );
  }

  return response.json() as Promise<CommentCreateResponse>;
}

export async function getWatchlist(
  params: WatchlistListParams = {},
  authToken?: string,
): Promise<PaginatedWatchlistResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildWatchlistQuery(params);
  const url = `${API_BASE_URL}/api/v1/watchlist${query ? `?${query}` : ""}`;
  const response = await authorizedFetch(url, {
    authToken,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<PaginatedWatchlistResponse>;
}

export async function addWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/watchlist`, {
    method: "POST",
    headers: withAuthHeader(
      {
        "Content-Type": "application/json",
      },
      authToken,
    ),
    body: JSON.stringify({ anime_id: animeID }),
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<WatchlistCreateResponse>;
}

export async function getWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/watchlist/${animeID}`,
    {
      headers: withAuthHeader({}, authToken),
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

  return response.json() as Promise<WatchlistCreateResponse>;
}

export async function removeWatchlistEntry(
  animeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/watchlist/${animeID}`,
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

export async function getOwnProfile(
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/profile`, {
    cache: "no-store",
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

  return response.json() as Promise<MemberProfileResponse>;
}

export async function getMemberProfile(
  slug: string,
  authToken?: string,
): Promise<PublicMemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/members/${encodedSlug}`,
    {
      cache: "no-store",
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

  return response.json() as Promise<PublicMemberProfileResponse>;
}

export async function getMyMemberClaim(
  authToken?: string,
): Promise<MemberClaimRow | null> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-claim`,
    {
      cache: "no-store",
      authToken,
    },
  );

  if (response.status === 404) {
    return null;
  }
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

  const payload = (await response.json()) as { data: MemberClaimRow };
  return payload.data;
}

export async function searchHistoricalMembers(
  q: string,
  authToken?: string,
): Promise<MemberSearchResult[]> {
  const API_BASE_URL = getApiBaseUrl();
  const query = encodeURIComponent(q);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-search?q=${query}`,
    {
      cache: "no-store",
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

  const payload = (await response.json()) as { data: MemberSearchResult[] };
  return payload.data;
}

export async function submitMemberClaim(
  payload: { member_id: number; note?: string },
  authToken?: string,
): Promise<MemberClaimRow> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-claims`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  const body = (await response.json()) as { data: MemberClaimRow };
  return body.data;
}

export async function submitMemberCorrection(
  memberId: number,
  payload: { targetType: string; targetId?: number | null; reasonText: string },
  authToken?: string,
): Promise<{ id: number; status: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/members/${memberId}/correction`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: payload.targetType,
        target_id: payload.targetId ?? null,
        reason_text: payload.reasonText,
      }),
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

  const body = (await response.json()) as { data: { id: number; status: string } };
  return body.data;
}

export async function patchNoindex(
  noindex: boolean,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/profile/noindex`,
    {
      method: "PATCH",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noindex }),
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

export async function submitMemberRequest(
  payload: { note?: string },
  authToken?: string,
): Promise<MemberRequestRow> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/member-requests`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  const body = (await response.json()) as { data: MemberRequestRow };
  return body.data;
}

export async function getMyFansubGroups(
  authToken?: string,
): Promise<ContributorGroupsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/fansub-groups`,
    {
      cache: "no-store",
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

  return response.json() as Promise<ContributorGroupsResponse>;
}

export async function getMyFansubGroupDetail(
  fansubGroupId: number,
  authToken?: string,
): Promise<ContributorGroupDetailResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/fansub-groups/${fansubGroupId}`,
    {
      cache: "no-store",
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

  return response.json() as Promise<ContributorGroupDetailResponse>;
}

export async function updateOwnProfile(
  payload: UpdateMemberProfileRequest,
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/profile`, {
    method: "PUT",
    authToken,
    headers: { "Content-Type": "application/json" },
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

  return response.json() as Promise<MemberProfileResponse>;
}

type OwnProfileAvatarUploadInput = File | {
  sourceFile: File;
  croppedFile: File;
  visibilityCode?: string;
  reviewStatusCode?: string;
};

export async function uploadOwnProfileAvatar(
  input: OwnProfileAvatarUploadInput,
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const body = new FormData();
  if (input instanceof File) {
    body.append("file", input);
  } else {
    body.append("source_file", input.sourceFile);
    body.append("cropped_file", input.croppedFile);
    if (input.visibilityCode) body.set("visibility_code", input.visibilityCode);
    if (input.reviewStatusCode) body.set("review_status_code", input.reviewStatusCode);
  }

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/profile/avatar`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body,
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

  return response.json() as Promise<MemberProfileResponse>;
}

type OwnProfileBackgroundUploadInput = File | {
  sourceFile?: File;
  croppedFile: File;
  visibilityCode?: string;
  reviewStatusCode?: string;
};

export async function uploadOwnProfileBackground(
  input: OwnProfileBackgroundUploadInput,
  authToken?: string,
): Promise<MemberProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const body = new FormData();
  if (input instanceof File) {
    body.append("file", input);
  } else {
    if (input.sourceFile) {
      body.append("source_file", input.sourceFile);
    }
    body.append("cropped_file", input.croppedFile);
    if (input.visibilityCode) body.set("visibility_code", input.visibilityCode);
    if (input.reviewStatusCode) body.set("review_status_code", input.reviewStatusCode);
  }

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/profile/background`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body,
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

  return response.json() as Promise<MemberProfileResponse>;
}

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

// ---------------------------------------------------------------------------
// Phase 80: Admin-User-Verwaltung + Rechte-Zentrale
// Alle Helper nutzen apiClientFetch (zentraler Auth-Refresh-Seam, Lock K).
// ---------------------------------------------------------------------------

/** Paginierte Admin-User-Liste mit allen D-05-Aggregat-Counts. */
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

/** Übersicht-Tab eines Users inkl. Conflict-Aufschlüsselung (D-19). */
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

/** Globale Rollen eines Users. */
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

/** Weist einem User eine globale Rolle zu (PUT). */
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

/** Entzieht einem User eine globale Rolle (DELETE). */
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

/** Ändert den Account-Status eines Users (active|disabled). */
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

/** Claims-Tab: Member-Profil + alle Claims eines Users. */
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

/** Gruppenmitgliedschaften-Tab. */
export async function getAdminUserGroupMemberships(
  userId: number,
): Promise<AdminUserGroupMembershipsResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/group-memberships`,
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

/** Gruppenrechte-Tab (scoped, read-only, D-03). */
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

/** Contributions-Tab (D-12/D-13, member_id-Anker). */
export async function getAdminUserContributions(
  userId: number,
): Promise<AdminUserContributionsResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/contributions`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserContributionsResponse>;
}

/** Medien-Tab: Medien-Uploads eines Users. */
export async function getAdminUserMedia(
  userId: number,
): Promise<AdminUserMediaResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/media`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserMediaResponse>;
}

/** Audit-Tab: Audit-Timeline (actor oder target = userId). */
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

export async function listFansubAppMembers(
  fansubId: number,
  authToken?: string,
): Promise<FansubAppMemberListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members`,
    {
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

  return response.json() as Promise<FansubAppMemberListResponse>;
}

export async function searchFansubAppMemberCandidates(
  fansubId: number,
  query: string,
  authToken?: string,
): Promise<FansubAppMemberCandidateSearchResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("q", query);

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-member-candidates?${params.toString()}`,
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

  return response.json() as Promise<FansubAppMemberCandidateSearchResponse>;
}

export async function getFansubGroupCapabilities(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupCapabilitiesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/capabilities`,
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

  return response.json() as Promise<FansubGroupCapabilitiesResponse>;
}

export async function createFansubAppMember(
  fansubId: number,
  payload: FansubAppMemberCreateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function listFansubGroupInvitations(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupInvitationListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/invitations`,
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

  return response.json() as Promise<FansubGroupInvitationListResponse>;
}

export async function createFansubGroupInvitation(
  fansubId: number,
  payload: FansubGroupInvitationCreateRequest,
  authToken?: string,
): Promise<FansubGroupInvitationCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/invitations`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  return response.json() as Promise<FansubGroupInvitationCreateResponse>;
}

export async function cancelFansubGroupInvitation(
  fansubId: number,
  invitationId: number,
  authToken?: string,
): Promise<FansubGroupInvitationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/invitations/${invitationId}/cancel`,
    {
      method: "POST",
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

  return response.json() as Promise<FansubGroupInvitationResponse>;
}

export async function acceptFansubInvitation(
  payload: AcceptFansubInvitationRequest,
  authToken?: string,
): Promise<AcceptFansubInvitationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/invitations/accept`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  return response.json() as Promise<AcceptFansubInvitationResponse>;
}

export async function acceptClaimInvitation(
  payload: { token: string },
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/claim-invitations/accept`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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
}

export async function generateClaimInvitation(
  fansubId: number,
  memberId: number,
  authToken?: string,
): Promise<GenerateClaimInvitationResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}/claim-invitations`,
    {
      method: "POST",
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

  const payload = (await response.json()) as {
    data: GenerateClaimInvitationResponse;
  };
  return payload.data;
}

export async function listClaimInvitations(
  fansubId: number,
  memberId: number,
  authToken?: string,
): Promise<MemberClaimInvitationResponse[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}/claim-invitations`,
    {
      cache: "no-store",
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

  const payload = (await response.json()) as {
    data: MemberClaimInvitationResponse[];
  };
  return payload.data;
}

export async function cancelClaimInvitation(
  fansubId: number,
  memberId: number,
  invitationId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/group-members/${memberId}/claim-invitations/${invitationId}/cancel`,
    {
      method: "POST",
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

export async function listPendingMemberClaims(
  fansubId: number,
  authToken?: string,
): Promise<MemberClaimRow[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-claims`,
    {
      cache: "no-store",
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

  const payload = (await response.json()) as { data: MemberClaimRow[] };
  return payload.data;
}

export async function verifyMemberClaim(
  fansubId: number,
  claimId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-claims/${claimId}/verify`,
    {
      method: "POST",
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

export async function rejectMemberClaim(
  fansubId: number,
  claimId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-claims/${claimId}/reject`,
    {
      method: "POST",
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

export async function listMemberRequests(
  authToken?: string,
): Promise<MemberRequestRow[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/member-requests`,
    {
      cache: "no-store",
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

  const payload = (await response.json()) as { data: MemberRequestRow[] };
  return payload.data;
}

export async function approveMemberRequest(
  requestId: number,
  payload: { nickname: string },
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/member-requests/${requestId}/approve`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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
}

export async function rejectMemberRequest(
  requestId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/member-requests/${requestId}/reject`,
    {
      method: "POST",
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

export async function updateFansubLeadRole(
  fansubId: number,
  appUserId: number,
  payload: FansubLeadUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/roles/fansub-lead`,
    {
      method: "PUT",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function updateFansubAppMemberRole(
  fansubId: number,
  appUserId: number,
  payload: FansubAppMemberRoleUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/roles`,
    {
      method: "PUT",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function updateFansubAppMemberStatus(
  fansubId: number,
  appUserId: number,
  payload: FansubAppMemberStatusUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/status`,
    {
      method: "PUT",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  return response.json() as Promise<FansubAppMemberResponse>;
}

export async function updateFansubAppMemberMediaPermissions(
  fansubId: number,
  appUserId: number,
  payload: FansubAppMemberMediaPermissionsUpdateRequest,
  authToken?: string,
): Promise<FansubAppMemberResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/app-members/${appUserId}/media-permissions`,
    {
      method: "PUT",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  return response.json() as Promise<FansubAppMemberResponse>;
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

export async function syncAdminAnimeFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinSyncRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinSyncResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/sync`,
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

  return response.json() as Promise<AdminAnimeJellyfinSyncResponse>;
}

export async function searchAdminJellyfinSeries(
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminJellyfinSeriesSearchResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const search = new URLSearchParams();
  search.set("q", query);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    search.set("limit", String(params.limit));

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/jellyfin/series?${search.toString()}`,
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

  return response.json() as Promise<AdminJellyfinSeriesSearchResponse>;
}

export async function previewAdminAnimeFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinSyncRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/preview`,
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

  return response.json() as Promise<AdminAnimeJellyfinPreviewResponse>;
}

export async function getAdminAnimeJellyfinContext(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeJellyfinContextResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/context`,
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

  return response.json() as Promise<AdminAnimeJellyfinContextResponse>;
}

export async function previewAdminAnimeMetadataFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinMetadataPreviewRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinMetadataPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/metadata/preview`,
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

  return response.json() as Promise<AdminAnimeJellyfinMetadataPreviewResponse>;
}

export async function applyAdminAnimeMetadataFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinMetadataApplyRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinMetadataApplyResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/metadata/apply`,
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

  return response.json() as Promise<AdminAnimeJellyfinMetadataApplyResponse>;
}

interface AdminAnimeMediaUploadOptions {
  animeID: number;
  assetType: AdminAnimeUploadAssetType;
  file: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

export async function uploadAdminAnimeMedia(
  options: AdminAnimeMediaUploadOptions,
): Promise<AdminMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/upload`;
  return authorizedUploadXhr<AdminMediaUploadResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("entity_type", "anime");
      body.set("entity_id", String(options.animeID));
      body.set("asset_type", options.assetType);
      body.set("file", options.file);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}
export async function assignAdminAnimeBannerAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, "banner", mediaID, authToken);
}

export async function assignAdminAnimeCoverAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, "cover", mediaID, authToken);
}

export async function assignAdminAnimeLogoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, "logo", mediaID, authToken);
}

export async function assignAdminAnimeBackgroundVideoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(
    animeID,
    "background_video",
    mediaID,
    authToken,
  );
}

export async function addAdminAnimeBackgroundVideoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/background_videos`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify({ media_id: mediaID }),
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

export async function getAdminFansubAnime(
  fansubID: number,
  authToken?: string,
): Promise<AdminFansubAnimeListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime`,
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

  return response.json() as Promise<AdminFansubAnimeListResponse>;
}

export async function getAdminReleaseThemeAssets(
  releaseID: number,
  authToken?: string,
): Promise<AdminReleaseThemeAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/releases/${releaseID}/theme-assets`,
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

  return response.json() as Promise<AdminReleaseThemeAssetsResponse>;
}

export async function getAdminFansubAnimeThemeAssets(
  fansubID: number,
  animeID: number,
  authToken?: string,
): Promise<AdminFansubAnimeThemeAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/theme-assets`,
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

  return response.json() as Promise<AdminFansubAnimeThemeAssetsResponse>;
}

interface AdminReleaseThemeAssetUploadOptions {
  fansubID: number;
  animeID: number;
  themeID: number;
  file: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

interface AdminReleaseThemeAssetUploadForReleaseOptions {
  releaseID: number;
  themeID: number;
  file: File;
  authToken?: string;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

export async function uploadAdminReleaseThemeAsset(
  options: AdminReleaseThemeAssetUploadOptions,
): Promise<AdminReleaseThemeAssetCreateResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/anime/${options.animeID}/theme-assets`;
  return authorizedUploadXhr<AdminReleaseThemeAssetCreateResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("theme_id", String(options.themeID));
      body.set("file", options.file);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}
export async function uploadAdminReleaseThemeAssetForRelease(
  options: AdminReleaseThemeAssetUploadForReleaseOptions,
): Promise<AdminReleaseThemeAssetCreateResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/releases/${options.releaseID}/theme-assets`;
  return authorizedUploadXhr<AdminReleaseThemeAssetCreateResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("theme_id", String(options.themeID));
      body.set("file", options.file);
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}
export async function deleteAdminReleaseThemeAsset(
  releaseID: number,
  themeID: number,
  mediaID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/releases/${releaseID}/theme-assets/${themeID}/${mediaID}`,
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

// --- Explicit release context helpers (Phase 30) ---
// These helpers load release identity directly from the dedicated release endpoints
// so callers do not have to infer release_id from theme-asset helper responses.

/** Lists all releases for a fansub + anime combination. */
export async function getAdminFansubAnimeReleases(
  fansubID: number,
  animeID: number,
  params: { page?: number; per_page?: number } = {},
  authToken?: string,
): Promise<AdminFansubAnimeReleasesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  if (params.page && Number.isFinite(params.page) && params.page > 0) {
    query.set("page", String(params.page));
  }
  if (params.per_page && Number.isFinite(params.per_page) && params.per_page > 0) {
    query.set("per_page", String(params.per_page));
  }
  const queryString = query.toString();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/releases${queryString ? `?${queryString}` : ""}`,
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

  return response.json() as Promise<AdminFansubAnimeReleasesResponse>;
}

/** Resolves the canonical release anchor for a fansub + anime combination.
 * Returns release: null when no canonical release exists — callers must handle the nil case. */
export async function getAdminCanonicalFansubRelease(
  fansubID: number,
  animeID: number,
  authToken?: string,
): Promise<AdminCanonicalFansubAnimeReleaseResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/releases/canonical`,
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

  return response.json() as Promise<AdminCanonicalFansubAnimeReleaseResponse>;
}

/** Fetches a release summary directly by releaseId. */
export async function getAdminRelease(
  releaseID: number,
  authToken?: string,
): Promise<AdminReleaseResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/releases/${releaseID}`,
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

  return response.json() as Promise<AdminReleaseResponse>;
}

async function assignAdminAnimeSingularAsset(
  animeID: number,
  assetKind: Exclude<AdminAnimeAssetKind, "background">,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/${assetKind}`,
    {
      method: "PUT",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify({ media_id: mediaID }),
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

export async function deleteAdminAnimeCoverAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/cover`,
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

export async function deleteAdminAnimeBannerAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, "banner", authToken);
}

export async function deleteAdminAnimeLogoAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, "logo", authToken);
}

export async function deleteAdminAnimeBackgroundVideoAsset(
  animeID: number,
  authToken?: string,
): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, "background_video", authToken);
}

async function deleteAdminAnimeSingularAsset(
  animeID: number,
  assetKind: Exclude<AdminAnimeAssetKind, "background">,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/${assetKind}`,
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

export async function addAdminAnimeBackgroundAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
  providerKey?: string,
): Promise<AdminAnimeBackgroundAssetResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const body: Record<string, string> = { media_id: mediaID };
  if (providerKey) body.provider_key = providerKey;
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/backgrounds`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
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

  return response.json() as Promise<AdminAnimeBackgroundAssetResponse>;
}

export async function deleteAdminAnimeBackgroundAsset(
  animeID: number,
  backgroundID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/backgrounds/${backgroundID}`,
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

export async function createAdminEpisode(
  payload: AdminEpisodeCreateRequest,
  authToken?: string,
): Promise<AdminEpisodeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episodes`,
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

  return response.json() as Promise<AdminEpisodeUpsertResponse>;
}

export async function updateAdminEpisode(
  episodeID: number,
  payload: AdminEpisodePatchRequest,
  authToken?: string,
): Promise<AdminEpisodeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episodes/${episodeID}`,
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

  return response.json() as Promise<AdminEpisodeUpsertResponse>;
}

export async function deleteAdminEpisode(
  episodeID: number,
  authToken?: string,
): Promise<AdminEpisodeDeleteResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/episodes/${episodeID}`,
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

  return response.json() as Promise<AdminEpisodeDeleteResponse>;
}

export async function getEpisodeImportContext(
  animeID: number,
  authToken?: string,
): Promise<EpisodeImportContextResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/context`,
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

  return response.json() as Promise<EpisodeImportContextResponse>;
}

export async function previewEpisodeImport(
  animeID: number,
  payload: {
    anisearch_id?: string;
    jellyfin_series_id?: string;
    season_offset?: number;
  },
  authToken?: string,
): Promise<EpisodeImportPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/preview`,
    {
      method: "POST",
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

  return response.json() as Promise<EpisodeImportPreviewResponse>;
}

export async function applyEpisodeImport(
  animeID: number,
  payload: EpisodeImportApplyInput,
  authToken?: string,
): Promise<EpisodeImportApplyResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/apply`,
    {
      method: "POST",
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

  return response.json() as Promise<EpisodeImportApplyResponse>;
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

export async function getAdminAnimeRelations(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeRelationsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations`,
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

  return response.json() as Promise<AdminAnimeRelationsResponse>;
}

export async function searchAdminAnimeRelationTargets(
  animeID: number,
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminAnimeRelationTargetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const search = new URLSearchParams();
  search.set("q", query);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    search.set("limit", String(params.limit));

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relation-targets?${search.toString()}`,
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

  return response.json() as Promise<AdminAnimeRelationTargetsResponse>;
}

export async function createAdminAnimeRelation(
  animeID: number,
  payload: AdminAnimeRelationCreateRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations`,
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
}

export async function updateAdminAnimeRelation(
  animeID: number,
  targetAnimeID: number,
  payload: AdminAnimeRelationUpdateRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations/${targetAnimeID}`,
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
}

export async function deleteAdminAnimeRelation(
  animeID: number,
  targetAnimeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations/${targetAnimeID}`,
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

export async function getAdminThemeTypes(
  authToken?: string,
): Promise<AdminThemeTypesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/theme-types`,
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

  return response.json() as Promise<AdminThemeTypesResponse>;
}

export async function getAdminAnimeThemes(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeThemesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes`,
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

  return response.json() as Promise<AdminAnimeThemesResponse>;
}

export async function createAdminAnimeTheme(
  animeID: number,
  payload: AdminAnimeThemeCreateRequest,
  authToken?: string,
): Promise<AdminAnimeThemeCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes`,
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

  return response.json() as Promise<AdminAnimeThemeCreateResponse>;
}

export async function updateAdminAnimeTheme(
  animeID: number,
  themeID: number,
  payload: AdminAnimeThemePatchRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}`,
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
}

export async function deleteAdminAnimeTheme(
  animeID: number,
  themeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}`,
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

export async function getAdminAnimeThemeSegments(
  animeID: number,
  themeID: number,
  authToken?: string,
): Promise<AdminAnimeThemeSegmentsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/segments`,
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

  const payload = (await response.json()) as AdminAnimeThemeSegmentsResponse;
  return {
    data: payload.data.filter((segment) => segment.theme_id === themeID),
  };
}

export async function createAdminAnimeThemeSegment(
  animeID: number,
  themeID: number,
  payload: AdminAnimeThemeSegmentCreateRequest,
  authToken?: string,
): Promise<AdminAnimeThemeSegmentCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/segments`,
    {
      method: "POST",
      headers: withAuthHeader(
        {
          "Content-Type": "application/json",
        },
        authToken,
      ),
      body: JSON.stringify({ ...payload, theme_id: themeID }),
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

  return response.json() as Promise<AdminAnimeThemeSegmentCreateResponse>;
}

export async function deleteAdminAnimeThemeSegment(
  animeID: number,
  themeID: number,
  segmentID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/segments/${segmentID}`,
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

export async function deleteUploadedCoverFile(fileName: string): Promise<void> {
  const response = await fetch("/api/admin/upload-cover", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_name: fileName }),
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
}

export async function getAdminGenreTokens(
  params: { q?: string; query?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminGenreTokensResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  const genreQuery = (params.query || params.q || "").trim();
  if (genreQuery) query.set("query", genreQuery);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    query.set("limit", String(params.limit));
  const url = `${API_BASE_URL}/api/v1/genres${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await authorizedFetch(url, {
    authToken,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AdminGenreTokensResponse>;
}

// getAdminTagTokens fetches normalized tag tokens from the dedicated admin tag
// endpoint. Mirrors getAdminGenreTokens so the two token sources stay parallel
// in both call signature and auth-header handling.
export async function getAdminTagTokens(
  params: { query?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminTagTokensResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  const tagQuery = (params.query || "").trim();
  if (tagQuery) query.set("query", tagQuery);
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0)
    query.set("limit", String(params.limit));
  const url = `${API_BASE_URL}/api/v1/admin/tags${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await authorizedFetch(url, {
    authToken,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<AdminTagTokensResponse>;
}

// Fansub merge operations
export async function mergeFansubsPreview(
  payload: MergeFansubsRequest,
  authToken?: string,
): Promise<MergeFansubsPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/merge/preview`,
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

  return response.json() as Promise<MergeFansubsPreviewResponse>;
}

export async function mergeFansubs(
  payload: MergeFansubsRequest,
  authToken?: string,
): Promise<MergeFansubsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/merge`,
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

  return response.json() as Promise<MergeFansubsResponse>;
}

export async function syncEpisode(
  animeID: number,
  episodeID: number,
  authToken?: string,
): Promise<{ data: { success: boolean; message?: string } }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeID}/episodes/${episodeID}/sync`,
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
    data: { success: boolean; message?: string };
  }>;
}

// Group operations
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

// --- Öffentliche Gruppen-Projektions-Endpunkte (Phase 75) ---

export async function getGroupContributors(
  animeID: number,
  groupID: number,
): Promise<GroupContributorsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/contributors`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupContributorsResponse>;
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

export async function getGroupProjectNote(
  animeID: number,
  groupID: number,
): Promise<GroupProjectNoteResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/project-note`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<GroupProjectNoteResponse>;
}

export async function getReleaseAssets(
  releaseID: number,
): Promise<ReleaseAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/releases/${releaseID}/assets`,
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

  return response.json() as Promise<ReleaseAssetsResponse>;
}

// --- Release-Segmente (OP/ED Timing) (Phase 24) ---

export async function getAnimeSegments(
  animeId: number,
  groupId: number | null,
  version: string | null,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminAnimeSegmentsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (groupId) params.set("group_id", String(groupId));
  if (version) params.set("version", version);
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments${qs}`,
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

  return response.json() as Promise<AdminAnimeSegmentsResponse>;
}

export async function createAnimeSegment(
  animeId: number,
  input: AdminThemeSegmentCreateRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments${qs}`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(input),
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

export async function updateAnimeSegment(
  animeId: number,
  segmentId: number,
  input: AdminThemeSegmentPatchRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}${qs}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(input),
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

export async function deleteAnimeSegment(
  animeId: number,
  segmentId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}`,
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

/**
 * Laedt Segment-Vorschläge für einen Anime und eine Episodennummer aus anderen Releases.
 * Optional kann die aktuelle (excludeGroupId, excludeVersion)-Kombination ausgeschlossen werden.
 */
export async function getAnimeSegmentSuggestions(
  animeId: number,
  episode: number,
  excludeGroupId?: number | null,
  excludeVersion?: string | null,
  authToken?: string,
): Promise<AdminSegmentSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("episode", String(episode));
  if (excludeGroupId) params.set("exclude_group_id", String(excludeGroupId));
  if (excludeVersion) params.set("exclude_version", excludeVersion);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/suggestions?${params.toString()}`,
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

  return response.json() as Promise<AdminSegmentSuggestionsResponse>;
}

export async function getSegmentLibraryCandidates(
  animeId: number,
  groupId: number,
  kind: string,
  name?: string | null,
  authToken?: string,
): Promise<AdminSegmentLibraryCandidatesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("group_id", String(groupId));
  params.set("kind", kind);
  if (name?.trim()) params.set("name", name.trim());

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/library-candidates?${params.toString()}`,
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

  return response.json() as Promise<AdminSegmentLibraryCandidatesResponse>;
}

export async function attachSegmentLibraryAsset(
  animeId: number,
  segmentId: number,
  payload: AdminSegmentLibraryAttachRequest,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/reuse`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Laedt eine Videodatei als Segment-Asset hoch und aktualisiert die Source-Felder des Segments.
 * Sendet multipart/form-data mit dem Feld "file".
 * Gibt das aktualisierte Segment zurück.
 */
export async function uploadSegmentAsset(
  animeId: number,
  segmentId: number,
  file: File,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body: formData,
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Loescht das Segment-Asset: leert Source-Felder, loescht Datei und media_assets-Eintrag.
 */
export async function deleteSegmentAsset(
  animeId: number,
  segmentId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset`,
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

// --- Release-Version Media ---

export async function getReleaseVersionMedia(
  versionId: number,
  authToken?: string,
): Promise<ReleaseVersionMediaListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media`,
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

  return response.json() as Promise<ReleaseVersionMediaListResponse>;
}

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

export interface UploadReleaseVersionMediaOptions {
  versionId: number;
  category: ReleaseVersionMediaCategory;
  files: File[];
  onProgress?: (fileIndex: number, percent: number) => void;
  authToken?: string;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

export async function uploadReleaseVersionMedia(
  options: UploadReleaseVersionMediaOptions,
): Promise<ReleaseVersionMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }

  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/release-versions/${options.versionId}/media`;
  return authorizedUploadXhr<ReleaseVersionMediaUploadResponse>({
    endpoint,
    retryEligibility: "never",
    onProgress: options.onProgress
      ? (percent) => options.onProgress?.(0, percent)
      : undefined,
    buildBody: () => {
      const body = new FormData();
      body.set("category", options.category);
      for (const file of options.files) {
        body.append("files[]", file);
      }
      if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
      if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
      return body;
    },
  });
}
export async function patchReleaseVersionMediaItem(
  versionId: number,
  mediaId: number,
  patch: ReleaseVersionMediaPatchRequest,
  authToken?: string,
): Promise<ReleaseVersionMediaItem> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/${mediaId}`,
    {
      method: "PATCH",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
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

  return response.json() as Promise<ReleaseVersionMediaItem>;
}

export async function deleteReleaseVersionMediaItem(
  versionId: number,
  mediaId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/${mediaId}`,
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

export async function reorderReleaseVersionMedia(
  versionId: number,
  body: ReleaseVersionMediaReorderRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/media/reorder`,
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
}

// ---- Fansub Group Notes ----

type RawFansubGroupNote = {
  ID: number;
  FansubGroupID: number;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawMemberGroupStory = {
  ID: number;
  FansubGroupID: number;
  MemberID: number;
  RoleID: number | null;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawAnimeFansubProjectNote = {
  ID: number;
  AnimeID: number;
  FansubGroupID: number;
  Title: string;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawMemberStoryContextMember = {
  ID: number;
  Nickname: string;
};

type RawMemberStoryContextRole = {
  ID: number;
  Name: string;
  Label: string;
};

function mapFansubGroupNote(raw: RawFansubGroupNote): FansubGroupNote {
  return {
    id: raw.ID,
    fansubGroupId: raw.FansubGroupID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapMemberGroupStory(raw: RawMemberGroupStory): MemberGroupStory {
  return {
    id: raw.ID,
    fansubGroupId: raw.FansubGroupID,
    memberId: raw.MemberID,
    roleId: raw.RoleID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapAnimeFansubProjectNote(
  raw: RawAnimeFansubProjectNote,
): AnimeFansubProjectNote {
  return {
    id: raw.ID,
    animeId: raw.AnimeID,
    fansubGroupId: raw.FansubGroupID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

function mapMemberStoryContextMember(
  raw: RawMemberStoryContextMember,
): MemberStoryContextMember {
  return {
    id: raw.ID,
    nickname: raw.Nickname,
  };
}

function mapMemberStoryContextRole(
  raw: RawMemberStoryContextRole,
): MemberStoryContextRole {
  return {
    id: raw.ID,
    name: raw.Name,
    label: raw.Label,
  };
}

export async function listFansubGroupNotes(
  fansubId: number,
  authToken?: string,
): Promise<FansubGroupNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes`,
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

  const json = (await response.json()) as { data: RawFansubGroupNote[] };
  return json.data.map(mapFansubGroupNote);
}

export async function createFansubGroupNote(
  fansubId: number,
  data: CreateFansubGroupNoteRequest,
  authToken?: string,
): Promise<FansubGroupNote> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawFansubGroupNote };
  return mapFansubGroupNote(json.data);
}

export async function updateFansubGroupNote(
  fansubId: number,
  noteId: number,
  data: UpdateFansubGroupNoteRequest,
  authToken?: string,
): Promise<FansubGroupNote> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes/${noteId}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawFansubGroupNote };
  return mapFansubGroupNote(json.data);
}

export async function deleteFansubGroupNote(
  fansubId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/notes/${noteId}`,
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

// ---- Member Group Stories ----

export async function listMemberGroupStories(
  fansubId: number,
  authToken?: string,
): Promise<MemberGroupStory[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories`,
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

  const json = (await response.json()) as { data: RawMemberGroupStory[] };
  return json.data.map(mapMemberGroupStory);
}

export async function getMemberGroupStoryContext(
  fansubId: number,
  authToken?: string,
): Promise<MemberStoryContext> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/context`,
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

  const json = (await response.json()) as {
    data: {
      members: RawMemberStoryContextMember[];
      roles: RawMemberStoryContextRole[];
    };
  };

  return {
    members: json.data.members.map(mapMemberStoryContextMember),
    roles: json.data.roles.map(mapMemberStoryContextRole),
  };
}

export async function createMemberGroupStory(
  fansubId: number,
  data: CreateMemberGroupStoryRequest,
  authToken?: string,
): Promise<MemberGroupStory> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    member_id: data.memberId,
    role_id: data.roleId ?? null,
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawMemberGroupStory };
  return mapMemberGroupStory(json.data);
}

export async function updateMemberGroupStory(
  fansubId: number,
  storyId: number,
  data: UpdateMemberGroupStoryRequest,
  authToken?: string,
): Promise<MemberGroupStory> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/${storyId}`,
    {
      method: "PATCH",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawMemberGroupStory };
  return mapMemberGroupStory(json.data);
}

export async function deleteMemberGroupStory(
  fansubId: number,
  storyId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/member-stories/${storyId}`,
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

// ---- Anime Fansub Project Notes ----

export async function getAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  authToken?: string,
): Promise<AnimeFansubProjectNote | null> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes`,
    {
      headers: withAuthHeader({}, authToken),
    },
  );

  if (response.status === 404) {
    return null;
  }

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

  const json = (await response.json()) as { data: RawAnimeFansubProjectNote | null };
  if (!json.data) {
    return null;
  }
  return mapAnimeFansubProjectNote(json.data);
}

export async function upsertAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  data: UpsertAnimeFansubProjectNoteRequest,
  authToken?: string,
): Promise<AnimeFansubProjectNote> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    title: data.title,
    body_json: data.bodyJson,
    visibility: data.visibility,
    status: data.status,
    sort_order: data.sortOrder ?? 0,
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes`,
    {
      method: "PUT",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawAnimeFansubProjectNote };
  return mapAnimeFansubProjectNote(json.data);
}

export async function deleteAnimeFansubProjectNote(
  fansubId: number,
  animeId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/notes/${noteId}`,
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

// ---- Release Version Notes ----

type RawReleaseVersionNote = {
  ID: number;
  ReleaseVersionID: number;
  MemberID: number;
  RoleID: number;
  Title: string | null;
  BodyMarkdown?: string | null;
  BodyHTML: string;
  BodyJSON: unknown | null;
  BodyText: string;
  EditorType: string;
  ContentSchemaVersion: number;
  Visibility: "public" | "internal";
  Status: "draft" | "published" | "archived" | "deleted";
  SortOrder: number;
  CreatedByUserID: number | null;
  UpdatedByUserID: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  DeletedAt: string | null;
};

type RawMemberRoleForVersion = {
  MemberID: number;
  MemberName: string;
  RoleID: number;
  RoleCode: string;
  RoleName: string;
  RoleLabel: string;
};

function decodeReleaseVersionBodyJson(value: unknown): unknown | null {
  if (value == null) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Some backend responses currently serialize []byte JSONB as base64 text.
  }

  try {
    const decoded =
      typeof atob === "function"
        ? new TextDecoder().decode(
            Uint8Array.from(atob(trimmed), (char) => char.charCodeAt(0)),
          )
        : Buffer.from(trimmed, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return value;
  }
}

function mapReleaseVersionNote(raw: RawReleaseVersionNote): ReleaseVersionNote {
  return {
    id: raw.ID,
    releaseVersionId: raw.ReleaseVersionID,
    memberId: raw.MemberID,
    roleId: raw.RoleID,
    title: raw.Title,
    bodyMarkdown: raw.BodyMarkdown ?? null,
    bodyHtml: raw.BodyHTML,
    bodyJson: decodeReleaseVersionBodyJson(raw.BodyJSON),
    bodyText: raw.BodyText,
    editorType: raw.EditorType,
    contentSchemaVersion: raw.ContentSchemaVersion,
    visibility: raw.Visibility,
    status: raw.Status,
    sortOrder: raw.SortOrder,
    createdByUserId: raw.CreatedByUserID,
    updatedByUserId: raw.UpdatedByUserID,
    createdAt: raw.CreatedAt,
    updatedAt: raw.UpdatedAt,
    deletedAt: raw.DeletedAt,
  };
}

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
  };
}

export async function listReleaseVersionNotes(
  versionId: number,
  authToken?: string,
): Promise<ReleaseVersionNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes`,
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

  const json = (await response.json()) as { data: RawReleaseVersionNote[] };
  return json.data.map(mapReleaseVersionNote);
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

export async function bulkUpsertReleaseVersionNotes(
  versionId: number,
  data: BulkUpsertReleaseVersionNotesRequest,
  authToken?: string,
): Promise<ReleaseVersionNote[]> {
  const API_BASE_URL = getApiBaseUrl();
  const payload = {
    notes: data.notes.map((note) => ({
      id: note.id,
      member_id: note.memberId,
      role_id: note.roleId,
      role_code: note.roleCode,
      title: note.title ?? null,
      body_json: note.bodyJson,
      visibility: note.visibility,
      status: note.status,
      sort_order: note.sortOrder ?? 0,
    })),
  };
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
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

  const json = (await response.json()) as { data: RawReleaseVersionNote[] };
  return json.data.map(mapReleaseVersionNote);
}

export async function deleteReleaseVersionNote(
  versionId: number,
  noteId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${versionId}/notes/${noteId}`,
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

// --- Gruppen-Mitglieder ---

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

/** Vereinheitlichte Personenliste (hist + App) für Mitwirkenden-Zuordnung (D-02, D-14).
 * Endpoint: GET /api/v1/admin/fansubs/:id/unified-members */
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

// ─── Standard-Team (default-crew) ─────────────────────────────────────────────

/** Lädt die Standard-Team-Einträge einer Fansub-Gruppe (D-04, D-14).
 * Endpoint: GET /api/v1/admin/fansubs/:id/default-crew */
export async function listDefaultCrew(
  fansubId: number,
  authToken?: string,
): Promise<DefaultCrewEntry[]> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew`,
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

  const body = await response.json() as { data: DefaultCrewEntry[] };
  return body.data;
}

/** Legt einen Standard-Team-Eintrag an oder aktualisiert ihn idempotent (D-04, D-14).
 * Endpoint: PUT /api/v1/admin/fansubs/:id/default-crew */
export async function upsertDefaultCrewEntry(
  fansubId: number,
  memberID: number,
  roleCode: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew`,
    {
      method: "PUT",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberID, role_code: roleCode }),
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

/** Löscht einen Standard-Team-Eintrag (D-04, D-14).
 * Endpoint: DELETE /api/v1/admin/fansubs/:id/default-crew/:memberId/:roleCode */
export async function deleteDefaultCrewEntry(
  fansubId: number,
  memberID: number,
  roleCode: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew/${memberID}/${roleCode}`,
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

/** Wendet das Standard-Team auf leere Projekte an (D-04, D-14).
 * Endpoint: POST /api/v1/admin/fansubs/:id/default-crew/apply
 * @param animeIds Optionale Liste von Anime-IDs; leer = alle leeren Projekte der Gruppe */
export async function applyDefaultCrew(
  fansubId: number,
  animeIds?: number[],
  authToken?: string,
): Promise<{ applied_count: number }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/default-crew/apply`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_ids: animeIds ?? [] }),
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

  return response.json() as Promise<{ applied_count: number }>;
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
    started_year: (raw.started_year ?? raw.StartedYear ?? null) as number | null,
    ended_year: (raw.ended_year ?? raw.EndedYear ?? null) as number | null,
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

// --- Anime-Coverage-Aggregat ---

/** Aggregationsdaten für ein einzelnes Anime einer Fansub-Gruppe:
 * Anzahl DISTINCT Mitwirkender und abgedeckte Rollencodes (Gap-82-07). */
export interface AnimeCoverage {
  anime_id: number
  member_count: number
  covered_role_codes: string[]
  has_project_note: boolean
}

export interface AnimeCoverageListResponse {
  data: AnimeCoverage[]
}

/** Lädt das Coverage-Aggregat für alle Anime einer Fansub-Gruppe (ein Call, kein N+1).
 * Verwendet authorizedFetch (D-14). */
export async function getAnimeCoverage(
  fansubId: number,
  authToken?: string,
): Promise<AnimeCoverageListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime-coverage`,
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

  return response.json() as Promise<AnimeCoverageListResponse>;
}

// --- Anime-Contributions ---

export async function listAnimeContributions(
  fansubId: number,
  animeId: number,
  authToken?: string,
): Promise<AnimeContributionListResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/contributions`,
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

  return response.json() as Promise<AnimeContributionListResponse>;
}

/** Lädt die gruppen-gefilterten Release-Versionen eines Anime für das optionale
 * Release-Version-Dropdown im Leader-Contribution-Formular (Phase 67-04).
 * Serverseitig gefiltert (release_version_groups) — kein Client-Filter. */
export async function getFansubAnimeReleaseVersions(
  fansubId: number,
  animeId: number,
  authToken?: string,
): Promise<FansubAnimeReleaseVersionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/release-versions`,
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

  return response.json() as Promise<FansubAnimeReleaseVersionsResponse>;
}

export async function upsertAnimeContribution(
  fansubId: number,
  animeId: number,
  body: UpsertAnimeContributionRequest,
  authToken?: string,
): Promise<AnimeContributionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/contributions`,
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

  return response.json() as Promise<AnimeContributionResponse>;
}

export async function deleteAnimeContribution(
  fansubId: number,
  animeId: number,
  contributionId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/anime/${animeId}/contributions/${contributionId}`,
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

/** Aufgelöster Mitwirkenden-Satz für eine Release-Version (Override oder Projekt-Default, D-02).
 * Endpoint: GET /api/v1/admin/release-versions/:versionId/contributions/effective */
export async function listEffectiveContributionsForVersion(
  releaseVersionId: number,
  fansubGroupId: number,
  authToken?: string,
): Promise<EffectiveContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/release-versions/${releaseVersionId}/contributions/effective?fansub_group_id=${fansubGroupId}`,
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

  return response.json() as Promise<EffectiveContributionsResponse>;
}

// ─── Me-Contributions ─────────────────────────────────────────────────────────

export async function getMyAnimeContributions(): Promise<MeAnimeContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions`,
    { cache: "no-store" },
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

  return response.json() as Promise<MeAnimeContributionsResponse>;
}

export async function getMyProjectDetail(
  animeId: number,
  fansubGroupId: number,
): Promise<MeProjectDetailResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/projects/${animeId}?fansub_group_id=${fansubGroupId}`,
    { cache: "no-store" },
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

  return response.json() as Promise<MeProjectDetailResponse>;
}

export async function patchAnimeContributionVisibility(
  contributionId: number,
  isPublic: boolean,
  roleCode?: string,
): Promise<{ contribution_id: number }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/visibility`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_public_on_member_profile: isPublic,
        ...(roleCode ? { role_code: roleCode } : {}),
      }),
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

  return response.json() as Promise<{ contribution_id: number }>;
}

export async function confirmAnimeContribution(
  contributionId: number,
): Promise<void> {
  // Bestätigen setzt den Status der Contribution auf 'confirmed' (Backend aktiviert
  // zusätzlich die Profil-Sichtbarkeit).
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/confirm`,
    { method: "POST" },
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

export async function rejectAnimeContribution(
  contributionId: number,
): Promise<void> {
  // Ablehnen setzt den Status auf 'disputed' und entzieht die Profil-Sichtbarkeit
  // (Eintrag bleibt intern erhalten).
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/reject`,
    { method: "POST" },
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

// === Phase 76: neue Me-Suggestion-Helfer ===

export async function rejectAnimeContributionWithReason(
  contributionId: number,
  memberReason: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_reason: memberReason }),
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

export interface SubmitSuggestionBody {
  suggestion_type: "error_report" | "story" | "media";
  target_type: "anime" | "contribution" | "fansub_group" | "member";
  target_id: number;
  content_text?: string | null;
}

export async function submitSuggestion(
  body: SubmitSuggestionBody,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/suggestions`,
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
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }
}

export async function getMySuggestions(): Promise<MeSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/suggestions`,
    { cache: "no-store" },
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

  return response.json() as Promise<MeSuggestionsResponse>;
}

export interface UploadMediaSuggestionOptions {
  file: File;
  fields: {
    target_type: string;
    target_id: string;
    category: string;
  };
  onProgress?: (percent: number) => void;
}

export async function uploadMediaSuggestion(
  options: UploadMediaSuggestionOptions,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  return authorizedUploadXhr<void>({
    endpoint: `${API_BASE_URL}/api/v1/me/suggestions/media`,
    retryEligibility: "never",
    onProgress: options.onProgress,
    buildBody: () => {
      const body = new FormData();
      body.set("file", options.file);
      body.set("target_type", options.fields.target_type);
      body.set("target_id", options.fields.target_id);
      body.set("category", options.fields.category);
      return body;
    },
  });
}

// ─── Contribution Proposals (Member) ─────────────────────────────────────────

export async function getMyMemberships(
  authToken?: string,
): Promise<MembershipsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/memberships`,
    { cache: "no-store", authToken },
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

  return response.json() as Promise<MembershipsResponse>;
}

export async function searchAnimeForProposal(
  query: string,
): Promise<PaginatedAnimeResponse> {
  return getAnimeList(
    { q: query, per_page: 8 },
    { cache: "no-store" },
  );
}

export async function createContributionProposal(
  body: ProposalFormData,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/contribution-proposals`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

export async function selfPublishContribution(
  contributionId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/anime-contributions/${contributionId}/self-publish`,
    { method: "POST", authToken },
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

// ─── Contribution Proposals (Admin/Review) ────────────────────────────────────

export async function listGroupProposals(
  fansubId: number,
  authToken?: string,
): Promise<GroupProposalsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/contribution-proposals`,
    { cache: "no-store", authToken },
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

  return response.json() as Promise<GroupProposalsResponse>;
}

export async function confirmProposal(
  fansubId: number,
  cid: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/contribution-proposals/${cid}/confirm`,
    { method: "POST", authToken },
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

export async function rejectProposal(
  fansubId: number,
  cid: number,
  note?: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubId}/contribution-proposals/${cid}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_note: note ?? null }),
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

// ─── Public Contributions ────────────────────────────────────────────────────

export async function getFansubContributions(
  fansubID: number,
): Promise<PublicGroupContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/fansubs/${fansubID}/contributions`,
    { next: { revalidate: 60 } },
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

  return response.json() as Promise<PublicGroupContributionsResponse>;
}

export async function getAnimeContributions(
  animeID: number,
): Promise<PublicAnimeContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/contributions`,
    { next: { revalidate: 60 } },
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

  return response.json() as Promise<PublicAnimeContributionsResponse>;
}

export async function getFansubGroupDomainProjection(
  groupID: number,
): Promise<DomainProjectionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await apiClientFetch(
    `${API_BASE_URL}/api/v1/fansubs/${groupID}/domain-projection`,
    { cache: "no-store" },
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

  return response.json() as Promise<DomainProjectionResponse>;
}

export async function getMediaOwnershipProjection(
  ownerType: string,
  ownerID: number,
): Promise<MediaOwnershipProjectionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedOwnerType = encodeURIComponent(ownerType);
  const response = await apiClientFetch(
    `${API_BASE_URL}/api/v1/media-ownership/${encodedOwnerType}/${ownerID}`,
    { cache: "no-store" },
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

  return response.json() as Promise<MediaOwnershipProjectionResponse>;
}

export async function getMemberContributions(
  slug: string,
): Promise<PublicMemberContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await fetch(
    `${API_BASE_URL}/api/v1/members/${encodedSlug}/contributions`,
    { cache: "no-store" },
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

  return response.json() as Promise<PublicMemberContributionsResponse>;
}

export async function getMyBadges(
  authToken?: string,
): Promise<MemberBadgesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(`${API_BASE_URL}/api/v1/me/badges`, {
    cache: "no-store",
    authToken,
  });
  if (!response.ok) {
    // 404 (Route nicht vorhanden) tolerieren, alle anderen Fehler propagieren.
    if (response.status === 404) {
      return { badges: [] };
    }
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
  return response.json() as Promise<MemberBadgesResponse>;
}

export async function patchMyBadgeVisibility(
  badgeId: number,
  visibility: string,
): Promise<void>
export async function patchMyBadgeVisibility(
  authToken: string | undefined,
  badgeId: number,
  visibility: string,
): Promise<void>
export async function patchMyBadgeVisibility(
  first: number | string | undefined,
  second: number | string,
  third?: string,
): Promise<void> {
  const authToken = typeof first === "number" ? undefined : first
  const badgeId = typeof first === "number" ? first : Number(second)
  const visibility = typeof first === "number" ? String(second) : String(third ?? "")
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/me/badges/${badgeId}/visibility`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
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

// ---------------------------------------------------------------------------
// Phase 68 — Gruppen-Meilenstein-CRUD (fansub_group_history)
// ---------------------------------------------------------------------------

export interface GroupHistoryRow {
  id: number
  fansub_group_id: number
  year: number | null
  event_type: string
  title: string | null
  note: string | null
  status: string
  created_by: number | null
  created_at: string
}

export interface GroupHistoryCreateRequest {
  event_type: string
  title: string
  year?: number | null
  note?: string | null
  status?: string
}

export interface GroupHistoryUpdateRequest {
  event_type?: string
  title?: string | null
  year?: number | null
  note?: string | null
  status?: string
}

export async function listGroupHistory(
  fansubGroupId: number,
  authToken?: string,
): Promise<GroupHistoryRow[]> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history`,
    {
      headers: withAuthHeader({}, authToken),
      cache: 'no-store',
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow[] }
  return body.data
}

export async function createGroupHistory(
  fansubGroupId: number,
  payload: GroupHistoryCreateRequest,
  authToken?: string,
): Promise<GroupHistoryRow> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history`,
    {
      method: 'POST',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow }
  return body.data
}

export async function updateGroupHistory(
  fansubGroupId: number,
  historyId: number,
  payload: GroupHistoryUpdateRequest,
  authToken?: string,
): Promise<GroupHistoryRow> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history/${historyId}`,
    {
      method: 'PATCH',
      headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  const body = (await response.json()) as { data: GroupHistoryRow }
  return body.data
}

export async function deleteGroupHistory(
  fansubGroupId: number,
  historyId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/fansubs/${fansubGroupId}/history/${historyId}`,
    {
      method: 'DELETE',
      headers: withAuthHeader({}, authToken),
    },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, 'Meilenstein konnte nicht gelöscht werden. Bitte versuche es erneut.')
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

// ---------------------------------------------------------------------------
// Phase 68 — Öffentliche Archiv-Suche (/archiv)
// ---------------------------------------------------------------------------

export interface ArchiveMemberRow {
  id: number
  nickname: string
  display_name: string
  slug: string | null
  avatar_path: string | null
  is_verified: boolean
  top_roles: string[]
  groups: string[]
}

export interface ArchiveSearchResponse {
  data: ArchiveMemberRow[]
  total: number
  page: number
}

/**
 * Sucht öffentliche Member im Archiv nach optionalen Filtern.
 * Keine Auth erforderlich — öffentlicher Endpunkt (D-15, D-13).
 * KEIN { next: { revalidate } } — die Seite nutzt export const dynamic = 'force-dynamic'
 * was revalidate wirkungslos macht; live fetch ohne Cache-Hint.
 */
export async function searchArchive(params: {
  rolle?: string
  gruppe?: string
  von?: string | number
  bis?: string | number
  page?: number
}): Promise<ArchiveSearchResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (params.rolle) query.set('rolle', params.rolle)
  if (params.gruppe) query.set('gruppe', String(params.gruppe))
  if (params.von) query.set('von', String(params.von))
  if (params.bis) query.set('bis', String(params.bis))
  if (params.page && params.page > 1) query.set('page', String(params.page))

  const response = await fetch(
    `${API_BASE_URL}/api/v1/archiv${query.toString() ? `?${query.toString()}` : ''}`,
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<ArchiveSearchResponse>
}

/**
 * Gibt alle Fansub-Gruppen für den Gruppen-Filter der Archiv-Seite zurück.
 * Kein Auth erforderlich (GET /api/v1/fansubs ist öffentlich, D-14).
 * Alias für getFansubList ohne Parameter für den Gruppen-Filter-Dropdown.
 */
export async function getFansubs(): Promise<FansubGroupListResponse> {
  return getFansubList()
}

// ---------------------------------------------------------------------------
// Story-Bild-Upload (Phase 70 — D-01..D-23)
// ---------------------------------------------------------------------------

export interface StoryImageUploadResponse {
  media_asset_id: number
  public_url: string
}

/**
 * Laedt ein einzelnes Story-Bild fuer das eigene Profil hoch.
 * Endpoint: POST /api/v1/me/profile/story-images (field "image")
 * retryEligibility: 'never' — Upload nicht idempotent.
 * Server-Side-Guard: wirft 500 wenn kein Browser-Kontext.
 */
interface OwnProfileStoryImageUploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;
  reviewStatusCode?: string;
}

export async function uploadOwnProfileStoryImage(
  fileOrOptions: File | OwnProfileStoryImageUploadOptions,
  onProgress?: (percent: number) => void,
): Promise<StoryImageUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }
  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/me/profile/story-images`;

  const opts: OwnProfileStoryImageUploadOptions =
    fileOrOptions instanceof File
      ? { file: fileOrOptions, onProgress }
      : fileOrOptions;

  return authorizedUploadXhr<StoryImageUploadResponse>({
    endpoint,
    onProgress: opts.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("image", opts.file);
      if (opts.visibilityCode) body.set("visibility_code", opts.visibilityCode);
      if (opts.reviewStatusCode) body.set("review_status_code", opts.reviewStatusCode);
      return body;
    },
    parsePayload: (payload) => {
      const data = (payload as { data: StoryImageUploadResponse }).data;
      return data;
    },
  });
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
 * Vergibt eine Capability an eine Rolle.
 * PUT /api/v1/admin/role-capabilities/:roleCode/:actionCode
 */
export async function grantRoleCapability(
  roleCode: string,
  actionCode: string,
): Promise<void> {
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
}

/**
 * Entzieht einer Rolle eine Capability.
 * DELETE /api/v1/admin/role-capabilities/:roleCode/:actionCode
 * Bei 409 (Lockout-Guard): wirft ApiError mit status=409 und code="lockout_guard".
 */
export async function revokeRoleCapability(
  roleCode: string,
  actionCode: string,
): Promise<void> {
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
}

/**
 * Lädt die kuratierte group_history-Rollenliste für eine Fansub-Gruppe.
 * GET /api/v1/admin/fansubs/:fansubId/role-definitions?context=group_history
 * Gibt genau die vier kuratierten Rollen (Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement) zurück.
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

// setMemberMemorial markiert ein Member-Profil als Gedenkprofil (profile_status='memorial').
// Nur Global Admin. Analoges Muster zu submitMemberClaim (authorizedFetch).
// POST /api/v1/admin/members/:id/memorial
export async function setMemberMemorial(
  memberId: number,
  authToken?: string,
): Promise<{ member_id: number; profile_status: string }> {
  const API_BASE_URL = getApiBaseUrl();
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/members/${memberId}/memorial`,
    {
      method: "POST",
      authToken,
      headers: { "Content-Type": "application/json" },
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

  const body = (await response.json()) as {
    data: { member_id: number; profile_status: string };
  };
  return body.data;
}
