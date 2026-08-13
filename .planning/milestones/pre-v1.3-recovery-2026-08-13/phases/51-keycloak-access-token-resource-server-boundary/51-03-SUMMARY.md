---
phase: 51-keycloak-access-token-resource-server-boundary
plan: 03
subsystem: frontend-auth
tags: [nextjs, keycloak, access-token, refresh]
requires:
  - phase: 51-02
    provides: backend accepts `team4s-api` access tokens
provides:
  - Frontend stores and sends Keycloak access tokens for Team4s API calls
affects: [auth-page, api-client, upload-auth]
tech-stack:
  added: []
  patterns: [ID token retained as login artifact only, access token persisted as API bearer]
key-files:
  created: []
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/keycloakAuth.ts
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/lib/api.no-token-boundary.test.ts
key-decisions:
  - "Use `KeycloakTokenBundle.accessToken` for `/api/v1/me`, persisted runtime bearer, and refresh retry."
patterns-established:
  - "Static test guards against `tokenBundle.idToken` flowing into Team4s bearer paths."
requirements-completed: [AUTH-RESOURCE-SERVER-01]
duration: 25min
completed: 2026-05-26
---

# Phase 51 Plan 03 Summary

The frontend no longer stores or retries with Keycloak ID tokens as Team4s API bearer tokens.

## Accomplishments
- Changed `toRuntimeAuthData` to persist `accessTokenData.accessToken`.
- Changed Keycloak login and refresh `/api/v1/me` resolution to use `tokenBundle.accessToken`.
- Changed refresh retry return value to the refreshed access token.
- Updated auth refresh tests to distinguish `new-access-token` from `fresh-id-token`.
- Added a static no-token-boundary regression for ID-token bearer mapping.
- Removed an unused Keycloak refresh helper that lint flagged after the proxy-based refresh path.

## Files Created/Modified
- `frontend/src/lib/api.ts` - Access-token bearer mapping.
- `frontend/src/lib/keycloakAuth.ts` - Removed unused direct browser refresh body helper.
- `frontend/src/lib/api.auth-refresh.test.ts` - Assertions now expect access-token bearer.
- `frontend/src/lib/api.no-token-boundary.test.ts` - Static ID-token guard.

## Deviations from Plan
None. The change stayed inside the central auth boundary and did not add token ownership to pages/components.

## Threat Flags
- CLOSED: `idToken` is no longer persisted as `team4s_access_token`.
- CLOSED: Refresh retry uses the refreshed access token.
- CLOSED: Static tests catch reintroduction of ID-token bearer mapping.
