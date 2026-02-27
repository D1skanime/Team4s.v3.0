import {
  AdminAnimeJellyfinPreviewResponse,
  AdminAnimeJellyfinSyncRequest,
  AdminAnimeJellyfinSyncResponse,
  AdminJellyfinSeriesSearchResponse,
  AdminAnimeCreateRequest,
  AdminAnimePatchRequest,
  AdminAnimeUpsertResponse,
  AdminGenreTokensResponse,
  AdminEpisodeCreateRequest,
  AdminEpisodeDeleteResponse,
  AdminEpisodePatchRequest,
  AdminEpisodeUpsertResponse,
} from '@/types/admin'
import {
  AnimeBackdropResponse,
  AnimeDetail,
  AnimeListParams,
  EpisodeDetail,
  PaginatedAnimeResponse,
} from '@/types/anime'
import { AuthIssueRequest, AuthRefreshRequest, AuthRevokeRequest, AuthTokenData, AuthTokenResponse } from '@/types/auth'
import { CommentCreateRequest, CommentCreateResponse, PaginatedCommentResponse } from '@/types/comment'
import {
  GroupedEpisodesResponse,
  EpisodeVersionCreateRequest,
  EpisodeVersionPatchRequest,
  EpisodeVersionResponse,
} from '@/types/episodeVersion'
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

// Browser needs a host-reachable API URL (e.g. http://localhost:8092).
// Server-side code inside Docker needs a container-network URL.
const API_PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'

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

function getApiBaseUrl(): string {
  return typeof window === 'undefined' ? API_INTERNAL_BASE_URL : API_PUBLIC_BASE_URL
}

export const AUTH_BEARER_TOKEN = (process.env.NEXT_PUBLIC_AUTH_TOKEN || '').trim()
export const AUTH_DISPLAY_NAME = (process.env.NEXT_PUBLIC_AUTH_DISPLAY_NAME || '').trim()
export const HAS_AUTH_TOKEN = AUTH_BEARER_TOKEN.length > 0

export const AUTH_TOKEN_COOKIE_NAME = 'team4s_access_token'
export const AUTH_REFRESH_COOKIE_NAME = 'team4s_refresh_token'
export const AUTH_DISPLAY_NAME_COOKIE_NAME = 'team4s_display_name'

export class ApiError extends Error {
  status: number
  retryAfterSeconds: number | null

  constructor(status: number, message: string, retryAfterSeconds: number | null = null) {
    super(message)
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
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

function buildCommentQuery(params: CommentListParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))

  return query.toString()
}

function buildWatchlistQuery(params: WatchlistListParams): string {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))

  return query.toString()
}

function buildFansubListQuery(params: FansubListParams): string {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))

  return query.toString()
}

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

function writeBrowserCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') {
    return
  }

  const maxAge = Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0 ? Math.floor(maxAgeSeconds) : 0
  const encodedValue = encodeURIComponent(value)
  document.cookie = `${name}=${encodedValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

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
  }

  return AUTH_BEARER_TOKEN
}

function withAuthHeader(headers: Record<string, string>, authToken?: string): Record<string, string> {
  const token = resolveAuthToken(authToken)
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    if (body.error?.message) {
      return body.error.message
    }
  } catch {
    // Keep fallback message.
  }

  return fallback
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

export function getRuntimeAuthToken(): string {
  const runtimeToken = resolveAuthToken()
  return runtimeToken.trim()
}

export function getRuntimeRefreshToken(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return readBrowserCookie(AUTH_REFRESH_COOKIE_NAME).trim()
}

export function getRuntimeDisplayName(): string {
  if (typeof window === 'undefined') {
    return AUTH_DISPLAY_NAME
  }

  const displayName = readBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME).trim()
  return displayName || AUTH_DISPLAY_NAME
}

export function hasRuntimeAuthToken(): boolean {
  return getRuntimeAuthToken().length > 0
}

export function persistAuthSession(authData: AuthTokenData): void {
  writeBrowserCookie(AUTH_TOKEN_COOKIE_NAME, authData.access_token, authData.access_token_expires_in)
  writeBrowserCookie(AUTH_REFRESH_COOKIE_NAME, authData.refresh_token, authData.refresh_token_expires_in)
  writeBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME, authData.display_name, authData.refresh_token_expires_in)
}

export function clearAuthSession(): void {
  writeBrowserCookie(AUTH_TOKEN_COOKIE_NAME, '', 0)
  writeBrowserCookie(AUTH_REFRESH_COOKIE_NAME, '', 0)
  writeBrowserCookie(AUTH_DISPLAY_NAME_COOKIE_NAME, '', 0)
}

export async function getAnimeList(params: AnimeListParams): Promise<PaginatedAnimeResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = buildQuery(params)
  const url = `${API_BASE_URL}/api/v1/anime${query ? `?${query}` : ''}`
  const response = await fetch(url, {
    next: { revalidate: 30 },
  })

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
    throw new ApiError(response.status, `API request failed: ${response.status}`)
  }

  return response.json() as Promise<{ data: AnimeDetail }>
}

export async function getAnimeBackdrops(id: number): Promise<AnimeBackdropResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/anime/${id}/backdrops`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AnimeBackdropResponse>
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
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubGroupListResponse>
}

export async function getFansubByID(id: number): Promise<FansubGroupResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${id}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
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
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<FansubGroupResponse>
}

export async function getFansubMembers(fansubID: number): Promise<FansubMemberListResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await fetch(`${API_BASE_URL}/api/v1/fansubs/${fansubID}/members`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
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

export async function issueAuthToken(payload: AuthIssueRequest = {}, authToken?: string): Promise<AuthTokenResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const issueKey = (payload.issue_key || '').trim()
  const headers = withAuthHeader({}, authToken)
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
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
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
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AdminAnimeUpsertResponse>
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
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
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
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
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
    const message = await parseApiError(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, message)
  }

  return response.json() as Promise<AdminAnimeJellyfinPreviewResponse>
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

export async function getAdminGenreTokens(
  params: { q?: string; limit?: number } = {},
  authToken?: string,
): Promise<AdminGenreTokensResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) query.set('limit', String(params.limit))
  const url = `${API_BASE_URL}/api/v1/admin/genres${query.toString() ? `?${query.toString()}` : ''}`
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
