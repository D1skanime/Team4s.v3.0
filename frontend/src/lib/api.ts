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
} from '@/types/admin'
import {
  AnimeBackdropResponse,
  AnimeDetail,
  AnimeListParams,
  AnimeRelationsResponse,
  EpisodeDetail,
  PaginatedAnimeResponse,
} from '@/types/anime'
import { AuthIssueRequest, AuthRefreshRequest, AuthRevokeRequest, AuthTokenData, AuthTokenResponse } from '@/types/auth'
import { CommentCreateRequest, CommentCreateResponse, PaginatedCommentResponse } from '@/types/comment'
import {
  GroupedEpisodesResponse,
  EpisodeVersionCreateRequest,
  EpisodeVersionEditorContextResponse,
  EpisodeVersionFolderScanResponse,
  EpisodeVersionPatchRequest,
  EpisodeVersionResponse,
} from '@/types/episodeVersion'
import {
  EpisodeImportApplyInput,
  EpisodeImportApplyResponse,
  EpisodeImportContextResponse,
  EpisodeImportPreviewResponse,
} from '@/types/episodeImport'
import {
  AnimeFansubListResponse,
  FansubGroupCreateRequest,
  FansubGroupListResponse,
  FansubGroupPatchRequest,
  FansubGroupResponse,
  FansubMemberResponse,
  FansubMemberCreateRequest,
  FansubMemberListResponse,
  FansubMemberPatchRequest,
  FansubAliasListResponse,
  FansubAliasResponse,
  FansubAliasCreateRequest,
  FansubStatus,
  MergeFansubsRequest,
  MergeFansubsPreviewResponse,
  MergeFansubsResponse,
  CollaborationMemberListResponse,
  CollaborationMemberResponse,
  AddCollaborationMemberRequest,
  FansubMediaKind,
  FansubMediaUploadResponse,
} from '@/types/fansub'
import { PaginatedWatchlistResponse, WatchlistCreateResponse } from '@/types/watchlist'
import {
  GroupDetailResponse,
  GroupReleasesResponse,
  GroupReleasesParams,
} from '@/types/group'
import { GroupAssetsResponse } from '@/types/groupAsset'
import { ReleaseAssetsResponse } from '@/types/mediaAsset'

// Browser braucht eine erreichbare Host-URL (z.B. http://localhost:8092).
// Server-seitiger Code in Docker nutzt die Container-interne Netzwerk-URL.
const API_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

/**
 * Normalisiert die interne API-URL für Docker-Umgebungen.
 * Falls der Hostname "backend" lautet (alter Docker-Compose-Name), wird er auf
 * "team4sv30-backend" umgeschrieben, damit Server-seitige Fetches den richtigen
 * Container erreichen. Außerhalb von Docker bleibt die URL unverändert.
 */
function normalizeInternalApiBaseUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''

  try {
    const parsed = new URL(value)
    if (parsed.hostname === 'backend') {
      parsed.hostname = 'team4sv30-backend'
      return parsed.toString().replace(/\/$/, '')
    }
    return value
  } catch {
    return value
  }
}

const API_INTERNAL_BASE_URL = normalizeInternalApiBaseUrl(process.env.API_INTERNAL_URL || '') || API_PUBLIC_BASE_URL
const AUTH_BYPASS_LOCAL = ((process.env.NEXT_PUBLIC_AUTH_BYPASS_LOCAL || '').trim() || 'false').toLowerCase() === 'true'
const AUTH_BYPASS_TOKEN = 'local-auth-bypass'
const AUTH_BYPASS_DISPLAY_NAME = 'LocalAdmin'

/**
 * Gibt die richtige API-Basis-URL zurück — je nachdem ob der Code im Browser
 * oder auf dem Next.js-Server (SSR/RSC) ausgeführt wird.
 * - Browser → öffentliche URL (vom Client erreichbar)
 * - Server  → interne Docker-URL (schneller, kein Umweg über Host)
 */
function getApiBaseUrl(): string {
  return typeof window === 'undefined' ? API_INTERNAL_BASE_URL : API_PUBLIC_BASE_URL
}

/**
 * Löst eine relative oder absolute Media-URL zu einer vollständig qualifizierten URL auf.
 * - Absolute URLs (http/https) → unverändert zurückgeben
 * - Pfade die mit /api/ beginnen → an die öffentliche API-Base anhängen
 * - Alle anderen Werte (z.B. /media/...) → unverändert zurückgeben
 * Wird für Cover-, Banner- und Backdrop-Pfade aus der API genutzt.
 */
export function resolveApiUrl(value?: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  if (trimmed.startsWith('/api/')) {
    return `${API_PUBLIC_BASE_URL}${trimmed}`
  }

  return trimmed
}

export const AUTH_BEARER_TOKEN = (process.env.NEXT_PUBLIC_AUTH_TOKEN || '').trim()
export const AUTH_DISPLAY_NAME = (process.env.NEXT_PUBLIC_AUTH_DISPLAY_NAME || '').trim() || (AUTH_BYPASS_LOCAL ? AUTH_BYPASS_DISPLAY_NAME : '')
export const HAS_AUTH_TOKEN = AUTH_BEARER_TOKEN.length > 0 || AUTH_BYPASS_LOCAL

export const AUTH_TOKEN_COOKIE_NAME = 'team4s_access_token'
export const AUTH_REFRESH_COOKIE_NAME = 'team4s_refresh_token'
export const AUTH_DISPLAY_NAME_COOKIE_NAME = 'team4s_display_name'
const AUTH_TOKEN_STORAGE_KEY = 'team4s.auth.access_token'
const AUTH_REFRESH_STORAGE_KEY = 'team4s.auth.refresh_token'
const AUTH_DISPLAY_NAME_STORAGE_KEY = 'team4s.auth.display_name'

