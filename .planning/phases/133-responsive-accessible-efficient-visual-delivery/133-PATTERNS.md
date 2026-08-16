# Phase 133: Responsive, Accessible & Efficient Visual Delivery - Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 24
**Analogs found:** 22 / 24

This phase is "consolidate and cut, not add" (RESEARCH.md). Almost every new/modified file has
its analog IN THE SAME repo, often the very file being split. Treat `MemberBadgeChain.module.css`
and `FocalCarousel.{tsx,module.css}` as the two load-bearing analogs for nearly everything below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/profile/RoleBadgeCard.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` lines 596-2005 (role-card rules, source of extraction) + `FocalCarousel.module.css` (container-query reference) | exact (extraction + pattern) |
| `frontend/src/components/profile/BadgeChip.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` badge-row/chip rules (source of extraction) | exact |
| `frontend/src/components/profile/BadgeFamilyCard.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` `.familyCard*` rules (source of extraction) | exact |
| `frontend/src/components/profile/LayeredBadgeArtwork.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` `.roleArtwork*` rules (source of extraction) | exact |
| `frontend/src/components/profile/LockedStageArtwork.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` `.lockedStage*` rules (source of extraction) | exact |
| `frontend/src/components/profile/AnimeProjectStage.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` `.animeProject*` rules (source of extraction) | exact |
| `frontend/src/components/profile/PointsAchievementStage.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` `.points*` rules (source of extraction) | exact |
| `frontend/src/components/profile/ContributionAchievementStage.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` `.contribution*` rules (source of extraction) | exact |
| `frontend/src/components/profile/MembershipStage.module.css` (new) | component (CSS module) | transform | `MemberBadgeChain.module.css` `.membership*`/`.foundingMember*` rules (source of extraction) | exact |
| `frontend/src/components/profile/MemberBadgeChain.module.css` (modified — shrink to shell) | component (CSS module) | transform | itself (pre-split version) + `FocalCarousel.module.css` (container-query target shape) | exact |
| `frontend/src/components/profile/MemberBadgeChain.tsx` (modified — import wiring + 820px constant extraction) | component (React, client) | event-driven | itself; `FocalCarousel.tsx` for the "extract magic number to named constant" precedent | exact |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` (modified — split CSS readFileSync assertions) | test | transform | itself; `FocalCarousel.test.tsx` (same `readFileSync(cssPath)` assertion pattern) | exact |
| `frontend/src/components/ui/FocalCarousel.tsx` (modified — focus-on-expand, inert on inactive slides) | component (shared UI primitive, client) | event-driven | itself (`restoreFocusRef` collapse-focus pattern already implemented, lines 100-108, 379-385) | exact (self-analog) |
| `frontend/src/components/ui/FocalCarousel.module.css` (modified — no layout change expected, only if inert styling needed) | component (CSS module) | transform | itself | exact |
| `frontend/src/components/ui/FocalCarousel.test.tsx` (modified — add focus/inert/axe assertions) | test | event-driven | itself (existing `stubAnimationFrames`/RTL `userEvent` patterns) | exact |
| `frontend/src/components/profile/MemberProfileMemorialHero.tsx` (modified — single-h1 heading fix) | component (React, server) | request-response | `MemberProfileHero.tsx` lines 200-214 (existing correct single-`<h1>` public-view branch) | exact |
| `frontend/src/components/profile/profile.module.css` (modified — memorial hero reuses `.heroTitle`/`.heroEyebrow`, drop now-orphaned `.heroTitleRow` h2-only rule if unused elsewhere) | component (CSS module) | transform | itself (`.heroTitle`, `.heroEyebrow` already defined for the non-memorial branch) | exact |
| `frontend/src/components/profile/MemberProfileHero.test.tsx` (modified — add heading-count + axe assertions) | test | request-response | itself (existing RTL render + assertion structure) | exact |
| `frontend/next.config.mjs` (modified — gate `dangerouslyAllowLocalIP`) | config | transform | itself (existing `configuredApiMediaPatterns()` env-branching pattern, lines 7-19) | exact (self-analog) |
| `frontend/src/components/ui/ResponsiveImage.config.test.ts` (modified — add `dangerouslyAllowLocalIP` env-gate regression case) | test | transform | itself (existing `hasLocalMatch`/`hasRemoteMatch` assertions) | exact |
| `frontend/scripts/collect-member-profile-evidence.mjs` (modified — extend `LOCKED_BUDGETS`/`evaluateBudget()` with image-byte ceilings) | utility (Node script) | batch | itself (`LOCKED_BUDGETS.profiles[slug].initialProfile` payload-budget shape, lines 713-741; `evaluateBudget()`, lines 745-805) | exact (self-analog) |
| `frontend/scripts/verify-profile-image-delivery.mjs` (unchanged unless new variant fixtures are introduced) | utility (Node script) | batch | itself | exact — do NOT use for KB budgets (RESEARCH.md Pitfall 1) |
| `frontend/package.json` (modified — add `axe-core`, `jest-axe` devDependencies) | config | transform | itself (existing `devDependencies` block) | exact |
| `frontend/vitest.config.ts` (modified — add `setupFiles` for axe matcher registration) | config | transform | none in-repo (no `setupFiles` entry exists today) | no analog — see below |
| `frontend/src/test/axeSetup.ts` (new — registers `expect.extend(toHaveNoViolations)`) | utility (test setup) | transform | none in-repo (no test-setup file convention exists yet) | no analog — see below |

