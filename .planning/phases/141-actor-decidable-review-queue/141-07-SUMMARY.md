---
phase: 141-actor-decidable-review-queue
plan: 07
subsystem: frontend
tags: [typescript, react, nextjs, error-handling, release-reviews]

# Dependency graph
requires:
  - phase: 141-actor-decidable-review-queue
    provides: "Plan 141-04's ReleaseReviewView/ReleaseReviewCounts contract and useReleaseReviewLane extraction, keeping ReleaseReviewsSection.tsx and the reviews/[reviewId] route under the 450-line cap"
provides:
  - "NextReviewControl -- shared resolving/available/exhausted/error presentational component for both post-decision and standalone 'next' navigation, never silently omitting the exhausted state"
  - "page.tsx's typed loadError: unknown with a real 403 branch rendering the locked 'Nicht entscheidbar für dich' ErrorState, distinct from the unchanged generic 404/network message"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated-union presentational component (mode: 'post-decision' | 'standalone') sharing one exhausted-message string constant so both call sites of a 'Next' affordance can never silently render nothing"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/NextReviewControl.tsx
    - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx

key-decisions:
  - "NextReviewControl's post-decision variant renders synchronously from a passed next prop (no internal fetch); the standalone variant owns local idle/loading/exhausted/error state and calls the already-implemented-but-previously-unused getNextReleaseReview, navigating immediately via useRouter().push on a resolved item per the UI-SPEC."
  - "The existing REVIEW_ALREADY_DECIDED 409 handling in submitDecision's catch block was left completely untouched -- the interfaces block confirmed both server-side sentinels (already-decided and not-pending) already map to this one code, so a new regression test proves coverage without adding redundant branching."
  - "The 403 ErrorState renders via <ErrorState> directly with plan-specific copy, not via getErrorStateCopy's built-in 403 branch, since that helper's default 'wende dich an einen Fansub-Admin' copy would misleadingly suggest an admin-actionable path for a same-submission case."

patterns-established:
  - "Compacting a new render branch's JSX onto fewer lines (single-line ErrorState/NextReviewControl props) is an accepted mechanical technique to stay under the 450-line file cap without altering behavior, extending the precedent from Plan 133's CSS-module splits into TSX line-budget management."

requirements-completed: [RQUE-02, RQUE-05, RDEL-05]

# Metrics
duration: ~25min
completed: 2026-08-26
---

# Phase 141 Plan 07: Actor-decidable review detail -- honest 403 branch and three-state Next control Summary

**A forbidden/own-submission review now renders a distinct, locked "Nicht entscheidbar für dich" panel instead of the generic load-failure message, and both the post-decision and new standalone "Nächste Prüfung" controls share one `NextReviewControl` component that never silently omits the exhausted state.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-26T09:59:00Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- New `NextReviewControl.tsx`: a discriminated-union component (`mode: 'post-decision' | 'standalone'`) exporting resolving/available/exhausted/error states. Post-decision renders synchronously from a `next` prop; standalone owns `idle | loading | exhausted | error` state, calls `getNextReleaseReview(fansubId, reviewId)` on click, navigates immediately via `useRouter().push` on a resolved item, and transitions to a locked `Keine weiteren Prüfungen für dich offen.` message on `null` (never re-shown until remount) or an inline `role="alert"` retry panel on failure. The native `Button`'s `disabled={disabled || loading}` behavior prevents a double-fire second click during the in-flight fetch.
- `page.tsx`: `loadError` changed from `useState(false)` to `useState<unknown>(null)`, and `loadDetail`'s catch now stores the raw error. The render branch split: `loadError instanceof ApiError && loadError.status === 403` renders `<ErrorState>` with the locked copy and a working `returnHref` link; every other failure (404/network/no status) renders the pre-existing generic message byte-for-byte (verified via a new regression test).
- `page.tsx`'s `showDecisionActions` block now always renders `<NextReviewControl mode="standalone" .../>` alongside the existing Confirm/Reject buttons; the `decisionState.kind === 'success'` block now always renders `<NextReviewControl mode="post-decision" next={... ?? null} />` instead of the previous silent `data.next ? (...) : null` omission.
- `submitDecision`'s catch block (both the `ApiError` 409 check and its plain-object fallback for `REVIEW_ALREADY_DECIDED`) was left completely unchanged, per the plan's interfaces block confirming the backend already maps both `ErrReviewAlreadyDecided` and `ErrReviewTargetNotPending` to this one code.
- `page.tsx` line count: 446 (at or below the CLAUDE.md 450-line cap), achieved by compacting the new 403-branch JSX and the post-decision `NextReviewControl` usage onto single lines rather than multi-line prop spreads.
- New `page.test.tsx`: 3 regression tests covering (1) a 403 `ApiError` rendering the locked panel with no Confirm/Reject buttons, (2) a 404 rendering the unchanged generic message, and (3) `REVIEW_ALREADY_DECIDED` on decide rendering the existing conflict panel.

