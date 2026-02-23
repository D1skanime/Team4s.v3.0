import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { AUTH_BEARER_TOKEN, AUTH_REFRESH_COOKIE_NAME, AUTH_TOKEN_COOKIE_NAME } from '@/lib/api'
import { applyRefreshedAuthCookies, resolveStreamRelayTarget } from '@/lib/server/streamRelayAuth'

interface RouteContext {
  params:
    | {
        id: string
      }
    | Promise<{
        id: string
      }>
}

function getApiBaseURL(): string {
  const internalRaw = (process.env.API_INTERNAL_URL || '').trim()
  const publicURL = (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'
  if (!internalRaw) {
    return publicURL
  }

  try {
    const parsed = new URL(internalRaw)
    if (parsed.hostname === 'backend') {
      parsed.hostname = 'team4sv30-backend'
      return parsed.toString().replace(/\/$/, '')
    }
  } catch {
    return internalRaw
  }

  return internalRaw
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const resolvedParams = await context.params
  const episodeID = Number.parseInt((resolvedParams.id || '').trim(), 10)
  if (!Number.isFinite(episodeID) || episodeID <= 0) {
    return NextResponse.json({ error: { message: 'ungueltige episode id' } }, { status: 400 })
  }

  const cookieStore = await cookies()
  const tokenFromCookie = (cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value || '').trim()
  const refreshTokenFromCookie = (cookieStore.get(AUTH_REFRESH_COOKIE_NAME)?.value || '').trim()

  const headers = new Headers()
  const range = request.headers.get('range')
  const userAgent = request.headers.get('user-agent')
  if (range) headers.set('Range', range)
  if (userAgent) headers.set('User-Agent', userAgent)

  const apiBaseURL = getApiBaseURL()
  const providedGrant = (request.nextUrl.searchParams.get('grant') || '').trim()
  let relayTarget = await resolveStreamRelayTarget({
    apiBaseURL,
    streamPath: `/api/v1/episodes/${episodeID}/play`,
    grantPath: `/api/v1/episodes/${episodeID}/play/grant`,
    providedGrant,
    accessToken: tokenFromCookie,
    fallbackAccessToken: AUTH_BEARER_TOKEN,
    refreshToken: refreshTokenFromCookie,
  })

  if (relayTarget.authorizationToken) {
    headers.set('Authorization', `Bearer ${relayTarget.authorizationToken}`)
  } else {
    headers.delete('Authorization')
  }

  let upstream: Response
  try {
    upstream = await fetch(relayTarget.targetURL, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: { message: 'stream nicht erreichbar' } }, { status: 502 })
  }

  let refreshedSession = relayTarget.refreshedSession
  if (upstream.status === 401) {
    const unauthorizedRecoveryTarget = await resolveStreamRelayTarget({
      apiBaseURL,
      streamPath: `/api/v1/episodes/${episodeID}/play`,
      grantPath: `/api/v1/episodes/${episodeID}/play/grant`,
      providedGrant: '',
      accessToken: relayTarget.authorizationToken && refreshTokenFromCookie ? '' : tokenFromCookie,
      fallbackAccessToken: relayTarget.authorizationToken && refreshTokenFromCookie ? '' : AUTH_BEARER_TOKEN,
      refreshToken: refreshTokenFromCookie,
    })

    if (unauthorizedRecoveryTarget.authorizationToken) {
      headers.set('Authorization', `Bearer ${unauthorizedRecoveryTarget.authorizationToken}`)
    } else {
      headers.delete('Authorization')
    }

    try {
      upstream = await fetch(unauthorizedRecoveryTarget.targetURL, {
        method: 'GET',
        headers,
        cache: 'no-store',
      })
      relayTarget = unauthorizedRecoveryTarget
      if (unauthorizedRecoveryTarget.refreshedSession) {
        refreshedSession = unauthorizedRecoveryTarget.refreshedSession
      }
    } catch {
      return NextResponse.json({ error: { message: 'stream nicht erreichbar' } }, { status: 502 })
    }
  }

  const responseHeaders = new Headers()
  for (const key of [
    'content-type',
    'content-length',
    'accept-ranges',
    'content-range',
    'etag',
    'last-modified',
    'cache-control',
  ]) {
    const value = upstream.headers.get(key)
    if (value) responseHeaders.set(key, value)
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
  applyRefreshedAuthCookies(response, refreshedSession)
  return response
}
