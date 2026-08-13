---
status: complete
phase: 51-keycloak-access-token-resource-server-boundary
source:
  - 51-01-SUMMARY.md
  - 51-02-SUMMARY.md
  - 51-03-SUMMARY.md
  - 51-04-SUMMARY.md
started: 2026-05-26T01:20:00+02:00
updated: 2026-05-26T01:40:00+02:00
---

# Phase 51 UAT

## Tests

### 1. Keycloak Access Token Audience
expected: A fresh Keycloak token for `team4s-frontend` contains `team4s-api` in the access-token `aud` claim.
result: passed
evidence: `access_aud = team4s-api,account`, `access_azp = team4s-frontend`, `access_typ = Bearer`.

### 2. ID Token Remains Login Identity Token
expected: The ID token remains targeted at `team4s-frontend` and is not accepted by Team4s APIs.
result: passed
evidence: `id_typ = ID`, `id_aud = team4s-frontend`, `/api/v1/me` with ID token returned `401`.

### 3. Team4s API Accepts Access Token
expected: `/api/v1/me` accepts the Keycloak access token after backend rebuild.
result: passed
evidence: `/api/v1/me` with access token returned `200`.

### 4. 24h Login Target
expected: Access token remains short-lived and refresh session remains 24h locally.
result: passed
evidence: token response returned `expires_in = 300`, `refresh_expires_in = 86400`.

### 5. Automated Regression Checks
expected: Focused backend/frontend regressions pass.
result: passed
evidence:
- `go test ./...` passed.
- `npm test -- --run src/lib/keycloakAuth.test.ts src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts` passed.
- `npx tsc --noEmit --incremental false` passed.
- Focused `npx eslint ...` passed after removing unused helper.
- `docker compose up -d --build team4sv30-backend team4sv30-frontend` passed.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

None for Phase 51 token-boundary scope.

## Notes

The Docker rebuild used the current dirty worktree. Unrelated local modifications/deletions existed before Phase 51 execution and were not reverted.
