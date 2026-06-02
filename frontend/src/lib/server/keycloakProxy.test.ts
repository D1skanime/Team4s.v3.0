import { describe, expect, it } from 'vitest'

import {
  buildLogoutEndpoint,
  buildLogoutRequestBody,
  buildTokenEndpoint,
  buildTokenRequestBody,
} from './keycloakProxy'

const env = {
  KEYCLOAK_INTERNAL_URL: 'http://team4sv30-keycloak:8080',
  NEXT_PUBLIC_KEYCLOAK_BASE_URL: 'http://localhost:8081/',
  NEXT_PUBLIC_KEYCLOAK_REALM: 'team4s',
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: 'team4s-frontend',
}

describe('keycloakProxy helpers', () => {
  it('builds the token endpoint from env', () => {
    expect(buildTokenEndpoint(env)).toBe('http://team4sv30-keycloak:8080/realms/team4s/protocol/openid-connect/token')
  })

  it('builds the authorization-code body with required fields', () => {
    const body = buildTokenRequestBody({
      grant_type: 'authorization_code',
      code: 'abc123',
      redirect_uri: 'http://localhost:3002/login',
      code_verifier: 'verifier-123',
    }, env)

    expect(body.toString()).toContain('client_id=team4s-frontend')
    expect(body.toString()).toContain('grant_type=authorization_code')
    expect(body.toString()).toContain('code=abc123')
    expect(body.toString()).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3002%2Flogin')
    expect(body.toString()).toContain('code_verifier=verifier-123')
  })

  it('builds the refresh body with required fields', () => {
    const body = buildTokenRequestBody({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-123',
    }, env)

    expect(body.toString()).toBe('client_id=team4s-frontend&grant_type=refresh_token&refresh_token=refresh-123')
  })

  it('builds the logout endpoint and body', () => {
    expect(buildLogoutEndpoint(env)).toBe('http://team4sv30-keycloak:8080/realms/team4s/protocol/openid-connect/logout')
    expect(buildLogoutRequestBody({ refresh_token: 'refresh-123' }, env).toString()).toBe(
      'client_id=team4s-frontend&refresh_token=refresh-123',
    )
  })
})
