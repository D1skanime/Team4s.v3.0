# Quick Task 261105-ds2: Phase-192-Review Befunde 3 — Research

**Researched:** 2026-11-05
**Domain:** React/Next.js frontend test patterns, CSS layout primitives (Cluster/Button), regression-guard test scoping
**Confidence:** HIGH (all claims below verified by direct file reads and grep against the actual repo state, not training knowledge)

## Summary

CONTEXT.md's technical grounding for Befund 1 and Befund 2 is accurate and directly actionable —
both the `elements()` test pattern and the `Cluster align="stretch"` / new `Button` prop plan match
the real code exactly as described. Befund 3's file list and comment examples are also accurate.

**The one place CONTEXT.md needs course-correction:** its literal instruction for the new
`processHistory.regression.test.ts` describe-block — "reuse the existing `FORBIDDEN_PATTERNS`
list verbatim, just widen the file scope to the four directories" — would cause a massive,
unintended scope explosion if implemented literally. Grep evidence below shows the existing
pattern list (which includes `D-Kennung`, `Quick-Task-Verweis`, generic `Phase\s*\d+`, generic
`Plan\s*\d+-\d+`) hits 30-150+ files per pattern across these four directories, nearly all of which
belong to **other, already-completed phases** (105, 122, 155, 157, 163, 177, 191, quick-261022,
quick-260920) that this quick task must not touch. The planner should use a Phase-192-specific
pattern subset plus an explicit file allowlist (mirroring `compositeLayoutPurity.guard.test.ts`'s
own `GUARDED_COMPOSITE_FILES` pattern), not a directory-recursive generic scan.

**Primary recommendation:** Implement Befund 1 and Befund 2 exactly as CONTEXT.md describes (both
verified below). For Befund 3's guard extension, scope it to an explicit file list, not a directory
walk with the full existing pattern array.

## Phase Requirements

No formal REQUIREMENTS.md IDs apply — this is a quick task fixing three review findings against
already-completed Phase 192 work. CONTEXT.md's three "Befund" sections are the requirement units.

## Befund 1 — `elements()` tree-walker pattern (VERIFIED)

Two existing implementations of the "call component as plain function, walk the tree" pattern:

**`frontend/src/app/anime/[id]/AnimeDetailView.test.tsx`** (lines 1-25) — the simpler, correct
template for this task (no special-casing needed since the new component is a plain leaf):

```ts
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    return [child, ...elements(child.props.children as ReactNode)]
  })
}
// usage:
const content = AnimeDetailView({ ...props })
const all = elements(content)
const banner = all.find((item) => item.type === BannerSection)
expect(banner?.props.imageUrl).toBe(expected)
```

**`frontend/src/app/anime/[id]/page.test.tsx`** (lines 104-118) has a more elaborate variant that
special-cases components whose children arrive via named props instead of `.props.children`
(`SplitLayout`, `AnimeDetailHero`, `AnimeEpisodesSection`) by calling them as functions inline.
**Not needed here** — confirmed `Card.tsx` renders `{children}` normally (line 193 of `Card.tsx`),
and `Cluster`/`Stack`/`ResponsiveImage`/`Text` all take ordinary children too, so the plain
`AnimeDetailView.test.tsx` variant is the correct, simpler template to copy for the new
`AnimeEdgeNavigationPreviewCard` test.

**The fireEvent test to remove** is exactly `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx`
lines 147-170 (describe block: `'AnimeEdgeNavigation -- Runde 5: ...'`, single `it(...)`). Confirmed
line range and content match CONTEXT.md's claim exactly. The correct, already-compliant `renderHook`
test (lines 68-89) is untouched.

