---
phase: 72-dom-nen-projektionen-status-fundament
plan: 04
subsystem: api
tags: [openapi, typescript, vitest, projection-contracts, api-client]
requires:
  - phase: 72-dom-nen-projektionen-status-fundament
    provides: "72-02 domain projection runtime DTOs and /api/v1/fansubs/:id/domain-projection route"
  - phase: 72-dom-nen-projektionen-status-fundament
    provides: "72-03 media ownership runtime DTOs and /api/v1/media-ownership/:ownerType/:ownerId route"
provides:
  - "OpenAPI documentation for direct no-envelope domain and media ownership projection reads"
  - "Snake_case frontend DTO mirrors for the projection response fields"
  - "Central api.ts read helpers and a Vitest parity guard"
affects: [frontend-projection-consumers, contract-discipline, phase-73-plus-surfaces]
tech-stack:
  added: []
  patterns:
    - "Projection reads use central api.ts helpers and return direct DTO/list payloads without data envelopes"
    - "Frontend projection DTOs mirror Go json tags in snake_case"
key-files:
  created:
    - frontend/src/types/domain-projection.ts
    - frontend/src/types/media-ownership.ts
    - frontend/src/types/__tests__/v12-projection-contract.test.ts
    - .planning/phases/72-dom-nen-projektionen-status-fundament/deferred-items.md
  modified:
    - shared/contracts/openapi.yaml
    - frontend/src/lib/api.ts
key-decisions:
  - "Runtime Go repository DTOs are the field source of truth for 72-04, so OpenAPI and TS include every json-tagged field from the two projection repositories."
  - "OpenAPI path keys follow the execution instruction without /api/v1, while api.ts helpers call the runtime /api/v1 routes."
  - "Projection client helpers parse direct response payloads and do not unwrap a data envelope."
patterns-established:
  - "Type-level ExactKeys/ExactUnion tests guard OpenAPI/TS projection drift."
requirements-completed: [K, A]
duration: 14min
completed: 2026-06-05T09:18:11Z
---

# Phase 72 Plan 04: Projection Contract Summary

**No-envelope projection read contracts with OpenAPI schemas, snake_case TypeScript mirrors, central api.ts helpers, and parity tests.**

## Performance

- **Duration:** 14min
- **Started:** 2026-06-05T09:04:15Z
- **Completed:** 2026-06-05T09:18:11Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Documented `/fansubs/{id}/domain-projection` and `/media-ownership/{ownerType}/{ownerId}` in `shared/contracts/openapi.yaml` as direct no-envelope reads.
- Added TypeScript DTO mirrors for all runtime Go JSON fields from the domain and media ownership projection repositories.
- Added `getFansubGroupDomainProjection` and `getMediaOwnershipProjection` to the central `api.ts` seam using `apiClientFetch`, `getApiBaseUrl`, shared error parsing, and no token/cookie access.
- Added a focused Vitest parity test for path shape, no-envelope responses, required field sets, and enum values.

## Task Commits

1. **Task 1: OpenAPI-Schemas + pinned read paths** - `aab9aa8d` (docs)
2. **Task 2: TS types + api.ts helpers + parity test** - `30c285b0` (feat)

## Files Created/Modified

- `shared/contracts/openapi.yaml` - Added projection path documentation and schema definitions.
- `frontend/src/types/domain-projection.ts` - Created snake_case domain projection DTO mirrors.
- `frontend/src/types/media-ownership.ts` - Created snake_case media ownership projection DTO mirrors.
- `frontend/src/lib/api.ts` - Added central read helpers for the two projection endpoints.
- `frontend/src/types/__tests__/v12-projection-contract.test.ts` - Created parity test for enums, field sets, pinned paths, and no-envelope responses.
- `.planning/phases/72-dom-nen-projektionen-status-fundament/deferred-items.md` - Recorded out-of-scope verification failures.

## Decisions Made

- Runtime Go DTO fields from `backend/internal/repository/domain_projection_repository.go` and `backend/internal/repository/media_ownership_projection_repository.go` were treated as the source of truth, including fields not listed in the shorter plan summary.
- OpenAPI path keys were added exactly as requested for this execution (`/fansubs/{id}/domain-projection` and `/media-ownership/{ownerType}/{ownerId}`); frontend helpers call the real runtime `/api/v1/...` URLs.
- Existing Redocly and frontend lint failures were not fixed because they are outside the allowed 72-04 file scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Documented and mirrored full runtime DTO field sets**
- **Found during:** Task 1 and Task 2
- **Issue:** The plan summary listed only the core projection axes, but the actual Go DTOs expose additional JSON fields such as IDs, status/year fields, file paths, captions, and MIME types.
- **Fix:** OpenAPI schemas, TS types, and parity tests include every json-tagged field from the runtime DTOs.
- **Files modified:** `shared/contracts/openapi.yaml`, `frontend/src/types/domain-projection.ts`, `frontend/src/types/media-ownership.ts`, `frontend/src/types/__tests__/v12-projection-contract.test.ts`
- **Verification:** `npx vitest run v12-projection-contract`, `npm run typecheck`, YAML parse.
- **Committed in:** `aab9aa8d`, `30c285b0`

**2. [Rule 3 - Blocking] Installed declared frontend dependencies in the worktree**
- **Found during:** Task 2 verification
- **Issue:** `npm run typecheck` initially failed because `tsc` was unavailable in the worktree (`node_modules` missing).
- **Fix:** Ran `npm ci` in `frontend`; no package files were changed.
- **Files modified:** None tracked.
- **Verification:** `npm run typecheck` completed successfully after install.
- **Committed in:** Not applicable; no tracked file changes.

---

**Total deviations:** 2 auto-handled (1 missing critical, 1 blocking)
**Impact on plan:** Contract fidelity improved to match runtime truth; no write endpoints, schema changes, or UI work were introduced.

## Issues Encountered

- `npx @redocly/cli lint ../shared/contracts/openapi.yaml` still fails on pre-existing OpenAPI issues outside the new 72-04 blocks. YAML parsing succeeds, and the 72-04-added nullable enum shape was adjusted so it no longer contributes a new Redocly error.
- `npm run lint` still fails on pre-existing frontend files outside this plan. Details are recorded in `deferred-items.md`.

## Known Stubs

None. Stub scan only matched pre-existing `api.ts` default/null helper patterns outside the new projection additions.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: contract-read-surface | `shared/contracts/openapi.yaml`, `frontend/src/lib/api.ts` | The plan documents and exposes client helpers for two existing GET projection surfaces. This is expected by the plan threat model and mitigated by no-envelope contract tests and central `api.ts` usage. |

## Verification

- `cd frontend && npx --yes js-yaml ../shared/contracts/openapi.yaml` - passed (`yaml-ok`).
- `cd frontend && npx vitest run v12-projection-contract` - passed (3 tests).
- `cd frontend && npm run typecheck` - passed.
- `git diff --check` - passed.
- `cd frontend && npx @redocly/cli@latest lint ../shared/contracts/openapi.yaml` - failed on pre-existing contract lint issues outside this slice; documented in `deferred-items.md`.
- `cd frontend && npm run lint` - failed on pre-existing frontend lint errors outside this slice; documented in `deferred-items.md`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Frontend phases can consume the domain and media ownership projections through typed central helpers. Contract drift is guarded by `v12-projection-contract.test.ts`.

## Self-Check: PASSED

- Found all created/modified plan files.
- Found task commits `aab9aa8d` and `30c285b0` in git history.
- No missing self-check items.

---
*Phase: 72-dom-nen-projektionen-status-fundament*
*Completed: 2026-06-05*
