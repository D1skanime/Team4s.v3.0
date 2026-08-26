---
phase: 141-actor-decidable-review-queue
plan: 05
subsystem: ui
tags: [react, nextjs, typescript, admin, release-reviews, tabs]

# Dependency graph
requires:
  - phase: 141-actor-decidable-review-queue
    provides: "Plan 141-04's useReleaseReviewLane hook and the extended ReleaseReviewView ('own') / ReleaseReviewCounts contract"
provides:
  - "OwnPendingReviewsSection.tsx -- read-only 'Wartet auf Fremdprüfung' lane consuming useReleaseReviewLane({view: 'own'}), no decision actions, no reviewer identity, no per-row navigation"
  - "PruefungenTabs (inside FansubEditSecondaryTabs.tsx) -- wraps the queue and own-pending lanes in the global Tabs primitive with independently-fetched, never-combined badge counts and ?lane=queue|own URL sync nested inside ?tab=pruefungen"
affects: [141-06, 141-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-track separation via the global Tabs primitive at the section level (not a Button-toggle) when two lists are structurally/semantically different in kind, not just different filters of the same list -- reserves the existing Offen/Verlauf Button-toggle for sub-views of a single actionable list"
    - "Locked badge-color asymmetry: Badge variant=\"info\" for actionable counts, Badge variant=\"muted\" for informational-only counts -- never swapped, never summed"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx

key-decisions:
  - "OwnPendingReviewsSection renders 5 always-visible table columns (no responsive desktop/tablet duplicate-column split, unlike ReleaseReviewsSection.tsx) so the DOM header count matches the plan's literal 'exactly 5 columns' requirement one-to-one, keeping colSpan={5} unambiguous."
  - "The ?lane= URL param uses the short values 'queue'/'own' (per 141-UI-SPEC.md's locked '?lane=queue|own' contract) while the Tabs item ids stay 'queue'/'own-pending' (per Component Contract 1's locked snippet); readLane()/setLane() map between the two so neither locked spec had to be paraphrased."
  - "PruefungenTabs's URL-sync effect rebuilds the querystring from scratch (tab + optional lane only), mirroring ReleaseReviewsSection.tsx's own from-scratch pattern, rather than merging into the live searchParams object -- avoids an infinite-render loop from including a fresh-identity searchParams object in the effect's dependency array."

patterns-established:
  - "New sibling lane components that reuse useReleaseReviewLane against a different `view` value follow OwnPendingReviewsSection.tsx's shape: local filter state (no URL sync of filters unless the lane needs it), the hook call, mobile-gate/no-session early returns copied verbatim from ReleaseReviewsSection.tsx, then a Table without a variant=\"withActions\" prop when no action column exists."

requirements-completed: [RQUE-02, RQUE-03, RQUE-04]

# Metrics
duration: ~30min
completed: 2026-08-26
---

# Phase 141 Plan 05: Own-pending review lane and two-track Tabs wrapper Summary

**A new read-only `OwnPendingReviewsSection` ("Wartet auf Fremdprüfung") lane and a `PruefungenTabs` wrapper inside `FansubEditSecondaryTabs.tsx` put the actionable review queue and the actor's own pending submissions into two ARIA-`tablist`-separated tracks with independently-fetched, structurally-never-summed badge counts (`Badge variant="info"` vs. `Badge variant="muted"`).**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-26T09:47:00Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `OwnPendingReviewsSection.tsx`: a new sibling component consuming `useReleaseReviewLane({fansubId, view: 'own', ...})`. Renders exactly 5 table columns (`Eingereicht`/`Projekt`/`Episode / Release`/`Typ`/`Status`) with no `Aktion` column, no `Einreicher` column, and no per-row navigation link. The `Typ` filter always shows both `Texte`/`Bilder` options (D10 -- this lane is capability-independent since it only ever contains the actor's own rows). Locked empty-state copy (`Keine offenen Einreichungen` / `Du hast aktuell keine eigenen Einreichungen, die auf Prüfung warten.`) and locked `SectionHeader` description are exact-string matches to 141-UI-SPEC.md.
- `FansubEditSecondaryTabs.tsx` gained a new internal `PruefungenTabs` component that wraps the "Zu prüfen"/"Wartet auf Fremdprüfung" tracks in the global `Tabs` primitive per Component Contract 1's locked snippet: `{id:'queue', badge: Badge variant="info"}` and `{id:'own-pending', badge: Badge variant="muted"}`, `keepMountedIds={new Set(['queue', 'own-pending'])}` so switching tabs never discards in-flight filters or forces a refetch of the other lane. `actionableCount`/`ownPendingCount` come from two independent, unfiltered `getReleaseReviewCounts(fansubId, {view: 'open'})` / `getReleaseReviewCounts(fansubId, {view: 'own'})` calls fetched once on mount -- structurally never summed, compared, or shown as "X of Y" anywhere in the UI.
- `?lane=queue|own` URL sync nested inside the existing `?tab=pruefungen` param, omitted from the URL when it equals the default (`queue`).
- `OwnPendingReviewsSection.test.tsx`: 3 tests -- (1) renders own-pending items in the read-only 5-column table with no decision buttons, no per-row `Öffnen` link, and confirms `listReleaseReviews` was called with `view: 'own'`; (2) locked empty-state title/description when zero items; (3) asserts no reviewer name (`Akari`), reviewer-count, or assignment-language text (`Prüfer`, `zugewiesen`, "Personen können das prüfen") appears anywhere in the rendered output (D07).