**Extraction target:** `AnimeEdgeNavigationContext`'s preview-card JSX lives at
`frontend/src/components/anime/AnimeEdgeNavigation.tsx` lines 96-117 (the `{previewAnime ? (<Card
variant="glassStrong" ...>...) : null}` block). It currently closes over `hoverDirection`,
`previewAnime`, and `previewCoverUrl` from the enclosing scope — extracting it into a named,
exported pure function component needs these as explicit props (e.g. `title: string`, `type: string`,
`coverUrl: string | null`, `direction: EdgeNavigationDirection`, and a `className`-equivalent for
the left/right positioning, since `hoverDirection === 'prev' ? styles.previewLeft : styles.previewRight`
is also closure-derived).

**Overlap confirmed:** Lines 129-133 of `AnimeEdgeNavigation.test.tsx` (the block comment just above
the `.previewCover`/`.previewCard` CSS test) contain the literal string `Runde 5, Befund-Review2-R2
(192-32)` — this must be reworded in the same pass per Befund 3, consistent with CONTEXT.md's note
that Befund 1 and Befund 3 overlap on this file.

## Befund 2 — Cluster `align="stretch"` + new Button prop (VERIFIED)

**`Cluster.tsx`** (`frontend/src/components/ui/Cluster.tsx`) already has `align?: 'start' | 'center'
| 'end' | 'baseline' | 'stretch'` (line 72), default `'center'` (line 130). It is forwarded to CSS as
`'--cluster-align': align` (line 145).

**`Cluster.module.css`** line 6: `.cluster { ... align-items: var(--cluster-align, center); ... }`.
The `.collapsibleMd` class (lines 25-28) only sets `flex-direction: column` for `<768px` (no own
`align-items` override) and reverts to `flex-direction: row` at `@container cluster (min-width:
48rem)` (lines 30-35) — so `align="stretch"` on the outer Cluster applies uniformly in both states:
cross-axis is width when stacked (mobile) and height when in a row (desktop). This exactly matches
CONTEXT.md's claim — confirmed by reading the actual CSS, not inferred.

**`ReleasePreviewRow.tsx`** (lines 85-133): the outer `<Cluster collapseBelow="md" gap="contentPair"
gapCollapsed="independentBlocks" justify="between" className={styles.row}>` currently has **no**
`align` prop (so it defaults to `'center'`) — confirmed exactly as CONTEXT.md states. The `<div
className={styles.action}>` wrapper (lines 123-131) wraps a single `Button`.

**`ReleasePreviewRow.module.css`** (full file read) confirms CONTEXT.md's claim precisely —
**two** separate `width` declaration sites need removing, not one:
- `.body { min-width: 0; width: 100%; }` (lines 22-25, base) — has its own explanatory comment
  about Cluster not defaulting to stretch.
- `.action, .action > a, .action > button { width: 100%; }` (lines 76-80, base) +
  `@media (min-width: 768px) { .action { flex-shrink: 0; width: auto; } .action > a, .action >
  button { width: auto; } }` (lines 91-99).

After the fix, `.body`'s `width: 100%` goes away too (replaced by the outer Cluster's
`align="stretch"`), and `.action`'s width rules go away (replaced by a new Button prop). The
`min-width: 0`/`flex: 1`/`flex-shrink: 0` declarations are unaffected (not `width`/`height`
literals, not flagged by the guard either way) and should stay.

**Button.tsx** (full file read) — exact shape to mirror for the new prop:
```ts
// CommonButtonProps (line 28-40):
fullWidth?: boolean
responsiveFullWidth?: boolean
// destructure+default (line 57-71):
fullWidth = false,
responsiveFullWidth = false,
// classNames call (line 96-97):
fullWidth && styles.buttonBlock,
responsiveFullWidth && styles.buttonResponsiveBlock,
```
**Button.module.css** (lines 333-345) — exact existing CSS shape to mirror, confirming the
breakpoint direction CONTEXT.md describes:
```css
.buttonBlock { width: 100%; }
.buttonResponsiveBlock { width: 100%; }
@media (max-width: 767px) {
  .buttonResponsiveBlock { width: auto; }
}
```
So `responsiveFullWidth` = 100% by default, `auto` only below 768px (confirmed, matches
`WatchlistAddButton.tsx` line 61's usage — grep-confirmed as the only non-test consumer, must not
be touched). The new `fullWidthBelowMd` prop is the literal inverse:
```css
.buttonFullWidthBelowMd { width: auto; }
@media (max-width: 767px) {
  .buttonFullWidthBelowMd { width: 100%; }
}
```
This uses the identical `767px`/`768px` breakpoint pair that `Cluster`'s `collapseBelow="md"` and
`responsiveFullWidth` both already use, so all three mechanisms flip at the same viewport width —
no new breakpoint constant needed.

