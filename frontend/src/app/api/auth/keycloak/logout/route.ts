import { NextResponse } from 'next/server'

import { buildLogoutEndpoint, buildLogoutRequestBody } from '@/lib/server/keycloakProxy'

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
    body = buildLogoutRequestBody((payload || {}) as { refresh_token?: string })
    endpoint = buildLogoutEndpoint()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Keycloak-Logout konnte nicht vorbereitet werden.'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: { message: 'Keycloak-Logout-Endpoint ist nicht erreichbar.' } }, { status: 502 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