## Task Commits

Each task was committed atomically:

1. **Task 1: OwnPendingReviewsSection component** - `45309943` (feat)
2. **Task 2: Tabs wrapper with independent badge counts** - `cadfc65c` (feat)
3. **Task 3: OwnPendingReviewsSection test coverage** - `dccdcc96` (test)

**Plan metadata:** (pending) `docs: complete plan`

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.tsx` - New read-only own-pending lane (297 lines, no action/submitter columns, no per-row link)
- `frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.test.tsx` - New: 3 tests (columns, empty state, no-reviewer-info)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx` - New internal `PruefungenTabs`; the `pruefungen` branch now renders `<PruefungenTabs fansubId={fansubID} />` instead of `<ReleaseReviewsSection fansubId={fansubID} />` directly (154 lines total, well under the 450-line cap)

## Decisions Made
- Dropped the desktop/tablet responsive duplicate-column pattern that `ReleaseReviewsSection.tsx` uses for `Projekt`/`Episode / Release` -- `OwnPendingReviewsSection.tsx` renders 5 single, always-present `TableHeaderCell`s instead, so `colSpan={5}` on `TableEmptyState` unambiguously matches the actual rendered header count and the plan's "exactly 5 columns" / "colSpan matching the actual rendered header-cell count" requirements are both satisfied without a duplicate-header edge case.
- `?lane=` URL values (`queue`/`own`) are mapped to/from the `Tabs` item ids (`queue`/`own-pending`) via `readLane()`/a controlled `onActiveIdChange` handler, since 141-UI-SPEC.md locks both the short URL param values and the longer `own-pending` tab id verbatim in two different places and neither could be paraphrased to match the other.
- `PruefungenTabs`'s URL-sync `useEffect` rebuilds the querystring from scratch (`tab=pruefungen` + optional `lane=own`) on `[lane, pathname, router]` only, deliberately not depending on or merging the live `searchParams` object, mirroring `ReleaseReviewsSection.tsx`'s own existing from-scratch URL-sync pattern -- including `searchParams` in the effect's own dependency array would retrigger the effect on every `router.replace`-driven re-render (a fresh `URLSearchParams` object each time), risking a render loop.

## Deviations from Plan

None - plan executed exactly as written. One necessary in-flight adjustment during Task 1 (not a deviation from the plan's substance, but a mechanical fix to my own first draft): a doc comment inside `OwnPendingReviewsSection.tsx` originally used the word "Aktion/Einreicher" descriptively, which caused the Task 1 acceptance-criteria grep (`grep -n "Aktion\|Einreicher" ... shows zero matches`) to false-positive; reworded the comment before committing.

The three pre-existing `useRoleCatalog`-provider test failures (`FansubAppMembersSection.test.tsx`, `page.test.tsx`) encountered while running the full `src/app/admin/fansubs` suite originate in `AnimeReleasesCockpit.tsx`/`FansubAppMembersOverview.tsx` -- files this plan never touches -- and match 141-04-SUMMARY.md's documented Phase-136 baseline debt. Left untouched per the Scope Boundary rule.

A concurrent, unrelated commit (`9155a1f7`, "docs: record three agreed follow-ups after phase 141", touching only `.planning/notes/todo-nach-phase-141.md`) landed on `main` from the human operator between Task 2 and Task 3 of this plan's execution. It shares no files with this plan and required no action.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Both the actionable queue and the actor's own-pending submissions now have a visible, structurally-separated home in the admin UI (closing D01's core UI gap). Plan 141-06 can now modify `ReleaseReviewsSection.tsx` (the "Zu prüfen" tab's content, unchanged in shape by this plan) to remove the fake `Mitwirkungen` badge, gate the `Typ`/`Bildkategorie` filters on `allowed_types`, and add the D13-locked empty-state copy variants without needing to touch the new Tabs wrapper or the own-pending lane. Plan 141-07 (Detail/Next honest-403 work) is unaffected by this plan's changes. No blockers.

---
*Phase: 141-actor-decidable-review-queue*
*Completed: 2026-08-26*

## Self-Check: PASSED

All created/modified files and referenced task commit hashes (`45309943`, `cadfc65c`, `dccdcc96`) verified present on disk / in `git log --oneline --all`.
