---
phase: 138-effective-rights-administration-impact-ux
plan: 10
subsystem: ui
tags: [nextjs, react, admin, claims, d-23, d-02, d-32]

# Dependency graph
requires:
  - phase: 138-effective-rights-administration-impact-ux (Plan 138-05)
    provides: "Cross-group filtered GET /admin/claims endpoint (listClaims/AdminClaimListRow contract)"
provides:
  - "/admin/claims top-level route with a filtered, paginated Claims list shell"
  - "useClaimsListFilters URL-synced filter hook reusable by Plan 138-14"
affects: [138-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL-synced filter hook (useClaimsListFilters) mirroring useUserListFilters.ts's stable-useMemo/router.replace shape"
    - "useIsMobile 759px matchMedia gate (RoleCapabilityClient.tsx pattern) reused for D-32 Table-to-Card collapse"

key-files:
  created:
    - frontend/src/app/admin/claims/useClaimsListFilters.ts
    - frontend/src/app/admin/claims/page.tsx
    - frontend/src/app/admin/claims/ClaimsClient.tsx
    - frontend/src/app/admin/claims/ClaimsClient.test.tsx
  modified: []

key-decisions:
  - "Gruppe/Benutzer filters implemented as numeric ID Input fields (onBlur-committed to URL), not a full group/user search-select — avoids adding an extra async lookup dependency not required by this plan's scope"
  - "Aktion column omitted entirely from the table (per plan instruction) — Plan 138-14 adds the real verify/activate action buttons; no dead/no-op button shipped"
  - "claim_type kept as a static 'claim' value with no dedicated URL setter, since it is the only real value today (plan interface note: don't over-build UI for a single-value dimension)"

patterns-established:
  - "Pattern: new admin list surfaces reuse useIsMobile's exact 759px matchMedia breakpoint for D-32 responsive collapse instead of inventing new breakpoints"

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-08-23
---

# Phase 138 Plan 10: Central Claims Workspace (D-23 list/filter/navigation shell) Summary

**New `/admin/claims` top-level route consuming Plan 138-05's `listClaims` endpoint: filtered, paginated, URL-synced Claims list with Button-based bidirectional navigation to users and groups, and a D-32 Table-to-Card collapse below 760px.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-23
- **Tasks:** 2 (Task 1 non-TDD, Task 2 TDD with RED/GREEN commits)
- **Files modified:** 4 (all new)

## Accomplishments
- `useClaimsListFilters.ts`: URL-synced status/fansub_group_id/app_user_id/from/to filter hook, mirroring `useUserListFilters.ts`'s exact stable-`useMemo`/`router.replace` shape to avoid the render-loop bug that pattern's own comment warns against.
- `/admin/claims` route + `ClaimsClient.tsx`: a real top-level Claims workspace listing claims across all groups, with a filter bar (Status: offen/genehmigt/abgelehnt mapped to the real `pending`/`verified`/`rejected` values; a disabled single-value Claim-Typ indicator; Gruppe/Benutzer ID filters; Von/Bis date range) and clamped pagination via the existing `Pagination` primitive.
- D-02 bidirectional navigation: every Benutzer and Gruppe cell renders as `Button variant="ghost"` navigating to `/admin/users/:id` and `/admin/fansubs/:id/edit` — never inert text, on both the desktop table and the mobile card collapse.
- D-32 responsive contract: below 760px (`useIsMobile`, same `window.matchMedia('(max-width: 759px)')` breakpoint as `RoleCapabilityClient.tsx`), the desktop `Table` is replaced by `Card`-based rows instead of a horizontally-squeezed matrix.
- Locked empty-state copy: exact "Keine offenen Claims." / "Für diesen Filter liegen aktuell keine zu entscheidenden Claims vor." renders specifically when `status=pending` returns zero rows; a generic `EmptyState` covers other zero-result filter combinations.

## Task Commits

Each task was committed atomically:

1. **Task 1: useClaimsListFilters hook** - `ae3e8271` (feat)
2. **Task 2: /admin/claims route + ClaimsClient** - `a718989a` (test, RED) → `35814ca2` (feat, GREEN)

_TDD gate sequence confirmed: `test(...)` commit `a718989a` precedes `feat(...)` commit `35814ca2`; RED was verified failing (`Cannot find module './ClaimsClient'`) before GREEN was written._

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/app/admin/claims/useClaimsListFilters.ts` - URL-synced filter/pagination state hook for the Claims workspace
- `frontend/src/app/admin/claims/page.tsx` - Thin server component wrapping `ClaimsClient` in `PlatformAdminGate`, mirroring `admin/users/page.tsx`
- `frontend/src/app/admin/claims/ClaimsClient.tsx` - Filtered, paginated, bidirectionally-navigable Claims list client with D-32 mobile card collapse
- `frontend/src/app/admin/claims/ClaimsClient.test.tsx` - 4 locked-behavior tests (empty state, navigation, status-filter URL roundtrip, pagination offset)

## Decisions Made
- Gruppe (ID)/Benutzer (ID) filters use plain numeric `Input` fields committed to the URL on blur, rather than a full group/user search-select — the plan's interface notes only specify these params exist in `listClaims`, not a lookup UI, and platform admins working this queue already operate on IDs elsewhere in the admin area (e.g. `AdminChangesListParams`'s `benutzer`/`gruppe`/`akteur` are also plain numeric IDs).
- The `Aktion` column was omitted entirely from both the table and card layouts (per the plan's explicit "prefer omitting the column entirely over shipping a dead button" instruction) — Plan 138-14 adds the real verify/activate actions here.
- Test file needed a `window.matchMedia` mock (jsdom does not implement it) — copied verbatim from `RoleCapabilityClient.test.tsx`'s existing `mockMatchMedia` helper rather than inventing a new one.
- Test assertions use `.not.toBeNull()` rather than `toBeInTheDocument()` — this codebase has no `@testing-library/jest-dom` matcher setup; `toBeInTheDocument()` type-checks failed under `tsc --noEmit` and no other test file in the codebase uses it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added jsdom `matchMedia` mock to the new test file**
- **Found during:** Task 2 GREEN run (all 4 tests initially failed with `TypeError: window.matchMedia is not a function`)
- **Issue:** jsdom (the test environment) does not implement `window.matchMedia`, which `useIsMobile()` calls unconditionally in a `useEffect`
- **Fix:** Added the exact `mockMatchMedia()` helper already established in `RoleCapabilityClient.test.tsx` and called it in a `beforeEach` (defaulting to desktop/`false`)
- **Files modified:** `frontend/src/app/admin/claims/ClaimsClient.test.tsx`
- **Verification:** All 4 tests pass after the fix
- **Committed in:** `a718989a` (test/RED commit — the mock was added as part of writing the RED test correctly, before GREEN implementation existed)

**2. [Rule 3 - Blocking] Replaced `toBeInTheDocument()` with `.not.toBeNull()`**
- **Found during:** Task 2, `tsc --noEmit` check after writing the initial test draft
- **Issue:** No `@testing-library/jest-dom` matcher setup exists in this codebase (confirmed via `grep -rl toBeInTheDocument` returning zero other files), so `toBeInTheDocument()` failed TypeScript type-checking
- **Fix:** Rewrote the two empty-state assertions to use the codebase's established `expect(...).not.toBeNull()` convention (seen throughout `ReleaseVersionMediaSection.test.tsx` and others)
- **Files modified:** `frontend/src/app/admin/claims/ClaimsClient.test.tsx`
- **Verification:** `tsc --noEmit` shows zero new errors for any claims file; test suite still green
- **Committed in:** `a718989a` (test/RED commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3, blocking test-infrastructure fixes)
**Impact on plan:** Both fixes were necessary to get the plan's own locked test-behavior list actually running and green in this codebase's real jsdom/vitest setup. No scope creep — no production behavior changed.

## Issues Encountered
None beyond the two auto-fixed test-infrastructure issues above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/admin/claims` is live as a real, filterable, paginated, bidirectionally-navigable list shell consuming Plan 138-05's `listClaims` endpoint.
- Plan 138-14 can now wire its D-24 decision-impact preview (verify/activate confirm actions) directly into this page's row set — the `Aktion` column is the explicit seam left open for it.
- `useClaimsListFilters` and the `useIsMobile`/`ClaimCard` D-32 pattern are directly reusable if Plan 138-14 needs additional filter or responsive-collapse behavior on the same page.

## Self-Check: PASSED

All 4 created files (`useClaimsListFilters.ts`, `page.tsx`, `ClaimsClient.tsx`, `ClaimsClient.test.tsx`)
confirmed present on disk. All 4 commit hashes (`ae3e8271`, `a718989a`, `35814ca2`, `f50be9bb`) confirmed
present in `git log --oneline --all`.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*
