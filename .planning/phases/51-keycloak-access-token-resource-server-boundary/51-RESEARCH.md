# Phase 51: Keycloak Access-Token Resource-Server Boundary - Research

**Researched:** 2026-05-26
**Domain:** Keycloak OIDC audience mapping, frontend token persistence, Go backend JWT verification
**Confidence:** HIGH for current-code and live-local findings; MEDIUM for exact Keycloak import JSON shape until tested against a fresh realm and an existing persisted realm.

<user_constraints>
## User Constraints From Context

### Locked Decisions
- D-01: `id_token` is not an API Bearer.
- D-02: The frontend stores and sends Keycloak `access_token` for Team4s API requests.
- D-03: Keycloak must issue a Team4s API audience such as `team4s-api`.
- D-04: The backend verifies API access tokens as a resource server.
- D-05: Team4s authorization stays in the app database; Keycloak remains identity and token lifecycle only.
- D-06: The 24h login target remains: short access tokens, 24h refresh/SSO session unless logout.
- D-07: Phase 49 central `authorizedFetch` refresh/retry behavior is the baseline.

### Deferred / Out Of Scope
- Moving fansub or app-domain roles into Keycloak.
- External production IdP rollout.
- Full OAuth consent, token exchange, or multi-resource API design.
- Reworking Team4s app-user/permission ownership.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-RESOURCE-SERVER-01 | Keycloak-issued Team4s API calls use real OIDC access tokens with a Team4s API audience; the frontend never uses ID tokens as API bearer tokens; the backend validates issuer, JWKS signature, expiry, audience, and authorized party while app authorization remains in Team4s. | Current code and live-local tests prove the inverse behavior today: `id_token` works as `/api/v1/me` bearer, `access_token` is rejected, and the frontend persists `idToken` into `team4s_access_token`. |
</phase_requirements>

## Summary

The user is right: the current Keycloak integration has the token boundary inverted. The browser receives both Keycloak tokens, but `frontend/src/lib/api.ts` maps `KeycloakTokenBundle.idToken` into the Team4s `access_token` storage slot and returns `idToken` after refresh. The backend verifier is built with `oidc.IDTokenVerifier` and `ClientID=team4s-frontend`, so it accepts the ID token audience and rejects the current access token.

Live-local evidence on 2026-05-26:

| Probe | Result |
|---|---|
| Password grant access token | `typ=Bearer`, `aud=account`, `azp=team4s-frontend`, `scope=openid profile email`, `sid` present, `expires_in=300`, `refresh_expires_in=86400`. |
| Password grant ID token | `typ=ID`, `aud=team4s-frontend`, `azp=team4s-frontend`, `sid` present. |
| `GET /api/v1/me` with access token | `401`. |
| `GET /api/v1/me` with ID token | `200`. |

Target: configure Keycloak so access tokens include `team4s-api` in `aud`, switch frontend storage/header use to `accessToken`, and switch backend API verification from ID-token semantics to access-token resource-server validation.

## External Standards / Product Notes

Keycloak's official audience docs match the desired design:

- Access tokens should carry an `aud` claim representing services where the token is intended to be used.
- Services should check the audience on access tokens.
- A hardcoded audience mapper can add a service client or custom value to the access token.
- Keycloak notes that the frontend client is not automatically added as access-token audience, and using the same client for frontend and REST service is not recommended.
- Keycloak's Audience and Audience Resolve mappers add audiences to access tokens by default; ID tokens normally keep the login client as their audience.

Official references:
- Keycloak Server Administration Guide, Audience section: https://www.keycloak.org/docs/latest/server_admin/
- Go `github.com/coreos/go-oidc/v3/oidc` docs: https://pkg.go.dev/github.com/coreos/go-oidc/v3/oidc

Go `go-oidc` also confirms the current implementation is an ID-token verifier path: `IDTokenVerifier.Verify` parses and verifies a raw ID token, and `Config.ClientID` is the expected token audience for that ID-token-style check. For access-token validation, the plan should either add an access-token-specific verifier around `RemoteKeySet.VerifySignature` plus explicit `iss`, `exp`, `aud`, and `azp` checks, or introduce a JWT validation library/helper that makes those checks explicit. Do not keep a method called `VerifyAccessToken` backed by frontend-client ID-token audience semantics.

## Current Architecture Findings