/**
 * Strukturierter API-Fehler — enthält HTTP-Statuscode, Fehlermeldung und
 * optionale Zusatzinfos wie Retry-Delay, Fehler-Code und Konflikt-Details.
 * Wird von allen API-Funktionen geworfen wenn der Server einen Fehler zurückgibt,
 * damit Aufrufer gezielt auf z.B. 401, 409 oder 429 reagieren können.
 */
export class ApiError extends Error {
  status: number
  retryAfterSeconds: number | null
  code: string | null
  details: string | null
  conflict: AdminAnimeAniSearchEditConflictResult | null

  constructor(
    status: number,
    message: string,
    retryAfterSeconds: number | null = null,
    code: string | null = null,
    details: string | null = null,
    conflict: AdminAnimeAniSearchEditConflictResult | null = null,
  ) {
    super(message)
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
    this.code = code
    this.details = details
    this.conflict = conflict
  }
}

interface ParsedApiErrorPayload {
  message: string
  code: string | null
  details: string | null
}

interface CommentListParams {
  page?: number
  per_page?: number
}

interface WatchlistListParams {
  page?: number
  per_page?: number
}

interface FansubListParams {
  q?: string
  status?: FansubStatus
  page?: number
  per_page?: number
}

/**
 * Baut den URL-Query-String für die Anime-Listenabfrage.
 * Nur gesetzte Parameter werden angehängt — undefined/null-Werte werden
 * weggelassen damit die URL sauber bleibt. Boolean-Felder (has_cover,
 * include_disabled) werden nur bei explizitem true/false übergeben.
 */
function buildQuery(params: AnimeListParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))
  if (params.q) query.set('q', params.q)
  if (params.letter) query.set('letter', params.letter)
  if (params.content_type) query.set('content_type', params.content_type)
  if (params.status) query.set('status', params.status)
  if (typeof params.fansub_id === 'number' && params.fansub_id > 0) query.set('fansub_id', String(params.fansub_id))
  if (typeof params.has_cover === 'boolean') query.set('has_cover', String(params.has_cover))
  if (typeof params.include_disabled === 'boolean') query.set('include_disabled', String(params.include_disabled))

  return query.toString()
}

/** Baut den Query-String für paginierte Kommentar-Abfragen (page + per_page). */
function buildCommentQuery(params: CommentListParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))

  return query.toString()
}

/** Baut den Query-String für paginierte Watchlist-Abfragen (page + per_page). */
function buildWatchlistQuery(params: WatchlistListParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))

  return query.toString()
}

/** Baut den Query-String für Fansub-Listenabfragen (Suche, Status, Pagination). */
function buildFansubListQuery(params: FansubListParams): string {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))

  return query.toString()
}

/**
 * Liest einen Cookie-Wert aus document.cookie (nur im Browser verfügbar).
 * Gibt einen leeren String zurück wenn der Cookie nicht existiert oder
 * der Code serverseitig ausgeführt wird.
 */
function readBrowserCookie(name: string): string {
  if (typeof document === 'undefined') {
    return ''
  }

  const prefix = `${name}=`
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))

  if (!cookie) {
    return ''
  }

  const value = cookie.slice(prefix.length)
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Schreibt einen Cookie mit SameSite=Lax und konfigurierbarer Lebensdauer.
 * Wird für Auth-Tokens genutzt damit der Token beim Seitenaufruf direkt
 * verfügbar ist — ohne Roundtrip über localStorage.
 */
function writeBrowserCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') {
    return
  }

  const maxAge = Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0 ? Math.floor(maxAgeSeconds) : 0
  const encodedValue = encodeURIComponent(value)
  document.cookie = `${name}=${encodedValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

/**
 * Liest einen Wert aus localStorage (nur im Browser verfügbar).
 * Fallback wenn Cookies nicht gelesen werden können (z.B. httpOnly-Einschränkungen).
 */
function readBrowserStorage(name: string): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    return (window.localStorage.getItem(name) || '').trim()
  } catch {
    return ''
  }
}

/**
 * Schreibt einen Wert in localStorage oder löscht den Eintrag bei leerem Wert.
 * Fehler werden stillschweigend ignoriert — Cookies bleiben der primäre Speicher.
 */
function writeBrowserStorage(name: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (value.trim()) {
      window.localStorage.setItem(name, value)
    } else {
      window.localStorage.removeItem(name)
    }
  } catch {
    // Ignore storage write failures and rely on cookies only.
  }
}

/**
 * Ermittelt den aktiven Auth-Token mit folgendem Vorrang:
 * 1. Explizit übergebener Token (z.B. von Server-Komponenten)
 * 2. Cookie team4s_access_token (nach Login gesetzt)
 * 3. localStorage Fallback
 * 4. Build-time Env-Variable NEXT_PUBLIC_AUTH_TOKEN
 * 5. Local-Dev-Bypass-Token (nur wenn AUTH_BYPASS_LOCAL=true)
 */
function resolveAuthToken(authToken?: string): string {
  const explicitToken = (authToken || '').trim()
  if (explicitToken) {
    return explicitToken
  }

  if (typeof window !== 'undefined') {
    const runtimeToken = readBrowserCookie(AUTH_TOKEN_COOKIE_NAME).trim()
    if (runtimeToken) {
      return runtimeToken
    }

    const storedToken = readBrowserStorage(AUTH_TOKEN_STORAGE_KEY)
    if (storedToken) {
      return storedToken
    }
  }

  if (AUTH_BEARER_TOKEN) {
    return AUTH_BEARER_TOKEN
  }

  if (AUTH_BYPASS_LOCAL) {
    return AUTH_BYPASS_TOKEN
  }

  return ''
}

/**
 * Fügt den Authorization-Header (Bearer-Token) zu einem Header-Objekt hinzu.
 * Gibt die Headers unverändert zurück wenn kein Token verfügbar ist.
 */
function withAuthHeader(headers: Record<string, string>, authToken?: string): Record<string, string> {
  const token = resolveAuthToken(authToken)
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

/**
 * Liest den strukturierten Fehler-Payload aus einer API-Response.
 * Erwartet JSON mit { error: { message, code?, details? } }.
 * Bei Parse-Fehlern oder fehlendem message-Feld wird der fallback-Text verwendet.
 */
export async function parseApiErrorPayload(response: Response, fallback: string): Promise<ParsedApiErrorPayload> {
  try {
    const body = (await response.json()) as { error?: { message?: string; code?: string; details?: string } }
    if (body.error?.message) {
      return {
        message: body.error.message,
        code: typeof body.error.code === 'string' && body.error.code.trim() ? body.error.code : null,
        details: typeof body.error.details === 'string' && body.error.details.trim() ? body.error.details : null,
      }
    }
  } catch {
    // Keep fallback message.
  }

  return {
    message: fallback,
    code: null,
    details: null,
  }
}

/** Kurzform von parseApiErrorPayload — gibt nur die Fehlermeldung als String zurück. */
async function parseApiError(response: Response, fallback: string): Promise<string> {
  const parsed = await parseApiErrorPayload(response, fallback)
  return parsed.message
}

function parsePayloadError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const message = (payload as { error?: { message?: unknown } }).error?.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return fallback
}

function parsePayloadApiError(payload: unknown, fallback: string): ParsedApiErrorPayload {
  if (!payload || typeof payload !== 'object') {
    return {
      message: fallback,
      code: null,
      details: null,
    }
  }

  const error = (payload as { error?: { message?: unknown; code?: unknown; details?: unknown } }).error
  const message = typeof error?.message === 'string' && error.message.trim() ? error.message : fallback
  const code = typeof error?.code === 'string' && error.code.trim() ? error.code : null
  const details = typeof error?.details === 'string' && error.details.trim() ? error.details : null

  return { message, code, details }
}

function parseAniSearchEditConflictPayload(payload: unknown): AdminAnimeAniSearchEditConflictResult | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const data = (payload as { data?: Record<string, unknown> }).data
  if (!data || typeof data !== 'object') {
    return null
  }

  if (data.mode !== 'conflict') {
    return null
  }

  if (
    typeof data.anisearch_id !== 'string' ||
    typeof data.existing_anime_id !== 'number' ||
    typeof data.existing_title !== 'string' ||
    typeof data.redirect_path !== 'string'
  ) {
    return null
  }

  return {
    mode: 'conflict',
    anisearch_id: data.anisearch_id,
    existing_anime_id: data.existing_anime_id,
    existing_title: data.existing_title,
    redirect_path: data.redirect_path,
  }
}

export function getRuntimeAuthToken(): string {
  const runtimeToken = resolveAuthToken()
  return runtimeToken.trim()
}

export function getRuntimeRefreshToken(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return readBrowserCookie(AUTH_REFRESH_COOKIE_NAME).trim() || readBrowserStorage(AUTH_REFRESH_STORAGE_KEY)
}

export function getRuntimeDisplayName(): string {
  if (typeof window === 'undefined') {
    return AUTH_DISPLAY_NAME
  }

  const displayName = readBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME).trim() || readBrowserStorage(AUTH_DISPLAY_NAME_STORAGE_KEY)
  return displayName || AUTH_DISPLAY_NAME
}

export function hasRuntimeAuthToken(): boolean {
  return getRuntimeAuthToken().length > 0
}

export function persistAuthSession(authData: AuthTokenData): void {
  writeBrowserCookie(AUTH_TOKEN_COOKIE_NAME, authData.access_token, authData.access_token_expires_in)
  writeBrowserCookie(AUTH_REFRESH_COOKIE_NAME, authData.refresh_token, authData.refresh_token_expires_in)
  writeBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME, authData.display_name, authData.refresh_token_expires_in)
  writeBrowserStorage(AUTH_TOKEN_STORAGE_KEY, authData.access_token)
  writeBrowserStorage(AUTH_REFRESH_STORAGE_KEY, authData.refresh_token)
  writeBrowserStorage(AUTH_DISPLAY_NAME_STORAGE_KEY, authData.display_name)
}

export function clearAuthSession(): void {
  writeBrowserCookie(AUTH_TOKEN_COOKIE_NAME, '', 0)
  writeBrowserCookie(AUTH_REFRESH_COOKIE_NAME, '', 0)
  writeBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME, '', 0)
  writeBrowserStorage(AUTH_TOKEN_STORAGE_KEY, '')
  writeBrowserStorage(AUTH_REFRESH_STORAGE_KEY, '')
  writeBrowserStorage(AUTH_DISPLAY_NAME_STORAGE_KEY, '')
}

interface AnimeListRequestOptions {
  cache?: RequestCache
  revalidate?: number
}

export async function getAnimeList(
  params: AnimeListParams,
  options: AnimeListRequestOptions = {},
): Promise<PaginatedAnimeResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = buildQuery(params)
  const url = `${API_BASE_URL}/api/v1/anime${query ? `?${query}` : ''}`
  const requestInit: RequestInit & { next?: { revalidate: number } } = {}
  if (options.cache) {
    requestInit.cache = options.cache
  }
  if (typeof options.revalidate === 'number') {
    requestInit.next = { revalidate: options.revalidate }
  } else if (options.cache !== 'no-store') {
    requestInit.next = { revalidate: 30 }
  }

  const response = await fetch(url, requestInit)

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.status}`)
  }

  return response.json() as Promise<PaginatedAnimeResponse>
}

