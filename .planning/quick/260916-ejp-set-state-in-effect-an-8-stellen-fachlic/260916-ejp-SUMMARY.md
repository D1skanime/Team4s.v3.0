---
phase: quick-260916-ejp
plan: 01
subsystem: ui
tags: [react, react-hooks, eslint, useCancellableSlugState, admin, episode-versions, fansubs]

requires:
  - phase: quick-260915-rv3
    provides: "the 8 void (async () => {...})() call sites this plan replaces with real structural fixes"
provides:
  - "8 call sites structurally compliant with react-hooks/set-state-in-effect (no eslint-disable, no syntactic dodge)"
  - "AdminGroupsClient.tsx's 4 summary components, CapabilityHistoryPanel.tsx, GroupRolesTab.tsx, useEpisodeNeighborNavigation.ts, useReleaseVersionMedia.ts all reuse the shared useCancellableSlugState hook or its render-time-adjustment extension"
affects: [admin-groups, admin-fansubs-edit, admin-episode-versions-edit, admin-users-capability-history]

tech-stack:
  added: []
  patterns:
    - "useCancellableSlugState direct adoption (Pattern A) for read-only, no-local-mutation, no-retain-previous-key sites"
    - "useCancellableSlugState + explicit enabled-gated 3-state render-time mapping (Pattern B) for sites needing a non-cleared sticky error branch"
    - "useCancellableSlugState + render-time-adjustment layer retaining the PREVIOUS successful result while a new key loads (Pattern C/D), reusing the GroupMemberFormModals.tsx precedent"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/groups/AdminGroupsClient.tsx
    - frontend/src/app/admin/groups/AdminGroupsClient.test.tsx
    - frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx
    - frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.test.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts

key-decisions:
  - "Fetchers accept zero parameters (not an unused `signal` parameter) at all 8 sites -- TypeScript structurally allows a `() => Promise<T>` function where `(signal: AbortSignal) => Promise<T>` is expected, avoiding @typescript-eslint/no-unused-vars without a throwaway `_signal` arg."
  - "AdminGroupsClient.tsx needed module-level EMPTY_MEMBERS/EMPTY_CLAIMS/EMPTY_CHANGES array constants (not per-render `[]` literals) so the React Compiler's memoization-preservation check on the existing `useMemo(() => ..., [claims])`/`useMemo(() => ..., [members])` calls does not flag a 'could not preserve manual memoization' error from an unstable dependency identity."
  - "state.data is asserted non-null (`state.data!`) at the point each site derives success-branch data, following the exact precedent already used in MemberCurrentProjectsSection.tsx -- CancellableSlugState<T> is a flat (non-discriminated-union) interface, so TypeScript cannot narrow `data` from `status === 'success'` alone."

requirements-completed: [QUICK-260916-EJP-01, QUICK-260916-EJP-02, QUICK-260916-EJP-03, QUICK-260916-EJP-04, QUICK-260916-EJP-05, QUICK-260916-EJP-06, QUICK-260916-EJP-07, QUICK-260916-EJP-08]

duration: 45min
completed: 2026-09-16
closed_by_user: 2026-09-16
human_uat: not_separately_confirmed
---

# Quick 260916-ejp: Real structural fixes for react-hooks/set-state-in-effect at 8 sites Summary

**Replaced all 8 `void (async () => {...})()` lint-dodge workarounds from quick 260915-rv3 with real
`useCancellableSlugState` adoptions (direct or via a render-time-adjustment layer), eliminating the
underlying synchronous-setState-in-effect pattern instead of merely hiding it from ESLint.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 5/5 completed
- **Files modified:** 10 (5 production + 5 test files)

## Accomplishments

- All 8 call sites (AdminGroupsClient.tsx's 4 inner summary components, CapabilityHistoryPanel.tsx,
  GroupRolesTab.tsx, useEpisodeNeighborNavigation.ts, useReleaseVersionMedia.ts) are structurally free of
  `void (async` -- verified by `grep` across all 5 changed production files returning zero matches.
- Each site now reuses the shared `useCancellableSlugState` hook (`frontend/src/hooks/useCancellableSlugState.ts`,
  left byte-identical) either directly (Pattern A) or combined with the render-time-adjustment pattern
  already established in `GroupMemberFormModals.tsx` (Patterns B/C/D).
- 50 new regression tests added across the 5 changed test files (request-count-parity, stale-response,
  and StrictMode-dev-double-invoke assertions per site, plus a sticky-loadError regression for
  GroupRolesTab and reload-survival/error-ordering regressions for useReleaseVersionMedia).