| Area | Current Behavior | Evidence | Planning Implication |
|---|---|---|---|
| Keycloak realm | Only `team4s-frontend` public client exists; no `team4s-api` client/scope/audience mapper is in realm import. | `infra/keycloak/realm-team4s.json` has one client and no `clientScopes`/`protocolMappers` audience setup. | Plan 51-01 must add local import config and live-update/reset instructions for existing Keycloak volumes. |
| Local token lifetime | Realm import has `accessTokenLifespan=300`, `ssoSessionIdleTimeout=86400`, `ssoSessionMaxLifespan=86400`. | `infra/keycloak/realm-team4s.json`; live password grant returned 300s/86400s. | Preserve this split. Do not solve 24h login by lengthening access tokens. |
| Frontend token bundle | `KeycloakTokenBundle` stores both `accessToken` and `idToken`. | `frontend/src/lib/keycloakAuth.ts`. | Keep bundle shape, but enforce API bearer mapping to `accessToken`. |
| Frontend runtime mapping | `toRuntimeAuthData` writes `access_token: accessTokenData.idToken`. | `frontend/src/lib/api.ts`. | Plan 51-03 must change this to `accessTokenData.accessToken` and update tests expecting `fresh-id-token` in `team4s_access_token`. |
| Frontend refresh | Keycloak refresh resolves `/api/v1/me` with `tokenBundle.idToken`, persists ID token, and returns ID token. | `refreshRuntimeSession`, `completeKeycloakAuthCallback`, `refreshActiveAuthSession` in `frontend/src/lib/api.ts`. | Switch `/api/v1/me` resolution and refresh return value to access token once backend accepts access tokens. |
| Backend verifier | `KeycloakVerifier` wraps `*oidc.IDTokenVerifier` with `ClientID=team4s-frontend`; method is named `VerifyAccessToken`. | `backend/internal/auth/oidc.go`. | Plan 51-02 must split identity-token terminology from access-token verification and add audience/azp config. |
| Backend config | Only `KEYCLOAK_CLIENT_ID` exists and means frontend client ID. | `backend/internal/config/config.go`, `.env.example`, `docker-compose.yml`. | Add `KEYCLOAK_API_AUDIENCE=team4s-api` or equivalent; keep frontend client ID available for logout/client context if needed. |
| Current user resolver | Uses token claims `sub`, email/name fields, `sid`, revocation checks, and app DB resolver. | `backend/internal/middleware/current_user_auth.go`. | Access tokens must still include enough identity claims, or resolver must fetch/map claims safely. Current live access token has `sid`; verify email/name availability in tests/live. |
| Backchannel logout | Uses the same `KeycloakVerifier.VerifyLogoutToken` path today. | `backend/internal/handlers/app_auth.go` + `backend/internal/auth/oidc.go`. | Avoid breaking logout token verification. It may need its own verifier/config path if access-token verifier stops using ID-token verifier semantics. |

## Recommended Target Shape

### 1. Keycloak Configuration

Use separate identities for browser client and API audience:

| Entity | Purpose | Suggested ID |
|---|---|---|
| Browser public client | PKCE login, browser redirect, refresh token lifecycle | `team4s-frontend` |
| API audience / resource server | The intended recipient of Team4s backend access tokens | `team4s-api` |
| Client scope or dedicated mapper | Adds Team4s API audience to frontend-issued access tokens | `team4s-api` scope or frontend dedicated audience mapper |

Recommended local approach:

1. Add a `team4s-api` OIDC client with no browser redirects and no public-login behavior if Keycloak import supports it cleanly.
2. Add an Audience mapper that adds `team4s-api` to access tokens issued to `team4s-frontend`.
3. Prefer a default client scope or dedicated frontend mapper for local dev so users do not need to request a custom `scope=team4s-api` manually.
4. Keep `openid profile email` in the login request; only add a custom scope if the mapper is optional by design.
5. Include docs/live instructions for existing realms, because Keycloak import does not update an already-persisted realm volume automatically.

Acceptance probe:

```powershell
$token = Invoke-RestMethod -Method Post `
  -Uri 'http://127.0.0.1:8081/realms/team4s/protocol/openid-connect/token' `
  -ContentType 'application/x-www-form-urlencoded' `
  -Body 'grant_type=password&client_id=team4s-frontend&username=phase43-admin&password=Team4s123!&scope=openid%20profile%20email'