export async function getAnimeByID(id: number, options: { include_disabled?: boolean } = {}): Promise<{ data: AnimeDetail }> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (typeof options.include_disabled === 'boolean') query.set('include_disabled', String(options.include_disabled))
  const url = `${API_BASE_URL}/api/v1/anime/${id}${query.toString() ? `?${query.toString()}` : ''}`
  const response = await fetch(url, {
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<{ data: AnimeDetail }>
}

export async function getAnimeBackdrops(id: number): Promise<AnimeBackdropResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${id}/backdrops`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AnimeBackdropResponse>
}

export async function getAnimeRelations(id: number): Promise<AnimeRelationsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${id}/relations`, {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return { data: [] }
    }
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AnimeRelationsResponse>
}

export async function getEpisodeByID(id: number): Promise<{ data: EpisodeDetail }> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/episodes/${id}`, {
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.status}`)
  }

  return response.json() as Promise<{ data: EpisodeDetail }>
}

export async function getFansubList(params: FansubListParams = {}): Promise<FansubGroupListResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = buildFansubListQuery(params)
  const url = `${API_BASE_URL}/api/v1/fansubs${query ? `?${query}` : ''}`
  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<FansubGroupListResponse>
}

export async function getFansubByID(id: number): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${id}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<FansubGroupResponse>
}

export async function getFansubBySlug(slug: string): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const encodedSlug = encodeURIComponent(slug)
  const response = await fetch(`${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<FansubGroupResponse>
}

export async function getFansubMembers(fansubID: number): Promise<FansubMemberListResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/members`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<FansubMemberListResponse>
}

export async function getFansubAliases(fansubID: number): Promise<FansubAliasListResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubAliasListResponse>
}

export async function createFansubAlias(
  fansubID: number,
  payload: FansubAliasCreateRequest,
  authToken?: string,
): Promise<FansubAliasResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubAliasResponse>
}

export async function deleteFansubAlias(fansubID: number, aliasID: number, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/aliases/${aliasID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function getAnimeFansubs(animeID: number): Promise<AnimeFansubListResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/fansubs`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AnimeFansubListResponse>
}

export async function attachAnimeFansub(
  animeID: number,
  fansubID: number,
  authToken?: string,
): Promise<{ data: { anime_id: number; fansub_group_id: number } }> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/fansubs/${fansubID}`, {
    method: 'POST',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<{ data: { anime_id: number; fansub_group_id: number } }>
}

export async function detachAnimeFansub(animeID: number, fansubID: number, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/fansubs/${fansubID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function getGroupedEpisodes(animeID: number): Promise<GroupedEpisodesResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/episodes`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<GroupedEpisodesResponse>
}

export async function getEpisodeVersionByID(versionID: number): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/episode-versions/${versionID}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<EpisodeVersionResponse>
}

export async function getEpisodeVersionEditorContext(
  versionID: number,
  authToken?: string,
): Promise<EpisodeVersionEditorContextResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/episode-versions/${versionID}/editor-context`, {
    cache: 'no-store',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<EpisodeVersionEditorContextResponse>
}

export async function scanEpisodeVersionFolder(
  versionID: number,
  authToken?: string,
): Promise<EpisodeVersionFolderScanResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/episode-versions/${versionID}/folder-scan`, {
    method: 'POST',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<EpisodeVersionFolderScanResponse>
}

export async function createEpisodeVersion(
  animeID: number,
  episodeNumber: number,
  payload: EpisodeVersionCreateRequest,
  authToken?: string,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/episodes/${episodeNumber}/versions`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<EpisodeVersionResponse>
}

export async function updateEpisodeVersion(
  versionID: number,
  payload: EpisodeVersionPatchRequest,
  authToken?: string,
): Promise<EpisodeVersionResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/episode-versions/${versionID}`, {
    method: 'PATCH',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<EpisodeVersionResponse>
}

export async function deleteEpisodeVersion(versionID: number, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/episode-versions/${versionID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function createFansubGroup(
  payload: FansubGroupCreateRequest,
  authToken?: string,
): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubGroupResponse>
}

export async function updateFansubGroup(
  fansubID: number,
  payload: FansubGroupPatchRequest,
  authToken?: string,
): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}`, {
    method: 'PATCH',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubGroupResponse>
}

export async function deleteFansubGroup(fansubID: number, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

interface FansubMediaUploadOptions {
  fansubID: number
  kind: FansubMediaKind
  file: File
  authToken?: string
  onProgress?: (percent: number) => void
}

export async function uploadFansubMedia(options: FansubMediaUploadOptions): Promise<FansubMediaUploadResponse> {
  if (typeof window === 'undefined') {
    throw new ApiError(500, 'upload ist nur im browser verfuegbar')
  }

  const API_BASE_URL = getApiBaseUrl()
  const token = resolveAuthToken(options.authToken)
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/media`

  return new Promise<FansubMediaUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress) return
      if (!event.lengthComputable) return
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
      options.onProgress(percent)
    }

    xhr.onerror = () => {
      reject(new ApiError(0, 'netzwerkfehler beim upload'))
    }

    xhr.onload = () => {
      let payload: unknown = null
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        payload = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100)
        resolve(payload as FansubMediaUploadResponse)
        return
      }

      const fallback = `API request failed: ${xhr.status}`
      reject(new ApiError(xhr.status, parsePayloadError(payload, fallback)))
    }

    const body = new FormData()
    body.set('kind', options.kind)
    body.set('file', options.file)
    options.onProgress?.(0)
    xhr.send(body)
  })
}

export async function deleteFansubMedia(fansubID: number, kind: FansubMediaKind, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/media/${kind}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function createFansubMember(
  fansubID: number,
  payload: FansubMemberCreateRequest,
  authToken?: string,
): Promise<FansubMemberResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/members`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubMemberResponse>
}

export async function updateFansubMember(
  fansubID: number,
  memberID: number,
  payload: FansubMemberPatchRequest,
  authToken?: string,
): Promise<FansubMemberResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/members/${memberID}`, {
    method: 'PATCH',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubMemberResponse>
}

export async function deleteFansubMember(fansubID: number, memberID: number, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/members/${memberID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function getAnimeComments(id: number, params: CommentListParams = {}): Promise<PaginatedCommentResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = buildCommentQuery(params)
  const url = `${API_BASE_URL}/api/v1/anime/${id}/comments${query ? `?${query}` : ''}`
  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.status}`)
  }

  return response.json() as Promise<PaginatedCommentResponse>
}

export async function createAnimeComment(
  id: number,
  payload: CommentCreateRequest,
  authToken?: string,
): Promise<CommentCreateResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const headers = withAuthHeader(
    {
      'Content-Type': 'application/json',
    },
    authToken,
  )

  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${id}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : Number.NaN
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message, Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds)
  }

  return response.json() as Promise<CommentCreateResponse>
}

