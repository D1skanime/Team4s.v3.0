---
phase: 136-capability-policy-catalog-schema-contract
plan: 19
subsystem: frontend
tags: [runtime-validation, role-catalog, react-context, contract-safety]
requires:
  - phase: 136-11
    provides: root-loaded context-scoped role catalog provider
provides:
  - strict runtime validation for every public role-catalog response
  - compact context-scoped provider failure states for malformed successful responses
affects: [role catalog consumers, root layout, Phase 137]
tech-stack:
  added: []
  patterns: [unknown-to-validated DTO boundary, fail-visible catalog loading]
key-files:
  created: [frontend/src/lib/api.role-catalog.test.ts]
  modified: [frontend/src/lib/api.ts, frontend/src/providers/RoleCatalogProvider.test.tsx, frontend/src/app/layout.tsx, frontend/src/app/layout.test.tsx]
key-decisions:
  - "A public catalog row is trusted only when every required field has the documented type and the requested context is present."
  - "Root catalog failures use one compact German message while remaining isolated to the failed context."
requirements-completed: [CAP-11, QUAL-01]
duration: 6min
completed: 2026-08-20
---

# Phase 136 Plan 19: Public Role Catalog Runtime Contract Summary

**Malformed HTTP-200 catalog responses now fail at the central API boundary and appear as compact context-scoped errors instead of silently becoming empty role authority.**

## Performance

- **Duration:** 6 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added strict top-level and per-row validation for code, German label, contexts, ordering, assignability, semantic presentation keys, operative capability count, and derived operative state.
- Preserved valid empty arrays and complete catalog rows without transformation.
- Rejected catalog rows outside the requested context with a structured `ROLE_CATALOG_CONTRACT_ERROR`.
- Replaced the opaque root error sentinel with the compact user-facing message `Rollenkatalog konnte nicht geladen werden.`.
- Proved partial failure preserves valid contexts and total failure never reinstalls static roles.

## Task Commits

1. **Define runtime contract (RED)** — `9c7a56af`
2. **Validate public catalog responses (GREEN)** — `552c4a91`
3. **Require provider error propagation (RED)** — `d0e27e79`
4. **Expose compact root errors (GREEN)** — `85e16dc7`

## Deviations from Plan

None - plan behavior was implemented as specified.

## Verification

- Catalog API Vitest: 24/24 passed.
- Provider/root Vitest: 5/5 passed.
- Frontend typecheck: passed.
- `git diff --check`: passed.
- The paired auth-boundary run reached 32/33 passing; its sole failure is a pre-existing explicit-document-allowlist assertion for an absent historical Phase-49 planning document. The production boundary scans themselves all passed, and Plan 136-19 did not alter that test or historical documentation.

## Known Stubs

None.

## Deferred Issues

- The existing `api.no-token-boundary.test.ts` documentation-allowlist assertion references a historical planning document absent from the working tree; address separately from this catalog contract change.

## Threat Review

- Public JSON is converted from `unknown` only after complete runtime validation.
- Invalid contexts and incomplete rows cannot become application role authority.
- No token access, bearer construction, endpoint, static role fallback, or leaf fetching was introduced.

## Self-Check: PASSED

- All four task commits exist.
- All five owned implementation/test files exist.
- Focused catalog/provider tests, frontend typecheck, and diff validation pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