**Button.stories.tsx — confirmed: no existing `responsiveFullWidth` story.** Grepped all story
export names; none reference `responsiveFullWidth` or a resize demo. CONTEXT.md's fallback path
applies: model the new `fullWidthBelowMd` story on `Cluster.stories.tsx`'s `HaltepunktUmkehr` story
pattern instead (lines 219-248 of `Cluster.stories.tsx`), which uses a `resize: horizontal` wrapper
`<div>` decorator so users can drag the frame narrower/wider than 768px to see the live flip. Copy
that decorator shape for the new Button story.

**`compositeLayoutPurity.guard.test.ts`** (full file read) — exact function to edit:
```ts
// line 153-156:
function isSizeResetValue(value: string): boolean {
  if (['100%', 'auto', '0', '0px', 'min-content', 'max-content'].includes(value)) return true
  return /^var\(--[\w-]+\)$/.test(value)
}
```
Removing `'100%'` from this array is the entire fix — the other four literal exemptions
(`'auto'`/`'0'`/`'0px'`/`'min-content'`/`'max-content'`) and the `var(...)` regex branch are
untouched, exactly as CONTEXT.md specifies.

**IMPORTANT — a currently-passing self-test will break and needs updating in the same commit:**
the test at lines 372-410 (`'erkennt reine Null-/Transparenz-Rücksetzer (...) NICHT als Verstoß'`)
has a `.sizeReset { width: 100%; height: auto; ... }` sample (lines 401-406) asserting **zero**
violations. Once `'100%'` is removed from the exempt list, this sample's `width: 100%` will become
a real `width-height` violation, and the test will fail. The planner must either change the sample
to a still-exempt value (e.g. drop the `width: 100%;` line, keep `height: auto;`) or add a new,
separate assertion confirming `width: 100%` **is now flagged** as a violation (mirroring the
`'erfasst das historische Verstoßmuster'` test's `.fixed { width: 260px; }` pattern). Not mentioned
in CONTEXT.md — this is a verified gap.

After the fix, the main "zero violations across all 9 guarded files" assertion (lines 300-309) must
stay green with the **empty** exception list — i.e., `ReleasePreviewRow.module.css` must have zero
remaining `width:`/`height:` literal declarations once Befund 2's CSS changes land, confirmed above
(the only two `width` sites in the file are exactly the two the fix removes).

## Befund 3 — Comment sweep + guard extension

### File list and example comments (VERIFIED, representative sample)

Spot-checked 10 of the 46 files (prioritizing ones outside Befund 1/2's direct edits). All contain
genuine planning-artifact references exactly as CONTEXT.md describes, e.g.:

- `AnimeDetailHero.module.css` line 1: `"Vor Befund 21/22"`; line 9: `"(Befund B, 192-13)"`;
  line 25: `"seit Befund B (192-13)"`; line 113: `"(Befund B, Runde 3, 192-15)"`.
- `animeFixtures.ts` line 20: `"siehe 192-12-SUMMARY.md"`.
- `gapPurposeNaming.guard.test.ts` line 10: `"Stand Runde 5: acht Dateien"`; line 24: `"Review-Befund 2 (Phase 192, vierte Gap-Closure-Runde)"`.
- `Pagination.test.tsx`: `"Befund 25"` appears **inside test description strings**, not just
  comments (lines 10, 51, 62, 218, 250) — e.g. `it('... statt Klick-Simulation, Befund 25)')`.
- `Stack.tsx` line 10: `"(Befund D, Runde 3 ...)"`.
- `designTokens.ts` lines 61/139/191: `"Befund 28 (Runde 3, 2026-11-04)"`.
- `layout.css`: five long comments referencing `"Befund D, Runde 3"`, `"Review-Befund 1, vierte
  Gap-Closure-Runde"`, `"fünfte Gap-Closure-Runde"`.

**Scale estimate (answering the "~50 vs ~200 edits" question):** counted distinct hits of the
narrow Befund-3 pattern set (`Befund[- ]?\d+`, `Runde\s*\d+`, `Plan\s*192-\d+`,
`192-\d+-(SUMMARY|PLAN|RESEARCH)`, `Phase\s*192\b`) across exactly the 46 listed files:
**114 total hits, averaging ~2.5 per file** (range 1-9 per file; `FansubVersionBrowser.test.tsx`
and `WatchlistAddButton.test.tsx` are the densest at 9 and 8 respectively). This is a sweep of
~110-120 small text edits across 46 files, not a ~200-edit undertaking — closer to the lower
estimate in the task framing, and well within a single quick-task pass.

### Guard extension — CRITICAL course-correction needed

`processHistory.regression.test.ts` (full file read) currently has:
```ts
const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'UAT-Runde-Verweis', regex: /UAT-Runde\s*\d+/g },
  { name: 'Befund-Nummer', regex: /Befund\s*\d+/g },
  { name: 'Quick-Task-Verweis', regex: /Quick-Task\s*\d+|quick-\d{6}/g },
  { name: 'Plan-Dateiverweis', regex: /Plan\s*\d+-\d+/g },
  { name: 'Phasen-Nummer', regex: /Phase\s*\d+/g },
  { name: 'D-Kennung', regex: /\bD-\d{2}\b/g },
  { name: 'In-App-Showcase-Jargon', regex: /In-App-Showcase/g },
  { name: 'Live-UAT-follow-up-Verweis', regex: /Live-UAT[\s/-]*follow-up/gi },
  { name: 'Code-Review-finding-Verweis', regex: /code-review finding/gi },
]
function findHits(filePath: string, content: string): string[] { /* iterates patterns, content.match(regex) */ }
function listFilesRecursive(dir: string, extensions: string[]): string[] { /* recursive fs walk */ }
```
Two existing describe blocks: (1) `components/ui` **direct files only** (non-recursive
`fs.readdirSync` + filter, excludes `.test.ts(x)`), (2) **all** `.stories.tsx` files **repo-wide**
via `listFilesRecursive(SRC_DIR, ...)`.

CONTEXT.md's decision says the new third block should "reuse the same existing
`FORBIDDEN_PATTERNS`/`findHits`, extend only the file scope" to the four directories, including
`.test.ts(x)`/`.module.css` this time. **Verified by grep — this will NOT work as a direct
widening** without also narrowing the pattern set and the file list, because:

1. **These four directories are not Phase-192-exclusive.** Direct-file grep (non-recursive, same
   depth as the `components/ui` block) using the *existing* generic patterns hits dozens of files
   that are **not** in the 46-file Phase-192 list and belong to other, separately-completed phases:
   `components/fansubs/useFansubGroupSwitch.ts` (10 hits), `useWindowedEpisodePages.ts`
   (`"Quick-Task 260920"`, 10 hits), `FansubVersionBrowser.filterSwitch.test.tsx`/`.groupSwitch.test.tsx`/
   `.windowing.test.tsx` (6/9/5 hits), `FansubMediaLightbox.tsx` (8 hits), `MediaViewerCaption.tsx`
   (4 hits), `ReleaseVersionBreakdown.tsx` (components/anime, 2 hits), and `app/anime/[id]/page.test.tsx`
   alone has **26** `D-\d{2}` hits (test-description tags like `D-16`, `D-04`, `D-11`, `D-20`, most
   from *other* phases' requirement IDs, e.g. `"162 D-02/163 D-11"`). Recursing into subdirectories
   (`app/anime/[id]/group/...`, `components/fansubs/projectMember/`, `components/fansubs/__tests__/`)
   would additionally pull in Phase 105/122/155/157/177/191 files (`ThemeTimeline.test.tsx` → "Phase
   105", `ProjectMemberRoutingRegression.test.tsx` → "Phase 122", `ReleaseDetailHero.tsx` → "Plan
   191-35", `projectPageData.test.ts` → "Plan 155-04").
2. **`D-Kennung` (`\bD-\d{2}\b`) and `Quick-Task-Verweis` are a codebase-wide requirement-tagging
   convention**, not a Phase-192-specific planning leak — CONTEXT.md's own Befund-3 investigation
   deliberately used a *narrower* pattern set (`Befund[- ]?\d+`, `Runde \d+`, `Plan 192-\d+`,
   `192-\d+-(SUMMARY|PLAN|RESEARCH)`, `Phase 192\b`) that does **not** include `D-\d{2}` or
   `Quick-Task` at all — those patterns exist in the *regression guard* for a different, broader
   purpose (components/ui primitives and repo-wide `.stories.tsx` hygiene) and were never meant to
   certify "no D-XX tags anywhere."

**Recommendation for the planner:** do not reuse the full `FORBIDDEN_PATTERNS` array or a directory
walk for the new describe block. Instead:
- Scope the new block to an **explicit file allowlist** — the 46 files from CONTEXT.md (minus the
  Befund-1/2 files already fixed inline, if desired, though re-checking them is harmless), mirroring
  `compositeLayoutPurity.guard.test.ts`'s `GUARDED_COMPOSITE_FILES` constant-array pattern rather
  than `fs.readdirSync`/`listFilesRecursive`.
- Reuse `findHits` and only the Phase-192-relevant subset of patterns (`Befund-Nummer`,
  `Plan-Dateiverweis` restricted to `192-\d+` via a new regex, `Phasen-Nummer` restricted to `192`),
  or add two new pattern entries (`Runde\s*\d+`, `192-\d+-(SUMMARY|PLAN|RESEARCH)`) to a **separate,
  smaller** array used only by this third block — not the shared array consumed by the other two
  blocks (which must keep their current, intentionally broad scope for `components/ui` and
  `.stories.tsx`).
- This keeps the guard genuinely "permanent" for Phase 192's specific pilot files without an
  unbounded, cross-phase scope explosion that would turn a quick task into a multi-phase cleanup.

Confirmed by direct listing: all 46 files in CONTEXT.md's list sit **directly** inside the four
named directories (no file is in a nested subdirectory like `group/`, `projectMember/`,
`__tests__/`) — so an explicit allowlist is a clean, exact match for the stated scope, with no
coincidental omissions.

## Common Pitfalls

### Pitfall 1: Literal reuse of `FORBIDDEN_PATTERNS` breaks far outside the 46-file scope
**What goes wrong:** Running the new describe block with the existing pattern array over a
directory walk (recursive or not) fails on dozens of unrelated files from other phases.
**Why it happens:** `D-Kennung`/`Quick-Task-Verweis`/generic `Phase\s*\d+`/`Plan\s*\d+-\d+` are
intentionally broad, codebase-wide conventions, not Phase-192-specific leaks.
**How to avoid:** Explicit file allowlist + Phase-192-scoped pattern subset (see above).
**Warning signs:** Running the new test block for the first time produces failures in files not on
the 46-file list.

### Pitfall 2: Forgetting the now-outdated `isSizeResetValue` self-test sample
**What goes wrong:** After removing `'100%'` from the exempt list, the pre-existing
`.sizeReset { width: 100%; ... }` self-test sample (lines 401-406) starts failing, unrelated to the
real `ReleasePreviewRow.module.css` fix, and looks like a regression if not anticipated.
**How to avoid:** Update that sample in the same commit as the `isSizeResetValue` edit.

## Code Examples

### New Button CSS modifier (mirrors `.buttonResponsiveBlock`, inverted breakpoint)
```css
/* Source: frontend/src/components/ui/Button.module.css lines 333-345 (existing pattern) */
.buttonFullWidthBelowMd {
  width: auto;
}

@media (max-width: 767px) {
  .buttonFullWidthBelowMd {
    width: 100%;
  }
}
```

### `isSizeResetValue` after Befund 2's fix
```ts
// Source: frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts lines 153-156
function isSizeResetValue(value: string): boolean {
  if (['auto', '0', '0px', 'min-content', 'max-content'].includes(value)) return true
  return /^var\(--[\w-]+\)$/.test(value)
}
```

## Open Questions

1. **Should Befund-3's rewording also touch test-description strings (e.g. `Pagination.test.tsx`'s
   `it('..., Befund 25)')`), or only comments?**
   - What we know: CONTEXT.md's decision text says "Jede Fundstelle wird umformuliert" (every
     finding, no distinction between comment and string literal).
   - What's unclear: whether rewording a test's human-readable name changes its meaning/searchability
     for future debugging.
   - Recommendation: reword test description strings too (drop the parenthetical `Befund NN`
     suffix, keep the substantive explanation before it) — consistent with "pure domain explanation,
     no planning references," and consistent with how `AnimeEdgeNavigation.test.tsx`'s own
     `renderHook` test name already does this correctly ("...Befund C" appears only as a trailing
     aside, could be dropped the same way).

2. **Exact prop surface for `AnimeEdgeNavigationPreviewCard`.**
   - What we know: needs `previewAnime.title`, `previewAnime.type` (via `getTypeLabel`),
     `previewCoverUrl`, and `hoverDirection` (for left/right positioning class).
   - What's unclear: whether to pass `hoverDirection: EdgeNavigationDirection | null` directly or a
     pre-resolved boolean/className — CONTEXT.md leaves exact prop shape to implementation.
   - Recommendation: pass `direction: EdgeNavigationDirection` (non-null, since the component is
     only rendered when a direction is active) to keep the pure component's prop contract simple
     and directly testable via `elements()`.

## Sources

### Primary (HIGH confidence — all direct file reads/greps against the live repo)
- `frontend/src/app/anime/[id]/page.test.tsx` — `elements()`/`textContent()` pattern
- `frontend/src/app/anime/[id]/AnimeDetailView.test.tsx` — simpler `elements()` template
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` / `.test.tsx` — exact preview-card JSX and fireEvent test location
- `frontend/src/components/ui/Button.tsx` / `.module.css` / `.stories.tsx` — prop/CSS/story shape
- `frontend/src/components/ui/Cluster.tsx` / `.module.css` / `.stories.tsx` — `align` prop mechanics
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx` / `.module.css` — exact width declarations
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` — `isSizeResetValue` and self-tests
- `frontend/src/components/ui/processHistory.regression.test.ts` — `FORBIDDEN_PATTERNS`/`findHits`/`listFilesRecursive`
- `frontend/src/components/ui/Card.tsx` — confirms plain `{children}` rendering
- Grep counts across `app/anime/[id]`, `components/fansubs`, `components/anime`, `components/watchlist` (direct files and patterns, run in this session)

## Metadata

**Confidence breakdown:**
- Standard stack / patterns: HIGH — all verified by reading the actual source files, not inferred
- Guard-extension risk analysis: HIGH — based on exhaustive grep counts against the live repo, reproducible
- Open questions (prop shape, string-vs-comment scope): MEDIUM — reasonable implementation choices, not blocking

**Research date:** 2026-11-05
**Valid until:** Short-lived — tied to current Phase 192 code state; invalidated by any further edits to the files above before this quick task executes.