export async function getWatchlist(
  params: WatchlistListParams = {},
  authToken?: string,
): Promise<PaginatedWatchlistResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = buildWatchlistQuery(params)
  const url = `${API_BASE_URL}/api/v1/watchlist${query ? `?${query}` : ''}`
  const response = await fetch(url, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<PaginatedWatchlistResponse>
}

export async function addWatchlistEntry(animeID: number, authToken?: string): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/watchlist`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify({ anime_id: animeID }),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<WatchlistCreateResponse>
}

export async function getWatchlistEntry(animeID: number, authToken?: string): Promise<WatchlistCreateResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/watchlist/${animeID}`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<WatchlistCreateResponse>
}

export async function removeWatchlistEntry(animeID: number, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/watchlist/${animeID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function issueAuthToken(
  payload: AuthIssueRequest = {},
  authToken?: string | null,
): Promise<AuthTokenResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const issueKey = (payload.issue_key || '').trim()
  const headers = authToken === null ? {} : withAuthHeader({}, authToken || undefined)
  if (issueKey) {
    headers['X-Auth-Issue-Key'] = issueKey
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/issue`, {
    method: 'POST',
    headers,
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AuthTokenResponse>
}

export async function refreshAuthToken(payload: AuthRefreshRequest): Promise<AuthTokenResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AuthTokenResponse>
}

export async function revokeAuthToken(payload: AuthRevokeRequest = {}, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const headers = withAuthHeader(
    {
      'Content-Type': 'application/json',
    },
    authToken,
  )

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/revoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function createAdminAnime(
  payload: AdminAnimeCreateRequest,
  authToken?: string,
): Promise<AdminAnimeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeUpsertResponse>
}

export async function updateAdminAnime(
  animeID: number,
  payload: AdminAnimePatchRequest,
  authToken?: string,
): Promise<AdminAnimeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}`, {
    method: 'PATCH',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeUpsertResponse>
}

export async function loadAdminAnimeEditAniSearchEnrichment(
  animeID: number,
  payload: AdminAnimeAniSearchEditRequest,
  authToken?: string,
): Promise<{ data: AdminAnimeAniSearchEditResult }> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/enrichment/anisearch`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as unknown
    const parsed = parsePayloadApiError(body, `API request failed: ${response.status}`)
    const conflict = response.status === 409 ? parseAniSearchEditConflictPayload(body) : null
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details, conflict)
  }

  return response.json() as Promise<{ data: AdminAnimeAniSearchEditResult }>
}

export async function syncAdminAnimeFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinSyncRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinSyncResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/sync`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeJellyfinSyncResponse>
}

export async function searchAdminJellyfinSeries(
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminJellyfinSeriesSearchResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const search = new URLSearchParams()
  search.set('q', query)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) search.set('limit', String(params.limit))

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/jellyfin/series?${search.toString()}`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminJellyfinSeriesSearchResponse>
}

export async function previewAdminAnimeFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinSyncRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/preview`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeJellyfinPreviewResponse>
}

export async function getAdminAnimeJellyfinContext(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeJellyfinContextResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/context`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeJellyfinContextResponse>
}

export async function previewAdminAnimeMetadataFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinMetadataPreviewRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinMetadataPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/metadata/preview`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeJellyfinMetadataPreviewResponse>
}

export async function applyAdminAnimeMetadataFromJellyfin(
  animeID: number,
  payload: AdminAnimeJellyfinMetadataApplyRequest = {},
  authToken?: string,
): Promise<AdminAnimeJellyfinMetadataApplyResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/jellyfin/metadata/apply`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeJellyfinMetadataApplyResponse>
}

interface AdminAnimeMediaUploadOptions {
  animeID: number
  assetType: AdminAnimeUploadAssetType
  file: File
  authToken?: string
  onProgress?: (percent: number) => void
}

export async function uploadAdminAnimeMedia(options: AdminAnimeMediaUploadOptions): Promise<AdminMediaUploadResponse> {
  if (typeof window === 'undefined') {
    throw new ApiError(500, 'upload ist nur im browser verfuegbar')
  }

  const API_BASE_URL = getApiBaseUrl()
  const token = resolveAuthToken(options.authToken)
  const endpoint = `${API_BASE_URL}/api/v1/admin/upload`

  return new Promise<AdminMediaUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress || !event.lengthComputable) return
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
      options.onProgress(percent)
    }

    xhr.onerror = () => reject(new ApiError(0, 'netzwerkfehler beim upload'))
    xhr.onload = () => {
      let payload: unknown = null
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        payload = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100)
        resolve(payload as AdminMediaUploadResponse)
        return
      }

      const parsed = parsePayloadApiError(payload, `API request failed: ${xhr.status}`)
      reject(new ApiError(xhr.status, parsed.message, null, parsed.code, parsed.details))
    }

    const body = new FormData()
    body.set('entity_type', 'anime')
    body.set('entity_id', String(options.animeID))
    body.set('asset_type', options.assetType)
    body.set('file', options.file)
    options.onProgress?.(0)
    xhr.send(body)
  })
}

export async function assignAdminAnimeBannerAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, 'banner', mediaID, authToken)
}

export async function assignAdminAnimeCoverAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, 'cover', mediaID, authToken)
}

export async function assignAdminAnimeLogoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, 'logo', mediaID, authToken)
}

export async function assignAdminAnimeBackgroundVideoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  return assignAdminAnimeSingularAsset(animeID, 'background_video', mediaID, authToken)
}

export async function addAdminAnimeBackgroundVideoAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/background_videos`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify({ media_id: mediaID }),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function getAdminFansubAnime(
  fansubID: number,
  authToken?: string,
): Promise<AdminFansubAnimeListResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminFansubAnimeListResponse>
}

