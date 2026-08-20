---
phase: 136-capability-policy-catalog-schema-contract
plan: 17
subsystem: api-contracts
tags: [openapi, typescript, authorization, contract-parity]
requires:
  - phase: 136-16
    provides: normalized override-reason vocabulary
provides:
  - synchronized effective-rights and scoped-override contract family
  - semantic focused/root OpenAPI-to-TypeScript parity gate
  - executable read-only contract inputs for backend parity tests
affects: [phase-137, phase-138, capability-policy]
tech-stack:
  added: []
  patterns: [discriminated mutation requests, semantic YAML contract tests]
key-files:
  created:
    - backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go
  modified:
    - shared/contracts/admin-capabilities.yaml
    - shared/contracts/openapi.yaml
    - frontend/src/types/admin-capability.ts
    - docker-compose.yml
key-decisions:
  - "Non-platform administrators use a reason-required request branch; platform administrators use a separately discriminated branch where reason may be omitted."
  - "Override removal is represented by a nullable effect while real mutation results distinguish changed from exact no_op."
requirements-completed: [CAP-04, QUAL-01]
duration: 16min
completed: 2026-08-20
---

# Phase 136 Plan 17: Synchronized Policy Contract Summary

**One complete effective-rights, scoped-override, provenance, impact, audit, activation, and mutation-result vocabulary across focused OpenAPI, root OpenAPI, and TypeScript.**

## Performance

- **Duration:** 16 min
- **Completed:** 2026-08-20
- **Tasks:** 1 TDD task
- **Files modified:** 5

## Accomplishments

- Added the full policy schema family with group scope, target user, allow/deny effects, non-deniable IdP provenance, before/after state, impact items, immutable audit shape, activation status, and changed/no-op results.
- Encoded the shared reason vocabulary exactly as `task_delegation`, `security_measure`, `role_gap`, and `other`; `other` requires non-empty text.
- Made reason optional only in the explicitly discriminated platform-admin mutation branch while preserving audit actor/timestamp/before/after fields.
- Added a YAML parser-based semantic gate that checks both OpenAPI documents and parses TypeScript interfaces/unions for membership, requiredness, enums, nullable transitions, and platform-admin reason semantics.

## Task Commits

1. **RED: Semantic cross-surface policy parity gate** — `38c88da5`
2. **GREEN: Synchronized policy contract family** — `ad67bdf1`

## Files Created/Modified

- `backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go` — semantic YAML↔TypeScript parity test.
- `shared/contracts/admin-capabilities.yaml` — focused canonical policy schemas.
- `shared/contracts/openapi.yaml` — root cross-surface mirror.
- `frontend/src/types/admin-capability.ts` — exact TypeScript policy family.
- `docker-compose.yml` — read-only contract/type mounts for executable backend parity tests.

## Decisions Made

- Used separate discriminated request schemas instead of documenting conditional reason requirements only in prose.
- Kept this plan contract-only: no endpoint, resolver, persistence, or Phase-137 runtime behavior was introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mounted contract sources for the named backend test**

- **Found during:** Task 1 verification
- **Issue:** The backend development container contained backend source only, so the required test could not read the canonical root OpenAPI and TypeScript files.
- **Fix:** Added read-only mounts for `shared/contracts` and `frontend/src/types` to the backend service.
- **Files modified:** `docker-compose.yml`
- **Commit:** `ad67bdf1`

## TDD Gate Compliance

- RED commit: `38c88da5`
- GREEN commit: `ad67bdf1`

## Verification

- `docker compose exec -T team4sv30-backend go test -v ./internal/handlers -run '^TestPhase136PolicyYAMLTypeScriptContract$' -count=1` — PASS, test executed.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — PASS.
- `git diff --check` — PASS.

## Known Stubs

None.

## Deferred Scope

- Effective-rights resolution and override mutations remain Phase 137.
- Override/impact UI remains Phase 138.
- The unused legacy releases route, Finding #33, and general Finding #34 badge redesign were untouched.

## Self-Check: PASSED

All five changed files and both task commits exist. The named semantic test executed rather than skipping.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
