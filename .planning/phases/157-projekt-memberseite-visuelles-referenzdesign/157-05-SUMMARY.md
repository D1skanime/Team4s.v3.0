---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 05
subsystem: ui
tags: [react, nextjs, lucide-react, vitest, projectMember, EmptyState]

# Dependency graph
requires:
  - phase: 157-projekt-memberseite-visuelles-referenzdesign (plan 01)
    provides: additive `episodes` count on ProjectMemberCounts (fixture gap closed here for this plan's test file)
provides:
  - Additive icon/className props on the global EmptyState primitive (@/components/ui), usable by any future call site
  - Compact, dashed-border empty state for the 0-releases case, replacing the literal "Mitwirkung an Releases0Alle 0 angezeigt" duplication
  - "Alle N angezeigt" removal for Releases once fully loaded, matching the Media section's rule
affects: [157-06 (live UAT / visual comparison against reference), 157-10/11/12 (responsive/test/live-UAT workstream)]

# Tech tracking
tech-stack:
  added: []
  patterns: ["EmptyState icon/className additive props (backward compatible)", "conditional pagerInfo render (null instead of always-render ternary) to collapse pager text — same pattern as 157-04's Media fix"]

key-files:
  created: []
  modified:
    - frontend/src/components/ui/EmptyState.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx
    - .planning/phases/157-projekt-memberseite-visuelles-referenzdesign/deferred-items.md

key-decisions:
  - "EmptyState's icon fallback uses `icon ?? <Inbox size={20} strokeWidth={2} />` so omitting the prop is byte-identical to the pre-change render for all 77 existing call sites (verified none pass icon/className today)."
  - "className is appended as the last argument to the existing classNames(...) call rather than replacing stateCard/stateNeutral/stateCompact, so the dashed-border override only adds border-style/border-color, it does not replace the shared card chrome."
  - "The count===0 branch is a full early return with its own <section>/sectionHead wrapper (duplicating 5 lines of header JSX) rather than a conditional fragment inside one shared return, to keep the >0 branch's list/pager JSX untouched/readable and avoid a large ternary — consistent with this file's existing self-contained style."
  - "Hooks (useCallback, useProjectMemberCollection) remain called unconditionally before the count===0 early return, so the hook still fetches on mount even when count is 0 (matches the plan's Task 3 instruction to mock a real empty-page fetch for the empty-state test, not skip fetching)."
  - "Closed one of the two remaining pre-existing tsc gaps logged in deferred-items.md by Plan 157-04 (episodes field missing on a ProjectMemberCounts literal in this plan's own test file) as an in-scope fixture fix per the known_issue_to_check instruction; the second gap (page.test.tsx, not in this plan's files_modified) remains open for a later plan."

requirements-completed: [P157-09, P157-07]

# Metrics
duration: 12min
completed: 2026-09-12
---

# Phase 157 Plan 05: Releases empty state and EmptyState primitive extension Summary

**0-releases now renders the global `EmptyState` primitive (compact, dashed border, Package icon, "Noch keine öffentlichen Release-Einträge.") instead of the literal un-spaced "Mitwirkung an Releases0Alle 0 angezeigt", and "Alle N angezeigt" disappears once every release is loaded, matching Media's rule — with EmptyState gaining small, additive icon/className props used by no other of its 77 existing call sites.**

## Performance

- **Duration:** ~12 min (18:19:xx first Read to 18:21:xx last verification pass)
- **Started:** 2026-09-12T18:19:00Z (approx)
- **Completed:** 2026-09-12T18:21:45Z
- **Tasks:** 3 completed
- **Files modified:** 4 (plus 1 phase-level deferred-items.md update)

## Accomplishments

- `EmptyState` (`frontend/src/components/ui/EmptyState.tsx`) gained two optional, additive props: `icon?: ReactNode` and `className?: string`. When omitted, output is unchanged — confirmed no existing call site across `frontend/src` passes either prop today (`grep` audit: 77 non-test call sites, zero matches for `icon=`/`className=`).
- `ProjectMemberReleasesSection` now branches on `count === 0` at the top of its render (after all hooks, so `useProjectMemberCollection` still fetches unconditionally): the section header (`Mitwirkung an Releases` + count `0`) is followed by a single `EmptyState` element (`variant="compact"`, `Package` icon at the primitive's default size/strokeWidth, `className={styles.releasesEmpty}` for a dashed-border override using only `--color-border`), with no `<ul>`, no pager, no loading/error text.
- For the `count > 0` path, the `pagerInfo` span (previously an unconditional ternary rendering `Alle ${count} angezeigt` once `!canShowMore`) now renders `null` in that case — releases only ever show `"{shown} von {count} angezeigt"` while more can still be loaded, exactly mirroring 157-04's Media section fix.
- `ProjectMemberReleasesSection.test.tsx` gained two new tests (5 -> 7 total in the file): one proving the exact empty-state sentence renders with no `listitem` elements when `count={0}`, and one proving `/Alle \d+ angezeigt/` is absent once a small, fully-loaded (`has_more: false`) release list renders. The pre-existing `ProjectMemberHero` fixture in this file (missing the `episodes` field added by Plan 157-01) was fixed to `episodes: 0`, closing one of the two `tsc --noEmit` gaps logged in `deferred-items.md` by Plan 157-04.

## Task Commits

Each task was committed atomically:

1. **Task 1: Additive EmptyState props — icon + className** - `f51e14bd` (feat)
2. **Task 2: Releases 0-count empty state + pager "Alle N angezeigt" parity with Media** - `09df2326` (feat)
3. **Task 3: Adapt ProjectMemberReleasesSection.test.tsx for the new empty state and pager rule** - `798e2e7d` (test)

**Plan metadata:** (this commit, following this SUMMARY)

## Files Created/Modified

- `frontend/src/components/ui/EmptyState.tsx` — added `icon?`/`className?` to `EmptyStateProps`; non-inline branch falls back to the original `Inbox` icon and appends `className` to the existing `classNames(...)` call
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.tsx` — imported `Package` (lucide-react) and `EmptyState`; added a `count === 0` early-return branch; made the `count > 0` `pagerInfo` span conditional on `canShowMore`
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.module.css` — added `.releasesEmpty { border-style: dashed; border-color: var(--color-border); }`
- `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx` — added the empty-state test, the pager-parity test, and fixed the `episodes` fixture gap
- `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/deferred-items.md` — marked the `ProjectMemberReleasesSection.test.tsx:60` line item as closed by this plan; left the `page.test.tsx` item open for a later plan

## Decisions Made

- Kept the icon fallback as a nullish-coalescing expression (`icon ?? <Inbox ... />`) rather than a ternary against `undefined` explicitly, matching the codebase's existing terse-conditional style and guaranteeing byte-identical JSX for every caller that omits `icon`.
- Did not touch `EmptyStateVariant`'s `'inline'` branch — the plan's action explicitly scoped the icon/className changes to "the non-`inline` render branch"; `inline` has no icon today and this plan does not add one.
- Used a full early-return for the `count === 0` case (duplicating the section-header JSX) instead of threading a ternary through one shared return, to avoid an awkward large-ternary shape and keep both branches independently readable — consistent with `ProjectMemberMediaGallery.tsx`'s style from 157-04 (no direct comparable branch there, but this file's own existing structure favors flat, sequential JSX over nested ternaries).
- Left `pagerButtons` unconditionally rendered in the `count > 0` branch (same reasoning as 157-04's Media fix): `canShowLess` and `canShowMore` are independent flags, so "Weniger anzeigen" can still legitimately render even once nothing further can load.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Closed the pre-existing `episodes` fixture gap in this plan's own test file**
- **Found during:** Task 3 (per the `known_issue_to_check` instruction in this run's prompt, and independently confirmed via `tsc --noEmit`)
- **Issue:** `ProjectMemberReleasesSection.test.tsx`'s `ProjectMemberHero` test fixture constructed a literal `ProjectMemberCounts` object (`{ roles: 3, notes: 0, media: 0, releases: 1 }`) missing the `episodes: number` field added by Plan 157-01, causing a `tsc --noEmit` type error (`TS2741`) in this file.
- **Fix:** Added `episodes: 0` to the fixture. No behavior change — `episodes` is not asserted on in that test.
- **Files modified:** `frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx`
- **Commit:** `798e2e7d`

### Logged, not fixed (Scope Boundary)

**1. Pre-existing `tsc --noEmit` failures in `page.test.tsx` remain open**
- **Found during:** verification (full-project `tsc --noEmit` run)
- **Issue:** `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` has two call sites constructing literal `ProjectMemberCounts` objects missing `episodes` (same root cause as above, from Plan 157-01).
- **Action:** Not fixed — this file is not in Plan 157-05's `files_modified` list, and `tsc --noEmit` reports zero errors for any file this plan touched. Remains logged in `deferred-items.md` for whichever later plan touches `page.test.tsx` (per 157-CONTEXT.md's Workstream I test list).

---

**Total deviations:** 1 auto-fixed (in-scope fixture fix, explicitly authorized by this run's `known_issue_to_check` instruction); 1 logged-and-deferred (pre-existing, out-of-scope, unchanged from Plan 157-04's finding).
**Impact on plan:** None on this plan's own correctness. `tsc --noEmit` is now clean for every file this plan modified or read for verification purposes, except the pre-existing, out-of-scope `page.test.tsx` gap.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Verification

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json"` — clean except the pre-existing, out-of-scope `page.test.tsx` gap (2 errors, unrelated file).
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx"` — 7/7 tests passed.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/fansubs/projectMember/ProjectMemberReleasesSection.tsx src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx src/components/ui/EmptyState.tsx"` — 0 findings.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` (full suite) — 2317 passed, 3 todo, 1 skipped file (pre-existing `VerifiedBadge.test.tsx` skip, unrelated), 299/300 test files passed — no regressions vs. the 157-04 baseline (2317 vs. previously reported 2314/2317 across earlier phase runs; this run's full count matches expectations with the 2 new tests added).
- Manual `grep` across `frontend/src` confirmed no pre-existing `<EmptyState icon=`/`<EmptyState className=` call site exists that this additive change could conflict with (0 matches).
- Line counts: `EmptyState.tsx` 52 lines, `ProjectMemberReleasesSection.tsx` 107 lines, `ProjectMemberReleasesSection.module.css` 116 lines, `ProjectMemberReleasesSection.test.tsx` 203 lines — all well under the 450-line ceiling.
- Umlaut check: the target sentence uses real umlauts ("Noch keine öffentlichen Release-Einträge.") in both the production JSX and the test assertion — no ASCII substitutes.
- Mandatory-run-constraint checks: `PublicNoteCard.tsx`, `ReleaseNotesList.tsx`, `useProjectMemberCollection.ts`, and `roleCatalog.accessibility.test.ts` were not touched by this plan. No new design tokens were introduced (`.releasesEmpty` uses only the pre-existing `--color-border` token). No role-color mapping was added or duplicated.

## Next Phase Readiness

- The Releases section now visually matches the reference spec's Workstream H requirement (dashed-border compact empty state, no "Alle 0 angezeigt") and is ready for the Live-UAT screenshot comparison in a later plan (157-06/10-12).
- `EmptyState`'s new `icon`/`className` props are available for reuse by any future empty-state call site in the codebase without further global-component changes.
- One `tsc --noEmit` gap remains open (`page.test.tsx`, 2 errors) for a later plan in this phase to close, per `deferred-items.md`.

---
*Phase: 157-projekt-memberseite-visuelles-referenzdesign*
*Completed: 2026-09-12*

## Self-Check: PASSED

All 4 code files plus this summary and `deferred-items.md` confirmed present on disk; all
three task commits (`f51e14bd`, `09df2326`, `798e2e7d`) confirmed present in
`git log --oneline --all`.