## Pattern Assignments

### CSS-module split targets (`RoleBadgeCard.module.css`, `BadgeChip.module.css`, `BadgeFamilyCard.module.css`, `LayeredBadgeArtwork.module.css`, `LockedStageArtwork.module.css`, `AnimeProjectStage.module.css`, `PointsAchievementStage.module.css`, `ContributionAchievementStage.module.css`, `MembershipStage.module.css`)

**Analog:** `frontend/src/components/profile/MemberBadgeChain.module.css` (2282 lines — the file being split) for content, `frontend/src/components/ui/FocalCarousel.module.css` (199 lines, 1 `@media` total) for the container-query shape every new module must converge to.

**Container-query pattern to copy** (`FocalCarousel.module.css` lines 1-7, 148-187):
```css
.root {
  display: grid;
  gap: 12px;
  min-width: 0;
  container: focal-carousel / inline-size;
  max-width: 100%;
}

@container focal-carousel (max-width: 480px) {
  .controls { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; }
}

@container focal-carousel (min-width: 1100px) {
  .track { --focal-item-size: min(60%, 720px); }
}

@media (prefers-reduced-motion: reduce) {
  .track { scroll-behavior: auto; }
  .itemWindow { transition: none; opacity: 1; filter: none; }
}
```
Rule: exactly one `@media` block total, reserved for `prefers-reduced-motion` — everything else in
every split module must be `@container`, scoped via its own `container: <name> / inline-size` on the
component's outermost wrapper. This is the target UI-SPEC.md's "Responsive strategy" contract locks.

**`.roleBadgeRow` / `.roleLabel` / `.roleHeroArtwork` duplicate-selector resolution (mandatory, for `RoleBadgeCard.module.css`)** — verified by direct read, three conflicting declarations for the same selector at widely separated lines:

```css
/* MemberBadgeChain.module.css line 596 (1st .roleLabel — DELETE) */
.roleLabel {
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;   /* overflow risk at 400% zoom — the reason to reject this variant */
}

/* MemberBadgeChain.module.css line 1358 (2nd .roleLabel — KEEP, per UI-SPEC.md canonical resolution) */
.roleLabel {
  justify-self: start;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
}
```

```css
/* MemberBadgeChain.module.css line 606 (1st .roleBadgeRow — DELETE, fixed min-height) */
.roleBadgeRow, .roleBadgeRowCompact {
  min-height: 420px;
  padding: 24px 8px;
  /* ... */
}

/* MemberBadgeChain.module.css line 1337 (2nd .roleBadgeRow — KEEP, flexible height) */
.roleBadgeRow {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  gap: 16px;
  padding: 32px 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--role-accent) 24%, transparent), transparent 34%),
    var(--surface-card);
}
```