export async function getAdminReleaseThemeAssets(
  releaseID: number,
  authToken?: string,
): Promise<AdminReleaseThemeAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/releases/${releaseID}/theme-assets`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminReleaseThemeAssetsResponse>
}

export async function getAdminFansubAnimeThemeAssets(
  fansubID: number,
  animeID: number,
  authToken?: string,
): Promise<AdminFansubAnimeThemeAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/theme-assets`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminFansubAnimeThemeAssetsResponse>
}

interface AdminReleaseThemeAssetUploadOptions {
  fansubID: number
  animeID: number
  themeID: number
  file: File
  authToken?: string
  onProgress?: (percent: number) => void
}

export async function uploadAdminReleaseThemeAsset(
  options: AdminReleaseThemeAssetUploadOptions,
): Promise<AdminReleaseThemeAssetCreateResponse> {
  if (typeof window === 'undefined') {
    throw new ApiError(500, 'upload ist nur im browser verfuegbar')
  }

  const API_BASE_URL = getApiBaseUrl()
  const token = resolveAuthToken(options.authToken)
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/anime/${options.animeID}/theme-assets`

  return new Promise<AdminReleaseThemeAssetCreateResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!options.onProgress) return
      if (!event.lengthComputable) return
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
      options.onProgress(percent)
    }

    xhr.onerror = () => {
      reject(new ApiError(0, 'netzwerkfehler beim upload'))
    }

    xhr.onload = () => {
      let payload: unknown = null
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        payload = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100)
        resolve(payload as AdminReleaseThemeAssetCreateResponse)
        return
      }

      const fallback = `API request failed: ${xhr.status}`
      reject(new ApiError(xhr.status, parsePayloadError(payload, fallback)))
    }

    const body = new FormData()
    body.set('theme_id', String(options.themeID))
    body.set('file', options.file)
    options.onProgress?.(0)
    xhr.send(body)
  })
}

export async function deleteAdminReleaseThemeAsset(
  releaseID: number,
  themeID: number,
  mediaID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/releases/${releaseID}/theme-assets/${themeID}/${mediaID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

async function assignAdminAnimeSingularAsset(
  animeID: number,
  assetKind: Exclude<AdminAnimeAssetKind, 'background'>,
  mediaID: string,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/${assetKind}`, {
    method: 'PUT',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify({ media_id: mediaID }),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function deleteAdminAnimeCoverAsset(animeID: number, authToken?: string): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/cover`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function deleteAdminAnimeBannerAsset(animeID: number, authToken?: string): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, 'banner', authToken)
}

export async function deleteAdminAnimeLogoAsset(animeID: number, authToken?: string): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, 'logo', authToken)
}

export async function deleteAdminAnimeBackgroundVideoAsset(animeID: number, authToken?: string): Promise<void> {
  return deleteAdminAnimeSingularAsset(animeID, 'background_video', authToken)
}

async function deleteAdminAnimeSingularAsset(
  animeID: number,
  assetKind: Exclude<AdminAnimeAssetKind, 'background'>,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/${assetKind}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function addAdminAnimeBackgroundAsset(
  animeID: number,
  mediaID: string,
  authToken?: string,
  providerKey?: string,
): Promise<AdminAnimeBackgroundAssetResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const body: Record<string, string> = { media_id: mediaID }
  if (providerKey) body.provider_key = providerKey
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/backgrounds`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeBackgroundAssetResponse>
}

export async function deleteAdminAnimeBackgroundAsset(
  animeID: number,
  backgroundID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/assets/backgrounds/${backgroundID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function createAdminEpisode(
  payload: AdminEpisodeCreateRequest,
  authToken?: string,
): Promise<AdminEpisodeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/episodes`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AdminEpisodeUpsertResponse>
}

export async function updateAdminEpisode(
  episodeID: number,
  payload: AdminEpisodePatchRequest,
  authToken?: string,
): Promise<AdminEpisodeUpsertResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/episodes/${episodeID}`, {
    method: 'PATCH',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AdminEpisodeUpsertResponse>
}

export async function deleteAdminEpisode(episodeID: number, authToken?: string): Promise<AdminEpisodeDeleteResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/episodes/${episodeID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AdminEpisodeDeleteResponse>
}

export async function getEpisodeImportContext(
  animeID: number,
  authToken?: string,
): Promise<EpisodeImportContextResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/context`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<EpisodeImportContextResponse>
}

export async function previewEpisodeImport(
  animeID: number,
  payload: { anisearch_id?: string; jellyfin_series_id?: string; season_offset?: number },
  authToken?: string,
): Promise<EpisodeImportPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/preview`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<EpisodeImportPreviewResponse>
}

export async function applyEpisodeImport(
  animeID: number,
  payload: EpisodeImportApplyInput,
  authToken?: string,
): Promise<EpisodeImportApplyResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/episode-import/apply`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<EpisodeImportApplyResponse>
}

export async function deleteAdminAnime(animeID: number, authToken?: string): Promise<AdminAnimeDeleteResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeDeleteResponse>
}

export async function getAdminAnimeRelations(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeRelationsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeRelationsResponse>
}

export async function searchAdminAnimeRelationTargets(
  animeID: number,
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminAnimeRelationTargetsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const search = new URLSearchParams()
  search.set('q', query)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) search.set('limit', String(params.limit))

  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/relation-targets?${search.toString()}`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeRelationTargetsResponse>
}

export async function createAdminAnimeRelation(
  animeID: number,
  payload: AdminAnimeRelationCreateRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function updateAdminAnimeRelation(
  animeID: number,
  targetAnimeID: number,
  payload: AdminAnimeRelationUpdateRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations/${targetAnimeID}`, {
    method: 'PATCH',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function deleteAdminAnimeRelation(
  animeID: number,
  targetAnimeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/relations/${targetAnimeID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function getAdminThemeTypes(authToken?: string): Promise<AdminThemeTypesResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/theme-types`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminThemeTypesResponse>
}

export async function getAdminAnimeThemes(
  animeID: number,
  authToken?: string,
): Promise<AdminAnimeThemesResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeThemesResponse>
}

export async function createAdminAnimeTheme(
  animeID: number,
  payload: AdminAnimeThemeCreateRequest,
  authToken?: string,
): Promise<AdminAnimeThemeCreateResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeThemeCreateResponse>
}

