---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 15
subsystem: ui

tags: [react, nextjs, css-modules, accessibility, focus-visible, tabindex]

# Dependency graph
requires:
  - phase: 157 (plans 10-14)
    provides: GAP-01/GAP-02 closed ProjectMemberNoteEntry structure, timeline dot/line color, hero jump-metric wiring that this plan extends (does not re-touch)
provides:
  - Additive icon/counter slots on the global SectionHeader primitive (backward-compatible for ~70 existing call sites)
  - Texte & Notizen / Bilder & Medien headers wired exclusively through SectionHeader's icon/counter slots (no local wrapper markup left)
  - Permanent, hover-independent .buttonText underline affordance plus a .buttonText:focus-visible ring
  - Tab-order containment for links inside a collapsed/clamped note preview
  - isolation: isolate scoping ProjectMemberNoteEntry's stacking context
affects: [projekt-memberseite-visuelles-referenzdesign, global-ui-section-header, global-ui-button]

tech-stack:
  added: []
  patterns:
    - "SectionHeader icon/counter slot: wrap icon+Heading+counter in a titleRow div only when icon or counter is passed, keeping the else-branch byte-identical to the pre-change markup for every other consumer"
    - "CSS-source unit tests (readFileSync + regex) for properties jsdom cannot compute (permanent underline vs hover-only, isolation, focus-visible box-shadow)"
    - "Live real-Tab-keypress verification in shot-projectmember.mjs: focus the preceding tab stop programmatically, then send one real Tab keypress, then wait out the CSS transition before reading getComputedStyle"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/SectionHeader.tsx
    - frontend/src/components/ui/SectionHeader.test.tsx
    - frontend/src/components/ui/ui.module.css
    - frontend/src/components/ui/HeroMetrics.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css
    - frontend/scripts/shot-projectmember.mjs
    - frontend/scripts/lib/shotHelpers.mjs

key-decisions:
  - "Rule 1 fix: .sectionHeaderCounter inherited the body's 1.5 line-height instead of matching .sectionTitle's 1.15, so align-items: center visibly offset the counter from the heading by ~2.8px even though both sat in the same flex row -- matched line-height, live-measured delta is now 0px at every viewport plus zoom200"
  - "Live focus-ring verification waits 200ms after the real Tab keypress before reading getComputedStyle, because .button's `transition: box-shadow 120ms ease` returns a mid-interpolation value if read immediately"
  - "Hero jump-metric Tab-reachability is proven by focusing the immediately-preceding tab stop programmatically and then sending exactly one real keyboard Tab, instead of an unbounded from-page-top Tab loop that would be fragile against unrelated nav-link count drift"

requirements-completed: [P157-05, P157-08, P157-11, P157-12]

duration: 25min
completed: 2026-09-14
---

# Phase 157 Plan 15: GAP-03 F1-F4 closure (SectionHeader icon/counter, hero-metric affordance, clamped-link tab containment, note isolation) Summary

