interface KeycloakProxyEnv {
  KEYCLOAK_INTERNAL_URL?: string
  NEXT_PUBLIC_KEYCLOAK_BASE_URL?: string
  NEXT_PUBLIC_KEYCLOAK_REALM?: string
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID?: string
  [key: string]: string | undefined
}

interface KeycloakProxyRequest {
  grant_type: 'authorization_code' | 'refresh_token'
  code?: string
  redirect_uri?: string
  code_verifier?: string
  refresh_token?: string
}

interface KeycloakLogoutRequest {
  refresh_token?: string
}

function getRequiredEnvValue(value: string | undefined, label: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    throw new Error(`Keycloak-Proxy ist unvollständig konfiguriert: ${label} fehlt.`)
  }
  return trimmed
}

function getRealmBase(env: KeycloakProxyEnv): string {
  const baseURL = getRequiredEnvValue(
    env.KEYCLOAK_INTERNAL_URL || env.NEXT_PUBLIC_KEYCLOAK_BASE_URL,
    env.KEYCLOAK_INTERNAL_URL ? 'KEYCLOAK_INTERNAL_URL' : 'NEXT_PUBLIC_KEYCLOAK_BASE_URL',
  ).replace(/\/$/, '')
  const realm = getRequiredEnvValue(env.NEXT_PUBLIC_KEYCLOAK_REALM, 'NEXT_PUBLIC_KEYCLOAK_REALM')
  return `${baseURL}/realms/${realm}`
}

function getClientID(env: KeycloakProxyEnv): string {
  return getRequiredEnvValue(env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID, 'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID')
}

export function buildTokenEndpoint(env: KeycloakProxyEnv = process.env): string {
  return `${getRealmBase(env)}/protocol/openid-connect/token`
}

export function buildLogoutEndpoint(env: KeycloakProxyEnv = process.env): string {
  return `${getRealmBase(env)}/protocol/openid-connect/logout`
}

export function buildTokenRequestBody(payload: KeycloakProxyRequest, env: KeycloakProxyEnv = process.env): URLSearchParams {
  const clientID = getClientID(env)
  const grantType = (payload.grant_type || '').trim()
  const body = new URLSearchParams()
  body.set('client_id', clientID)

  if (grantType === 'authorization_code') {
    const code = (payload.code || '').trim()
    const redirectURI = (payload.redirect_uri || '').trim()
    const codeVerifier = (payload.code_verifier || '').trim()
    if (!code || !redirectURI || !codeVerifier) {
      throw new Error('Keycloak-Code-Austausch erfordert code, redirect_uri und code_verifier.')
    }
    body.set('grant_type', 'authorization_code')
    body.set('code', code)
    body.set('redirect_uri', redirectURI)
    body.set('code_verifier', codeVerifier)
    return body
  }

  if (grantType === 'refresh_token') {
    const refreshToken = (payload.refresh_token || '').trim()
    if (!refreshToken) {
      throw new Error('Keycloak-Refresh erfordert refresh_token.')
    }
    body.set('grant_type', 'refresh_token')
    body.set('refresh_token', refreshToken)
    return body
  }

  throw new Error('Unbekannter Keycloak-Grant-Type.')
}

export function buildLogoutRequestBody(payload: KeycloakLogoutRequest, env: KeycloakProxyEnv = process.env): URLSearchParams {
  const refreshToken = (payload.refresh_token || '').trim()
  if (!refreshToken) {
    throw new Error('Keycloak-Logout erfordert refresh_token.')
  }

  const body = new URLSearchParams()
  body.set('client_id', getClientID(env))
  body.set('refresh_token', refreshToken)
  return body
}
