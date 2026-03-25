import type {
  AdminAnimeJellyfinIntakePreviewRequest,
  AdminAnimeJellyfinIntakePreviewResponse,
  AdminJellyfinIntakeSearchResponse,
} from '@/types/admin'

function getApiBaseUrl(): string {
  const publicBase = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'
  const internalBase = (process.env.API_INTERNAL_URL || '').trim() || publicBase

  if (typeof window === 'undefined') {
    try {
      const parsed = new URL(internalBase)
      if (parsed.hostname === 'backend') {
        parsed.hostname = 'team4sv30-backend'
        return parsed.toString().replace(/\/$/, '')
      }
    } catch {
      return internalBase
    }
    return internalBase
  }

  return publicBase
}

function readCookie(name: string): string {
  if (typeof document === 'undefined') return ''

  const prefix = `${name}=`
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  if (!match) return ''

  const value = match.slice(prefix.length)
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function resolveAuthToken(authToken?: string): string {
  const explicit = (authToken || '').trim()
  if (explicit) return explicit

  if (typeof window !== 'undefined') {
    const runtime = readCookie('team4s_access_token').trim()
    if (runtime) return runtime
  }

  return (process.env.NEXT_PUBLIC_AUTH_TOKEN || '').trim()
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    if (body.error?.message?.trim()) {
      return body.error.message
    }
  } catch {
    // keep fallback
  }

  return fallback
}

function withAuthHeaders(authToken?: string): Record<string, string> {
  const token = resolveAuthToken(authToken)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function searchAdminJellyfinIntakeCandidates(
  query: string,
  params: { limit?: number } = {},
  authToken?: string,
): Promise<AdminJellyfinIntakeSearchResponse> {
  const search = new URLSearchParams()
  search.set('q', query)
  if (params.limit && Number.isFinite(params.limit) && params.limit > 0) {
    search.set('limit', String(params.limit))
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/admin/jellyfin/series?${search.toString()}`, {
    headers: withAuthHeaders(authToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `API request failed: ${response.status}`))
  }

  return response.json() as Promise<AdminJellyfinIntakeSearchResponse>
}

export async function previewAdminAnimeFromJellyfinIntake(
  payload: AdminAnimeJellyfinIntakePreviewRequest,
  authToken?: string,
): Promise<AdminAnimeJellyfinIntakePreviewResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/admin/jellyfin/intake/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withAuthHeaders(authToken),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `API request failed: ${response.status}`))
  }

  return response.json() as Promise<AdminAnimeJellyfinIntakePreviewResponse>
}
