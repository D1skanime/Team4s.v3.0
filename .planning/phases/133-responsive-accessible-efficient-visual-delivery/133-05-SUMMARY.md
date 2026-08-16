---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 05
subsystem: frontend-ui
tags: [accessibility, focus-management, inert, jest-axe, focal-carousel]

# Dependency graph
requires: [133-01]
provides:
  - "FocalCarousel non-active slides marked inert (imperative ref-driven, not the declarative JSX prop)"
  - "FocalCarousel expand-direction focus management (expandFocusRef mirroring restoreFocusRef)"
  - "First real jest-axe consumer proving zero violations across FocalCarousel's collapsed/expanded/quiet states"
affects: [MemberBadgeChain, FansubProjectsGrid, members/[slug]/page, fansubs pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "react-dom@18.3.1 does not recognize `inert` as a boolean DOM property (only added in a later React major); a declarative `inert={boolean}` JSX prop emits a dev warning and never reaches the DOM in this exact version. Set/remove the attribute imperatively via a ref callback (`node.setAttribute('inert', '')` / `node.removeAttribute('inert')`) instead -- works identically in real browsers and in this repo's jsdom test environment."
    - "jsdom@26.1.0's `HTMLElement.prototype.inert` IDL property getter/setter does not reflect to/from the underlying attribute in either direction; only `setAttribute`/`getAttribute`/`hasAttribute` are reliable for asserting `inert` state in tests."

key-files:
  created: []
  modified:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.test.tsx

key-decisions:
  - "Used an imperative ref-callback (`node.setAttribute('inert', '')` / `removeAttribute`) instead of the plan-suggested declarative `inert={!isActive}` JSX prop, because react-dom@18.3.1 (this repo's exact pinned version) does not forward boolean `inert` to the DOM at all -- confirmed by direct runtime probe showing `hasAttribute('inert')` false for both `true` and `false` prop values, with a dev warning pointing at the string-value workaround."
  - "Tab-order reachability was tested via the `inert` attribute's presence as the behavioral proxy (per the plan's own documented fallback), not via `userEvent.tab()`, because `@testing-library/user-event` is not an installed devDependency in this repo and jsdom@26.1.0 does not implement `inert`'s focus-blocking behavior regardless."

requirements-completed: [PMA11Y-02, PMA11Y-03, PMA11Y-04]

# Metrics
duration: ~35min
completed: 2026-08-16
---

# Phase 133 Plan 05: FocalCarousel Keyboard/Focus/Axe Hardening Summary

**Hardened the shared `FocalCarousel` primitive so inactive slides are imperatively `inert` (bypassing a react-dom@18.3.1 gap where the declarative boolean prop silently no-ops) and expanding to grid view moves focus into the grid instead of stranding it, then proved zero axe-core violations across all three render states as the first real consumer of Plan 133-01's jest-axe setup.**

## Performance

- **Duration:** ~35 min (includes discovering and root-causing a React-version-specific `inert` prop gap not anticipated by the plan)
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Every non-active `FocalCarousel` slide (`[data-focal-item]`) now carries the `inert` HTML attribute, applied imperatively via a ref callback so it actually lands in the DOM under this repo's react-dom@18.3.1.
- Expanding to grid view (`showAllLabel` toggle click, or any item's `showAll()` callback) now moves focus to the "Weniger anzeigen" button via a new `expandFocusRef`/`useEffect` pair that mirrors the pre-existing `restoreFocusRef` collapse-direction pattern, giving the grid a stable `${gridId}-collapse` id to focus.
- The pre-existing collapse-direction focus restoration (toggle regains focus after "Weniger anzeigen" is clicked) is unchanged and covered by an extended regression test.
- Added three `jest-axe` assertions (`expect(await axe(container)).toHaveNoViolations()`) covering the collapsed default state, the expanded grid state, and the single-item "quiet" state -- the first real usage of Plan 133-01's global `toHaveNoViolations()` Vitest matcher.
- `FocalCarousel.test.tsx` grew from 25 to 29 tests (all green); `FocalCarousel.tsx` typechecks and lints clean (only pre-existing, unrelated errors remain elsewhere in the repo).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inert on inactive slides and focus-on-expand handling** - `61678250` (feat)
2. **Task 2: Add jest-axe coverage for collapsed, expanded, and quiet (single-item) states** - `6cbca00b` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/ui/FocalCarousel.tsx` - `expandFocusRef` + `collapseId`, a new expand-direction focus `useEffect`, a stable id on the "Weniger anzeigen" button, `expandFocusRef.current = true` set at both `setExpanded(true)` call sites, and an imperative `ref` callback on the collapsed-view `itemWindow` div that sets/removes the `inert` attribute based on `isActive`.
- `frontend/src/components/ui/FocalCarousel.test.tsx` - `jest-axe`'s `axe` import; two new tests asserting `inert` attribute presence/absence per slide (default state and after navigating to the second slide); the pre-existing expand/collapse regression test extended to assert focus lands on the "Weniger anzeigen" button after expanding; a new `describe('FocalCarousel accessibility', ...)` block with three axe assertions.

## Decisions Made
- **[Rule 1 - Bug] `inert` prop does not work declaratively in this repo's exact React version.** The plan's `<interfaces>` section assumed `inert={!isActive}` would "forward the `inert` DOM attribute on host elements" in React 18.3. A direct runtime probe (inside the `team4sv30-frontend` container) showed react-dom@18.3.1 does not have `inert` registered in its internal DOM-property config -- it treats the prop as an unrecognized non-boolean attribute, logs a dev warning ("Received `true`/`false` for a non-boolean attribute `inert`"), and never sets the attribute for either `true` or `false`. Fixed by setting/removing the attribute imperatively via a ref callback (`node.setAttribute('inert', '')` / `node.removeAttribute('inert')`), which works correctly in real browsers and in jsdom alike. TypeScript itself does have an `inert?: boolean` type available (surfaced via `@types/react/experimental.d.ts` through this repo's `jsx: react-jsx` + `moduleResolution: bundler` config), so the type-level mismatch between "TS says this compiles" and "React actually renders nothing" made this easy to miss without an explicit runtime check -- documented as a `tech-stack.patterns` entry for future consumers of `inert` elsewhere in the codebase.
- **[Rule 1 - Bug, test-tooling] Tab-order reachability tested via attribute-presence proxy, per the plan's own fallback.** `@testing-library/user-event` is not installed in this repo (`frontend/package.json` has no `@testing-library/user-event` devDependency), and a direct jsdom probe confirmed jsdom@26.1.0 does not implement `inert`'s focus/tab-blocking behavior (`element.focus()` on an element inside an `inert` ancestor still succeeds and moves `document.activeElement`, both via the IDL property and via `setAttribute`). Per the plan's explicit fallback instruction ("if it does not, assert the `inert` attribute presence directly as the behavioral proxy instead"), the reachability tests assert `hasAttribute('inert')` on each non-active slide rather than attempting `userEvent.tab()` traversal. No new package was installed (per the RULE 3 exclusion on package-manager installs requiring a checkpoint) since the plan's own fallback path made an install unnecessary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Declarative `inert={!isActive}` silently no-ops under react-dom@18.3.1; replaced with an imperative ref callback**
- **Found during:** Task 1, first `npx vitest run` after implementing the plan's literal `<interfaces>` snippet
- **Issue:** `hasAttribute('inert')` was `false` for both active and non-active slides; a runtime probe confirmed react-dom@18.3.1 never forwards the `inert` attribute to the DOM regardless of the boolean value passed, only logging a dev warning.
- **Fix:** Replaced the JSX `inert={!isActive}` prop with a `ref` callback on the `itemWindow` div that calls `node.setAttribute('inert', '')` (non-active) or `node.removeAttribute('inert')` (active).
- **Files modified:** `frontend/src/components/ui/FocalCarousel.tsx`
- **Verification:** `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/ui/FocalCarousel.test.tsx"` -- inert-attribute tests pass; `npm run typecheck` and `npx eslint` clean for both changed files.
- **Committed in:** `61678250` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking -- the plan's own literal interface snippet would not have satisfied its own acceptance criteria). No scope creep: the fix stays entirely within `FocalCarousel.tsx`'s `itemWindow` rendering, the exact code region the plan targeted.

## Issues Encountered
- **Package-manager scope check:** `@testing-library/user-event` is not installed. No install was attempted -- the plan's own documented fallback (assert `inert` attribute presence directly) made this unnecessary, and per the RULE 3 exclusion any new package install would have required a `checkpoint:human-verify` gate regardless.
- **Pre-existing unrelated failure surfaced while running the broader consumer test suite** (`src/app/members/[slug]/page.test.tsx`): a source-string assertion still expects `<Card className={styles.familyCard} ...>` in `MemberBadgeChain.tsx`, but Plan 133-04 already renamed that import alias to `chainStyles` (`MemberBadgeChain.tsx:322` reads `chainStyles.familyCard`). Confirmed via `git status`/`git log` that `MemberBadgeChain.tsx` is untouched by this plan and the mismatch predates it (last touched by Plan 133-04's commit `962a0e30`). Logged to `deferred-items.md`, not fixed (out of this plan's scope).
- **Pre-existing `MemberBadgeChain.test.tsx` failures (5) and `ResponsiveImage.config.test.ts`/`MembershipsSection.test.tsx` failures** already logged in `deferred-items.md` remain unchanged -- re-ran `MemberBadgeChain.test.tsx` in isolation and confirmed the exact same 5 test names fail, none newly introduced.
- **`FocalCarousel.tsx` file size:** already 485 lines (over CLAUDE.md's 450-line cap) before this plan started (per the plan's own objective text, which explicitly cites "the current 485-line file"); this plan's changes bring it to 523 lines. Consistent with the existing Phase 133 precedent for `MemberBadgeChain.tsx` (928 lines, STATE.md decision log), this pre-existing-and-growing debt is not addressed here -- the plan's scope was strictly the two documented a11y gaps, not a file split, and no later Phase 133 plan currently claims ownership of splitting `FocalCarousel.tsx`. Flagged here for awareness; not auto-fixed (Rule 4 territory -- a file split is an architectural change out of this plan's authority).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `FocalCarousel` is now a second (after `MemberStatusPill.test.tsx`, Plan 133-01) real consumer of the shared jest-axe setup, further validating the pattern for Plan 133-06 (memorial-hero heading fix) and Plan 133-11 (evidence gate).
- The `inert`-via-ref-callback pattern and the react-dom@18.3.1 boolean-`inert` gap are documented in this summary's `tech-stack.patterns` for any future component that needs `inert` semantics in this codebase.
- `FocalCarousel.tsx`'s pre-existing 450-line-cap overage (now 523 lines) is flagged but not actioned; a future cleanup plan should consider whether to split it alongside the already-deferred `MemberBadgeChain.tsx`.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`frontend/src/components/ui/FocalCarousel.tsx` and `frontend/src/components/ui/FocalCarousel.test.tsx` both exist and are committed. Commits `61678250` and `6cbca00b` verified present in `git log --oneline`. `npx vitest run src/components/ui/FocalCarousel.test.tsx` shows 29/29 passing (in-container). `npm run typecheck` and `npx eslint` show zero errors/warnings attributable to either changed file; only pre-existing, unrelated errors remain elsewhere in the repo.