export async function updateAdminAnimeTheme(
  animeID: number,
  themeID: number,
  payload: AdminAnimeThemePatchRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}`, {
    method: 'PATCH',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function deleteAdminAnimeTheme(
  animeID: number,
  themeID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function getAdminAnimeThemeSegments(
  animeID: number,
  themeID: number,
  authToken?: string,
): Promise<AdminAnimeThemeSegmentsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}/segments`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeThemeSegmentsResponse>
}

export async function createAdminAnimeThemeSegment(
  animeID: number,
  themeID: number,
  payload: AdminAnimeThemeSegmentCreateRequest,
  authToken?: string,
): Promise<AdminAnimeThemeSegmentCreateResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}/segments`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeThemeSegmentCreateResponse>
}

export async function deleteAdminAnimeThemeSegment(
  animeID: number,
  themeID: number,
  segmentID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/themes/${themeID}/segments/${segmentID}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function deleteUploadedCoverFile(fileName: string): Promise<void> {
  const response = await fetch('/api/admin/upload-cover', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_name: fileName }),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function getAdminGenreTokens(
  params: { q?: string; query?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminGenreTokensResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  const genreQuery = (params.query || params.q || '').trim()
  if (genreQuery) query.set('query', genreQuery)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) query.set('limit', String(params.limit))
  const url = `${API_BASE_URL}/api/v1/genres${query.toString() ? `?${query.toString()}` : ''}`
  const response = await fetch(url, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AdminGenreTokensResponse>
}

// getAdminTagTokens fetches normalized tag tokens from the dedicated admin tag
// endpoint. Mirrors getAdminGenreTokens so the two token sources stay parallel
// in both call signature and auth-header handling.
export async function getAdminTagTokens(
  params: { query?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminTagTokensResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  const tagQuery = (params.query || '').trim()
  if (tagQuery) query.set('query', tagQuery)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) query.set('limit', String(params.limit))
  const url = `${API_BASE_URL}/api/v1/admin/tags${query.toString() ? `?${query.toString()}` : ''}`
  const response = await fetch(url, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AdminTagTokensResponse>
}

// Fansub merge operations
export async function mergeFansubsPreview(
  payload: MergeFansubsRequest,
  authToken?: string,
): Promise<MergeFansubsPreviewResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/fansubs/merge/preview`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<MergeFansubsPreviewResponse>
}

export async function mergeFansubs(
  payload: MergeFansubsRequest,
  authToken?: string,
): Promise<MergeFansubsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/fansubs/merge`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<MergeFansubsResponse>
}

// Collaboration member operations
export async function getCollaborationMembers(fansubID: number): Promise<CollaborationMemberListResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/collaboration-members`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<CollaborationMemberListResponse>
}