# Decode token payload and assert:
# access_token.typ == "Bearer"
# access_token.aud includes "team4s-api"
# access_token.azp == "team4s-frontend"
# id_token.aud == "team4s-frontend"
```

### 2. Backend Resource-Server Verification

The backend API should validate access tokens with these checks:

| Check | Required |
|---|---|
| Signature | Validate with JWKS from Keycloak discovery `jwks_uri`. |
| Issuer | Must equal `KEYCLOAK_ISSUER_URL`. |
| Expiry / not-before if available | Must reject expired tokens. |
| Audience | `aud` must include `KEYCLOAK_API_AUDIENCE`, default `team4s-api` for local. |
| Authorized party | `azp` should be `KEYCLOAK_CLIENT_ID` / `team4s-frontend` for browser-issued user tokens, unless an explicit server/client flow is introduced later. |
| Token kind | Reject ID tokens as API bearers; use `typ`, audience, and required access-token claims as practical discriminators. |
| Subject/session | Require `sub`; preserve `sid` checks when present and decide fail-closed/fail-open for missing `sid`. For current Keycloak, `sid` is present in access tokens. |

Implementation notes:

- Do not use `oidc.IDTokenVerifier` with `ClientID=team4s-frontend` as the API access-token verifier.
- If using `go-oidc` only, wrap `RemoteKeySet.VerifySignature` and then decode claims; add explicit issuer, expiry, audience, and azp checks in Team4s code. This avoids pretending ID-token validation is access-token validation.
- Alternatively use a JWT library already compatible with JWKS and claim validators, but avoid a broad dependency churn unless it clearly simplifies validation.
- Keep logout token verification separate. It may still be ID-token-like JWT validation, but should not use the API audience verifier.

Recommended test vectors:

| Token Fixture | Expected |
|---|---|
| valid access token with `aud=["team4s-api"]`, `azp="team4s-frontend"` | accepted |
| ID token with `typ="ID"`, `aud="team4s-frontend"` | rejected |
| access token with `aud="account"` only | rejected |
| access token with wrong `iss` | rejected |
| expired access token | rejected |
| access token with wrong `azp` | rejected |

### 3. Frontend Mapping And Refresh

Switch only the API bearer token. Keep ID token in the Keycloak bundle for login identity/session completion if still useful, but do not store it in `team4s_access_token`.

Concrete target changes:

| Current | Target |
|---|---|
| `toRuntimeAuthData(...).access_token = accessTokenData.idToken` | `accessTokenData.accessToken` |
| `getCurrentUserWithBearerToken(tokenBundle.idToken)` after login/refresh | `tokenBundle.accessToken` |
| `refreshRuntimeSession()` returns `tokenBundle.idToken` | returns `tokenBundle.accessToken` |
| tests expect `team4s_access_token=fresh-id-token` | expect `fresh-access-token` or equivalent |
| auth docs say ID token works as Team4s bearer | docs say ID token is not an API bearer |

Preserve these Phase 49 properties:

- Central `authorizedFetch` remains the normal API request path.
- Refresh still uses one shared in-flight promise.
- 401 auth-related recovery still retries once.
- No page/component should gain direct token ownership.

### 4. Documentation And Developer Operations

Required docs updates:

- Correct `docs/operations/keycloak-auth-foundation-phase43.md`, especially the current statement that successful login plus `id_token` as Team4s bearer is expected.
- Add audience verification and migration instructions:
  - fresh realm import path;
  - existing-volume live update path via Keycloak Admin API/Admin Console;
  - smoke checks for token claims and `/api/v1/me`.
- Update `.env.example` and `docker-compose.yml` with the API audience config.
- Keep a note that app roles/fansub permissions remain in Team4s DB and are not Keycloak claims.

## Plan Split Recommendation

| Plan | Focus | Why First/After |
|---|---|---|
| 51-01 | Keycloak `team4s-api` audience/client-scope config plus local/live verification docs | Backend cannot accept true access tokens until Keycloak can issue them. |
| 51-02 | Backend verifier/config/tests for resource-server access-token validation | Must be ready before frontend flips the stored bearer token. |
| 51-03 | Frontend mapping, refresh, and tests from ID-token bearer to access-token bearer | Depends on API accepting access tokens. |
| 51-04 | End-to-end regression, docs correction, live UAT, and migration notes | Validates cross-boundary behavior and 24h login goal after all pieces land. |

## Validation Strategy

### Automated Checks

Frontend:

```powershell
cd C:/Users/admin/Documents/Team4s/frontend
npm test -- --run src/lib/keycloakAuth.test.ts src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts
npx tsc --noEmit --incremental false
npx eslint src/lib/api.ts src/lib/keycloakAuth.ts src/lib/api.auth-refresh.test.ts src/lib/keycloakAuth.test.ts src/lib/api.no-token-boundary.test.ts
```

Backend:

```powershell
cd C:/Users/admin/Documents/Team4s/backend
go test ./internal/auth ./internal/middleware ./internal/handlers
```

Repo-level:

```powershell
cd C:/Users/admin/Documents/Team4s
git diff --check
```

### Live UAT / Smoke Checks

1. Rebuild/restart Keycloak, backend, and frontend with local config.
2. Log in through `http://127.0.0.1:3002/auth`.
3. Decode stored browser `team4s_access_token`; assert it is an access token with `aud` containing `team4s-api`, not an ID token.
4. Call `/api/v1/me` with access token; expect 200.
5. Call `/api/v1/me` with ID token; expect 401.
6. Wait beyond access-token lifetime or force expiry path; ensure automatic refresh occurs without manual button.
7. Confirm logout clears local session and invalidates the Keycloak refresh session.

