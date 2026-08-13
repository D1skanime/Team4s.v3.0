---
phase: 128-canonical-public-identity-visibility-foundation
plan: 14
subsystem: frontend-routing
tags: [nextjs, proxy, canonical-routing, privacy, tdd]
requires:
  - phase: 128-03
    provides: Canonical URL syntax, encoding, query, and privacy-neutral RED matrix
provides:
  - Syntax-only permanent member-path canonicalization
  - Single-decode rejection for ambiguous and unusable member segments
  - Descendant path and query preservation without member lookup
affects: [128-07, 128-09, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Next.js 16 proxy matcher scoped to member paths
    - Decode-once, validate, normalize, and re-encode redirect boundary
key-files:
  created:
    - frontend/proxy.ts
  modified:
    - frontend/proxy.test.ts
key-decisions:
  - "Member-path redirects normalize URL syntax only and never consult identity, visibility, auth, API, or database state."
  - "Only valid ASCII stored-slug syntax redirects; numeric, malformed, separator-bearing, control, double-encoded, and non-ASCII segments pass through to neutral routing."
requirements-completed: [PMID-03, PMPR-01]
metrics:
  duration: 13m
  completed: 2026-08-13
---

# Phase 128 Plan 14: Syntax-Only Member Redirect Summary

**Next.js 16 now canonicalizes safe member-path syntax with privacy-neutral 308 redirects while rejecting ambiguous segments without identity lookup.**

## Performance

- **Duration:** 13m
- **Started:** 2026-08-13T13:03:18Z
- **Completed:** 2026-08-13T13:15:47Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added the root Next.js proxy convention with a matcher limited to member paths.
- Decodes exactly one member segment, trims edge whitespace, lowercases only canonical ASCII stored-slug syntax, and preserves descendant suffixes and query parameters in 308 redirects.
- Leaves numeric, malformed, encoded separator/backslash/control, double-encoded separator, internal-whitespace, non-ASCII, empty, and already-canonical requests unresolved by the proxy.
- Replaced the Plan-128-03 test-local redirect oracle with direct execution of the production proxy and an explicit forbidden-seam source contract.

## Task Commits

1. **RED: Bind canonical redirect tests to production proxy** - 29ccd4cc (test)
2. **GREEN: Implement syntax-only member path canonicalization** - 83aec94c (feat)

## Files Created/Modified

- frontend/proxy.ts - Pinned Next.js 16 proxy handler and member-path matcher.
- frontend/proxy.test.ts - Direct 19-case production redirect/rejection matrix and syntax-only seam assertion.

## Decisions Made

- Kept the proxy stricter than a generic URL normalizer: it redirects only values already representable by the stored ASCII slug contract.
- Preserved path descendants because existing member subroutes carry the same member slug, while validating only the first segment.
- Returned NextResponse.next() for every rejected or canonical request so missing/private/numeric/guessed identity resolution remains downstream and privacy-neutral.

## Verification

- Direct root proxy suite with an explicit Vitest include: 19/19 passed.
- Plan npm test command: passed the configured proxy-adjacent src suites, 10/10.
- Focused ESLint on proxy.ts and proxy.test.ts: passed.
- Isolated TypeScript compile of proxy.ts: passed.
- Forbidden auth/API/database/nickname seam grep: passed.
- Repository git diff --check: passed.
- Full frontend typecheck was attempted and remains red only on pre-existing Next route-prop errors plus user-owned dirty MemberBadgeChain.test.tsx edits; the plan files have no type error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Bound the RED matrix to production and expanded unsafe-input coverage**

- **Found during:** Task 1 TDD RED
- **Issue:** The inherited Plan-128-03 file tested a local duplicate canonicalizer, so production could remain absent or drift while the test stayed green. It also did not cover descendants, malformed/double encoding, backslash, non-ASCII, or internal whitespace.
- **Fix:** Imported and executed the real Next proxy, added the missing rejection/descendant cases, and asserted the implementation imports no API/auth/database/nickname seam.
- **Files modified:** frontend/proxy.test.ts
- **Verification:** The direct suite failed solely because frontend/proxy.ts was absent, then passed 19/19 after GREEN.
- **Commit:** 29ccd4cc

**2. [Rule 3 - Blocking] Executed the root-level test despite the repository Vitest include**

- **Found during:** Task 1 verification
- **Issue:** The plan command filters by proxy.test.ts, but vitest.config.ts includes only src test files; therefore the root test was silently excluded and only two unrelated proxy-adjacent suites ran.
- **Fix:** Retained the required plan command and additionally invoked Vitest programmatically with the root proxy test explicitly included, using the canonical bind-mounted frontend source.
- **Files modified:** None
- **Verification:** Direct root suite passed 19/19; plan command passed its configured 10/10.
- **Commit:** No code change required

---

**Total deviations:** 2 auto-fixed (1 missing critical functionality, 1 blocking).
**Impact:** Verification became executable against production behavior without changing the plan's routing or privacy scope.

## Issues Encountered

- Full frontend typecheck remains blocked by unrelated existing Next page-prop errors and user-owned dirty MemberBadgeChain.test.tsx changes.
- Remote multi-hunk patch transport required smaller targeted patches; failed patches were atomic and did not alter user work.

## Known Stubs

None. The proxy is wired through the root Next.js 16 file convention and all planned behavior is implemented.

## Threat Flags

None. The proxy introduces a routing boundary but no network request, auth path, data read, file access, or schema change beyond the plan threat model.

## TDD Gate Compliance

- RED commit: 29ccd4cc
- GREEN commit: 83aec94c
- No refactor commit was needed.

## User Setup Required

None.

## Next Phase Readiness

- Downstream member access plans can rely on normalized safe URL spelling without treating redirects as identity evidence.
- Literal neutral 404 and owner-preview work remains owned by the later Phase-128 access plans.

## Self-Check: PASSED

Both changed files exist, both task commits are present, the direct 19-case suite passes, and the implementation contains no forbidden identity/auth/API seam.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