export async function addCollaborationMember(
  collaborationID: number,
  payload: AddCollaborationMemberRequest,
  authToken?: string,
): Promise<CollaborationMemberResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${collaborationID}/collaboration-members`, {
    method: 'POST',
    headers: withAuthHeader(
      {
        'Content-Type': 'application/json',
      },
      authToken,
    ),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<CollaborationMemberResponse>
}

export async function removeCollaborationMember(
  collaborationID: number,
  memberGroupID: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(
    `${API_BASE_URL}/api/v1/fansubs/${collaborationID}/collaboration-members/${memberGroupID}`,
    {
      method: 'DELETE',
      headers: withAuthHeader({}, authToken),
    },
  )

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }
}

export async function syncEpisode(
  animeID: number,
  episodeID: number,
  authToken?: string,
): Promise<{ data: { success: boolean; message?: string } }> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeID}/episodes/${episodeID}/sync`, {
    method: 'POST',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<{ data: { success: boolean; message?: string } }>
}

// Group operations
export async function getGroupDetail(animeID: number, groupID: number): Promise<GroupDetailResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<GroupDetailResponse>
}

function buildGroupReleasesQuery(params: GroupReleasesParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))
  if (typeof params.has_op === 'boolean') query.set('has_op', String(params.has_op))
  if (typeof params.has_ed === 'boolean') query.set('has_ed', String(params.has_ed))
  if (typeof params.has_karaoke === 'boolean') query.set('has_karaoke', String(params.has_karaoke))
  if (params.q) query.set('q', params.q)

  return query.toString()
}

export async function getGroupReleases(
  animeID: number,
  groupID: number,
  params: GroupReleasesParams = {},
): Promise<GroupReleasesResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = buildGroupReleasesQuery(params)
  const url = `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/releases${query ? `?${query}` : ''}`
  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<GroupReleasesResponse>
}

export async function getGroupAssets(animeID: number, groupID: number): Promise<GroupAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/assets`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<GroupAssetsResponse>
}

export async function getReleaseAssets(releaseID: number): Promise<ReleaseAssetsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/releases/${releaseID}/assets`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<ReleaseAssetsResponse>
}

// --- Release-Segmente (OP/ED Timing) (Phase 24) ---

export async function getAnimeSegments(
  animeId: number,
  groupId: number | null,
  version: string | null,
  authToken?: string,
): Promise<AdminAnimeSegmentsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const params = new URLSearchParams()
  if (groupId) params.set('group_id', String(groupId))
  if (version) params.set('version', version)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments${qs}`, {
    headers: withAuthHeader({}, authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeSegmentsResponse>
}

export async function createAnimeSegment(
  animeId: number,
  input: AdminThemeSegmentCreateRequest,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments`, {
    method: 'POST',
    headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<{ data: AdminThemeSegment }>
}

export async function updateAnimeSegment(
  animeId: number,
  segmentId: number,
  input: AdminThemeSegmentPatchRequest,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}`, {
    method: 'PATCH',
    headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

export async function deleteAnimeSegment(
  animeId: number,
  segmentId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}`, {
    method: 'DELETE',
    headers: withAuthHeader({}, authToken),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}

/**
 * Laedt Segment-Vorschlaege fuer einen Anime und eine Episodennummer aus anderen Releases.
 * Optional kann die aktuelle (excludeGroupId, excludeVersion)-Kombination ausgeschlossen werden.
 */
export async function getAnimeSegmentSuggestions(
  animeId: number,
  episode: number,
  excludeGroupId?: number | null,
  excludeVersion?: string | null,
  authToken?: string,
): Promise<AdminSegmentSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const params = new URLSearchParams()
  params.set('episode', String(episode))
  if (excludeGroupId) params.set('exclude_group_id', String(excludeGroupId))
  if (excludeVersion) params.set('exclude_version', excludeVersion)
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/suggestions?${params.toString()}`,
    {
      headers: withAuthHeader({}, authToken),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminSegmentSuggestionsResponse>
}

export async function getSegmentLibraryCandidates(
  animeId: number,
  groupId: number,
  kind: string,
  name?: string | null,
  authToken?: string,
): Promise<AdminSegmentLibraryCandidatesResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const params = new URLSearchParams()
  params.set('group_id', String(groupId))
  params.set('kind', kind)
  if (name?.trim()) params.set('name', name.trim())

  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/library-candidates?${params.toString()}`,
    {
      headers: withAuthHeader({}, authToken),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminSegmentLibraryCandidatesResponse>
}

export async function attachSegmentLibraryAsset(
  animeId: number,
  segmentId: number,
  payload: AdminSegmentLibraryAttachRequest,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/reuse`, {
    method: 'POST',
    headers: withAuthHeader({ 'Content-Type': 'application/json' }, authToken),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<{ data: AdminThemeSegment }>
}

/**
 * Laedt eine Videodatei als Segment-Asset hoch und aktualisiert die Source-Felder des Segments.
 * Sendet multipart/form-data mit dem Feld "file".
 * Gibt das aktualisierte Segment zurueck.
 */
export async function uploadSegmentAsset(
  animeId: number,
  segmentId: number,
  file: File,
  authToken?: string,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset`,
    {
      method: 'POST',
      headers: withAuthHeader({}, authToken),
      body: formData,
    },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<{ data: AdminThemeSegment }>
}

/**
 * Loescht das Segment-Asset: leert Source-Felder, loescht Datei und media_assets-Eintrag.
 */
export async function deleteSegmentAsset(
  animeId: number,
  segmentId: number,
  authToken?: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset`,
    {
      method: 'DELETE',
      headers: withAuthHeader({}, authToken),
    },
  )

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}
