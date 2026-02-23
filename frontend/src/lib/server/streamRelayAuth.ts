import { NextResponse } from 'next/server'

import { AUTH_DISPLAY_NAME_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME, AUTH_TOKEN_COOKIE_NAME } from '@/lib/api'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

interface TokenRefreshResponseData {
  access_token?: string
  access_token_expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
  display_name?: string
}

interface TokenRefreshResponse {
  data?: TokenRefreshResponseData
}

export interface RefreshedAuthSession {
  accessToken: string
  accessTokenExpiresIn: number
  refreshToken: string
  refreshTokenExpiresIn: number
  displayName: string
}

interface GrantAttemptResult {
  grantToken: string
  unauthorized: boolean
}

interface ResolveStreamRelayTargetArgs {
  apiBaseURL: string
  streamPath: string
  grantPath: string
  providedGrant: string
  accessToken: string
  fallbackAccessToken?: string
  refreshToken: string
  fetchImpl?: FetchLike
}

export interface ResolveStreamRelayTargetResult {
  targetURL: string
  authorizationToken: string
  refreshedSession: RefreshedAuthSession | null
}

function normalizePositiveInt(value: unknown): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return 0
  }
  return Math.floor(numberValue)
}

async function requestGrantToken(
  apiBaseURL: string,
  grantPath: string,
  accessToken: string,
  fetchImpl: FetchLike,
): Promise<GrantAttemptResult> {
  if (!accessToken) {
    return { grantToken: '', unauthorized: false }
  }

  let response: Response
  try {
    response = await fetchImpl(`${apiBaseURL}${grantPath}`, {
      method: 'POST',
      headers: new Headers({
        Authorization: `Bearer ${accessToken}`,
      }),
      cache: 'no-store',
    })
  } catch {
    return { grantToken: '', unauthorized: false }
  }

  if (!response.ok) {
    return {
      grantToken: '',
      unauthorized: response.status === 401,
    }
  }

  try {
    const body = (await response.json()) as {
      data?: {
        grant_token?: string
      }
    }
    const grantToken = (body.data?.grant_token || '').trim()
    return {
      grantToken,
      unauthorized: false,
    }
  } catch {
    return { grantToken: '', unauthorized: false }
  }
}

async function refreshSession(
  apiBaseURL: string,
  refreshToken: string,
  fetchImpl: FetchLike,
): Promise<RefreshedAuthSession | null> {
  if (!refreshToken) {
    return null
  }

  let response: Response
  try {
    response = await fetchImpl(`${apiBaseURL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
      cache: 'no-store',
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  let payload: TokenRefreshResponse
  try {
    payload = (await response.json()) as TokenRefreshResponse
  } catch {
    return null
  }

  const data = payload.data || {}
  const accessToken = (data.access_token || '').trim()
  const rotatedRefreshToken = (data.refresh_token || '').trim()
  const displayName = (data.display_name || '').trim()
  const accessTokenExpiresIn = normalizePositiveInt(data.access_token_expires_in)
  const refreshTokenExpiresIn = normalizePositiveInt(data.refresh_token_expires_in)

  if (!accessToken || !rotatedRefreshToken || accessTokenExpiresIn === 0 || refreshTokenExpiresIn === 0) {
    return null
  }

  return {
    accessToken,
    accessTokenExpiresIn,
    refreshToken: rotatedRefreshToken,
    refreshTokenExpiresIn,
    displayName,
  }
}

function buildGrantTarget(streamURL: string, grantToken: string): string {
  if (!grantToken) return streamURL
  return `${streamURL}?grant=${encodeURIComponent(grantToken)}`
}

export async function resolveStreamRelayTarget(
  args: ResolveStreamRelayTargetArgs,
): Promise<ResolveStreamRelayTargetResult> {
  const fetchImpl = args.fetchImpl || fetch
  const streamURL = `${args.apiBaseURL}${args.streamPath}`
  const providedGrant = args.providedGrant.trim()
  if (providedGrant) {
    return {
      targetURL: buildGrantTarget(streamURL, providedGrant),
      authorizationToken: '',
      refreshedSession: null,
    }
  }

  let refreshedSession: RefreshedAuthSession | null = null
  let activeAccessToken = args.accessToken.trim()
  const fallbackAccessToken = (args.fallbackAccessToken || '').trim()
  const activeRefreshToken = args.refreshToken.trim()
  let usingFallbackAccessToken = false

  if (!activeAccessToken && fallbackAccessToken) {
    activeAccessToken = fallbackAccessToken
    usingFallbackAccessToken = true
  }

  if (!activeAccessToken && activeRefreshToken) {
    refreshedSession = await refreshSession(args.apiBaseURL, activeRefreshToken, fetchImpl)
    if (refreshedSession) {
      activeAccessToken = refreshedSession.accessToken
      usingFallbackAccessToken = false
    }
  }

  let grantAttempt = await requestGrantToken(args.apiBaseURL, args.grantPath, activeAccessToken, fetchImpl)

  if (!grantAttempt.grantToken && grantAttempt.unauthorized && activeRefreshToken) {
    if (!refreshedSession) {
      refreshedSession = await refreshSession(args.apiBaseURL, activeRefreshToken, fetchImpl)
      if (refreshedSession) {
        activeAccessToken = refreshedSession.accessToken
        usingFallbackAccessToken = false
      }
    }
    grantAttempt = await requestGrantToken(args.apiBaseURL, args.grantPath, activeAccessToken, fetchImpl)
  }

  if (!grantAttempt.grantToken && grantAttempt.unauthorized && !usingFallbackAccessToken && fallbackAccessToken) {
    activeAccessToken = fallbackAccessToken
    usingFallbackAccessToken = true
    grantAttempt = await requestGrantToken(args.apiBaseURL, args.grantPath, activeAccessToken, fetchImpl)
  }

  if (grantAttempt.grantToken) {
    return {
      targetURL: buildGrantTarget(streamURL, grantAttempt.grantToken),
      authorizationToken: '',
      refreshedSession,
    }
  }

  return {
    targetURL: streamURL,
    authorizationToken: activeAccessToken,
    refreshedSession,
  }
}

export function applyRefreshedAuthCookies(response: NextResponse, session: RefreshedAuthSession | null): void {
  if (!session) {
    return
  }

  response.cookies.set(AUTH_TOKEN_COOKIE_NAME, session.accessToken, {
    path: '/',
    sameSite: 'lax',
    maxAge: session.accessTokenExpiresIn,
  })
  response.cookies.set(AUTH_REFRESH_COOKIE_NAME, session.refreshToken, {
    path: '/',
    sameSite: 'lax',
    maxAge: session.refreshTokenExpiresIn,
  })
  if (session.displayName) {
    response.cookies.set(AUTH_DISPLAY_NAME_COOKIE_NAME, session.displayName, {
      path: '/',
      sameSite: 'lax',
      maxAge: session.refreshTokenExpiresIn,
    })
  }
}