## Risks / Stop Conditions

- Stop if Keycloak audience setup cannot be represented safely in realm import and live update instructions; do not fake API acceptance by allowing `team4s-frontend` ID-token audience.
- Stop if the backend loses `sid`/subject revocation semantics after moving to access-token claims.
- Stop if frontend and backend cannot be switched in a compatible order. Prefer backend accepts correct access tokens before frontend flips storage.
- Stop before moving app-domain roles, fansub memberships, release/media capabilities, or platform admin decisions into Keycloak.
- Stop if implementation work intersects unrelated dirty UI/deletion changes in the current worktree; do not revert user changes.

## Open Questions For Planner

| Question | Recommended Default |
|---|---|
| Should `team4s-api` be a Keycloak client or only a custom audience string? | Prefer a real disabled/non-browser OIDC client plus audience mapper, because Keycloak docs describe client audience as the normal resource-server representation. |
| Should the audience mapper be default or optional scope? | Prefer default for local Team4s frontend so API calls always work without a custom scope parameter. |
| Should backend require `sid` on access tokens? | Prefer fail-closed if Keycloak access tokens include `sid` in live/local tests; otherwise explicitly document fallback revocation behavior before accepting. |
| Should ID token be stored anywhere after login? | No normal API storage. Keep in transient bundle only if needed for login completion tests; do not persist as Team4s bearer. |

## Sources

### Local Verified Sources
- `.planning/ROADMAP.md` Phase 51.
- `.planning/phases/51-keycloak-access-token-resource-server-boundary/51-CONTEXT.md`.
- `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-RESEARCH.md`.
- `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-PATTERNS.md`.
- `frontend/src/lib/keycloakAuth.ts`.
- `frontend/src/lib/api.ts`.
- `frontend/src/lib/api.auth-refresh.test.ts`.
- `backend/internal/auth/oidc.go`.
- `backend/internal/middleware/current_user_auth.go`.
- `backend/internal/handlers/app_auth.go`.
- `backend/internal/config/config.go`.
- `infra/keycloak/realm-team4s.json`.
- `docker-compose.yml`.
- `.env.example`.

### Live Local Probes
- `docker compose ps --format json` showed Keycloak, backend, frontend, DB, Redis running locally on 2026-05-26.
- Password grant token decode against `http://127.0.0.1:8081/realms/team4s` on 2026-05-26.
- `/api/v1/me` smoke test against `http://127.0.0.1:8092` with access token and ID token on 2026-05-26.

### External Official Sources
- Keycloak Server Administration Guide, Audience and Client Scopes sections: https://www.keycloak.org/docs/latest/server_admin/
- Go `github.com/coreos/go-oidc/v3/oidc` package docs: https://pkg.go.dev/github.com/coreos/go-oidc/v3/oidc

## Metadata

**Research date:** 2026-05-26
**Valid until:** 2026-06-09 for this repo snapshot; re-run live token probes if Keycloak realm config or auth files change first.