**Additive icon/counter slots on the global SectionHeader primitive close the section-header underline/counter regression, paired with a permanent hover-independent hero-metric affordance with a focus ring, Tab-order containment for clipped note links, and an isolated note stacking context.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-14T19:03:00Z (approx, first plan/file reads)
- **Completed:** 2026-09-14T19:18:58Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- `SectionHeader` gained additive `icon`/`counter` props rendered inside a new `sectionHeaderTitleRow`, kept deliberately outside the mobile column-wrap rule so the counter never wraps onto its own line; every other existing call site (profile sections, "Alle Releases", "An diesem Release beteiligt", "Stimmen aus dem Team", "Karas", "Mitwirkende am Fansub-Projekt") renders byte-identical output because none of them pass the new props
- `ProjectMemberNotesSection`/`ProjectMemberMediaGallery` now call `SectionHeader` directly with `icon=`/`counter=`, deleting the now-dead local `sectionHeadRow`/`sectionHeadIcon`/`sectionHeadRowContent` wrapper markup and CSS from both components
- `.buttonText` (the hero jump-metric's button variant) underlines permanently instead of only on `:hover`, and gained its own `.buttonText:focus-visible` box-shadow ring using `var(--focus-ring)`; "13 Folgen" (plain text, not a Button) is untouched
- `ProjectMemberNoteEntry` toggles `tabindex="-1"` on body links while the note is collapsed and overflowing, restoring reachability on expand and re-clamping on collapse -- pure DOM-attribute manipulation of already-sanitized `RichTextRenderer` output
- `.entry` (`ProjectMemberNoteEntry.module.css`) gained `isolation: isolate`, scoping its own stacking context without changing any existing `z-index` value
- `shot-projectmember.mjs`/`shotHelpers.mjs` gained three new live checks: a same-row counter/heading alignment check (mobile/tablet/desktop + zoom200), and a desktop-only real-Tab-keypress affordance check proving the underline is visible before any hover and that keyboard Tab reaches the metric with a settled focus ring

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend global SectionHeader with optional icon/counter slots (F1 contract)** - `21e28bf9` (feat)
2. **Task 2: Wire icon/counter into Texte & Notizen / Bilder & Medien headers, extend screenshot proof (F1 consumers)** - `6a1d0989` (feat)
3. **Task 3: Permanent hero-metric affordance + focus ring (F2), contain clamped-link focus (F3), isolate note stacking context (F4), full verification** - `ddfbb5a4` (feat)

**Plan metadata:** (this commit, follows this SUMMARY)

_Note: each task's tests were written and confirmed RED (failing against the pre-change implementation) before the implementation change, then confirmed GREEN, but all changes for a given task landed in a single commit rather than separate `test(...)`/`feat(...)` commits -- this plan's frontmatter type is `execute` (task-level `tdd="true"`), not the plan-level `type: tdd` gate that mandates separate RED/GREEN commits._

## Files Created/Modified
- `frontend/src/components/ui/SectionHeader.tsx` - Additive `icon`/`counter` props, byte-identical else-branch for existing consumers
- `frontend/src/components/ui/SectionHeader.test.tsx` - 3 new tests (byte-identical shape, icon ordering, counter ordering) alongside the 3 pre-existing tests
- `frontend/src/components/ui/ui.module.css` - `.sectionHeaderTitleRow`/`.sectionHeaderIcon`/`.sectionHeaderCounter`, permanent `.buttonText` underline + `.buttonText:focus-visible` ring
- `frontend/src/components/ui/HeroMetrics.test.tsx` - CSS-source assertion for the permanent underline + focus-visible ring
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.tsx` - Calls `SectionHeader` with `icon=`/`counter=` directly
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.module.css` - Dead `sectionHeadRow`/`sectionHeadIcon`/`sectionHeadRowContent` rules removed
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx` - New F1 consumer test, F3 tabindex test, F4 CSS-source test
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.tsx` - Calls `SectionHeader` with `icon=`/`counter=` directly
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.module.css` - Dead `sectionHeadRow`/`sectionHeadIcon`/`sectionHeadRowContent` rules removed
- `frontend/src/components/fansubs/projectMember/ProjectMemberMediaGallery.test.tsx` - New F1 consumer test
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.tsx` - `useEffect` toggling `tabindex="-1"` on clamped body links
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css` - `isolation: isolate` added to `.entry`
- `frontend/scripts/shot-projectmember.mjs` - Calls the new alignment/focus-affordance checks (449/450 production lines)
- `frontend/scripts/lib/shotHelpers.mjs` - New `runSectionHeaderRowAlignmentCheck`/`runHeroMetricFocusAffordanceCheck` helpers

## Decisions Made
- Matched `.sectionHeaderCounter`'s line-height to `.sectionTitle`'s (1.15) instead of leaving it to inherit the body's 1.5 default -- see Deviations below
- Live focus-ring check waits 200ms after the real Tab keypress to avoid reading a mid-transition `box-shadow` value
- Hero jump-metric Tab-reachability is proven via preceding-tab-stop-then-one-real-Tab, not an unbounded from-top Tab loop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `.sectionHeaderCounter` inherited the wrong line-height, causing a live ~2.8px vertical misalignment against the heading**
- **Found during:** Task 2 (live screenshot verification of the new same-row alignment check)
- **Issue:** `.sectionHeaderCounter` (and the plan's own spec for it) only set `flex-shrink: 0`, leaving `line-height` to inherit the body's global `1.5` default. `.sectionTitle` (the `<h2>`) explicitly sets `line-height: 1.15`. With `align-items: center` on `.sectionHeaderTitleRow`, the two elements' differently-sized line boxes centered independently, producing a live top-offset delta of ~2.8px -- failing this plan's own `<=2px` acceptance bar the first time the screenshot script ran.
- **Fix:** Added `line-height: 1.15;` to `.sectionHeaderCounter`, matching `.sectionTitle`.
- **Files modified:** `frontend/src/components/ui/ui.module.css`
- **Verification:** Re-ran `node scripts/shot-projectmember.mjs` against a freshly restarted container; `sectionHeaderTitleRowAlignment`/`sectionHeaderTitleRowAlignmentZoom200` deltas are `0` for both sections at every viewport plus zoom200.
- **Committed in:** `6a1d0989` (Task 2 commit)

**2. [Rule 1 - Bug] Live focus-ring check initially read a mid-CSS-transition `box-shadow` value**
- **Found during:** Task 3 (live screenshot verification of the new keyboard-focus check)
- **Issue:** `.button` carries `transition: box-shadow 120ms ease`. The first implementation of the live Tab-focus check read `getComputedStyle(button).boxShadow` immediately after the Tab keypress, catching the animation mid-interpolation (`rgba(0, 0, 0, 0) 0px 0px 0px 0px` or a fractional value like `rgba(255, 106, 61, 0.027) 0px 0px 0px 0.486216px`) instead of the settled `var(--focus-ring)` value -- a false negative/ambiguous read, not an actual CSS bug (confirmed via a throwaway debug script that the `:focus-visible` rule itself was correctly matched and the resolved `--focus-ring` custom property was correct).
- **Fix:** Added a 200ms `page.waitForTimeout` after the Tab keypress before reading the computed style.
- **Files modified:** `frontend/scripts/lib/shotHelpers.mjs`
- **Verification:** Re-ran the live screenshot script; `heroMetricFocusAffordance.focusStyle.boxShadow` now reads the settled `rgba(255, 106, 61, 0.18) 0px 0px 0px 3px` (the `--focus-ring` token), exit code 0.
- **Committed in:** `ddfbb5a4` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 -- bugs found and fixed via the plan's own live verification steps)
**Impact on plan:** Both fixes were necessary to actually meet this plan's own acceptance bars (<=2px alignment delta; a real, settled, visible focus ring). No scope creep -- neither touched GAP-01/GAP-02 structure, PublicNoteCard, ReleaseNotesList, or backend code.

## Issues Encountered
None beyond the two auto-fixed issues documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GAP-03 findings F1, F2, F3, F4 are closed with automated verification (unit tests + live `shot-projectmember.mjs` run, exit code 0, all facts within bounds) and personally reviewed screenshots (full-width underline, in-row counter, visibly underlined "12 Beiträge"/"2 Medien" vs plain "13 Folgen").
- This plan does **not** constitute live human UAT sign-off. The phase-level `157-06` Task 4 checkpoint and a full human re-run of `157-UAT.md`'s GAP-02 points 1-9 plus GAP-03 F1-F5 remain a separate, required, out-of-band human step -- unchanged by this plan.
- `157-16-PLAN.md` (F5: docs + orphan cleanup) runs in the same wave against a disjoint file set; no coordination conflict observed (`git status` showed only `.planning/STATE.md` as a pre-existing concurrent-writer change throughout this plan's execution, never touched by this plan's commits).

---
*Phase: 157-projekt-memberseite-visuelles-referenzdesign*
*Completed: 2026-09-14*

## Self-Check: PASSED

All 14 modified files plus this SUMMARY.md verified present on disk; all 3 task commit hashes
(`21e28bf9`, `6a1d0989`, `ddfbb5a4`) verified present in `git log --oneline --all`.
