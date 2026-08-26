---
phase: 141-actor-decidable-review-queue
plan: 06
subsystem: frontend
tags: [react, nextjs, typescript, admin, release-reviews, honesty-contract]

# Dependency graph
requires:
  - phase: 141-actor-decidable-review-queue
    provides: "Plan 141-04's ReleaseReviewCounts.allowed_types field and useReleaseReviewLane hook"
provides:
  - "ReleaseReviewsSection.tsx -- D06-honest counters row (no fake-zero Mitwirkungen badge), D10-gated Typ/Bildkategorie filters (full omission on allowed_types, never a disabled ghost option), D13-locked three-way empty-state copy split"
affects: [141-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filter FormField full-omission gating: render conditionally on a server-provided capability array (allowed_types), never on a derived zero-count or as a disabled-but-visible Select -- disabled implies 'temporarily unavailable', omission implies 'not applicable to you'"
    - "Three-way empty-state copy split computed once (view === 'history' vs hasFilters vs neither) and passed as a single description value, keeping the JSX render branch unchanged"

key-files:
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx
    - frontend/src/app/admin/fansubs/releaseReviews.test.tsx

key-decisions:
  - "The locked SectionHeader description text mixes a German opening guillemet („) with an ASCII closing double-quote (\") per the plan's verbatim interfaces block; since JSX double-quoted attributes cannot contain an unescaped ASCII double-quote, the attribute was written with single-quote JSX delimiters (description='...') instead of escaping the internal quote -- avoids paraphrasing or re-typing the locked copy while staying syntactically valid."
  - "Typ FormField gating checks lane.counts.allowed_types.length > 1 (full omission below that), matching the plan's exact predicate rather than checking .length === 0 -- a single-entry allowed_types must never render a one-option dropdown either."

requirements-completed: [RQUE-01, RQUE-04, RDEL-05]

# Metrics
duration: ~15min
completed: 2026-08-26
---

# Phase 141 Plan 06: Zu prüfen tab honesty contract -- badge removal, D10 filter gating, D13 empty-state copy Summary

**`ReleaseReviewsSection.tsx`'s "Zu prüfen" tab no longer shows the always-fake-zero `Mitwirkungen` badge, its `Typ`/`Bildkategorie` filters are now fully omitted (not disabled) when the backend's real `allowed_types` signal says the actor cannot review that kind, and its empty state now uses three distinct D13-locked copy variants instead of one generic message.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-26T09:52:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Deleted the `Mitwirkungen {counts.contribution}` badge entirely (never replaced); the counters row now renders only `Texte`/`Bilder`, both `variant="info"`, with `aria-label="Prüfungen, die du entscheiden kannst, nach Typ"` (D06).
- Updated the `SectionHeader` description to the locked verbatim string pointing admins to the new "Wartet auf Fremdprüfung" own-pending lane (Plan 141-05).
- `Typ` `FormField` is now rendered only when `lane.counts.allowed_types.length > 1`; its `text`/`image` `<option>`s are individually gated on `.includes('text')`/`.includes('image')`. `Bildkategorie` `FormField` is rendered only when `.includes('image')`, unchanged `disabled={type !== 'image'}` behavior preserved when present (D10).
- The single generic `TableEmptyState` description was replaced with a computed `emptyStateDescription` branching on `view === 'history'` vs (`view === 'open'` and `hasFilters`) vs (`view === 'open'` and `!hasFilters`), using the three exact D13-locked strings.
- Extended `releaseReviews.test.tsx`: default mocked counts now carry `allowed_types: ['text', 'image']`; the removed-badge assertion was replaced with an absence check; four new tests cover Typ-FormField full-omission at one allowed type, both-options rendering at two allowed types, and the two distinct D13 empty-state copy variants (no-filter vs filters-active).

## Task Commits

Each task was committed atomically:

1. **Task 1: Badge removal, D10 filter gating, D13 empty-state copy** - `f6902f8c` (fix)
2. **Task 2: Test coverage for D10 gating and D13 copy** - `ec910a59` (test)

**Plan metadata:** (pending) `docs: complete plan`

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx` - Badge removed, filters gated on `allowed_types`, empty-state copy branched into three D13-locked variants
- `frontend/src/app/admin/fansubs/releaseReviews.test.tsx` - Updated default counts mock, replaced badge assertion, added 4 new tests (19 total, all passing)

## Decisions Made
- The locked `SectionHeader` description string mixes a German opening guillemet (`„`) with an ASCII closing double-quote (`"`); since this made the string un-embeddable in a double-quoted JSX attribute, the attribute was switched to single-quote JSX delimiters (`description='...'`) rather than escaping or paraphrasing the locked copy.
- Typ gating uses `allowed_types.length > 1` (not `=== 0`) as the render predicate, matching the plan's explicit rule that even a single-entry `allowed_types` must omit the FormField entirely (a one-option dropdown would still leak "this is the only kind you can review" via its shape).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
Initial edit of the `SectionHeader description` attribute (double-quoted, containing an unescaped ASCII `"` from the locked copy) produced a TypeScript/JSX parse error (`TS1003: Identifier expected` / `TS1382: Unexpected token`). Fixed by switching the JSX attribute to single-quote delimiters, preserving the locked copy byte-for-byte (Rule 3 - blocking issue, fixed inline before continuing).

The plan's combined verification command (`npx tsc --noEmit && npx vitest run releaseReviews --reporter=basic`) does not complete end-to-end because `tsc --noEmit` exits non-zero on one pre-existing, out-of-scope error in a generated `.next/dev/types` artifact (`fansubprojekt/[animeSlug]/page.ts`) that predates this plan and touches no file either plan 141-04, 141-05, or 141-06 modified (documented in `141-04-SUMMARY.md`'s Deviations section as pre-existing baseline debt). Both halves of the verification command were run independently and both pass for every file this plan touches: `tsc --noEmit` produces zero new errors, and `vitest run releaseReviews --reporter=basic` reports 19/19 tests passing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
The "Zu prüfen" tab's D06/D10/D13 honesty contract is now fully closed on the frontend: no fake-zero badge, capability-honest filter rendering, and neutral three-way empty-state copy. Plan 141-07 (Detail/Next honest-403 work) touches a different surface (`/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` and related Detail/Next flow) and is unaffected by this plan's changes -- no shared files, no blockers.

---
*Phase: 141-actor-decidable-review-queue*
*Completed: 2026-08-26*
