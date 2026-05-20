import type {
  AdminAnimeAssetSearchRequest,
  AdminAnimeAssetSearchResponse,
  AdminAnimeAniSearchCreateRequest,
  AdminAnimeAniSearchCreateResponse,
  AdminAnimeAniSearchSearchResponse,
  AdminAnimeJellyfinIntakePreviewRequest,
  AdminAnimeJellyfinIntakePreviewResponse,
  AdminAnimeCreateRequest,
  AdminAnimeUpsertResponse,
  AdminJellyfinIntakeSearchResponse,
  AdminTagTokensResponse,
} from '@/types/admin'
import { ApiError, apiClientFetch, parseApiErrorPayload } from '@/lib/api'

function ignoreDeprecatedAuthToken(_token?: string): void {
  void _token
}

function normalizeAniSearchSearchResponse(
  response: AdminAnimeAniSearchSearchResponse,
): AdminAnimeAniSearchSearchResponse {
  return {
    data: Array.isArray(response.data) ? response.data : [],
    filtered_existing_count:
      typeof response.filtered_existing_count === 'number' ? response.filtered_existing_count : 0,
  }
}

export async function searchAdminJellyfinIntakeCandidates(
  query: string,
  params: { limit?: number } = {},
  _deprecatedAuthToken?: string,
): Promise<AdminJellyfinIntakeSearchResponse> {
  ignoreDeprecatedAuthToken(_deprecatedAuthToken)

  const search = new URLSearchParams()
  search.set('q', query)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) {
    search.set('limit', String(params.limit))
  }

  const response = await apiClientFetch(`/api/v1/admin/jellyfin/series?${search.toString()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminJellyfinIntakeSearchResponse>
}

export async function previewAdminAnimeFromJellyfinIntake(
  payload: AdminAnimeJellyfinIntakePreviewRequest,
  _deprecatedAuthToken?: string,
): Promise<AdminAnimeJellyfinIntakePreviewResponse> {
  ignoreDeprecatedAuthToken(_deprecatedAuthToken)

  const response = await apiClientFetch('/api/v1/admin/jellyfin/intake/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeJellyfinIntakePreviewResponse>
}

export async function createAdminAnimeFromJellyfinDraft(
  payload: AdminAnimeCreateRequest,
  _deprecatedAuthToken?: string,
): Promise<AdminAnimeUpsertResponse> {
  ignoreDeprecatedAuthToken(_deprecatedAuthToken)

  const response = await apiClientFetch('/api/v1/admin/anime', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeUpsertResponse>
}

export async function loadAdminAnimeCreateAniSearchDraft(
  payload: AdminAnimeAniSearchCreateRequest,
  _deprecatedAuthToken?: string,
): Promise<AdminAnimeAniSearchCreateResponse> {
  ignoreDeprecatedAuthToken(_deprecatedAuthToken)

  const response = await apiClientFetch('/api/v1/admin/anime/enrichment/anisearch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 409) {
    return response.json() as Promise<AdminAnimeAniSearchCreateResponse>
  }

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeAniSearchCreateResponse>
}

export async function searchAdminAnimeCreateAniSearchCandidates(
  query: string,
  params: { limit?: number } = {},
  _deprecatedAuthToken?: string,
): Promise<AdminAnimeAniSearchSearchResponse> {
  ignoreDeprecatedAuthToken(_deprecatedAuthToken)

  const search = new URLSearchParams()
  search.set('q', query)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) {
    search.set('limit', String(params.limit))
  }

  const response = await apiClientFetch(`/api/v1/admin/anime/enrichment/anisearch/search?${search.toString()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  const payload = (await response.json()) as AdminAnimeAniSearchSearchResponse
  return normalizeAniSearchSearchResponse(payload)
}

export async function searchAdminAnimeCreateAssetCandidates(
  payload: AdminAnimeAssetSearchRequest,
  _deprecatedAuthToken?: string,
): Promise<AdminAnimeAssetSearchResponse> {
  ignoreDeprecatedAuthToken(_deprecatedAuthToken)

  const search = new URLSearchParams()
  search.set('slot', payload.asset_kind)
  search.set('q', payload.query)
  if (payload.limit && Number.isFinite(payload.limit) && payload.limit > 0) {
    search.set('limit', String(payload.limit))
  }
  if (payload.page && Number.isFinite(payload.page) && payload.page > 1) {
    search.set('page', String(payload.page))
  }
  if (payload.sources && payload.sources.length > 0) {
    search.set('sources', payload.sources.join(','))
  }

  const response = await apiClientFetch(`/api/v1/admin/anime/assets/search?${search.toString()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminAnimeAssetSearchResponse>
}

// getAdminTagTokens fetches normalized tag suggestion tokens from the dedicated
// admin tags endpoint. Uses the same auth-header pattern as the other intake
// helpers instead of reusing the genre helper so the two token sources stay
// independently callable.
export async function getAdminTagTokens(
  params: { query?: string; limit?: number } = {},
  _deprecatedAuthToken?: string,
): Promise<AdminTagTokensResponse> {
  ignoreDeprecatedAuthToken(_deprecatedAuthToken)

  const search = new URLSearchParams()
  const tagQuery = (params.query || '').trim()
  if (tagQuery) search.set('query', tagQuery)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) {
    search.set('limit', String(params.limit))
  }

  const url = `/api/v1/admin/tags${search.toString() ? `?${search.toString()}` : ''}`
  const response = await apiClientFetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminTagTokensResponse>
}
