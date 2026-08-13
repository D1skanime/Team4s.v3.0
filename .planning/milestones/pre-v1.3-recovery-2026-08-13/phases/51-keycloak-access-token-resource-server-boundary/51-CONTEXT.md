# Phase 51: Keycloak Access-Token Resource-Server Boundary - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** Operator direction after live Keycloak session/token debugging

<domain>
## Phase Boundary

Phase 51 corrects the Keycloak/API token boundary. The current implementation
uses a Keycloak `id_token` as the Team4s API Bearer token because the backend
verifier was wired around the frontend client audience. This phase replaces that
shortcut with a proper resource-server model:

- Keycloak issues an API-usable `access_token` for Team4s.
- The frontend stores and sends `access_token` for Team4s API calls.
- The backend verifies access tokens for issuer, signature, expiry, and
  Team4s API audience / authorized party.
- `id_token` remains a login identity artifact only and is not accepted as a
  Team4s API Bearer.

This phase is an auth architecture hardening slice. It must not change Team4s
domain authorization ownership: app users, platform roles, fansub memberships,
and fansub roles remain in the Team4s database/application.
</domain>

<decisions>
## Implementation Decisions

### D-01 ID Token Is Not An API Bearer
- `id_token` must not be stored as `team4s_access_token`.
- `id_token` must not be sent in `Authorization: Bearer` to Team4s backend
  endpoints.
- Backend tests must reject an otherwise valid Keycloak `id_token` when it is
  used as an API Bearer.

### D-02 Access Token Owns API Calls
- The frontend must store and send Keycloak `access_token` for Team4s API
  requests.
- Refresh must continue to rotate and persist the current API access token and
  refresh token.
- Browser session metadata must use the actual API token expiry, not a mixed
  `id_token` / `access_token` approximation.

### D-03 Team4s API Audience
- Keycloak must be configured to include a Team4s API audience in access tokens,
  with a stable identifier such as `team4s-api`.
- The local realm import must document and provision this audience/client-scope
  setup where practical.
- Existing Keycloak volumes may need live migration or reset instructions
  because realm import is ignored for existing realms.

### D-04 Backend Resource-Server Verification
- The backend must verify access tokens as API resource-server tokens.
- Verification must include issuer, JWKS signature, expiry, and audience or
  authorized-party semantics appropriate for the chosen Keycloak setup.
- The verifier naming and tests should stop implying that an ID token is an
  access token.

### D-05 Team4s Authorization Boundary Stays Unchanged
- Keycloak remains identity and token lifecycle only.
- Team4s continues to own `app_users`, platform admin roles, fansub
  memberships, fansub roles, release/media capabilities, and all domain
  permission decisions.
- No fansub-specific role or app-domain permission should be moved into
  Keycloak claims.

### D-06 24h Login Goal Remains
- Access tokens may remain short-lived, e.g. 5 minutes.
- Refresh/SSO session configuration should keep the user logged in locally for
  24 hours unless they actively log out.
- The frontend should refresh automatically; users should not need to press a
  manual refresh button during normal use.

### D-07 Existing Refresh Hardening Is Baseline
- Phase 49 central auth client boundaries and the current `authorizedFetch`
  refresh/retry behavior are the baseline.
- This phase should preserve the no-token-boundary tests and extend them where
  needed rather than reintroducing token props or direct token access in app
  surfaces.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth And Token Lifecycle
- `docs/operations/keycloak-auth-foundation-phase43.md` - Current Keycloak
  foundation docs, including the known wrong `id_token` bearer expectation that
  this phase must correct.
- `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-RESEARCH.md` - Central auth client ownership and refresh baseline.
- `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-PATTERNS.md` - Existing frontend auth boundary patterns and static-test expectations.
- `frontend/src/lib/keycloakAuth.ts` - PKCE login, code exchange, refresh, and
  token bundle parsing.
- `frontend/src/lib/api.ts` - Runtime auth session persistence, refresh,
  `authorizedFetch`, and `/api/v1/me` resolution.
- `frontend/src/lib/api.auth-refresh.test.ts` - Refresh/retry regression tests.
- `frontend/src/lib/api.no-token-boundary.test.ts` - Static boundary tests for
  token ownership.

### Backend Verification
- `backend/internal/auth/oidc.go` - Current Keycloak verifier implementation.
- `backend/internal/middleware/current_user_auth.go` - Keycloak current-user
  resolver and bearer middleware.
- `backend/internal/middleware/current_user_auth_test.go` - Current middleware
  tests.
- `backend/internal/handlers/app_auth.go` - `/api/v1/me` and Keycloak logout
  handling.

### Runtime And Configuration
- `infra/keycloak/realm-team4s.json` - Local Keycloak realm/client import.
- `docker-compose.yml` - Keycloak, frontend, and backend auth-related env.
- `.env.example` - Documented local auth defaults.
</canonical_refs>

<specifics>
## Specific Ideas

- Prefer a Keycloak audience/client-scope setup over accepting frontend-client
  ID tokens in the backend.
- `team4s-api` is the preferred stable API audience name unless implementation
  research finds a better Keycloak-native convention for this setup.
- Keep `team4s-frontend` as the public browser/OIDC client.
- The backend may need separate config for frontend client ID versus API
  audience, e.g. `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_API_AUDIENCE`, or a clearer
  rename that preserves compatibility during transition.
- Tests should include representative JWTs or test verifier seams that prove
  `aud=team4s-frontend` ID-token-only behavior is rejected while
  `aud=team4s-api` access-token behavior is accepted.
- Docs should explicitly say that `id_token` identifies the logged-in user to
  the client, while `access_token` authorizes API calls to Team4s.
</specifics>

<deferred>
## Deferred Ideas

- Moving Team4s domain roles into Keycloak claims.
- Adding external production IdP providers beyond the local Keycloak setup.
- Full OAuth consent or multi-resource API design beyond the Team4s API
  audience needed for this app.
- Reworking the whole app-user/permission engine beyond the token verification
  boundary.
</deferred>

<risks>
## Risk Summary

- Changing token semantics can break all protected API calls if frontend and
  backend switch in the wrong order.
- Existing Keycloak volumes ignore realm import changes; live update or reset
  instructions are required for developers.
- The Go OIDC verifier currently uses ID-token verification semantics; the plan
  must be explicit about how access-token audience validation is implemented.
- Refresh cookies/storage must not mix `id_token` and `access_token` expiry
  metadata after the change.
- Backchannel logout and session revocation must continue to work with the
  claims available in access tokens.
</risks>

---

*Phase: 51-keycloak-access-token-resource-server-boundary*
*Context gathered: 2026-05-26 via operator direction*