```css
/* MemberBadgeChain.module.css line 1366 (.roleHeroArtwork base — fixed box, superseded) */
.roleHeroArtwork { width: 320px; height: 320px; }

/* MemberBadgeChain.module.css line 2002 (scoped override — KEEP as the canonical, CLS-safe rule) */
.group[data-badge-group="roles"] .roleHeroArtwork {
  aspect-ratio: 1;
  height: auto;
}
```
When extracting to `RoleBadgeCard.module.css`, merge this into ONE `.roleHeroArtwork` rule using
`aspect-ratio: 1; height: auto` directly (the descendant-selector scoping via `[data-badge-group]`
becomes unnecessary once the rule lives in its own component-owned module with no sibling
`.roleHeroArtwork` definitions competing for it) — this also resolves part of PMUI-07's "no broad
descendant selectors" requirement.

**When to use:** every one of the 9 new CSS modules is populated by literally cutting the
matching selector block out of `MemberBadgeChain.module.css` (see UI-SPEC.md's line-range/selector
table for the full owns-list per file) and pasting it into the new file, converting any `@media`
layout rule found there to `@container` per the pattern above, and deleting the source block from
`MemberBadgeChain.module.css`. Verify with `grep -n '\.<selector>' MemberBadgeChain.module.css`
before deleting that no duplicate declaration or descendant-selector reference to that class
remains outside the file being extracted from.

---

### `frontend/src/components/profile/MemberBadgeChain.module.css` (modified — shrink to shell, ≤450 lines)

