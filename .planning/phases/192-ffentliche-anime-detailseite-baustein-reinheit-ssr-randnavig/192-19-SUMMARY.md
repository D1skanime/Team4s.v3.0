---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 19
subsystem: ui
tags: [storybook, design-tokens, react, css-custom-properties, accordion]

# Dependency graph
requires:
  - phase: 192-10
    provides: "the --space-*/--split-layout-*/effects.css purpose-named tokens that this plan's classifier now recognizes as the Zweck-Werte-Stufe"
  - phase: 192-18
    provides: "the Grundlagen/Effekte showcase page this plan links to instead of re-rendering effect previews"
provides:
  - "classifyToken()/isVarReference()/resolveVarReferenceName() in designTokens.ts -- a reusable, fully-automatic foundation/purpose/component tier classifier for any future design-token consumer"
  - "Grundlagen/Design-Tokens Storybook page reorganized into three visually distinct tiers instead of one flat alphabetical dump of 549 values"
affects: [design-system-documentation, storybook-grundlagen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Token-tier classification is driven entirely by name-family prefix + remaining name segments -- no hand-maintained per-token list, consistent with the existing automatic-scan philosophy of designTokens.ts"
    - "Accordion panels that must stay in the DOM for a completeness/audit guarantee while still being visually collapsed use keepMountedIds (hidden attribute) instead of the default unmount-when-closed behavior"

key-files:
  created: []
  modified:
    - frontend/src/lib/designTokens.ts
    - frontend/src/lib/designTokens.test.ts
    - frontend/src/components/showcases/DesignTokensShowcase.tsx
    - frontend/src/components/showcases/DesignTokensShowcase.module.css
    - frontend/src/components/showcases/DesignTokensShowcase.stories.tsx
    - frontend/src/components/showcases/DesignTokensShowcase.test.tsx

key-decisions:
  - "Foundation-family membership is a small, explicit set {color, space, radius, shadow, font} -- every other name-family (card, button, avatar, banner, linkchip, ...) is entirely 'component' tier, even if some of its members are effects.css recipes or legacy color aliases, because splitting those families further would require per-token special-casing the plan explicitly warns against"
  - "The five effects.css recipe token groups (banner-backdrop-*, linkchip-glass-*/-scrim-*, button-chip-glass-*, badge-onmedia-*) render in Tier 3 (Bausteinwerte) alongside their sibling component tokens, not in Tier 2 -- Tier 1 additionally gets one static link-out card to 'Grundlagen/Effekte' instead of re-deriving effect previews, satisfying both 'every token appears somewhere' and the human's explicit effects-reference request without duplicating 192-18's work"
  - "Purpose-tier sentences are generated generically from the token's own name (humanized name-tail), not from real authored CSS comments -- document.styleSheets' CSSOM strips comments when parsing, so the browser-side showcase has no technical access to the real comments in layout.css/effects.css even though the Node test world (reading raw file text) does; inventing a comment-reading path only the showcase could never actually traverse would have been misleading"
  - "Collapsed Accordion groups in Tier 3 use Accordion's keepMountedIds (not the default unmount-on-close) so every component-tier token stays present in the DOM -- test-verifiable and consistent with the plan's 'every token still appears' truth -- while remaining visually collapsed via the hidden attribute"

requirements-completed: [Befund-28]

duration: ~55min
completed: 2026-11-04
---

# Phase 192 Plan 19: Grundlagen/Design-Tokens dreistufig neu gliedern Summary

**Added a fully-automatic foundation/purpose/component token classifier to `designTokens.ts` and rebuilt the Storybook "Grundlagen/Design-Tokens" page around it -- replacing one flat, alphabetically sorted 549-value dump with three distinct tiers (Grundskala with real previews, Zweck-Werte with back-references, collapsed-by-default Bausteinwerte with raw-literal markers).**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `classifyToken(token, groupKey)` sorts every scanned CSS custom property into `'foundation' | 'purpose' | 'component'` purely from its existing name-family prefix and the name segments after it -- verified against the human's exact calibration examples (`--space-3`/`--radius-sm` foundation, `--space-section`/`--radius-surface` purpose) plus a full real-sample run against the actual `globals.css` (37 foundation, 10 purpose, 502 component out of 549 total)
- `isVarReference()`/`resolveVarReferenceName()` detect whether a declared value is a `var()` reference vs. a raw literal, powering both the purpose-tier back-reference and the component-tier raw-literal marker
- `GROUP_LABELS` extended with explicit German names for `card`/`button`/`focal`/`split`/`disclosure`/`adjacent`/`date`/`empty` groups (e.g. "Zwei-Spalten-Raster" for `split`, "Aufklapp-Kopfzeile" for `disclosure`, "Nebeneinander" for `adjacent`)
- `DesignTokensShowcase.tsx` rebuilt around three tiers: Grundskala (color swatch / sized space bar / rounded corner box / shadow box / font sample previews, plus a static link-out card to "Grundlagen/Effekte"), Zweck-Werte (flat list, each with a generic German sentence and a `-> value (--ref-name)` back-reference), Bausteinwerte (46 component groups in a collapsed-by-default `Accordion`, each raw-literal value marked with a `Badge variant="warning"`)
- Every one of the 549 scanned tokens still renders somewhere on the page (proven by an updated completeness test comparing the rendered `<code>` name set against an independent regex count of the real `globals.css`)
- All Autodocs-visible description copy rewritten jargon-free (no "CSS-Custom-Properties"/"domänenspezifische Komposition")

## Task Commits

1. **Task 1: Add the three-tier classification function to designTokens.ts** - `06bbad7de` (feat)
2. **Task 2: Rebuild the Storybook page around the three tiers** - (see below, committed together with the processHistory regression fix)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `frontend/src/lib/designTokens.ts` - adds `TokenTier`, `FOUNDATION_GROUP_KEYS`, `classifyToken()`, `isVarReference()`, `resolveVarReferenceName()`; extends `GROUP_LABELS`
- `frontend/src/lib/designTokens.test.ts` - calibration tests for `classifyToken` and the var()-reference helpers
- `frontend/src/components/showcases/DesignTokensShowcase.tsx` - rebuilt around the three tiers (284 lines, no split needed)
- `frontend/src/components/showcases/DesignTokensShowcase.module.css` - layout classes for the new foundation preview shapes, purpose list, and component accordion rows
- `frontend/src/components/showcases/DesignTokensShowcase.stories.tsx` - jargon-free, three-tier-aware Autodocs description
- `frontend/src/components/showcases/DesignTokensShowcase.test.tsx` - tier-order, foundation-preview, purpose-back-reference, collapsed-but-mounted, and jargon-absence assertions

## Decisions Made
See `key-decisions` in frontmatter above for the four substantive design calls (foundation-family scope, effects.css placement, generic vs. comment-derived purpose sentences, keepMountedIds for completeness).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed a "Befund 28" planning reference from the new Storybook meta description**
- **Found during:** Task 2 verification (full project test suite)
- **Issue:** The rebuilt `DesignTokensShowcase.stories.tsx` meta description included `(Befund 28)` as a parenthetical tag. `processHistory.regression.test.ts` repo-wide guards every `.stories.tsx` file against exactly this kind of planning-round reference (`Befund\s*\d+` is one of its forbidden patterns) -- it failed with `components/showcases/DesignTokensShowcase.stories.tsx: Story-Datei enthält keinen Auftrags-/Planungs-Verweis`.
- **Fix:** Rewrote the sentence to describe the three-tier structure without the parenthetical finding-number tag.
- **Files modified:** `frontend/src/components/showcases/DesignTokensShowcase.stories.tsx`
- **Verification:** `npx vitest run src/components/ui/processHistory.regression.test.ts` -- 237/237 passed.
- **Committed in:** same commit as Task 2's main change (this is a pre-commit fix, not a separate commit).

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope creep -- a wording-only correction to satisfy an existing repo-wide regression guard, discovered before the Task 2 commit landed.

## Issues Encountered
- Running the full frontend test suite directly on the host (outside the `team4sv30-frontend` Docker container) produced 2 additional failures: `ResponsiveImage.config.test.ts` (already a known, documented pre-existing host-environment failure, see `192-02`'s entry in `deferred-items.md`) and `RoleCapabilityDetail.membershipBaselineDrift.test.ts` (reads `/backend/internal/permissions/*.go` via a Docker-only bind mount that does not exist on the bare host). Re-ran the full suite inside `team4sv30-frontend` via `docker compose exec` -- both passed there, confirming these are host-vs-container execution artifacts, not regressions caused by this plan.
- The full suite re-run inside Docker (accidentally run twice concurrently in the same container due to an earlier duplicated background command) showed 2 failures on that pass: `src/app/admin/fansubs/[id]/edit/page.test.tsx` (unrelated file, last touched by a pre-phase-192 commit) re-ran clean in isolation (37/37) -- a resource-contention flake from the accidental double concurrent run, not a real regression. `src/lib/cssCustomProperties.guard.test.ts` failed reproducibly even in isolation, but flags `var(--space-N)` inside a JSDoc comment at `components/ui/Card.tsx:41` (a prose description of a generic mapping pattern, not real CSS) -- `Card.tsx` was last touched by Plan 192-11, not by this plan, and is unrelated to any file in this plan's `files_modified`. Logged as a new deferred item under `192-11` in `deferred-items.md` per the scope-boundary rule rather than fixed here.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund 28 is closed: "Grundlagen/Design-Tokens" now shows three distinct, correctly populated tiers with every token still reachable, jargon-free copy, and the component tier collapsed by default with raw-literal values marked (not fixed, per the explicit "marking only" scope of this plan).
- The remaining Runde-3-Gap-Closure plans (A/B/C/D, the visual regression fix, and the final cross-plan verification) are independent of this plan per the `192-CONTEXT.md` "Reihenfolge Runde 3" ordering and are unaffected by this change.
- Live-UAT of the new three-tier page (visual confirmation of the preview shapes, the collapsed Accordion, and the "Grundlagen/Effekte" link) is still outstanding and belongs to this round's closing verification pass, not this plan individually.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 6 modified source files plus this SUMMARY.md and the updated `deferred-items.md` verified present on disk; both task commits (`06bbad7de`, `d66e11d26`) verified present in `git log`.
