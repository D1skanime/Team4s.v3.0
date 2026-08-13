---
phase: 128-canonical-public-identity-visibility-foundation
plan: 15
subsystem: frontend-routing
tags: [nextjs, ssr, privacy, auth-boundary, tdd]
requires:
  - phase: 128-03
    provides: Public member route privacy and canonical-identity RED matrix
  - phase: 128-13
    provides: Token-free refresh-capable central public member API helper
  - phase: 128-14
    provides: Syntax-only canonical member redirect boundary
provides:
  - Route-local authoritative public member profile composition
  - Anonymous token-free SSR with literal route-level notFound authority
  - Privacy-neutral noindex metadata and responsive route-owned state styles
affects: [128-16, public-member-profile, frontend-auth-boundary]
tech-stack:
  added: []
  patterns:
    - Anonymous server reads through the central token-free getMemberProfile helper
    - Route-local composition shared by public and future owner-preview rendering
    - Syntax validation and API denial converging on Next.js notFound
key-files:
  created:
    - frontend/src/app/members/[slug]/MemberProfileContent.tsx
  modified:
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/app/members/[slug]/page.test.tsx
    - frontend/src/app/members/[slug]/page.module.css
key-decisions:
  - "Member profile SSR remains anonymous and token-free; refresh-only owner recovery stays in the Plan-128-16 route-local client seam."
  - "Invalid, numeric, missing, and privacy-denied member routes converge on Next notFound with neutral noindex metadata."
  - "The full established profile composition is authoritative and reusable; owner and correction actions are mutually exclusive."
requirements-completed: [PMID-03, PMPR-01, PMPR-04, PMPR-05]
metrics:
  duration: 24m
  completed: 2026-08-13
---

# Phase 128 Plan 15: Privacy-Neutral Member SSR Summary

**Public member SSR now uses one anonymous central read and a literal neutral 404 boundary while retaining the complete established profile composition for allowed viewers.**

## Performance

- **Duration:** 24m
- **Started:** 2026-08-13T16:31:09Z
- **Completed:** 2026-08-13T16:55:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extracted the existing toolbar, hero, story, memberships, projects, badges, and contribution sections into one route-local authoritative composition without reducing or reinterpreting the visible profile.
- Removed server cookie and access-token authority from the page; SSR calls the central token-free `getMemberProfile` helper only.
- Routed invalid, numeric, missing, and privacy-denied slugs through Next.js `notFound()` and made denial metadata neutral and non-indexable.
- Kept non-404 transport failures scoped to the established `ErrorState` copy.
- Preserved the future owner-preview notice geometry with mobile-first `min-width: 0`, an explicit container, and the 36rem container breakpoint.

## Task Commits

1. **RED: Bind composition extraction contract** - ce9acdbf (test)
2. **GREEN: Extract authoritative member profile composition** - fe1b43ef (feat)
3. **RED: Bind privacy-neutral SSR contracts** - 92e038a1 (test)
4. **GREEN: Make member SSR privacy-neutral** - ce250b51 (feat)

## Files Created/Modified

- `frontend/src/app/members/[slug]/MemberProfileContent.tsx` - Complete established profile composition and mutually exclusive owner/correction toolbar actions.
- `frontend/src/app/members/[slug]/page.tsx` - Anonymous central read, syntax validation, literal notFound routing, and neutral metadata.
- `frontend/src/app/members/[slug]/page.test.tsx` - 28-case runtime, source-boundary, composition, metadata, and responsive-style contract suite.
- `frontend/src/app/members/[slug]/page.module.css` - Scoped state/notice geometry and 36rem owner-preview container behavior; legacy duplicate profile-grid rules removed.

## Decisions Made

- Kept SSR deliberately anonymous instead of creating a server refresh/BFF seam or reading browser auth state on the server.
- Kept the complete existing profile as the only allowed-view composition so Plan 128-16 can recover owner authority without maintaining a second reduced page.
- Treated structurally typed 404 errors like the central `ApiError` at the route boundary, preserving reliable `notFound()` behavior under test doubles and helper evolution.
- Adopted Next.js 16 Promise route params and the Plan-128-13 required stored slug field in the route fixtures.

