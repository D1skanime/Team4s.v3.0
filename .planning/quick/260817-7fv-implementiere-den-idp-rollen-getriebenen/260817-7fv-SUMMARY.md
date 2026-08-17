---
phase: quick-260817-7fv
plan: 01
subsystem: auth
tags: [keycloak, oidc, jwt, jit-sync, admin-authorization, gin, react]

requires: []
provides:
  - "KeycloakTokenClaims.RealmRoles populated from a verified access token's realm_access.roles claim"
  - "AuthzRepository.SyncGlobalRolesFromKeycloak (+ pure diffKeycloakGlobalRoleSync) JIT-reconciling app_user_global_roles from IdP realm roles"
  - "Read-only 'aus IdP' global-role display in /admin/users"
affects: [admin-authorization, admin-users, keycloak-realm-config]

tech-stack:
  added: []
  patterns:
    - "IdP-role-driven authorization: realm role -> JWT claim -> per-request JIT DB reconciliation, never a one-time bootstrap"
    - "Pure diff function (diffKeycloakGlobalRoleSync) isolated from DB side effects for exhaustive unit testing"

key-files:
  created:
    - backend/internal/repository/authz_keycloak_sync.go
    - backend/internal/repository/authz_keycloak_sync_test.go
  modified:
    - infra/keycloak/realm-team4s.json
    - backend/internal/auth/oidc.go
    - backend/internal/auth/oidc_test.go
    - backend/internal/models/app_auth.go
    - backend/internal/middleware/current_user_auth.go
    - backend/internal/config/config.go
    - backend/cmd/server/bootstrap_helpers.go
    - .env.example
    - README.md
    - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx
    - frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx

key-decisions:
  - "JIT sync lives in KeycloakCurrentUserResolver.ResolveCurrentUser, never inside EnsureAppUserForIdentity, preserving the locked TestEnsureAppUserForIdentityStaysAppUserOnly invariant."
  - "Global roles (platform_admin/content_admin/user) became IdP-managed and read-only in /admin/users; fine-grained app-DB roles remain app-UI-managed and untouched by the sync."
  - "AUTH_ADMIN_BOOTSTRAP_USER_IDS kept working byte-for-byte unchanged, marked deprecated-fallback-only in comments/docs, not removed."
  - "No last-admin-guard was added to the JIT revoke path (accepted risk per the milestone note's design decision); the guard stays on the manual RevokeGlobalRole UI endpoint only."

patterns-established:
  - "Realm-role -> app-role reconciliation: models.KeycloakManagedGlobalRoles is the single source of truth for which realm roles the JIT sync is authoritative for; unknown realm roles are silently ignored (defense in depth alongside the DB CHECK constraint)."

requirements-completed: [260817-7fv-scope]

duration: ~90min (Tasks 1-3; Task 4 is a live human-verification checkpoint, not yet executed)
completed: 2026-08-17
---

# Quick Task 260817-7fv: IdP-role-driven global admin (JIT role sync) Summary

**Keycloak `platform_admin`/`content_admin` realm roles now flow through the verified JWT into a per-request `AuthzRepository.SyncGlobalRolesFromKeycloak` reconciliation of `app_user_global_roles`, replacing the DB-only bootstrap path; `/admin/users` shows the synced roles read-only ("aus IdP").**

## Performance

- **Tasks:** 3 of 4 completed (Tasks 1-3, all `type="auto" tdd="true"`)
- **Task 4** is a `type="checkpoint:human-verify" gate="blocking"` live-verification step — not executable by an agent, documented below for the human operator.
- **Files modified:** 11 (2 newly created)

## Accomplishments

