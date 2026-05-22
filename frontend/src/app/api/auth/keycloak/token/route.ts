import { NextResponse } from 'next/server'

import { buildTokenEndpoint, buildTokenRequestBody } from '@/lib/server/keycloakProxy'

export async function POST(request: Request): Promise<Response> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: { message: 'Ungültiger Request-Body.' } }, { status: 400 })
  }

  let body: URLSearchParams
  let endpoint: string
  try {
    body = buildTokenRequestBody((payload || {}) as {
      grant_type: 'authorization_code' | 'refresh_token'
      code?: string
      redirect_uri?: string
      code_verifier?: string
      refresh_token?: string
    })
    endpoint = buildTokenEndpoint()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Keycloak-Proxy konnte den Request nicht vorbereiten.'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: { message: 'Keycloak-Token-Endpoint ist nicht erreichbar.' } }, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') || 'application/json'
  const responseBody = await upstream.text()

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  })
}
