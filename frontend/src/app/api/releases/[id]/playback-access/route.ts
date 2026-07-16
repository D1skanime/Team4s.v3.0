import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { AUTH_REFRESH_COOKIE_NAME, AUTH_TOKEN_COOKIE_NAME } from '@/lib/api'
import { applyRefreshedAuthCookies, resolveAuthenticatedRelaySession } from '@/lib/server/streamRelayAuth'

interface RouteContext { params: { id: string } | Promise<{ id: string }> }

function apiBaseURL() {
  return (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8092').trim().replace(/\/$/, '')
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  if (!/^\d+$/.test(id) || Number(id) <= 0) return NextResponse.json({ error: { message: 'ungültige release id' } }, { status: 400 })
  const store = await cookies()
  const auth = await resolveAuthenticatedRelaySession({
    apiBaseURL: apiBaseURL(),
    accessToken: store.get(AUTH_TOKEN_COOKIE_NAME)?.value || '',
    refreshToken: store.get(AUTH_REFRESH_COOKIE_NAME)?.value || '',
  })
  if (!auth.accessToken) return NextResponse.json({ error: { message: 'anmeldung erforderlich' } }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } })
  let upstream: Response
  try {
    upstream = await fetch(`${apiBaseURL()}/api/v1/release-versions/${id}/playback-access`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` }, cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: { message: 'wiedergabestatus nicht erreichbar' } }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
  }
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
  })
  applyRefreshedAuthCookies(response, auth.refreshedSession)
  return response
}
