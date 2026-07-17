---
phase: 104-registrierungs-login-und-account-onboarding-hardening
plan: 04
subsystem: auth
tags: [go, postgres, member-profile, contributions, react, next-router, ui-primitives]

requires:
  - phase: 104-03
    provides: Shell 5-state model (uninitialized/anonymous/profile-loading/profile-error/ready) and the additive AppShell 'loading' mode that AppShellClientWrapper this plan extends builds on
provides:
  - Authoritative own-profile project-eligibility signal has_project_assignments (D-06/D-09) — true only for a verified Member with at least one real confirmed anime/group contribution or historical release credit, computed via a dedicated EXISTS query
  - EnsureAppUserForIdentity locked by a source-invariant regression test to stay app_user(+legacy bridge)-only with no implicit app role/Member/membership/contribution/project side effect (D-10/D-15)
  - Standardized 403 + stable MEMBER_PROFILE_REQUIRED machine-readable code for missing-Member gates on /me/* contribution endpoints, threaded through ApiError.code
  - "Meine Projekte" navigation entry gated on hasMemberProfile AND hasProjectAssignments (never has_member_profile alone)
  - /me/contributions eligibility-checked via the own-profile aggregate, redirecting any authenticated non-entitled account to /me/profile with no claim/error intermediate (D-08), while real network/5xx failures on an eligible session get a scoped retry action instead of a login prompt
affects: [104-05, 104-06]

tech-stack:
  added: []
  patterns:
    - "hasProjectAssignments is computed by a single dedicated repository method (EXISTS over anime_contributions UNION-style OR release_member_roles), called only when the own-profile base row already proved a verified Member link, and short-circuited to false for account-only responses — mirrors the existing loadHistoricalCredits/loadRecentContributions COALESCE(ac.member_id, hfgm.member_id) pattern"
    - "respondMemberProfileRequired() is the single call site for the standardized 403+MEMBER_PROFILE_REQUIRED envelope, replacing six duplicated inline 404 responses in ContributionsMeHandler"
    - "/me/contributions treats the own-profile aggregate (has_member_profile + has_project_assignments) as the sole eligibility source, fetched before the contributions dashboard load itself, with a defensive second redirect if the contributions endpoint later returns MEMBER_PROFILE_REQUIRED"
    - "AppShell's Meine Projekte nav item is now conditionally pushed onto fixedMyItems only when both eligibility booleans are true, instead of being unconditionally present"

key-files:
  created:
    - frontend/src/app/me/contributions/page.test.tsx
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/repository/member_profile_repository_test.go
    - backend/internal/repository/app_auth_repository_test.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/handlers/contributions_me_handler.go
    - backend/internal/handlers/contributions_me_handler_test.go
    - shared/contracts/openapi.yaml
    - shared/contracts/contributions.yaml
    - frontend/src/types/profile.ts
    - frontend/src/lib/api.test.ts
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.test.tsx
    - frontend/src/components/layout/AppShellClientWrapper.tsx
    - frontend/src/components/layout/AppShellClientWrapper.test.tsx
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/app/me/profile/page.test.tsx
    - "frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx"

key-decisions:
  - "has_project_assignments EXISTS query checks both anime_contributions (status='confirmed', resolved through COALESCE(ac.member_id, hfgm.member_id) exactly like existing loadCurrentProjects/loadRecentContributions) and release_member_roles (rmr.member_id) — real historical release credits count as a real assignment, not just anime_contributions."
  - "router is intentionally excluded from the /me/contributions reload() useCallback dependency array — Next.js guarantees router identity is stable, and including it caused an infinite reload/redirect loop against test mocks that return a fresh object per useRouter() call (discovered live during Task 3 test-writing, not spec'd in the plan)."
  - "The contributions dashboard load carries a defensive second redirect path: if getMyAnimeContributions() itself ever returns the new MEMBER_PROFILE_REQUIRED code (e.g. a race between the eligibility check and the load), the page redirects instead of surfacing a raw error, reusing Task 2's new code rather than inventing a second signal."

requirements-completed: [P104-ACCOUNT-1]

duration: ~55min
completed: 2026-07-17
---

# Phase 104 Plan 04: Own-project eligibility signal, navigation gating, and non-entitled /me/contributions redirect Summary

**A new backend `has_project_assignments` aggregate (verified Member + real confirmed contribution/credit, never inferable from `has_member_profile` alone) now drives both the "Meine Projekte" nav entry and a `/me/profile` redirect for any authenticated but non-entitled account hitting `/me/contributions` directly, backed by a standardized 403 `MEMBER_PROFILE_REQUIRED` error code.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3 completed
- **Files modified/created:** 17

## Accomplishments

- `MemberProfile.HasProjectAssignments` (`has_project_assignments` JSON) is the new authoritative D-06/D-09 signal: `MemberProfileRepository.hasProjectAssignments` runs a single `SELECT EXISTS(...) OR EXISTS(...)` against confirmed `anime_contributions` (both direct `member_id` and historical `hist_fansub_group_members` linkage) and historical `release_member_roles`, invoked from `GetOwnProfile` only after `HasMemberProfile` is already true (which itself already required a verified `member_claims` row); account-only responses short-circuit to `false` without querying assignment tables.
- `EnsureAppUserForIdentity` is now locked by a source-invariant regression test proving it only ever touches `app_users` (+ the compatibility `users` legacy bridge) — never `app_user_global_roles`, `members`, `member_claims`, `fansub_group_members`, `anime_contributions`, or `release_member_roles` — closing D-10/D-15 for registration/login side effects.
- `ContributionsMeHandler`'s six duplicated "no verified Member" 404 responses are now one `respondMemberProfileRequired()` helper returning HTTP 403 with a stable `MEMBER_PROFILE_REQUIRED` code in the existing error envelope; `ApiError.code` already threaded this through on the frontend, verified with new regression tests proving an unrelated 403 and a real 500 both stay unclassified/retryable.
- `AppShell` only renders "Meine Projekte" when `hasMemberProfile && hasProjectAssignments` are both true; `AppShellClientWrapper` threads `has_project_assignments` from `getOwnProfile()` through as the new prop (deviation — required to satisfy this task's own gating criteria, not listed in the task's file scope, mirroring the 104-03 `AppShell.tsx` precedent).
- `/me/contributions` fetches the own-profile aggregate before the dashboard load: client-initializing is neutral loading, anonymous keeps the existing login-gated `ErrorState`, and any authenticated account failing the eligibility check calls `router.replace('/me/profile')` with no claim/error intermediate ever rendered. Real network/5xx failures on an already-eligible session render a scoped German "Erneut versuchen" retry action instead of a login prompt. A refresh-only session (no access token, only a refresh token) proceeds transparently through the central `authorizedFetch` seam.

## Task Commits

1. **Task 1: Define and test the authoritative project-eligibility contract** - `697d6314` (feat)
2. **Task 2: Preserve structured backend Member classification** - `ededc978` (feat)
3. **Task 3: Gate navigation and redirect non-entitled direct access** - `388edaa8` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `backend/internal/models/member_profile.go` - `MemberProfile.HasProjectAssignments bool` (`json:"has_project_assignments"`)
- `backend/internal/repository/member_profile_repository.go` - new `hasProjectAssignments(ctx, memberID)` EXISTS-query method; wired into `GetOwnProfile`
- `backend/internal/repository/member_profile_repository_test.go` - `TestHasProjectAssignmentsSourceInvariants` (SQL-shape assertions, no live DB in this package)
- `backend/internal/repository/app_auth_repository_test.go` - `TestEnsureAppUserForIdentityStaysAppUserOnly` locking the app_user-only side-effect boundary
- `backend/internal/handlers/app_auth_test.go` - 3 new `GetOwnProfile` tests covering account-only false / verified-no-assignment false / verified-with-assignment true
- `backend/internal/handlers/contributions_me_handler.go` - `respondMemberProfileRequired()` + `memberProfileRequiredErrorCode` constant; replaces 6 inline 404 responses with 403+code
- `backend/internal/handlers/contributions_me_handler_test.go` - `TestRespondMemberProfileRequiredUsesStandardizedEnvelope`
- `shared/contracts/openapi.yaml` - `MemberProfile.has_project_assignments` documented (required, boolean, with the D-06/D-09 rationale)
- `shared/contracts/contributions.yaml` - `ErrorResponse.error.code` property added; `GET /api/v1/me/anime-contributions` 404→403 doc update with `MEMBER_PROFILE_REQUIRED` example
- `frontend/src/types/profile.ts` - `MemberProfileData.has_project_assignments: boolean`
- `frontend/src/lib/api.test.ts` - MEMBER_PROFILE_REQUIRED classification regressions for `getMyAnimeContributions`/`getOwnProfile`, plus an unrelated-403/real-500 non-classification proof
- `frontend/src/components/layout/AppShell.tsx` - `hasProjectAssignments` prop; "Meine Projekte" conditionally pushed onto `fixedMyItems`
- `frontend/src/components/layout/AppShell.test.tsx` - fixed a test that assumed unconditional "Meine Projekte" visibility; added 3 gating tests
- `frontend/src/components/layout/AppShellClientWrapper.tsx` - threads `has_project_assignments` from `getOwnProfile()` into the new `AppShell` prop (deviation)
- `frontend/src/components/layout/AppShellClientWrapper.test.tsx` - 2 new tests for the threaded prop (deviation)
- `frontend/src/app/me/contributions/page.tsx` - own-profile eligibility gate, redirect, and retry-capable error state
- `frontend/src/app/me/contributions/page.test.tsx` - 10 new tests (loading, anonymous login gate, eligible dashboard, both ineligible-redirect variants, no-redirect-loop, real-failure retry + recovery, defensive MEMBER_PROFILE_REQUIRED redirect, refresh-only session)
- `frontend/src/app/me/profile/page.test.tsx` / `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` - added `has_project_assignments: false` to two pre-existing `MemberProfileData` test fixtures (Rule 3 — typecheck became strict once the field became required)

## Decisions Made

See `key-decisions` in frontmatter. Most consequential: excluding `router` from the `/me/contributions` reload callback's dependency array to avoid an infinite reload/redirect loop when the router instance identity isn't stable (a live discovery during test-writing, not called out in the plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `AppShellClientWrapper.tsx`/`.test.tsx` needed to thread `has_project_assignments`**
- **Found during:** Task 3
- **Issue:** Task 3's `<files>` list only covers `AppShell.tsx`/`.test.tsx` and the `/me/contributions` page/test, but `AppShellClientWrapper` is the component that actually calls `getOwnProfile()` and passes `hasMemberProfile` into `AppShell` — without also passing `hasProjectAssignments`, the task's own acceptance criteria ("Show Meine Projekte only when own-profile has_member_profile and has_project_assignments are both true") is unreachable in the real app (only reachable in isolated `AppShell` unit tests).
- **Fix:** Added `hasProjectAssignments` to `WrapperProfile`, populated it from `d.has_project_assignments` in the `getOwnProfile()` response handler, and passed it through to `AppShell`. Added 2 regression tests.
- **Files modified:** `frontend/src/components/layout/AppShellClientWrapper.tsx`, `frontend/src/components/layout/AppShellClientWrapper.test.tsx`
- **Verification:** `npx vitest run src/components/layout/AppShellClientWrapper.test.tsx` (11/11 pass, up from 9).
- **Committed in:** `388edaa8` (Task 3 commit)

**2. [Rule 3 - Blocking issue] Two pre-existing `MemberProfileData` test fixtures broke typecheck**
- **Found during:** Task 3 (post-implementation `tsc --noEmit`)
- **Issue:** `frontend/src/app/me/profile/page.test.tsx` and `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` each construct a full `MemberProfileData` object literal without `has_project_assignments`; once that field became required (Task 1), both files failed `tsc --noEmit` with TS2322.
- **Fix:** Added `has_project_assignments: false` to each fixture's base object.
- **Files modified:** `frontend/src/app/me/profile/page.test.tsx`, `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx`
- **Verification:** `npx tsc --noEmit -p tsconfig.json` clean; both test files still pass (36/36, 3/3).
- **Committed in:** `388edaa8` (Task 3 commit)

**3. [Rule 1 - Bug] Infinite reload/redirect loop from `router` in a `useCallback` dependency array**
- **Found during:** Task 3 test-writing
- **Issue:** `/me/contributions`'s `reload()` initially included `router` (from `useRouter()`) in its `useCallback` dependency array. Against a test mock that returns a fresh object per `useRouter()` call (the same pattern already used in `AppShell.test.tsx`), this caused the load effect to re-run on every render, calling `getOwnProfile()`/`router.replace()` thousands of times in a tight loop.
- **Fix:** Removed `router` from the dependency array with an explanatory comment (Next.js guarantees a stable router instance; `router.replace` is used imperatively and doesn't need to be reactive).
- **Files modified:** `frontend/src/app/me/contributions/page.tsx`
- **Verification:** `npx vitest run src/app/me/contributions/page.test.tsx` (10/10 pass, including the explicit "no redirect loop" and "called exactly once" assertions).
- **Committed in:** `388edaa8` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 Rule 1 - bug, 1 Rule 2 - missing critical functionality, 1 Rule 3 - blocking issue)
**Impact on plan:** All three were necessary to deliver the plan's own D-06/D-08/D-09 acceptance criteria correctly, in a shipping (not just unit-isolated) state, without regressing existing tests. No scope creep beyond what the task's own stated behavior requires.

## Issues Encountered

- `backend/internal/handlers/contributions_me_handler.go` (605→620 lines) and `backend/internal/repository/member_profile_repository.go` (1794→1823 lines) were both already over the CLAUDE.md 450-line limit before this plan touched them. Neither was split — logged as a deferred follow-up in `deferred-items.md`, consistent with the existing project convention for other oversized files.
- `frontend/src/lib/api.no-token-boundary.test.ts` shows the same 2 pre-existing failures already logged in `deferred-items.md` from Plans 104-01/104-02/104-03 (`GroupHistorySection.tsx`'s `authToken` prop, `ProfileBackgroundCard.tsx`'s direct `fetch`) — neither file is touched by this plan; re-verified unchanged.
- A full `cd frontend && npx vitest run` still shows the same pre-existing baseline failures documented across 104-01/104-02/104-03 (concurrent session's project-page/hero/AvatarStack work in the `anime/[id]/group/[groupId]` / `fansubprojekt` area) — unrelated to this plan's profile/contributions/shell changes, not fixed per the executor scope boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-06, D-08, D-09, D-10, and D-15 now hold end-to-end: the backend aggregate is the sole eligibility source, both contracts document it, and the frontend nav/direct-route surfaces enforce it without weakening any existing backend Member authorization.
- Plans 104-05/104-06 can build on `has_project_assignments` as a stable, tested own-profile field and on `MEMBER_PROFILE_REQUIRED` as a stable machine-readable error code for any further `/me/*` gating work.
- `contributions_me_handler.go` and `member_profile_repository.go` remain known, tracked 450-line CLAUDE.md violations — a dedicated follow-up quick task should split them before further feature growth in either file.

---
*Phase: 104-registrierungs-login-und-account-onboarding-hardening*
*Completed: 2026-07-17*

## Self-Check: PASSED

All 19 created/modified files verified present on disk; all 3 task commit hashes
(`697d6314`, `ededc978`, `388edaa8`) verified present in `git log --oneline --all`.
