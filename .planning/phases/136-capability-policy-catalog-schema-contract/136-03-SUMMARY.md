---
phase: 136-capability-policy-catalog-schema-contract
plan: 03
subsystem: api
tags: [openapi, typescript, role-catalog, authorization]
requires:
  - phase: 136-02
    provides: protected catalog projections
  - phase: 136-10
    provides: public presentation catalog
provides:
  - synchronized public role presentation contract and central API helper
  - pure catalog-backed role lookup and presentation adapter
affects: [136-04, 136-11, 136-12, role consumers]
tech-stack:
  added: []
  patterns: [injected catalog adapter, neutral unknown-role fallback]
key-files:
  created: [frontend/src/lib/roleCatalog.ts, frontend/src/lib/roleCatalog.test.ts, backend/internal/handlers/phase136_contract_parity_test.go]
  modified: [shared/contracts/admin-capabilities.yaml, shared/contracts/openapi.yaml, frontend/src/types/admin-capability.ts, frontend/src/types/fansub.ts, frontend/src/lib/api.ts]
key-decisions:
  - "Role codes remain open strings; presentation is derived from injected server rows."
  - "Unknown semantic keys and role codes degrade to a neutral presentation without becoming assignable."
requirements-completed: [CAP-04, CAP-11, CAP-12, CAP-13, QUAL-01]
duration: 12min
completed: 2026-08-20
---

# Phase 136 Plan 03: Role Catalog Contract and Adapter Summary

**Public and protected role metadata now share an OpenAPI/TypeScript vocabulary, with one pure injected-catalog adapter and a neutral future-role fallback.**

## Performance

- **Duration:** 12 min
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Documented the public three-context presentation endpoint in both focused and root OpenAPI contracts.
- Added open role codes, enriched catalog DTOs, policy vocabulary, and a central `apiClientFetch` catalog helper.
- Added lookup, ordering, label, and allowlisted semantic-presentation helpers with arbitrary future-role coverage.

## Task Commits

1. **Synchronize policy and catalog contracts** — `2833bda6`
2. **Build catalog-backed role adapter** — `5bd348f9`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Retained a deprecated static export until downstream consumer plans migrate**
- **Found during:** Task 1 typecheck
- **Issue:** Immediate removal broke more than twenty existing consumers owned by later Phase 136 plans.
- **Fix:** Opened `FansubGroupRoleCode` to `string` and retained the old options export only as a deprecated transition seam. The new adapter does not import or use it.
- **Verification:** Full frontend typecheck passes; adapter source contains no role-code list or branch.

**2. [Rule 3 - Blocking] Corrected the planned Vitest container path**
- The Compose frontend workdir is `/app`, so `src/lib/roleCatalog.test.ts` is the executable filter; the plan's repository-prefixed filter finds no tests.

## Verification

- Handler `Phase136ContractParity` test: passed.
- Catalog adapter Vitest: 2/2 passed.
- Frontend typecheck: passed.
- `git diff --check`: passed.

## Known Stubs

None.

## Next Phase Readiness

- Provider/root-layout work can import the pure adapter.
- Downstream consumer plans must remove the explicitly deprecated `FANSUB_GROUP_ROLE_OPTIONS` transition export after all imports are migrated.

## Self-Check: PASSED

- Both task commits exist and all created files are present.
- Focused tests and typecheck pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
