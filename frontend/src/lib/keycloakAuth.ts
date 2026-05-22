const KEYCLOAK_ENABLED = ((process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED || '').trim() || 'false').toLowerCase() === 'true'
const KEYCLOAK_BASE_URL = (process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL || '').trim()
const KEYCLOAK_REALM = (process.env.NEXT_PUBLIC_KEYCLOAK_REALM || '').trim()
const KEYCLOAK_CLIENT_ID = (process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || '').trim()
const KEYCLOAK_REDIRECT_PATH = '/auth'
const KEYCLOAK_PROXY_TOKEN_PATH = '/api/auth/keycloak/token'
const PKCE_VERIFIER_STORAGE_KEY = 'team4s.keycloak.pkce_verifier'
const PKCE_STATE_STORAGE_KEY = 'team4s.keycloak.pkce_state'

export interface KeycloakTokenBundle {
  accessToken: string
  accessTokenExpiresAt: number
  accessTokenExpiresIn: number
  idToken: string
  refreshToken: string
  refreshTokenExpiresAt: number
  refreshTokenExpiresIn: number
  tokenType: 'Bearer'
}

function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function sha256Base64Url(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return base64UrlEncode(new Uint8Array(digest))
}

function currentRealmBase(): string {
  if (!KEYCLOAK_ENABLED || !KEYCLOAK_BASE_URL || !KEYCLOAK_REALM || !KEYCLOAK_CLIENT_ID) {
    throw new Error('Keycloak ist nicht vollständig konfiguriert.')
  }
  return `${KEYCLOAK_BASE_URL.replace(/\/$/, '')}/realms/${KEYCLOAK_REALM}`
}

function authRedirectUri(): string {
  if (typeof window === 'undefined') {
    return KEYCLOAK_REDIRECT_PATH
  }
  return `${window.location.origin}${KEYCLOAK_REDIRECT_PATH}`
}

function buildBrowserRefreshBody(refreshToken: string): URLSearchParams {
  const trimmed = refreshToken.trim()
  if (!trimmed) {
    throw new Error('Keycloak-Refresh erfordert refresh_token.')
  }

  const body = new URLSearchParams()
  body.set('client_id', KEYCLOAK_CLIENT_ID)
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', trimmed)
  return body
}

function saveTransientAuthState(verifier: string, state: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_STORAGE_KEY, state)
}

function consumeTransientAuthState(): { verifier: string; state: string } {
  const verifier = (sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY) || '').trim()
  const state = (sessionStorage.getItem(PKCE_STATE_STORAGE_KEY) || '').trim()
  sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY)
  sessionStorage.removeItem(PKCE_STATE_STORAGE_KEY)
  return { verifier, state }
}

function buildTokenBundle(data: {
  access_token: string
  expires_in: number
  id_token?: string
  refresh_token?: string
  refresh_expires_in?: number
  token_type?: string
}): KeycloakTokenBundle {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const accessExpiresIn = Number(data.expires_in || 0)
  const refreshExpiresIn = Number(data.refresh_expires_in || 0)
  const idToken = (data.id_token || '').trim()
  const refreshToken = (data.refresh_token || '').trim()
  if (!data.access_token || !idToken || !refreshToken || accessExpiresIn <= 0 || refreshExpiresIn <= 0) {
    throw new Error('Keycloak hat kein vollständiges Token-Bundle geliefert.')
  }

  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: nowSeconds + accessExpiresIn,
    accessTokenExpiresIn: accessExpiresIn,
    idToken,
    refreshToken,
    refreshTokenExpiresAt: nowSeconds + refreshExpiresIn,
    refreshTokenExpiresIn: refreshExpiresIn,
    tokenType: 'Bearer',
  }
}

export function isKeycloakEnabled(): boolean {
  return KEYCLOAK_ENABLED
}

export async function beginKeycloakLogin(): Promise<void> {
  const verifier = randomString(64)
  const state = randomString(32)
  const challenge = await sha256Base64Url(verifier)
  saveTransientAuthState(verifier, state)

  const authURL = new URL(`${currentRealmBase()}/protocol/openid-connect/auth`)
  authURL.searchParams.set('client_id', KEYCLOAK_CLIENT_ID)
  authURL.searchParams.set('response_type', 'code')
  authURL.searchParams.set('scope', 'openid profile email')
  authURL.searchParams.set('redirect_uri', authRedirectUri())
  authURL.searchParams.set('code_challenge', challenge)
  authURL.searchParams.set('code_challenge_method', 'S256')
  authURL.searchParams.set('state', state)

  window.location.assign(authURL.toString())
}

export async function exchangeKeycloakCode(code: string, returnedState: string): Promise<KeycloakTokenBundle> {
  const { verifier, state } = consumeTransientAuthState()
  if (!verifier || !state || state !== returnedState) {
    throw new Error('Der Keycloak-Loginstatus ist abgelaufen oder ungültig.')
  }

  const response = await fetch(KEYCLOAK_PROXY_TOKEN_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: authRedirectUri(),
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    throw new Error('Keycloak-Code konnte nicht gegen Tokens getauscht werden.')
  }

  const payload = (await response.json()) as {
    access_token: string
    expires_in: number
    id_token?: string
    refresh_token?: string
    refresh_expires_in?: number
    token_type?: string
  }

  return buildTokenBundle(payload)
}

export async function refreshKeycloakToken(refreshToken: string): Promise<KeycloakTokenBundle> {
  const response = await fetch(KEYCLOAK_PROXY_TOKEN_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken.trim(),
    }),
  })

  if (!response.ok) {
    throw new Error('Keycloak-Session konnte nicht aktualisiert werden.')
  }

  const payload = (await response.json()) as {
    access_token: string
    expires_in: number
    id_token?: string
    refresh_token?: string
    refresh_expires_in?: number
    token_type?: string
  }

  return buildTokenBundle(payload)
}

export async function logoutFromKeycloak(refreshToken?: string): Promise<void> {
  if (!refreshToken) {
    return
  }

  const body = new URLSearchParams()
  body.set('client_id', KEYCLOAK_CLIENT_ID)
  body.set('refresh_token', refreshToken.trim())

  await fetch(`${currentRealmBase()}/protocol/openid-connect/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })
}
