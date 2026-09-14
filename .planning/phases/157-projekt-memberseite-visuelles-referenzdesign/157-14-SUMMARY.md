---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 14
subsystem: ui
tags: [react, nextjs, css-modules, accessibility, hero-metrics, button-primitive]

# Dependency graph
requires:
  - phase: 157-13
    provides: GAP-02 V3/V4 timeline dot/line color closure; ProjectMemberHero/ProjectMemberPage as they stood after that plan
provides:
  - additive variant="text" on the global Button primitive (frontend/src/components/ui/Button.tsx)
  - additive onActivate/activateLabel API on the global HeroMetrics primitive
  - shared frontend/src/lib/scrollToSection.ts helper
  - ProjectMemberHero's Beiträge/Medien metrics as real, keyboard-operable jump targets, gated by a new sectionsRendered prop
  - full removal of ProjectMemberStickyNav (component + CSS module + its own test)
affects: [projectMember, ui-primitives, hero-metrics-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global-primitive additive extension: add an optional field/variant instead of a local reimplementation, prove the other call sites byte-identical via targeted tests + git diff --stat"
    - "Shared in-page scroll helper (prefers-reduced-motion-aware) extracted once, consumed by callers instead of duplicated per component"

key-files:
  created:
    - frontend/src/lib/scrollToSection.ts
    - frontend/src/lib/scrollToSection.test.ts
  modified:
    - frontend/src/components/ui/Button.tsx
    - frontend/src/components/ui/HeroMetrics.tsx
    - frontend/src/components/ui/HeroMetrics.test.tsx
    - frontend/src/components/ui/ui.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberHero.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx"
    - frontend/scripts/shot-projectmember.mjs
  deleted:
    - frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.test.tsx

key-decisions:
  - "Route the new interactive hero metric through the global Button primitive (variant=\"text\") per CLAUDE.md's Frontend-UI rule, instead of a native <button> -- extended Button additively (7th variant) rather than bypassing it for a shape mismatch"
  - "Extend HeroMetrics' item shape additively (onActivate/activateLabel) so all 6 other call sites need zero changes, proven via git diff --stat and dedicated no-onActivate test assertions"
  - "Folgen stays plain, non-interactive text -- it has no matching page section, so it is not wired to scrollToSection"

patterns-established:
  - "Additive global-primitive API extension pattern (optional field + conditional wrapper, no new element rendered when the field is absent)"

requirements-completed: [P157-02, P157-03, P157-01]

# Metrics
duration: 11min
completed: 2026-09-14
---

# Phase 157 Plan 14: Hero jump metrics replace duplicate ProjectMemberStickyNav (GAP-02 V6) Summary

**Hero's "Beiträge"/"Medien" counts are now real, keyboard-operable in-page jump buttons via a new additive `Button` `variant="text"` and `HeroMetrics` `onActivate` field, routed through a shared `scrollToSection` helper; the separate duplicate `ProjectMemberStickyNav` tab card is deleted entirely.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-14T18:06:17Z
- **Completed:** 2026-09-14T18:16:59Z
- **Tasks:** 4
- **Files modified:** 13 (10 modified, 2 created, 3 deleted — some files appear in both created/deleted or modified/deleted lists in different tasks)

## Accomplishments
- `ProjectMemberHero`'s "Beiträge" and "Medien" metrics are now `getByRole('button', ...)`-visible, keyboard-focusable jump targets to `#texte`/`#bilder`, with `Folgen` staying plain, non-interactive text
- The clickable metric renders through the global `Button` primitive (`variant="text"`) — a genuinely new native `<button>` element via `Button`, not a bespoke local one — satisfying CLAUDE.md's Frontend-UI rule for new interactive elements
- `HeroMetrics`' API extension (`onActivate`/`activateLabel`) is additive and proven not to affect its other 6 call sites (`DashboardMetrics`, `dev/ui-system`, `ProjectStats`, `ReleaseDetailHero`, `MemberProfileHero`, `FansubHeroSection` — all outside `git diff --stat` for this plan)
- `Button`'s 6 existing variants are byte-identical (only additive union-type member + one new `classNames` branch touched; `git diff` on `Button.tsx`/`ui.module.css` shows only additions)
- `ProjectMemberStickyNav` and its duplicate "Texte & Notizen · 12 / Bilder & Medien · 2" tab card are fully removed from the codebase (component, CSS module, and its own test file), verified by `grep -rc` returning 0 across `frontend/src`
- Live browser proof (restarted container, `node scripts/shot-projectmember.mjs`): `stickyNavPresent: false` on all 3 viewports, clicking "Zu Texte & Notizen springen" actually scrolls `#texte` within 100px of the viewport top, `zoom200Overflow: false`, no console errors, exit 0

## Task Commits

Each task was committed atomically (TDD: RED → GREEN):

1. **Task 1: Write failing tests for the Button "text" variant, HeroMetrics API, scrollToSection helper, and wired-up hero** - `4ad41cd3` (test) — RED confirmed (3 files failed, 13 pre-existing assertions still passed)
2. **Task 2: Implement the additive Button "text" variant, HeroMetrics API, and scrollToSection helper** - `3b887f90` (feat) — GREEN for HeroMetrics.test.tsx/scrollToSection.test.ts; ProjectMemberHero.test.tsx remained expected-RED (wiring is Task 3)
3. **Task 3: Wire ProjectMemberHero's jump metrics; remove ProjectMemberStickyNav** - `4fdede64` (feat, ProjectMemberStickyNav deletion) + `f17d9012` (feat, the wiring edits — split into two commits because a multi-path `git add` aborted partway on a stale pathspec; both together form Task 3) — all 19 of Task 1's assertions GREEN
4. **Task 4: Update page-level tests; run full regression; produce live-UAT screenshot evidence** - `e29a6e13` (test)

**Plan metadata:** (this commit) `docs(157-14): complete hero jump-metric wiring plan`

## Files Created/Modified
- `frontend/src/lib/scrollToSection.ts` - shared prefers-reduced-motion-aware in-page scroll helper, extracted verbatim from the deleted `ProjectMemberStickyNav`'s inline mechanic
- `frontend/src/components/ui/Button.tsx` - additive `variant="text"` (native `<button>`/`<a>` semantics unchanged, only visible chrome reset)
- `frontend/src/components/ui/ui.module.css` - two new additive rule blocks (`.buttonText`, `.buttonText:hover`) inserted after `.buttonSuccess:hover`
- `frontend/src/components/ui/HeroMetrics.tsx` - additive `onActivate`/`activateLabel` fields; wraps content in `Button` (`variant="text"`) only when `onActivate` is set
- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx` - new required `sectionsRendered` prop; Beiträge/Medien wired to `scrollToSection('texte'/'bilder')`
- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx` - drops `ProjectMemberStickyNav`, passes `sectionsRendered={!isEmpty}` to the hero
- `frontend/scripts/shot-projectmember.mjs` - new `stickyNavPresent` fact + throwing check; live click-and-scroll proof for the hero jump button
- `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx`/`.module.css`/`.test.tsx` - **deleted** (component fully superseded by the hero's own jump metrics)

## Decisions Made
- Routed the hero jump metric through `Button` (`variant="text"`) rather than a native `<button>`, per CLAUDE.md's Frontend-UI rule — this is a genuinely new interactive element, not a grandfathered one
- Extended `Button` and `HeroMetrics` additively (new variant / new optional fields) instead of forking either component, so all other call sites required zero changes
- "Folgen" intentionally stays plain text — it has no corresponding page section to jump to

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom does not implement `window.matchMedia`**
- **Found during:** Task 2 (confirming GREEN for `scrollToSection.test.ts`) and Task 3 (confirming GREEN for `ProjectMemberHero.test.tsx`)
- **Issue:** `scrollToSection()` calls `window.matchMedia(...)` for the `prefers-reduced-motion` check; jsdom (the vitest test environment) does not implement `matchMedia` at all, so any test exercising the real click path threw `TypeError: window.matchMedia is not a function`
- **Fix:** Added a guarded stub (`if (typeof window.matchMedia !== 'function') { window.matchMedia = ... }`) to both `scrollToSection.test.ts` and `ProjectMemberHero.test.tsx`, following the same established idiom already used in the codebase for `Element.prototype.scrollIntoView`/`CSS.escape` (see `RolesClient.test.tsx`)
- **Files modified:** `frontend/src/lib/scrollToSection.test.ts`, `frontend/src/components/fansubs/projectMember/ProjectMemberHero.test.tsx`
- **Verification:** All affected tests pass GREEN afterward
- **Committed in:** `3b887f90` (scrollToSection.test.ts), `4fdede64`/`f17d9012` (ProjectMemberHero.test.tsx)

**2. [Precision note, not a Rule 1-4 fix] Comment references to the deleted `ProjectMemberStickyNav` files**
- **Found during:** Task 3, verifying the plan's own acceptance criterion `grep -rc "ProjectMemberStickyNav" frontend/src returns 0`
- **Issue:** Two pre-existing/self-written comments (in the new `scrollToSection.ts` and the pre-existing `ProjectMemberPage.module.css`) named the now-deleted `ProjectMemberStickyNav.module.css`/`.tsx` files by filename, which would have kept the grep non-zero and left stale documentation pointing at a deleted component
- **Fix:** Reworded both comments to describe the deleted component generically instead of naming its filename
- **Files modified:** `frontend/src/lib/scrollToSection.ts`, `frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css`
- **Verification:** `grep -rc "ProjectMemberStickyNav" frontend/src` returns 0 across the whole tree
- **Committed in:** `4fdede64`/`f17d9012`

**3. [Precision note, not a Rule 1-4 fix] HTML-entity escaping in the page-level test assertions**
- **Found during:** Task 4, writing the new positive/negative assertions for `page.test.tsx`
- **Issue:** The plan's acceptance criteria reference the literal string `Zu Texte & Notizen springen` (unescaped ampersand), but `renderToStaticMarkup` HTML-escapes `&` to `&amp;` in attribute values, so an assertion using the literal unescaped ampersand would never match the actual rendered output and the test would fail
- **Fix:** Wrote the assertions against the actual escaped string (`aria-label="Zu Texte &amp; Notizen springen"`), which is what the component genuinely renders and what a real browser/DOM parser resolves back to the correct label
- **Files modified:** `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx`
- **Verification:** All 6 tests in this file pass GREEN; the aria-label is confirmed correct (unescaped) in the live browser screenshot run's `heroButtonLabels` fact
- **Committed in:** `e29a6e13`

---

**Total deviations:** 3 (2 Rule-3 blocking test-infra fixes, 1 precision-only documentation/assertion correction)
**Impact on plan:** All fixes were necessary for the plan's own tests to actually pass and for its own acceptance criteria to be satisfiable as literally written. No scope creep — no production behavior changed beyond what the plan specified.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GAP-02 from `157-UAT.md` is now automated-verification-complete across all four of its closure plans (157-11 through 157-14: screenshot-script settle-wait fix, section-header underline primitive, timeline dot/line color, and this plan's hero jump-metric/StickyNav removal)
- Human Live-UAT sign-off (the full `157-UAT.md` checklist, points 1-9, re-run live by the operator) remains a separate, explicitly open step — this plan's own passing verification does NOT mark GAP-02 or Phase 157 as accepted
- No blockers for that human sign-off step; all automated gates (tsc, eslint, full vitest suite, live screenshot script) are green with 0 new regressions

---
*Phase: 157-projekt-memberseite-visuelles-referenzdesign*
*Completed: 2026-09-14*

## Self-Check: PASSED

All created/modified files confirmed present (`scrollToSection.ts`, `scrollToSection.test.ts`,
`Button.tsx`, `HeroMetrics.tsx`, `ProjectMemberHero.tsx`, `ProjectMemberPage.tsx`); all three
`ProjectMemberStickyNav.*` files confirmed deleted; all five task commit hashes
(`4ad41cd3`, `3b887f90`, `4fdede64`, `f17d9012`, `e29a6e13`) confirmed present in `git log`.