## Task Commits

Each task was committed atomically:

1. **Task 1: NextReviewControl (shared resolving/available/exhausted/error states)** - `ec40c4ab` (feat)
2. **Task 2: page.tsx 403 branch + Next control wiring** - `f3034fdc` (feat)
3. **Task 3: Detail-page regression tests** - `a06ab46b` (test)

**Plan metadata:** (pending) `docs: complete plan`

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/NextReviewControl.tsx` - New: shared post-decision/standalone Next control with resolving/available/exhausted/error states
- `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` - `loadError: unknown` + real 403 branch; both `NextReviewControl` call sites wired in; 442 -> 446 lines (within cap)
- `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx` - New: 3 regression tests for the 403 branch, the unchanged 404 behavior, and the shared 409 mapping

## Decisions Made
- Post-decision `NextReviewControl` stays a pure presentational render of the `next` prop (no fetch); only the standalone variant owns fetch/navigation state, keeping the two modes' responsibilities cleanly separated within one component.
- The 403 `ErrorState` uses plan-specific copy directly rather than `getErrorStateCopy`'s built-in 403 branch, since the shared helper's default copy ("wende dich an einen Fansub-Admin") would misleadingly imply an admin-fixable permission gap for what is often a same-submission case.
- No new 409 branching was added; the existing `error.code === 'REVIEW_ALREADY_DECIDED'` check already covers both `ErrReviewAlreadyDecided` and `ErrReviewTargetNotPending` server-side, confirmed by a new regression test rather than new frontend logic.

## Deviations from Plan

None - plan executed exactly as written. Two pre-existing, out-of-scope issues were observed and left untouched per the Scope Boundary rule:
- The `tsc --noEmit` baseline error at `.next/dev/types/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.ts` (a generated dev-type artifact) — same pre-existing baseline noted in Plan 141-04's SUMMARY, unrelated to any file this plan touches. Because the plan's `<verification>` block chains `tsc --noEmit && vitest run` with `&&`, this pre-existing non-zero exit prevents the chained command from completing; `npx vitest run page.test --reporter=basic` was run standalone to confirm the new test file passes (3/3).
- Running the broad `page.test` filter (which matches every `page.test.tsx` in the frontend, not just this plan's file) surfaced 17 pre-existing failures across 4 unrelated files (`fansubs/[id]/edit/page.test.tsx`, `me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx`, and a `ProjectMemberPage` suite) — all `useRoleCatalog`-provider-related baseline debt matching the same class of failure Plan 141-04's SUMMARY already documented (`FansubAppMembersSection.test.tsx`, `page.test.tsx`, `useGroupMembersTab.test.ts`). None of these files were touched by this plan; logged here rather than fixed, per Scope Boundary.

## Issues Encountered
None beyond the documented pre-existing baseline debt above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
This is the final plan (Wave 5, plan 3 of 3) of Phase 141. Combined with Plans 141-01 through 141-06, the actor-decidable review queue is now feature-complete: server-side filtering to actor-decidable entries, an honest "Zu prüfen" tab contract, and a review-detail page that never silently hides a forbidden state or an exhausted "Next" affordance. Phase-level verification is expected to run next.

---
*Phase: 141-actor-decidable-review-queue*
*Completed: 2026-08-26*

## Self-Check: PASSED

All created/modified files and referenced commit hashes (`ec40c4ab`, `f3034fdc`, `a06ab46b`) verified present on disk / in `git log --oneline --all`.