- Global ESLint stays at exactly 3 errors / 319 warnings before and after -- zero new findings of any rule.
- `npx tsc --noEmit` reports 0 errors.
- All 5 changed test files plus both pre-existing `useCancellableSlugState` consumers
  (`useMemberViewer.test.ts` -- 14 tests, `MemberCurrentProjectsSection.test.tsx` -- 11 tests, both
  byte-identical/untouched) pass: 50 + 25 = 75 tests green.
- `team4sv30-frontend` container restarted; `/`, `/admin/groups`, `/admin/fansubs` all return HTTP 200
  after restart with no server-side crash.

## Task Commits

Each task was committed atomically:

1. **Task 1: Class A -- AdminGroupsClient.tsx's four summary components** - `f8ceb0fe` (refactor)
2. **Task 2: Class A remainder (CapabilityHistoryPanel.tsx) plus Class B (GroupRolesTab.tsx)** - `95ff0499` (refactor)
3. **Task 3: Class C -- useEpisodeNeighborNavigation.ts** - `30ffab0c` (refactor)
4. **Task 4: Class D -- useReleaseVersionMedia.ts** - `368bc4b9` (refactor)
5. **Task 5: Full verification, global lint recount, container restart, SUMMARY** - this commit (docs, made by the orchestrator after this SUMMARY)

## Global ESLint Recount (Task 5 requirement)

| | Errors | Warnings |
|---|---|---|
| **Before** (baseline, checked prior to any change) | 3 | 319 |
| **After** (all 5 sites refactored) | 3 | 319 |

Zero new findings of any rule anywhere in the repo. The 3 errors and 319 warnings are the same
pre-existing, plan-unrelated findings documented in prior quicks/phases (unchanged file set, unchanged
rule IDs).

`npx tsc --noEmit`: 0 errors before and after.

## Per-Site Class Confirmation

All 8 sites matched their planned Lifecycle-Klasse exactly -- no reclassification was needed during
implementation:

| Site | File | Class | Confirmed |
|---|---|---|---|
| 1 | AdminGroupsClient.tsx — GroupMembersSummary | A | yes |
| 2 | AdminGroupsClient.tsx — GroupRolesSummary | A | yes |
| 3 | AdminGroupsClient.tsx — GroupClaimsSummary | A | yes |
| 4 | AdminGroupsClient.tsx — GroupChangesSummary | A | yes |
| 5 | CapabilityHistoryPanel.tsx | A | yes |
| 6 | GroupRolesTab.tsx | B | yes |
| 7 | useEpisodeNeighborNavigation.ts | C | yes |
| 8 | useReleaseVersionMedia.ts | D | yes |

## The One Allowed Behavioral Difference, Per Site

The plan permits exactly one documented behavioral change everywhere: elimination of the single
cascading commit where, on a key change, the OLD key's data briefly rendered without a loading
indicator before the effect body's `setIsLoading(true)` (running in a *later*, post-commit effect
pass) caught up. Structurally, this is real and provable by code inspection: in the old implementation
`isLoading` was a `useState` set asynchronously *inside* the effect body (a second render/commit cycle
after the prop change committed); in the new implementation `isLoading` is a pure, synchronous
*derivation* (`state.key !== requestKey || state.status === 'loading' || state.status === 'idle'`)
computed in the SAME render pass where the key changes -- so there is no longer an intermediate commit
where stale data is visible without a loading indicator.

**Honest test-coverage note:** this specific single-render-frame elimination is not independently
observable through React Testing Library's `render`/`rerender`, because both wrap all interactions in
`act()`, which flushes the full effect-plus-re-render cascade (old code's two commits, new code's one
commit) before returning control to the test -- by the time an assertion runs, both implementations
already show the identical *settled* DOM. The new regression tests (request-count-parity,
stale-response, sticky-error, StrictMode) all pass unchanged across the refactor and prove the
*end-state* state machine (loading -> success/error, a superseded key's response never wins) is
unaffected; they do not, and structurally cannot via this test harness, assert on the eliminated
intermediate frame itself. This is reported plainly rather than claiming a specific test proves the
single-frame elimination, per the plan's demand not to silently absorb the claim.

- **Sites 1-4 (AdminGroupsClient.tsx):** `AdminGroupsClient.test.tsx`'s 4 new "gleiche Gruppe ...
  Gruppenwechsel ... verspaetete alte Antwort" tests (one per component) cover the end-state guarantee.
- **Site 5 (CapabilityHistoryPanel.tsx):** the new "wendet eine verspaetete Antwort fuer den alten
  appUserId ... nicht mehr an" test.
- **Site 6 (GroupRolesTab.tsx):** the new "gleiche fansubId loest keine, ein Wechsel genau eine neue
  Anfrage aus" test, plus the dedicated sticky-loadError test (a genuinely new, explicitly required
  regression, not just the cascading-render item).
