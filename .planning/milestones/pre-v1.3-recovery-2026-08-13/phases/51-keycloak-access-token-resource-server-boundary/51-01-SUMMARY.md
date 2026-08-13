---
phase: 51-keycloak-access-token-resource-server-boundary
plan: 01
subsystem: auth-infra
tags: [keycloak, oidc, audience, docker]
requires:
  - phase: 49
    provides: central frontend auth refresh baseline
provides:
  - Keycloak `team4s-api` audience configuration for access tokens
  - Live local realm update and smoke evidence
affects: [backend-auth, frontend-auth, docs]
tech-stack:
  added: []
  patterns: [Keycloak default client scope for API audience]
key-files:
  created:
    - .planning/phases/51-keycloak-access-token-resource-server-boundary/51-keycloak-audience-smoke.md
  modified:
    - infra/keycloak/realm-team4s.json
    - docker-compose.yml
    - .env.example
    - docs/operations/keycloak-auth-foundation-phase43.md
key-decisions:
  - "Use `team4s-api` as the Team4s API audience."
  - "Attach the audience through a default client scope so browser login scope can stay `openid profile email`."
patterns-established:
  - "Existing Keycloak volumes need live update or reset because import does not rewrite existing realms."
requirements-completed: [AUTH-RESOURCE-SERVER-01]
duration: 35min
completed: 2026-05-26
---

# Phase 51 Plan 01 Summary

Keycloak now has a Team4s API audience model and the local live realm issues access tokens with `aud` containing `team4s-api`.

## Accomplishments
- Added `team4s-api` client and default client-scope audience mapper to the local realm import.
- Added `KEYCLOAK_API_AUDIENCE=team4s-api` to backend env defaults and docs.
- Updated the live local Keycloak realm without resetting the DB volume.
- Captured before/after token and `/api/v1/me` smoke evidence.

## Files Created/Modified
- `infra/keycloak/realm-team4s.json` - Adds API client, client scope, and access-token audience mapper.
- `docker-compose.yml` - Passes `KEYCLOAK_API_AUDIENCE` to backend.
- `.env.example` - Documents the API audience default.
- `docs/operations/keycloak-auth-foundation-phase43.md` - Corrects ID-token bearer guidance and documents audience.
- `.planning/phases/51-keycloak-access-token-resource-server-boundary/51-keycloak-audience-smoke.md` - Records live evidence.

## Deviations from Plan
The implementation followed the plan but refined the Keycloak shape: the audience mapper is on a default client scope, not directly on the frontend client. This keeps the browser request scope unchanged and matches the cleaner Keycloak model.

## Threat Flags
- CLOSED: Access tokens now include `team4s-api`.
- CLOSED: ID tokens remain targeted at `team4s-frontend`.
- CLOSED: Existing-volume drift is documented and was handled via live Admin REST update.