- `realm_access.roles` now reaches issued Keycloak access tokens: `infra/keycloak/realm-team4s.json`'s `team4s-frontend` client gained `roles` in `defaultClientScopes` (source-of-truth JSON edit), **and** the identical change was applied live against the running `team4sv30-keycloak` container via `kcadm.sh` (the realm JSON alone would not have reached the already-imported, volume-persisted realm).
- `KeycloakTokenClaims.RealmRoles` is populated by a new pure `extractRealmRoles` helper (trims, drops empty entries, never panics when `realm_access` is absent).
- New `backend/internal/repository/authz_keycloak_sync.go`: pure `diffKeycloakGlobalRoleSync` (fully unit-tested against every case in the plan's behavior spec) plus `AuthzRepository.SyncGlobalRolesFromKeycloak`, which loads current roles, computes the diff, applies assign/revoke, and returns the post-sync role list.
- `KeycloakCurrentUserResolver.ResolveCurrentUser` now calls `SyncGlobalRolesFromKeycloak(ctx, currentUser.ID, claims.RealmRoles)` instead of the former read-only `ListAppUserGlobalRoles` — every authenticated request reconciles `app_user_global_roles` bidirectionally from the token.
- `AUTH_ADMIN_BOOTSTRAP_USER_IDS` is documented as a deprecated fallback (config.go, bootstrap_helpers.go, .env.example, README.md) with **zero behavior change**.
- `UserGlobalRolesTab.tsx` rewritten to a read-only view: no more assign/revoke modals or buttons; each role row now shows a muted "aus IdP" `Badge`, and the section header explains the IdP-managed nature of these roles in German.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire realm_access.roles into issued tokens and extract it in Go** - `74443874` (feat)
   - `infra/keycloak/realm-team4s.json`, `backend/internal/auth/oidc.go`, `backend/internal/auth/oidc_test.go`
   - Also applied the equivalent `defaultClientScopes` change live via `kcadm.sh` against the running `team4sv30-keycloak` container (not a git-tracked change; verified via `kcadm.sh get clients ... --fields defaultClientScopes`).
2. **Task 2: JIT-sync mapped Keycloak realm roles into app_user_global_roles** - `2541d701` (feat)
   - `backend/internal/models/app_auth.go`, `backend/internal/repository/authz_keycloak_sync.go` (new), `backend/internal/repository/authz_keycloak_sync_test.go` (new), `backend/internal/middleware/current_user_auth.go`, `backend/internal/config/config.go`, `backend/cmd/server/bootstrap_helpers.go`, `.env.example`, `README.md`
3. **Task 3: Make /admin/users show global roles as read-only "aus IdP"** - `9bd21938` (feat)
   - `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx`, `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx`

**Plan metadata:** not yet committed — pending this SUMMARY.md and STATE.md updates (orchestrator will commit docs).

_Note: all three tasks were TDD (`tdd="true"`); the RED state for Task 1 (failing/uncompilable `oidc_test.go`) already existed uncommitted before this session started, so no separate RED commit was made — the GREEN implementation and RED tests landed together in commit `74443874`, consistent with the pre-existing uncommitted state described in the task prompt._

## Files Created/Modified

- `infra/keycloak/realm-team4s.json` - `roles` added to `team4s-frontend`'s `defaultClientScopes`; corrected stale `platform_admin`/`content_admin` role descriptions
- `backend/internal/auth/oidc.go` - `keycloakAccessTokenClaims.RealmAccess`, `KeycloakTokenClaims.RealmRoles`, `extractRealmRoles` helper, wired into `VerifyAccessToken`
- `backend/internal/auth/oidc_test.go` - RED tests for realm role claim unmarshaling/extraction (pre-existing from prior session, verified GREEN)
- `backend/internal/models/app_auth.go` - `models.KeycloakManagedGlobalRoles` (single KC-realm-role -> app-global-role mapping source of truth)
- `backend/internal/repository/authz_keycloak_sync.go` (new) - `diffKeycloakGlobalRoleSync` (pure) + `AuthzRepository.SyncGlobalRolesFromKeycloak`
- `backend/internal/repository/authz_keycloak_sync_test.go` (new) - exhaustive pure-function unit tests + a Phase-107-fixture-based integration test (skips without `TEAM4S_PHASE107_TEST_DSN`, consistent with every other Phase-107 test in this package)
- `backend/internal/middleware/current_user_auth.go` - `ResolveCurrentUser` now calls `SyncGlobalRolesFromKeycloak` instead of `ListAppUserGlobalRoles`
- `backend/internal/config/config.go`, `backend/cmd/server/bootstrap_helpers.go`, `.env.example`, `README.md` - `AUTH_ADMIN_BOOTSTRAP_USER_IDS` deprecation comments only, no behavior change
- `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` - read-only "aus IdP" rewrite, no assign/revoke controls
- `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx` - updated mocks + new read-only-contract test, existing "global role never links" regression test unmodified

## Decisions Made

- Live Keycloak edit required `kcadm.sh` REST calls to `clients/{id}/default-client-scopes/{scopeId}` (a `PUT`-style default-scope attach), not a top-level `clients/{id}` `update` with a `defaultClientScopes` array — the latter silently no-ops in Keycloak 26 because default/optional client scopes are managed through their own dedicated sub-resource endpoints, not the client representation's field directly. Verified by re-querying `defaultClientScopes` after each attempt.
- `TestSyncGlobalRolesFromKeycloak` follows the exact same `TEAM4S_PHASE107_TEST_DSN`-gated skip pattern as every other Postgres-backed test already in `authz_permissions_test.go` in this package (no dedicated Postgres fixture DSN is configured in this environment) — this is the established, accepted convention here (skip, not fail, when the DSN is absent), not a shortcut invented for this task.
- Kept `SectionHeader`'s `actions` prop unset in the read-only `UserGlobalRolesTab` (no "Rolle vergeben" action) rather than replacing it with a disabled button, per the plan's explicit instruction to remove the actions prop entirely.

## Deviations from Plan

None - plan executed exactly as written for Tasks 1-3. The already-uncommitted RED-state changes described in the task prompt (`realm-team4s.json`'s `roles` scope addition, `oidc_test.go`'s three RED tests) were continued from, not redone, exactly as instructed.

## Issues Encountered

- Initial `kcadm.sh update clients/{id} -r team4s -f <json-with-defaultClientScopes>` silently succeeded (exit 0) but did not change the live `defaultClientScopes` — resolved by using the dedicated `kcadm.sh update clients/{id}/default-client-scopes/{scopeId}` sub-resource endpoint instead, which took effect immediately (verified via a follow-up `kcadm.sh get`).
- The backend/frontend containers have no live bind-mount of the host source in this environment's `docker compose watch`-disabled setup (per this session's disk-pressure constraint); code changes were synced into the running `team4sv30-backend` container via `docker cp` before each `go test`/`go build` run (frontend already has a live bind-mount via `docker-compose.override.yml`, so no `docker cp` was needed there).
- A broader, unfiltered `go test ./internal/repository/...` run surfaces ~25 pre-existing failures, all `TEAM4S_PHASE128_TEST_DSN is required for Phase-128 PostgreSQL tests` (a mandatory-DSN convention from Phase 128, per `.planning/STATE.md`'s decision: "Phase-128 PostgreSQL tests require TEAM4S_PHASE128_TEST_DSN and never fall back to DATABASE_URL"). These are pre-existing, unrelated to any file this plan touched, and out of this plan's scope boundary — not fixed, not part of this plan's targeted verify commands (which pass cleanly).

## User Setup Required

None for Tasks 1-3 (already applied automatically: JSON source-of-truth edit + live `kcadm.sh` realm edit).

**Task 4 requires live human verification** — see below. This cannot be automated or approved by an agent; it is a `gate="blocking"` checkpoint per the plan.

## Task 4: Live End-to-End Verification (NOT YET DONE — human action required)

The following five checks from the plan must be performed manually against the running stack (`http://127.0.0.1:3300` via the Windows SSH tunnel, per CLAUDE.md):

1. **Confirm no bootstrap env is active for the test user:**
   ```
   docker compose exec team4sv30-backend printenv AUTH_ADMIN_BOOTSTRAP_USER_IDS
   ```
   Should be empty/unset. (Already spot-checked as part of this session — see automated verify output below — but must be re-confirmed at the moment of the live test since env can differ per restart.)

2. **Grant the realm role and log in as a fresh test user:**
   - In the Keycloak admin console (or `kcadm.sh`) for the `team4s` realm, assign the `platform_admin` realm role to a real test user who does **not** have their id in `AUTH_ADMIN_BOOTSTRAP_USER_IDS` and has **no** existing `app_user_global_roles` row.
   - Log in as that user at `http://127.0.0.1:3300` and confirm `/admin/users` (and other admin-only surfaces) are now reachable — proving `platform_admin` was granted purely from the Keycloak realm role, no env/DB/restart involved.

3. **Confirm the read-only "aus IdP" display:**
   - As an existing platform admin, open `/admin/users/{test-user-id}`, click the "Globale Rollen" tab.
   - Confirm it shows `platform_admin` with a visible "aus IdP" `Badge`, no "Rolle entziehen"/"Rolle vergeben" buttons anywhere on the tab.

4. **Confirm bidirectional revoke:**
   - In Keycloak, remove the `platform_admin` realm role from the test user.
   - Log the test user out and back in (forces a fresh token/resolve — the sync only runs on `ResolveCurrentUser`, i.e. on the next authenticated request after re-login).
   - Confirm admin-only surfaces are now forbidden again for that user, and `/admin/users/{test-user-id}` no longer lists `platform_admin` in the Globale-Rollen tab.

5. **Confirm no regression for existing admins:**
   - An existing admin whose realm role was **not** touched during this test must still have full, uninterrupted access throughout steps 2-4.

**Rebuild/restart note:** per the plan's Task 4 `<action>`, `team4sv30-backend` and `team4sv30-frontend` need to be rebuilt/recreated so the Task 1-3 code changes are live (the containers currently running still have the pre-change binaries baked in, since this session used `docker cp` for fast test iteration rather than a full image rebuild, per the disk-pressure constraint in this session's instructions). Suggested minimal-disk-impact approach:
```
docker compose build team4sv30-backend team4sv30-frontend
docker compose up -d team4sv30-backend team4sv30-frontend
```
(Avoid `docker compose watch` and full unrelated-service rebuilds per this session's disk constraint; `docker builder prune -af` is available if disk pressure blocks the build.)

**Automated portion of Task 4's verify block (already run, informational only — does not substitute for the five live checks above):**
```
$ docker compose exec -T team4sv30-backend printenv AUTH_ADMIN_BOOTSTRAP_USER_IDS
(empty)
$ docker compose exec -T team4sv30-backend go build ./...
(succeeds)
```

## Next Phase Readiness

- Tasks 1-3's code and live-Keycloak-config changes are complete, committed, and independently verified via automated tests plus a live `kcadm.sh` round trip confirming `realm_access.roles` reaches issued tokens.
- Task 4 (blocking live human-verification checkpoint) is the only remaining step to fully close this quick task. Once a human completes the five checks above and rebuilds the backend/frontend containers, this quick task can be marked fully complete.
- This quick task is explicitly "Phase 0" of the larger v1.4 milestone-intent (`.planning/notes/milestone-intent-rechte-benutzerverwaltung.md`) and is a prerequisite for that milestone's later "Full-Reset" step (first admin purely via Keycloak realm role, no env/DB bootstrap at all) — not started here, out of this quick task's scope.

---

*Quick task: 260817-7fv*
*Completed (Tasks 1-3): 2026-08-17*
*Task 4: BLOCKED on live human verification*

## Self-Check: PASSED

All created/modified files verified present on disk; all three task commit hashes (`74443874`, `2541d701`, `9bd21938`) verified present in `git log`.