**Analog:** itself pre-split (2282 lines today) — the target shape is `FocalCarousel.module.css`'s
discipline (1 non-layout `@media`, `@container`-first). After extraction it should retain only:
`.section/.chainCard/.groupList/.group/.carouselShell/.carouselSkeleton/.chain/.badgeWindow/
.badgeGrid/.visuallyHidden` (see UI-SPEC.md's split table, ~150-180 lines).

**`!important` removal target** (`MemberBadgeChain.module.css`, `.badgeWindow` — grep for
`!important` to find both of the 4 current sites; resolve via normal cascade ordering, not a
blanket keep):
```
grep -n '!important' frontend/src/components/profile/MemberBadgeChain.module.css
```
Per D-05, keep `!important` only with an explicit code comment justifying it as an exception.

---

### `frontend/src/components/profile/MemberBadgeChain.tsx` (modified — CSS import wiring + 820px constant)

**Analog:** itself. The file already has each split target as an isolated top-level function
(verified by direct read, 928 lines total):
- `LockedStageArtwork` (lines 61-70)
- `ContributionProgress` (lines 72-82) — stays with `BadgeChip.module.css`'s owner
- `FamilyCollectionCard` (lines 166-409) → `BadgeFamilyCard.module.css`
- `AnimeProjectAchievementStage` (lines 411-478) → `AnimeProjectStage.module.css`
- `ContributionAchievementStage` (lines 482-528) → `ContributionAchievementStage.module.css`
- `MembershipStage` (lines 530-581) → `MembershipStage.module.css`
- `PointsAchievementStage` (lines 583-620) → `PointsAchievementStage.module.css`
- `MemberBadgeChain` (lines 622-928, exported) — stays with the shell `MemberBadgeChain.module.css`

Each function currently reads `styles.xxx` from the single `import styles from
'./MemberBadgeChain.module.css'` (line 25). Since CLAUDE.md's D-04 does NOT require splitting the
`.tsx` file itself (RESEARCH.md Open Question 1 — flagged as a scope decision, not resolved here),
the mechanical default is: keep ONE `.tsx` file, but import multiple CSS modules with distinct
aliases, e.g.:
```typescript
import chainStyles from './MemberBadgeChain.module.css'
import roleBadgeCardStyles from './RoleBadgeCard.module.css'
import badgeChipStyles from './BadgeChip.module.css'
import badgeFamilyCardStyles from './BadgeFamilyCard.module.css'
// ... one alias per new module, referenced only inside the function that owns it
```

**820px magic-number extraction** (Anti-Pattern flagged in RESEARCH.md, `FamilyCollectionCard`
lines 213-272 — two `window.matchMedia('(max-width: 820px)')` call sites):
```typescript
// FamilyCollectionCard, line 213 and line 227-228 — both hardcode 820px inline today.
// Extract to a named module-level constant near the top of the file (mirrors
// COMPACT_BADGE_SIZES/ACTIVE_BADGE_SIZES already declared at lines 58-59):
const FAMILY_CARD_COMPACT_QUERY = '(max-width: 820px)'
// ...then reference `window.matchMedia(FAMILY_CARD_COMPACT_QUERY)` at both call sites.
```
This does not convert the behavioral JS branch to CSS (RESEARCH.md explains why it can't — it
drives scroll-centering logic, not just styling) but satisfies PMUI-07's "unnötige
Resize-Listener"/magic-number cleanup intent for the JS side.

---

### `frontend/src/components/profile/MemberBadgeChain.test.tsx` / `frontend/src/components/ui/FocalCarousel.test.tsx` (modified — test pattern to preserve)

**Analog:** itself — both files already assert against raw CSS module source via `readFileSync`,
NOT against computed styles (verified by direct read):
```typescript
// MemberBadgeChain.test.tsx line 9
const memberBadgeChainCss = readFileSync('src/components/profile/MemberBadgeChain.module.css', 'utf8')

// FocalCarousel.test.tsx line 8
const focalCarouselCss = readFileSync('src/components/ui/FocalCarousel.module.css', 'utf8')
```
**Critical for the split:** any existing assertion in `MemberBadgeChain.test.tsx` that greps
`memberBadgeChainCss` for a selector now living in a NEW file (e.g. `.roleLabel`, `.familyCard`)
will silently stop finding it once the selector moves. Each such assertion must add its own
`readFileSync` of the correct new module path (e.g. `roleBadgeCardCss = readFileSync('src/components/profile/RoleBadgeCard.module.css', 'utf8')`) — this is a mechanical but easy-to-miss
regression source flagged for the planner.

---

### `frontend/src/components/ui/FocalCarousel.tsx` (modified — Pitfall 4 focus-on-expand, Pitfall 5 inert)

**Analog:** itself — the collapse-direction focus restoration ALREADY exists and is the pattern to
mirror for the missing expand-direction fix:
```typescript
// FocalCarousel.tsx lines 100-108 — existing collapse-focus restoration (KEEP, do not touch)
useEffect(() => {
  if (!expanded && restoreFocusRef.current) {
    restoreFocusRef.current = false
    const toggle = document.getElementById(toggleId)
    if (toggle) toggle.focus()
    else trackRef.current?.focus()
  }
}, [expanded, toggleId])

// FocalCarousel.tsx lines 379-385 — existing "Weniger anzeigen" button already sets
// restoreFocusRef.current = true before collapsing (KEEP, this is the direction that already works)
<Button
  ...
  onClick={() => {
    restoreFocusRef.current = true
    setExpanded(false)
  }}
>
  {showLessLabel}
</Button>
```
**Missing counterpart (Pitfall 4):** `setExpanded(true)` is called from two sites without any
`document.getElementById(...)?.focus()` follow-up — line 368 (`showAll: () => setExpanded(true)`,
passed into `renderItem`) and line 479 (the `showAllLabel` toggle `Button`'s own `onClick`). Add an
`expandFocusRef`-style flag (mirroring `restoreFocusRef`'s existing shape) consumed inside a new
`useEffect` keyed on `expanded === true`, focusing the "Weniger anzeigen" button (`document.getElementById(...)` — that button has no stable id today, so either give it one or focus the
grid `<ul id={gridId}>` directly, per UI-SPEC.md's contract).

**Missing inert on inactive slides (Pitfall 5):** the `itemWindow` map (lines 429-458) renders
every `visibleItem`'s wrapper `<div>` with only `isActive`-conditional classNames, never
`inert`/`tabIndex`:
```typescript
// FocalCarousel.tsx lines 432-441 — current itemWindow div, NO inert/tabindex gating
<div
  key={getItemKey(item)}
  data-focal-item
  role={listLabel ? 'listitem' : undefined}
  className={classNames(
    styles.itemWindow,
    itemClassName,
    isActive && styles.itemWindowActive,
    isActive && activeItemClassName,
  )}
  aria-current={isActive ? 'true' : undefined}
  ...
>
```
Add `inert={!isActive}` (React 18.3 forwards the `inert` DOM attribute on host elements) to this
`<div>`, re-evaluated automatically on every `activeIndex` change since it's derived from
`isActive` in the render body already — no new effect needed for this one, unlike the focus fix.

---

### `frontend/src/components/profile/MemberProfileMemorialHero.tsx` (modified — single-`<h1>` fix)

**Analog:** `frontend/src/components/profile/MemberProfileHero.tsx` lines 200-214 — the
non-memorial branch already renders the correct single-heading pattern for public view:
```typescript
// MemberProfileHero.tsx lines 200-207 — COPY this shape for the memorial branch
<div className={styles.heroCopy}>
  {isPublicView ? <p className={styles.heroEyebrow}>Fansub-Member</p> : null}
  <div className={styles.heroTitleRow}>
    {isPublicView ? (
      <h1 className={styles.heroTitle}>{displayName}</h1>
    ) : (
      <h2 className={styles.heroTitle}>{displayName}</h2>
    )}
```
**Current memorial-hero bug** (`MemberProfileMemorialHero.tsx` lines 36-69 — verified by direct
read):
```typescript
// Line 37 — PageHeader renders a SECOND <h1> internally (via PageHeader.tsx) with the same name
<PageHeader eyebrow="Fansub-Member" title={displayName} />
...
// Lines 66-69 — the ALREADY-STYLED heading is demoted to <h2>, duplicating the accessible name
<h2 className={styles.heroTitleRow}>
  <span>{displayName}</span>
  <MemberStatusPill status="memorial" />
</h2>
```
**Fix per UI-SPEC.md's locked decision:** drop the `PageHeader` `title` usage entirely for this
component; render `displayName` as `<h1 className={styles.heroTitle}>` inside `.heroCopy` (mirror
`MemberProfileHero.tsx`'s public-view branch exactly, keeping `<MemberStatusPill>` alongside it);
if the "Fansub-Member" eyebrow is still wanted, render `<p className={styles.heroEyebrow}>Fansub-Member</p>` (reusing `profile.module.css`'s existing `.heroEyebrow`, not `PageHeader`).

---

### `frontend/next.config.mjs` (modified — gate `dangerouslyAllowLocalIP`)

**Analog:** itself — the file already has one env-branching helper function
(`configuredApiMediaPatterns()`, lines 7-19) whose shape is the pattern to copy for the new guard:
```javascript
// next.config.mjs lines 7-19 — existing env-conditional pattern (copy this shape)
function configuredApiMediaPatterns() {
  const publicApiURL = (process.env.NEXT_PUBLIC_API_URL || '').trim()
  if (!publicApiURL) return []
  const mediaOrigin = new URL(publicApiURL)
  return [{ protocol: mediaOrigin.protocol.slice(0, -1), hostname: mediaOrigin.hostname, port: mediaOrigin.port, pathname: '/api/v1/media/**' }]
}

// Line 40 — current UNGATED value to fix:
dangerouslyAllowLocalIP: true,
// Target (per RESEARCH.md Pitfall 2 / Next.js 16 docs):
dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
```
**Regression guard (Pitfall 3):** `localPatterns` (lines 27-32) MUST keep `/media/**`,
`/member-achievement-badges/**`, `/covers/**` verbatim — diff-check this array specifically after
any edit to this file; a missing `/media/**` entry crashes profile pages with E426 (documented team
memory in CONTEXT.md canonical refs).

---

### `frontend/src/components/ui/ResponsiveImage.config.test.ts` (modified — add gate regression test)

**Analog:** itself — existing assertions already import `nextConfig` directly and assert on
`localPatterns`/`remotePatterns` (lines 1-8, 21-23, 25-28, 30-33, 35-49). Add a parallel case
asserting `nextConfig.images.dangerouslyAllowLocalIP` resolves correctly per `NODE_ENV`, following
the exact same "import config, assert a derived property" shape already used here — no new test
utility needed.

---

### `frontend/scripts/collect-member-profile-evidence.mjs` (modified — image-byte budget extension)

**Analog:** itself — `capturePageMetrics()` already returns a per-page `imageWaterfall` (verified
by direct read):
```javascript
// collect-member-profile-evidence.mjs lines 593-603 — ALREADY captures per-image bytes; extend
// LOCKED_BUDGETS/evaluateBudget to assert against this, do not build new capture logic
imageWaterfall: {
  count: images.length,
  totalBytes: imageBytes,
  images: images.map((request) => ({
    url: request.url,
    status: request.status,
    bytes: request.responseBodyBytes,
    startTimeMs: request.timing.startTimeMs,
    responseEndMs: request.timing.responseEndMs,
  })),
},
```
**Existing budget-lock shape to extend** (lines 713-741 `LOCKED_BUDGETS`, 745-805 `evaluateBudget()`
— add an `imageWaterfall: { maxTotalBytes, maxSingleImageBytes }` block per profile, mirroring the
existing `initialProfile: { expectStatus, maxBytes, maxMedianMs }` shape exactly):
```javascript
const LOCKED_BUDGETS = {
  absoluteCeilings: { lcpMs: 2500, cls: 0.1, inpMs: 200 },
  queryCountCeiling: 19,
  profiles: {
    sheppert: {
      initialProfile: { expectStatus: 200, maxBytes: 1952, maxMedianMs: 25 },
      // ADD (D-08): imageWaterfall: { maxTotalBytes: <baseline*1.2>, maxSingleImageBytes: <ceiling> },
    },
  },
}

function evaluateBudget(slug, api, page) {
  // ... existing apiChecks loop (lines 753-784) — add an analogous imageWaterfall check here,
  // pushing to the same `breaches` array on overrun, following the exact
  // `check.xOk = measured <= limit; if (!check.xOk) breaches.push(...)` idiom used at lines 773-774.
}
```
Do NOT extend `verify-profile-image-delivery.mjs` for this (RESEARCH.md Pitfall 1 — it is a
format/cache correctness probe over fixed phase120 fixtures, unrelated to the two real seed
profiles this budget must be measured against).

---

### `frontend/package.json` / `frontend/vitest.config.ts` / `frontend/src/test/axeSetup.ts` (new — axe wiring, Wave 0)

**Analog:** `frontend/package.json`'s existing `devDependencies` block (lines 32-44) is the
insertion point — add `"axe-core": "4.13.0"` and `"jest-axe": "11.0.0"` alphabetically into that
existing list, no new section needed.

**No in-repo analog for `vitest.config.ts`'s `setupFiles`** — the file currently has no
`setupFiles` entry (verified by direct read, 15 lines total). This is new configuration, not an
extension of an existing pattern:
```typescript
// vitest.config.ts — ADD a setupFiles entry; RESEARCH.md's Wave-0-gap recommendation:
test: {
  globals: true,
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  setupFiles: ['src/test/axeSetup.ts'], // NEW
},
```
```typescript
// frontend/src/test/axeSetup.ts — NEW file, no existing analog; standard jest-axe wiring:
import { expect } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)
```
Both are flagged `no analog` deliberately — RESEARCH.md's Standard Stack section documents this is
the one genuinely new piece of machinery this phase introduces (Wave 0, gated behind
`checkpoint:human-verify` per the Package Legitimacy Audit).

---

## Shared Patterns

### Container-query-first component styling (D-01)
**Source:** `frontend/src/components/ui/FocalCarousel.module.css` (entire file, 199 lines — the
one reusable component already fully compliant)
**Apply to:** every new/modified profile CSS module (`RoleBadgeCard.module.css`,
`BadgeChip.module.css`, `BadgeFamilyCard.module.css`, `LayeredBadgeArtwork.module.css`,
`LockedStageArtwork.module.css`, `AnimeProjectStage.module.css`, `PointsAchievementStage.module.css`,
`ContributionAchievementStage.module.css`, `MembershipStage.module.css`,
`MemberBadgeChain.module.css` shell). Exactly one `@media` block allowed (reduced-motion only);
everything else `@container`, scoped via `container: <component-name> / inline-size` on the
component's own wrapper.

### Page-level `@media` stays purpose-based, NOT container-based (D-02)
**Source:** `frontend/src/app/members/[slug]/page.module.css` lines ~ (`.profilePair` / 1399px
breakpoint — collapses a 2-column pairing to 1-column)
**Apply to:** `page.module.css` only — this file is explicitly OUT of the container-query
conversion; do not touch its `@media` breakpoints during this phase's split work.

### Focus-visible / target-size tokens (PMA11Y-03/04)
**Source:** global `:focus-visible` rule in `frontend/src/styles/globals.css` (`--focus-outline`,
`--focus-ring`, orange/coral, NOT the blue primary accent) + `FocalCarousel.module.css` line 78-81
(`.track:focus-visible { outline: 2px solid var(--focus-ring, ...); outline-offset: 2px; }`)
**Apply to:** every interactive control touched in the split (carousel controls, badge-stage
buttons, disclosure toggles, founding-member button) — inherits automatically via the global rule;
do not override with a different focus color during the CSS-module move.

### Test assertions against raw CSS module source (not computed styles)
**Source:** `MemberBadgeChain.test.tsx` line 9, `FocalCarousel.test.tsx` line 8 —
`readFileSync('src/components/.../X.module.css', 'utf8')` then string/regex assertions against
selector presence.
**Apply to:** every CSS-module split — each moved selector's existing test assertion must update
its `readFileSync` target to the NEW module path, or add a second `readFileSync` for the new file
alongside the shrunk original.

### Locked measurement-anchored budgets (baseline + margin + absolute ceiling)
**Source:** `frontend/scripts/collect-member-profile-evidence.mjs` lines 713-805
(`LOCKED_BUDGETS`/`evaluateBudget()`), already implementing this exact method for API
payload/latency in Phase 131.
**Apply to:** the new image-byte budget extension (D-08) — same shape, same file, do not build a
parallel harness or touch `verify-profile-image-delivery.mjs` for this purpose.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/test/axeSetup.ts` | utility (test setup) | transform | No test-setup-file convention exists in this repo yet (`vitest.config.ts` has no `setupFiles` today) — this is the one genuinely new piece of infrastructure the phase introduces (RESEARCH.md Standard Stack / Wave 0 Gaps). Use the standard `jest-axe` wiring shown above; there is nothing in-repo to copy from. |
| `frontend/vitest.config.ts` (the `setupFiles` addition specifically) | config | transform | Same reason — no existing `setupFiles` array to extend, only a `test.include` array. The rest of the file (`resolve.alias`) is untouched and needs no pattern. |

## Metadata

**Analog search scope:** `frontend/src/components/profile/`, `frontend/src/components/ui/`,
`frontend/src/app/members/[slug]/`, `frontend/scripts/`, `frontend/next.config.mjs`,
`frontend/package.json`, `frontend/vitest.config.ts` (all read directly, no framework-provided
scaffolding exists to search elsewhere — RESEARCH.md already exhaustively inventoried this scope).
**Files scanned:** `MemberBadgeChain.tsx` (928 lines, full read), `MemberBadgeChain.module.css`
(targeted reads: lines 590-620, 1330-1370, 1995-2010, plus RESEARCH.md's exhaustively verified
line-range inventory for the rest), `FocalCarousel.tsx` (485 lines, full read),
`FocalCarousel.module.css` (199 lines, full read), `FocalCarousel.test.tsx` (header read),
`MemberBadgeChain.test.tsx` (header read), `MemberProfileHero.tsx` (268 lines, full read),
`MemberProfileMemorialHero.tsx` (100 lines, full read), `ResponsiveImage.tsx` (30 lines, full
read), `ResponsiveImage.config.test.ts` (51 lines, full read), `next.config.mjs` (47 lines, full
read), `collect-member-profile-evidence.mjs` (targeted reads: 580-790, 790-865),
`vitest.config.ts` (15 lines, full read), `package.json` (45 lines, full read).
**Pattern extraction date:** 2026-08-15
