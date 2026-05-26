---
phase: 51-keycloak-access-token-resource-server-boundary
status: secured
updated: 2026-05-26
threats_open: 0
---

# Phase 51 Security Verification

## Threat Register

| Threat | Status | Evidence |
|---|---|---|
| Access tokens omit `team4s-api`, encouraging ID-token fallback | CLOSED | Keycloak live token has `access_token.aud = team4s-api,account`; realm import includes default client scope and audience mapper. |
| ID tokens remain accepted as API bearer tokens | CLOSED | Backend live smoke returns `401` for `/api/v1/me` with ID token; static frontend test rejects ID-token bearer mapping. |
| Wrong audience or wrong authorized party accepted | CLOSED | Backend tests cover wrong audience and wrong `azp`; verifier is configured with API audience and explicit `azp` check. |
| Signature/issuer/expiry validation weakened during verifier refactor | CLOSED | Backend uses `go-oidc` verifier for JWKS signature, issuer, expiry, and API audience, plus explicit claim checks. |
| Logout token verification breaks through API-audience verifier | CLOSED | `VerifyLogoutToken` remains separate and uses frontend-client verifier semantics. |
| Keycloak takes over Team4s domain authorization | CLOSED | Implementation only changes token audience/verification; app roles, fansub memberships, and permissions remain in Team4s DB. |

## Accepted Risks

None.

## Security Audit 2026-05-26

| Metric | Count |
|---|---:|
| Threats found | 6 |
| Closed | 6 |
| Open | 0 |

## Audit Trail

- Verified implementation against all `<threat_model>` blocks in Phase 51 plans.
- Ran focused backend tests and live `/api/v1/me` access-token/ID-token probes.
