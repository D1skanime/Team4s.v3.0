# Phase 51 Keycloak Audience Smoke

**Date:** 2026-05-26
**Realm:** `team4s`
**Frontend client:** `team4s-frontend`
**API audience:** `team4s-api`

## Baseline Before Fix

Observed before Phase 51 implementation:

| Probe | Result |
|---|---|
| `access_token.typ` | `Bearer` |
| `access_token.aud` | `account` |
| `access_token.azp` | `team4s-frontend` |
| `access_token.sid` | present |
| `id_token.typ` | `ID` |
| `id_token.aud` | `team4s-frontend` |
| `/api/v1/me` with access token | `401` |
| `/api/v1/me` with ID token | `200` |

## Live Realm Update

The existing local Keycloak DB volume was preserved. The live realm was updated through the Keycloak Admin REST API:

1. Created client `team4s-api`.
2. Created client scope `team4s-api`.
3. Added an OIDC Audience mapper with `included.client.audience=team4s-api`.
4. Added the `team4s-api` client scope as a default scope of `team4s-frontend`.

The import file now carries the same setup through `infra/keycloak/realm-team4s.json`.

## Final Token Probe

Command shape used, without recording raw tokens:

```powershell
$tokenResponse = Invoke-RestMethod -Method Post `
  -Uri 'http://127.0.0.1:8081/realms/team4s/protocol/openid-connect/token' `
  -ContentType 'application/x-www-form-urlencoded' `
  -Body 'grant_type=password&client_id=team4s-frontend&username=phase43-admin&password=Team4s123!&scope=openid%20profile%20email'

# Decode only JWT payloads locally and inspect typ, aud, azp, sid.
```

Final observed claims:

| Claim | Value |
|---|---|
| `access_token.expires_in` | `300` |
| `refresh_expires_in` | `86400` |
| `access_token.typ` | `Bearer` |
| `access_token.aud` | `team4s-api,account` |
| `access_token.azp` | `team4s-frontend` |
| `access_token.sid` | present |
| `id_token.typ` | `ID` |
| `id_token.aud` | `team4s-frontend` |

## API Boundary Probe

After rebuilding backend and frontend:

| Probe | Result |
|---|---|
| `GET http://127.0.0.1:8092/api/v1/me` with access token | `200` |
| `GET http://127.0.0.1:8092/api/v1/me` with ID token | `401` |

Conclusion: Keycloak now issues a Team4s API access token and the backend no longer accepts the ID token as API bearer.
