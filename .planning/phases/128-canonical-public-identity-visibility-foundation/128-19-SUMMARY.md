---
phase: 128-canonical-public-identity-visibility-foundation
plan: 19
subsystem: frontend-profile-editor
tags: [nextjs, react, visibility, deep-link, auth-session, accessibility]
requires:
  - phase: 128-13
    provides: Canonical public/private profile visibility contract and refresh-capable central profile client
  - phase: 128-17
    provides: Stored-slug-only own-profile navigation
provides:
  - Exact public/private visibility radio vocabulary in the established editor
  - Allow-listed profile-tab query synchronization for the owner visibility deep link
  - Focused and scrolled visibility panel while preserving refresh-only protected access
  - Regression coverage for visibility copy, invalid tabs, deep-link accessibility, and refresh-only sessions
affects: [128-20, 128-21, owner-preview, profile-editor]
tech-stack:
  added: []
  patterns:
    - Allow-listed useSearchParams state synchronization
    - Existing semantic radio-card and central auth/API seam reuse
key-files:
  created: []
  modified:
    - frontend/src/app/me/profile/page.tsx
    - frontend/src/app/me/profile/page.test.tsx
    - frontend/src/app/me/profile/components/VisibilityCard.tsx
    - frontend/src/lib/profileLabels.ts
key-decisions:
  - "Visibility remains in the established radio-card editor with exactly public and private values; no members-only alias or fallback label remains."
  - "The owner deep link allow-lists existing profile tabs and focuses/scrolls the visibility panel without creating a second route, form, or auth seam."
patterns-established:
  - "Profile query tabs: derive only from PROFILE_TABS, fall back to profile, and synchronize the existing activeTab state."
  - "Protected profile editor access: hasAccessToken || hasRefreshToken gates token-free getOwnProfile calls through the central client."
requirements-completed: [PMPR-04]
metrics:
  duration: 13min
  completed: 2026-08-13
---

# Phase 128 Plan 19: Owner Visibility Editor Workflow Summary

**The hidden-profile owner action now opens the established protected visibility editor with exact public/private controls, allow-listed query handling, and accessible focus.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-13T18:01:54Z
- **Completed:** 2026-08-13T18:14:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced the stale `members_only` option and copy with the exact approved `Öffentlich` and `Privat` radio-card vocabulary.
- Kept the existing visibility form state and save flow; no parallel control, modal, page, request helper, or API contract was introduced.
- Honored `/me/profile?tab=visibility` through `useSearchParams`, allow-listing only the four established profile tabs and falling back unknown values to `profile`.
- Made the deep-linked visibility panel programmatically focusable and scrolled it into view after protected profile hydration.
- Preserved refresh-only access through `hasAccessToken || hasRefreshToken` and token-free `getOwnProfile()` calls through the central browser client.

## Task Commits

Each task followed the required RED/GREEN cycle:

1. **Task 1 RED: Visibility vocabulary contracts** - `4986115e` (test)
2. **Task 1 GREEN: Public/private visibility editor** - `c74f130f` (feat)
3. **Task 2 RED: Profile-tab deep-link contracts** - `2d274290` (test)
4. **Task 2 GREEN: Allow-listed visibility deep link** - `d8866187` (feat)

## Files Created/Modified

- `frontend/src/app/me/profile/components/VisibilityCard.tsx` - Uses exactly public/private values and approved German descriptions in the retained semantic radio cards.
- `frontend/src/lib/profileLabels.ts` - Maps the canonical visibility union to `Öffentlich` and `Privat` with no legacy fallback.
- `frontend/src/app/me/profile/page.tsx` - Synchronizes allow-listed query tabs, retains the refresh-session auth gate, and focuses/scrolls the existing visibility panel.
- `frontend/src/app/me/profile/page.test.tsx` - Covers vocabulary, legacy-alias removal, valid/invalid query tabs, synchronization, focus/scroll, and refresh-only access.

## Decisions Made

- Reused the existing `PROFILE_TABS`, active-tab state, visibility radio cards, profile form, save flow, `useAuthSession`, and `getOwnProfile()` seams.
- Unknown query values deliberately select the default profile panel and receive no focus/scroll behavior.
- The visibility panel receives `tabIndex={-1}` only for programmatic deep-link focus; no visual redesign or responsive CSS change was necessary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected stale ROADMAP progress-table count**
- **Found during:** Plan close-out
- **Issue:** The roadmap handler checked Plan 128-19 and reported 19 summaries, but left the progress-table row at 17/22.
- **Fix:** Updated the row to the verified 19/22 count without changing plan order or status.
- **Files modified:** `.planning/ROADMAP.md`
- **Verification:** The phase directory contains 19 summaries and ROADMAP contains 19 checked Phase-128 plan entries.
- **Committed in:** Final plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** Planning metadata now matches the completed artifacts; implementation scope is unchanged.

## Verification

- `docker compose exec -T team4sv30-frontend npm test -- --run src/app/me/profile/page.test.tsx`: **45/45 passed**, including VisibilityCard vocabulary and all deep-link/session cases.
- `docker compose exec -T team4sv30-frontend npm test -- --run src/lib/api.auth-refresh.test.ts`: **25/25 passed**.
- Production portion of `api.no-token-boundary.test.ts`: **8/8 passed**; the known historical planning-document inventory case was excluded.
- Focused ESLint on all four plan files: **0 errors**; retained one existing native-radio warning and one existing test-mock textarea warning.
- Full frontend typecheck: no Plan 128-19 errors; repository command remains red on the pre-existing generated ranking `PageProps` mismatch and user-owned dirty `MemberBadgeChain.test.tsx` errors.
- Source gates passed for exact copy, two radio values, legacy-alias absence, allow-listed query handling, focus/scroll semantics, refresh-session gating, token/fetch boundary, and owner-notice URL.
- No CSS was changed; the established responsive profile composition remains authoritative.
- Plan-range and working-tree `git diff --check`: passed.
- Backend live UAT remains deferred while migration 0145 intentionally blocks the backend; no reset, reseed, restart, or retry was attempted.

## Known Stubs

None.

## Threat Model Verification

- **Query tampering:** only values present in `PROFILE_TABS` can become active; unknown values fall back to `profile`.
- **Auth boundary:** refresh-only remains active and protected loads still use the central token-free client.
- **Threat surface:** no new endpoint, auth path, storage access, network helper, schema, or file-access boundary was introduced.

## TDD Gate Compliance

PASSED - both tasks have ordered failing-test commits followed by feature commits, and the final focused suite passes 45/45.

## Issues Encountered

- Full typecheck remains blocked by unrelated generated ranking and user-owned dirty badge-test errors; none references a Plan 128-19 file.
- The complete no-token suite retains one known inventory-only failure for historical Phase-49 planning documents that no longer exist at their former active paths; all eight production boundary assertions pass.
- Focused lint reports only retained project warnings in the existing semantic native radio and the existing test-only textarea mock.
- The GSD commit wrapper returned `nothing_to_commit` despite the verified modified metadata; the final metadata commit used explicit path staging while preserving the user's existing staged files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The owner-preview notice now lands on the canonical visibility control without duplicating editor or auth state.
- Plans 128-20 through 128-22 can rely on canonical public/private vocabulary and the completed owner workflow.
- Live backend UAT remains deferred to the separately authorized migration reset/reseed checkpoint.
## Self-Check: PASSED

All four plan files, the summary, and commits `4986115e`, `c74f130f`, `2d274290`, and `d8866187` exist. The final page suite, auth-refresh suite, production no-token assertions, focused lint, source/accessibility gates, TDD order, and diff checks were verified in the canonical Linux repository.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*