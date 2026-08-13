---
phase: 51-keycloak-access-token-resource-server-boundary
plan: 02
subsystem: backend-auth
tags: [go, oidc, jwt, keycloak]
requires:
  - phase: 51-01
    provides: access tokens with `team4s-api` audience
provides:
  - Backend resource-server access-token verification
  - Tests rejecting ID-token and wrong-audience API bearers
affects: [frontend-auth, current-user, backchannel-logout]
tech-stack:
  added: []
  patterns: [go-oidc verifier with API audience plus explicit azp/type checks]
key-files:
  created:
    - backend/internal/auth/oidc_test.go
  modified:
    - backend/internal/auth/oidc.go
    - backend/internal/config/config.go
    - backend/cmd/server/bootstrap_helpers.go
    - backend/cmd/server/main.go
key-decisions:
  - "Use `KEYCLOAK_API_AUDIENCE` separately from `KEYCLOAK_CLIENT_ID`."
  - "Keep logout token verification separate from API access-token verification."
patterns-established:
  - "Access-token validation checks API audience through go-oidc and then checks `azp`, `typ`, `sub`, and `sid` explicitly."
requirements-completed: [AUTH-RESOURCE-SERVER-01]
duration: 40min
completed: 2026-05-26
---

# Phase 51 Plan 02 Summary

The backend now validates Keycloak access tokens as Team4s API resource-server tokens and rejects ID-token-shaped API bearers.

## Accomplishments
- Added `KeycloakAPIAudience` backend config and startup validation.
- Refactored `KeycloakVerifier` to use `team4s-api` as the access-token audience.
- Added explicit claim checks for `typ`, `azp`, `sub`, `sid`, expiry, and audience.
- Preserved the separate logout verifier path for Keycloak backchannel logout.
- Added backend auth tests for accepted and rejected claim sets.

## Files Created/Modified
- `backend/internal/auth/oidc.go` - Resource-server verifier and explicit claim validation.
- `backend/internal/auth/oidc_test.go` - Claim validation regressions.
- `backend/internal/config/config.go` - Adds `KEYCLOAK_API_AUDIENCE`.
- `backend/cmd/server/bootstrap_helpers.go` - Requires audience when Keycloak is enabled.
- `backend/cmd/server/main.go` - Passes frontend client ID and API audience to verifier.

## Deviations from Plan
The verifier uses `go-oidc`'s verifier configured with `ClientID=team4s-api`, then adds Team4s-specific `azp` and token-shape checks. This is stricter than a bare JWKS signature check.

## Threat Flags
- CLOSED: ID tokens are rejected as API bearer tokens.
- CLOSED: Wrong audience and wrong authorized party are rejected.
- CLOSED: Logout token verification remains separate.