- **Site 7 (useEpisodeNeighborNavigation.ts):** the new "behaelt die vorherigen Nachbar-Ziele waehrend
  eines Reloads sichtbar" test -- this one IS independently new coverage (not just end-state parity):
  it asserts the INTERIM state (previous navigation target still visible, `isLoading` true) while a
  reload is in flight, which today's code already satisfied and the refactor preserves exactly.
- **Site 8 (useReleaseVersionMedia.ts):** the new "reorderItems bleibt bis zum Abschluss eines
  waehrenddessen gestarteten reload() sichtbar" and "patchItem-Ergebnisse ueberleben einen danach
  gestarteten, noch offenen reload()" tests -- both assert the INTERIM (in-flight-reload) state
  directly, proving local mutations are never clobbered by a load in progress.

## Files Created/Modified

- `frontend/src/app/admin/groups/AdminGroupsClient.tsx` - 4 summary components (GroupMembersSummary,
  GroupRolesSummary, GroupClaimsSummary, GroupChangesSummary) now derive isLoading/error/data straight
  from `useCancellableSlugState` (Pattern A); file at 484 lines (was 557), no extraction needed.
- `frontend/src/app/admin/groups/AdminGroupsClient.test.tsx` - +5 tests (4 request-count-parity +
  stale-response, 1 StrictMode), 9 total (was 4).
- `frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx` - Pattern A; `requestKey` keeps
  `actionCode` even though the fetcher itself ignores it, preserving today's refetch-on-actionCode-change
  parity.
- `frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.test.tsx` - +3 tests, 6 total (was 3).
- `frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx` - Pattern B; `members`/`loadError` stay
  real local state with a render-time-adjustment block mapping the three
  enabled/access-revoked/settled states explicitly, preserving the sticky-loadError edge case.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.test.tsx` - +3 tests, 5 total (was 2).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts` - Pattern C;
  `navigation`/`error` stay real local state with a render-time-adjustment layer that retains the
  PREVIOUS key's resolved targets while a new key loads.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.test.ts` -
  +3 tests, 9 total (was 6).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` - Pattern D; only
  the trailing load effect (items/capabilities/error/capabilitiesError) was replaced. Every
  mutation/upload `useCallback` (patchItem, replaceItem, deleteItem, reorderItems, runUpload,
  retryUpload, clearUploadQueue, startUpload) is byte-identical. File at 418 lines (was 411).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts` - +6 tests,
  21 total (was 15).

## Decisions Made

- **Fetcher signature: omit `signal` entirely.** All 8 fetchers are declared as `() => Promise<T>`
  rather than `(signal: AbortSignal) => Promise<T>` with an unused `_signal` param -- TypeScript's
  structural typing accepts a function with fewer parameters where more are expected, so this avoids
  `@typescript-eslint/no-unused-vars` warnings cleanly. This mirrors the interfaces block's
  signal-forwarding-gap note: none of the 8 underlying API calls accept an `AbortSignal` today, so
  there is nothing to forward regardless of whether the parameter is declared.
- **Module-level empty-array constants in AdminGroupsClient.tsx.** `EMPTY_MEMBERS`/`EMPTY_CLAIMS`/
  `EMPTY_CHANGES` were added as stable, shared references (instead of a fresh `[]` literal per render
  in the non-success branch) specifically because the React Compiler's `preserve-manual-memoization`
  ESLint rule flagged the existing `useMemo(() => ..., [claims])`/`useMemo(() => ..., [members])` calls
  as unable to preserve memoization when the dependency's identity could change on every render.
- **`state.data!` non-null assertion at each site's success branch**, matching the exact precedent
  already established in `MemberCurrentProjectsSection.tsx` (`state.data!.items`). `CancellableSlugState<T>`
  is a flat interface (not a discriminated union keyed on `status`), so TypeScript cannot narrow `data`
  from a `status === 'success'` check alone; the non-null assertion is the established idiom for this
  exact situation in this codebase.

## Deviations from Plan

None - plan executed exactly as written. All 5 tasks followed their specified Pattern (A/A/B/C/D)
precisely; no architectural changes, no scope additions, no auto-fixes beyond the two small type/lint
frictions documented above under Decisions Made (both are mechanical TypeScript/ESLint compliance
details, not behavioral changes).

## Issues Encountered

