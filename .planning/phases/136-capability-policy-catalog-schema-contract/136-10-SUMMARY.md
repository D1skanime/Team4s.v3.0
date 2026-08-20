---
phase: 136-capability-policy-catalog-schema-contract
plan: 10
subsystem: api
tags: [go, gin, postgresql, role-catalog, public-api]

requires:
  - phase: 136-01
    provides: canonical role presentation metadata and zero-right karaoke_fx seed
provides:
  - bounded public role catalog projection for three canonical contexts
  - one unauthenticated v1 presentation-only endpoint
  - exact-key tests preventing authorization metadata disclosure
affects: [136-03, 136-11, frontend-role-catalog-consumers]

tech-stack:
  added: []
  patterns: [explicit public DTO, fixed context allowlist, unprotected router registration seam]

key-files:
  created:
    - backend/internal/repository/role_catalog_repository.go
    - backend/internal/handlers/role_catalog_handler.go
    - backend/internal/repository/role_catalog_repository_test.go
    - backend/internal/handlers/role_catalog_handler_test.go
    - backend/internal/handlers/role_catalog_router_integration_test.go
  modified:
    - backend/cmd/server/main.go

key-decisions:
  - "The public catalog DTO contains only semantic presentation fields and a derived operative-capability count/state."
  - "The handler accepts exactly fansub_group, anime_contribution, and group_history; all other or missing contexts use the project 400 envelope."
  - "The route is registered through one explicit unprotected v1 seam, while IdP roles, grants, overrides, actions, and audit data remain structurally absent."

requirements-completed: [CAP-11, CAP-13, QUAL-01]

duration: 6min
completed: 2026-08-20
---

# Phase 136 Plan 10: Public Role Catalog Summary

**One unauthenticated `/api/v1/role-definitions` endpoint now projects the ordered canonical database role catalog without exposing any authorization state.**

## Performance

- **Duration:** 6 min
- **Completed:** 2026-08-20T17:29:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added a database-backed presentation projection ordered by `sort_order` and role code.
- Restricted public queries to `fansub_group`, `anime_contribution`, and `group_history` with a fixed allowlist.
- Exposed only role code, German label, contexts, order, assignability, semantic color/icon keys, and derived operative-capability state.
- Proved the route is unauthenticated, uses the project error envelope, preserves the zero-right `karaoke_fx` state, and has no sensitive JSON fields.
- Left the unused legacy `/anime/[id]/group/[groupId]/releases` surface untouched.

## Task Commits

1. **Task 1: Specify public projection and exact router audience** — `cd5bd6e0` (test)
2. **Task 2: Implement the sole public presentation catalog route** — `992bac37` (feat)

## Files Created/Modified

- `backend/internal/repository/role_catalog_repository.go` — canonical presentation-only SQL projection and public DTO.
- `backend/internal/repository/role_catalog_repository_test.go` — bounded-query and forbidden-source contract.
- `backend/internal/handlers/role_catalog_handler.go` — fixed context allowlist, project error handling, and public registration seam.
- `backend/internal/handlers/role_catalog_handler_test.go` — audience, exact JSON keys, zero-right, and error-envelope tests.
- `backend/internal/handlers/role_catalog_router_integration_test.go` — exact single unprotected registration proof.
- `backend/cmd/server/main.go` — wires the public catalog repository and handler to v1.

## Decisions Made

- Public presentation is a dedicated DTO rather than a filtered admin-capability response, making sensitive fields impossible to serialize accidentally.
- `has_operative_capabilities` is derived from the canonical mapping count; no role-name inference or static role list is introduced.
- The repository query never joins override, audit, or global-role tables.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Isolated the Go build cache during focused verification**
- **Found during:** Task 2 verification
- **Issue:** A concurrent process cleared the backend container's shared Go build cache while packages were compiling, producing missing cache-artifact errors unrelated to the source.
- **Fix:** Re-ran verification with plan-local `GOCACHE=/tmp/go-build-13610`.
- **Files modified:** None.
- **Verification:** Focused repository/handler tests and the server package test passed.

## Verification

- `docker compose exec -T -e GOCACHE=/tmp/go-build-13610 team4sv30-backend go test ./internal/repository ./internal/handlers -run 'RoleCatalog|RoleDefinitionsRouter' -count=1` — passed.
- `docker compose exec -T -e GOCACHE=/tmp/go-build-13610 team4sv30-backend go test ./cmd/server -count=1` — passed.
- `git diff --check cd5bd6e0^..HEAD` — passed.

## Known Stubs

None.

## Next Phase Readiness

- Contract and frontend adapter plans can consume one stable public presentation endpoint.
- Root provider wiring can load the three contexts without page-specific role catalogs.
- Runtime capability resolution and override mutation remain deferred to Phases 137 and 138.

## Self-Check: PASSED

- All six owned source/test files exist.
- Task commits `cd5bd6e0` and `992bac37` exist in repository history.
- Focused handler/repository and server compilation tests pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