## Verification

- Exact member page suite: 28/28 passed.
- Focused ESLint on `page.tsx`, `MemberProfileContent.tsx`, and `page.test.tsx`: passed.
- Production no-token boundary assertions: 8/8 passed; the known archived-document inventory case was excluded.
- Literal numeric live route: returned HTTP 404 with neutral `Profil nicht verfügbar` output before the backend restart.
- Responsive/source invariants: explicit container type, 36rem query, `min-width: 0`, no new `overflow-wrap: anywhere`, no server cookie/token seam, and no duplicate profile grid.
- `git diff --check`: passed.
- Full frontend typecheck was run and reports no plan-owned error. It remains red on existing Next ranking props, downstream Plan-128-16 visibility/slug adoption, dirty `MemberBadgeChain.test.tsx` edits, and an existing `MemberProfileHero.test.tsx` fixture.
- The protected imported profile/carousel files were not modified by any Plan-128-15 commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adopted current route and profile contract types**

- **Found during:** Task 2 GREEN/typecheck
- **Issue:** Next.js 16 generated page types require Promise params, while Plan 128-13 made the canonical stored slug required in `PublicMemberProfileData`.
- **Fix:** Updated only the route signature and Plan-128-15 test fixtures to the already-established contracts.
- **Files modified:** `frontend/src/app/members/[slug]/page.tsx`, `frontend/src/app/members/[slug]/page.test.tsx`
- **Verification:** Exact page suite and focused lint pass; typecheck reports no Plan-128-15 file.
- **Commit:** ce250b51

**2. [Rule 3 - Blocking] Isolated a pre-existing live backend startup failure**

- **Found during:** Overall live verification
- **Issue:** The backend container was nominally Up but served no API because its stale development build had failed. A non-destructive restart picked up the corrected source, then migration 0145 stopped startup because the disposable `members` table is non-empty.
- **Fix:** No data action was taken. The migration safety precondition was honored, and verification remained on the isolated page/API boundary contracts.
- **Files modified:** None
- **Verification:** Source contains the corrected Plan-128-12 repository methods; backend startup stops explicitly at migration 0145 before serving traffic.
- **Commit:** No code change required

---

**Total deviations:** 2 auto-fixed blocking issues.
**Impact:** Contract compatibility was restored without broadening the SSR/auth design; live data was preserved and no reset or reseed was attempted.

## Issues Encountered

- Live API-driven missing/private route UAT is blocked by migration 0145's empty-members precondition. Reset/reseed is explicitly deferred to Plan 128-20 approval and Plan 128-21 execution.
- Full frontend typecheck remains red only on out-of-scope existing/downstream files listed in Verification.
- The full no-token inventory suite has one known pre-existing archived-doc allowlist failure already recorded in phase deferred items; all eight production boundary assertions pass.

## Known Stubs

None. Allowed profiles render the real API-backed composition; denial paths use the route-level 404 boundary.

## Threat Flags

None. This plan changes the existing SSR route boundary covered by its threat model and adds no endpoint, schema, storage read, or server auth path.

## TDD Gate Compliance

- Task 1 RED: ce9acdbf
- Task 1 GREEN: fe1b43ef
- Task 2 RED: 92e038a1
- Task 2 GREEN: ce250b51
- No refactor commit was needed.

## User Setup Required

None for the implementation. Live backend UAT resumes only through the separately approved reset/reseed sequence in Plans 128-20 and 128-21.

## Next Phase Readiness

- Plan 128-16 can add refresh-capable owner recovery inside the neutral 404 document while reusing `MemberProfileContent`.
- The server page now has no cookie/token authority and exposes no private detail before the client refresh seam.
- Live missing/private UAT remains queued behind the approved disposable-data reset sequence.

## Self-Check: PASSED

All four plan files exist, all four task commits are present, both TDD gates are ordered correctly, the exact 28-test page suite passes, and the implementation contains no forbidden server token/cookie seam.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