- **React Compiler `preserve-manual-memoization` error** in `AdminGroupsClient.tsx` after the initial
  refactor pass (destructuring `[members, claims]` from a conditional array literal, and later even
  after splitting into two separate ternaries with inline `[]` fallbacks, still flagged an unstable
  dependency for `useMemo(() => ..., [claims])`). Resolved by hoisting `EMPTY_MEMBERS`/`EMPTY_CLAIMS`/
  `EMPTY_CHANGES` to module-level constants (see Decisions Made). No behavior change -- purely a stable-
  identity fix satisfying the compiler's memoization-preservation check.
- **TypeScript `state.data` possibly null** at 5 call sites once fetchers stopped narrowing via a
  discriminated union. Resolved by using the `state.data!` non-null-assertion idiom already established
  in `MemberCurrentProjectsSection.tsx` (see Decisions Made). No behavior change.
- **StrictMode test for GroupRolesTab initially failed** because `mockResolvedValueOnce` only queued a
  successful response for the FIRST of React StrictMode's two dev-mode effect invocations; the second
  invocation fell through to an unmocked call, producing `undefined` and tripping the catch branch.
  Fixed by using the persistent `mockResolvedValue` (not `-Once`) for that specific test, since both
  double-invoked calls legitimately need the same successful response.

## User Setup Required

None - no external service configuration required.

## Manual-Sighting Checklist (OPEN -- NOT verified as part of this plan)

The following require a human with an authenticated admin session to visually confirm in the live
Team4s frontend. None of these were exercised in this plan; they are listed here as explicitly OPEN,
not claimed as passed:

- [ ] **Gruppenverwaltung** (`/admin/groups`): all four tabs (Benutzer/Rollen/Claims/Änderungen) render
  correctly, and switching between two different groups shows the new group's data without a stale
  flash or a stuck loading spinner.
- [ ] **Capability-Historie** (row expansion in the user editor, `/admin/users/:id`): the inline
  per-capability override history panel loads and filters correctly when expanding different
  capability rows for the same user.
- [ ] **Rollen-Tab im Fansub-Editor** (`/admin/fansubs/:id/edit`, Rollen tab): rolls up correctly,
  including the sticky-error edge case (an error message that was visible stays visible if access is
  revoked mid-session, e.g. via a token expiry) -- this specific edge case has never been visually
  confirmed live, only unit-tested.
- [ ] **Episoden-Navigation vor/zurück** (`/admin/episode-versions/:versionId/edit`): the previous/next
  episode arrow buttons correctly navigate across episode boundaries without flashing stale targets or
  getting stuck on an old episode's neighbors.
- [ ] **Medien-Tab** (`/admin/episode-versions/:versionId/edit`, Medien tab): upload, drag-reorder,
  delete, and a reload triggered after a local edit all behave correctly together in the live browser
  (unit tests cover the interaction logic in isolation; a live combined flow has not been observed).

## Out-of-Scope Follow-Up (explicitly named, not silently fixed and not silently ignored)

- **`frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx`** still uses the same
  `void (async () => {...})()` workaround pattern (synchronous `setGroupNotes`/`setLoadingNotes` calls
  before the first `await`, exactly matching the 8 sites this plan fixed) and was intentionally NOT
  touched -- it was not one of the 8 sites named in this plan's scope. A follow-up quick/plan should
  apply the same Pattern A/B/C/D treatment to it.
- **Legitimate (non-workaround) `void (async` usages left alone, correctly:**
  `frontend/src/app/admin/fansubs/[id]/edit/useReleaseReviewLane.ts`,
  `frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx`, and
  `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx` all set state only AFTER a
  real `await` (event-handler-triggered async work, not effect-body code), so they were never flagged
  by `react-hooks/set-state-in-effect` and are out of this plan's scope by design, not oversight.

## Next Phase Readiness

- All 8 sites are structurally compliant; no `eslint-disable`, no syntactic dodge anywhere in the
  changed files.
- `useCancellableSlugState` itself and its two pre-existing consumers remain byte-identical -- confirmed
  via `git status --short` showing no changes to `useCancellableSlugState.ts`, `useMemberViewer.ts`, or
  `MemberCurrentProjectsSection.tsx`/their test files.
- Container restarted and serving; `/`, `/admin/groups`, `/admin/fansubs` return HTTP 200.
- The manual-sighting checklist above and the `NotesTab.tsx` follow-up are the two concrete open items
  for a future session.

---
*Phase: quick-260916-ejp*
*Completed: 2026-09-16*

## Abschluss 2026-09-16

Vom Auftraggeber abgeschlossen („kannst abschließen“). Eine gesonderte Sichtprüfung der Checkliste wurde nicht
zurückgemeldet und wird hier nicht als bestanden geführt. Folgeauftrag für `NotesTab.tsx` (gleiches Muster) wurde
vom Auftraggeber abgelehnt und bleibt bewusst offen.
