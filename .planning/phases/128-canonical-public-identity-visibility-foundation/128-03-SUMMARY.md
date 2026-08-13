---
phase: 128-canonical-public-identity-visibility-foundation
plan: 03
subsystem: frontend-testing
tags: [vitest, nextjs, canonical-routing, auth-refresh, privacy]
requires:
  - phase: 128-01
    provides: Stored immutable slug RED contracts and guarded Wave-0 test pattern
  - phase: 128-02
    provides: Shared visibility-first access matrix and privacy-neutral 404 vocabulary
provides:
  - Canonical public-member URL syntax and encoding RED matrix
  - Next notFound, neutral metadata, and route-local access-gate RED contracts
  - Central refresh-only member-helper and authoritative owner-preview RED contracts
affects: [128-07, 128-08, 128-09, 128-10, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Compilable Vitest RED contracts with exact named-failure allow-lists
    - Source-boundary assertions paired with executable central-refresh scenarios
key-files:
  created:
    - frontend/proxy.test.ts
  modified:
    - frontend/src/app/members/[slug]/page.test.tsx
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
    - frontend/src/app/me/profile/page.test.tsx
key-decisions:
  - "Canonical redirects are tested as syntax-only 308 behavior independent of member existence."
  - "Refresh-only owner coverage exercises getMemberProfile, getMemberContributions, and project-member summary through the central browser client."
  - "Preview RED coverage rejects getOwnProfile conversion, token/cookie access, direct bearer/refresh, bare protected fetch, nickname slugification, and numeric fallback seams."
patterns-established:
  - "RED allow-list: a focused suite succeeds only when its exact Phase-128 assertion names are the complete failure set."
  - "Protected helper matrix: no/expired access plus valid refresh must refresh centrally, attach the new bearer internally, and retain no-store."
requirements-completed: [PMID-03, PMPR-01, PMPR-04, PMPR-05]
metrics:
  duration: 16m
  completed: 2026-08-13
---

# Phase 128 Plan 03: Canonical Navigation and Owner Preview RED Contracts Summary

**Focused Vitest contracts now pin syntax-only canonical redirects, literal neutral route denial, central refresh-only member reads, and pathname-owned authoritative private-profile preview behavior.**

## Performance

- **Duration:** 16m
- **Started:** 2026-08-13T12:41:56Z
- **Completed:** 2026-08-13T12:57:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added case, plain/encoded edge whitespace, equivalent encoding, query preservation, encoded slash, control, unusable, numeric, and existence-independent redirect coverage.
- Added exact `Phase128PageInvokesNotFound` and `Phase128NotFoundAccessGate` failures for literal Next 404 behavior, neutral metadata, and the pathname-derived route-local client gate.
- Added exact `Phase128RefreshOnlyOwnerUpgrade` and `Phase128PreviewUsesPathname` failures for central refresh/no-store behavior and replacement of the reduced `getOwnProfile` preview authority.
- Preserved the user's dirty profile, carousel, and badge files without staging or modifying them.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define canonical URL and neutral route tests** - `62812606` (test)
2. **Task 2: Define refresh-only and authoritative preview tests** - `bd461f98` (test)

## Files Created/Modified

- `frontend/proxy.test.ts` - Syntax-only 308 canonicalization, rejection, query, and privacy-neutral presentation matrix.
- `frontend/src/app/members/[slug]/page.test.tsx` - Next `notFound()` invocation, neutral metadata, and route-local access-gate contracts.
- `frontend/src/lib/api.auth-refresh.test.ts` - Missing/expired-access central refresh matrix for member profile, contributions, and project-member summary.
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` - Pathname, authoritative DTO, no-flash, owner notice/action, composition, and forbidden-seam contract.
- `frontend/src/app/me/profile/page.test.tsx` - Refresh-only protected hub and stored-slug link assertion.

## Decisions Made

- Kept Wave-0 contracts compilable against current production code and represented future route files through guarded source inspection.
- Consolidated each task into exactly the two named RED failures required by the plan; supporting matrices remain passing assertions inside those contracts.
- Reused the existing central-client test harness and current page/component seams; no production fetch, auth, preview, or URL logic was introduced.

## Verification

- Route RED gate: passed; failures are exactly `Phase128PageInvokesNotFound` and `Phase128NotFoundAccessGate`.
- Preview RED gate: passed; failures are exactly `Phase128RefreshOnlyOwnerUpgrade` and `Phase128PreviewUsesPathname`.
- Focused ESLint on all five plan files: 0 errors; one pre-existing native-textarea warning in `page.test.tsx`.
- Repository `git diff --check`: passed.
- Frontend typecheck: Plan-128-03 errors resolved; command remains red only on pre-existing Next route-prop types and the user's dirty `MemberBadgeChain.test.tsx` edits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored milestone identity and completion activity after state updates**

- **Found during:** Final planning metadata update
- **Issue:** The available GSD state handler replaced the milestone name with the generic value `milestone` and reduced completion activity fields to date-only or the previous plan.
- **Fix:** Restored the canonical milestone name and recorded Phase 128 Plan 03 completion while preserving the handler's plan counter, progress, metrics, decisions, and session timestamp.
- **Files modified:** `.planning/STATE.md`
- **Verification:** Reviewed the resulting state frontmatter, Current Position, Session Continuity, and planning diffs.
- **Commit:** Final plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 bug)

## Issues Encountered

- The first remote multi-hunk patch did not apply because of patch-count/context transport; it failed atomically. Subsequent UTF-8 base64 transport with smaller `git apply --recount` patches succeeded without partial edits.
- Full frontend typecheck remains blocked by unrelated pre-existing route-prop errors and user-owned dirty `MemberBadgeChain.test.tsx` errors; no out-of-scope files were changed.

## Known Stubs

- The four named Phase-128 assertions intentionally remain RED until production Plans 128-07 through 128-10 add proxy, literal 404/access-gate, central protected member helpers, stored links, and authoritative owner preview behavior.
- No production UI/data stub was added by this plan.

## TDD Gate Compliance

This Wave-0 plan intentionally establishes RED contracts only. Both task commits are `test(128-03)` commits and include `RED:` evidence; production GREEN work is assigned to later Phase-128 plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 128-07 through 128-10 can implement directly against exact canonical-route, neutral-state, refresh, cache, and preview contracts.
- The protected-client boundary is explicit: UI remains token-free and refresh-only sessions flow through the central API client.

## Self-Check: PASSED

All five created/modified files and both task commits were verified. Both focused suites stop only at their exact named missing Phase-128 contracts.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
