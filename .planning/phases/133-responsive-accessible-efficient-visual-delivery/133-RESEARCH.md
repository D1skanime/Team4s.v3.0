# Phase 133: Responsive, Accessible & Efficient Visual Delivery - Research

**Researched:** 2026-08-15
**Domain:** CSS Modules architecture (container queries, responsive layout), WCAG 2.2 AA accessibility, Next.js 16 image delivery/budgets
**Confidence:** HIGH (all findings verified by direct file inspection of this repo; one external claim verified via official Next.js docs)

## Summary

Phase 133 is a hardening/refactor phase over code that already exists and works — there is no new
framework or library to introduce (CLAUDE.md explicitly forbids that). The work is: (1) slice
`MemberBadgeChain.module.css` (2282 lines, 34 `@media` vs only 4 `@container`, 4 `!important`,
and — a new finding from this research — at least 4 genuinely **duplicate/conflicting selector
definitions** for the same class) into component-owned modules ≤450 lines each; (2) convert
device-breakpoint CSS in reusable components (hero, badge chain, memberships) to container
queries, per the pattern already established in `profile.module.css`'s sibling `FocalCarousel.module.css`
and parts of `MemberBadgeChain.module.css`; (3) close concrete a11y gaps found in `FocalCarousel`
(no focus management when expanding to grid view; all carousel slides — including off-screen ones
— remain independently tabbable) and in `MemberProfileMemorialHero` (duplicate h1+h2 headings with
identical text); (4) extend two *existing* measurement scripts for image budgets rather than
building new ones — `frontend/scripts/collect-member-profile-evidence.mjs` (`--mode perf-baseline`
/ `--mode budget-check`, built in Phase 131) already captures a full `imageWaterfall` per seed
profile and already implements the exact baseline+margin+absolute-ceiling method D-08 asks to
mirror; `verify-profile-image-delivery.mjs` is a narrower WebP-format/dimension/cache-behavior
correctness probe, not a KB-budget tool, despite being the file CONTEXT.md's plan-time-read list
names for D-08; and (5) gate `dangerouslyAllowLocalIP` in `next.config.mjs`, which is currently
unconditionally `true` with no dev/test guard at all.

There is no axe-core/jest-axe/vitest-axe tooling anywhere in this repo today — Wave 0 must add it.

**Primary recommendation:** Treat this phase as "consolidate and cut," not "add." Every deliverable
maps to an existing seam (existing `@container` usage, existing `ResponsiveImage`/evidence scripts,
existing `SectionHeader`/`FocalCarousel` primitives) that needs extending or de-duplicating, not a
new pattern needing invention.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Container-responsive layout (hero, badge chain, membership cards) | Frontend Server (SSR) / Browser (CSS) | — | Pure CSS Modules + `@container`; no new client JS needed beyond what already exists |
| Page-level viewport composition (`page.module.css`) | Frontend Server (SSR) / Browser (CSS) | — | Already uses purpose-based `@media` breakpoints (1399/1099/760px) collapsing 2-col → 1-col; keep this pattern, do not convert page-level layout to container queries |
| Carousel/paging/disclosure keyboard + ARIA state | Browser (Client Component) | — | `FocalCarousel.tsx`, `MemberBadgeChain.tsx` render buttons/regions client-side; all a11y fixes are React + CSS, no backend involvement |
| Image variant selection, `sizes`, quality bounds | Frontend Server (SSR) via `next/image` optimizer | CDN/Static (`/_next/image` route) | `ResponsiveImage` wrapper + `next.config.mjs` own this; no backend change |
| Image transfer/KB budget evidence | Build/Tooling (Node scripts, not app runtime) | — | `collect-member-profile-evidence.mjs` runs against a live dev/staging server via Playwright+CDP; it is a CI/verification artifact, not application code |
| `localPatterns`/`dangerouslyAllowLocalIP` guard | Frontend Server config (`next.config.mjs`) | — | Build-time Next.js config; must branch on `NODE_ENV`/env flag to restrict local-IP optimization to dev/test |

## Project Constraints (from CLAUDE.md)

These are binding, not optional, for every task this phase plans:

- **450-line file limit** for production code files — applies to `MemberBadgeChain.module.css`
  (2282 lines) AND, although not named in CONTEXT.md's D-04, also to `MemberBadgeChain.tsx`
  itself (928 lines, also over the limit — see Open Questions).
- **Umlaut rule**: all user-facing German strings (JSX text, aria-labels, toasts, placeholders)
  must use real ä/ö/ü/ß, never ASCII substitutes. Existing profile code already does this
  correctly (`Fehlermeldungen`, `Höchste Stufe erreicht`, `Gründungsmitglied`, etc.) — new/moved
  strings during the CSS/component split must preserve it exactly, byte-for-byte.
- **Global UI primitives mandatory** (`@/components/ui`): no hand-built native
  `<select>/<input>/<textarea>/<button>`. All interactive controls touched in this phase
  (`FocalCarousel`'s prev/next/toggle buttons, badge-stage buttons, founding-member button) must
  keep using `Button` from `@/components/ui` or the existing native `<button>` exemption pattern
  already used consistently across `MemberBadgeChain.tsx` (these are plain semantic buttons for
  custom carousel/stage controls, not one of the five primitive types the rule targets — this is
  pre-existing precedent, not a new violation).
- **GSD workflow enforcement**: any file edit must go through `/gsd:execute-phase`, not ad hoc.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PMPF-06 | Profilbilder/Badges: geeignete Varianten, korrekte `sizes`, reservierte Geometrie, begrenzte Qualität | `ResponsiveImage.tsx` findings; Next.js 16 `images.qualities` finding; concrete `sizes` audit below |
| PMPF-08 | Komprimierte Bildquellen; Asset-/Transferbudgets; lokale-IP-Optimierung nur Test/Dev | `next.config.mjs` `dangerouslyAllowLocalIP` finding (currently ungated); `collect-member-profile-evidence.mjs` extension plan |
| PMUI-01 | Mobile-first ohne horizontales Abschneiden | `page.module.css`/`profile.module.css` `min-width:0` audit; existing pattern is largely sound |
| PMUI-02 | Zwischenbreiten/Breitbild kompakt, ohne Leerflächen | `page.module.css` purpose-based breakpoints (already exist, keep) |
| PMUI-03 | Wiederverwendbare Komponenten reagieren auf Container statt Gerät | `@media` vs `@container` count table below; `profile.module.css` hero uses device breakpoints today (gap) |
| PMUI-04 | Achievement/Hero/Membership/Seitenlayout in verantwortete Module aufgeteilt | Concrete `MemberBadgeChain.module.css` split table below |
| PMUI-05 | Widersprüchliche/doppelte Selektoren, Breakpoint-Patches, `!important` entfernt | Concrete duplicate-selector findings (`.roleBadgeRow`, `.roleLabel`, `.roleHeroArtwork`, `.roleProgressTrack` each defined 2-3×) and the 4 `!important` sites |
| PMUI-06 | Lange deutsche Texte, 400% Zoom, schmale/mittlere/breite Viewports nutzbar | `overflow-wrap`/`rem` audit; existing patterns mostly correct, verification plan below |
| PMUI-07 | Breite Nachfahrenselektoren, redundante Media Queries, unnötige Resize-Listener entfernt | `FamilyCollectionCard`'s `matchMedia('(max-width: 820px)')` + `ResizeObserver` finding |
| PMA11Y-01 | Semantische, nachvollziehbare Überschriftenhierarchie | `MemberProfileMemorialHero` duplicate h1+h2 finding; otherwise single-h1 pattern is correct |
| PMA11Y-02 | Carousel/Paging/Vorschau/aufklappbare Bereiche vollständig tastaturbedienbar | `FocalCarousel.tsx` keyboard audit: arrow/Home/End nav works; expand-to-grid focus loss gap found |
| PMA11Y-03 | Korrekte Namen, Fokusdarstellung, `aria-expanded`, `aria-controls`, Statusmeldungen | `FocalCarousel.tsx` already has most of this; gaps listed below |
| PMA11Y-04 | Kontrast, Zielgrößen, reduzierte Bewegung, DOM-Reihenfolge | Target sizes already ≥44px in `FocalCarousel`; tabbable off-screen slides is the DOM-order gap |
</phase_requirements>

## Standard Stack

No new runtime/production dependency is required or in-scope (CLAUDE.md forbids new frameworks
for this milestone). One new **dev/test-only** dependency is needed for automated WCAG evidence
(PMA11Y, D-12), since no axe integration exists in this repo today.

### Core (existing, extend only)
| Library | Installed Version | Purpose | Why Standard |
|---------|--------|---------|--------------|
| Next.js | 16.1.6 `[VERIFIED: package.json]` | App Router, `next/image` optimizer | Already the project's framework; do not add another |
| React | 18.3.1 `[VERIFIED: package.json]` | Client components (`FocalCarousel`, `MemberBadgeChain`) | Already the project's UI runtime |
| Vitest | ^3.2.4 `[VERIFIED: package.json]` | Existing test runner (jsdom environment) | Already configured in `frontend/vitest.config.ts`; component/CSS-module tests must use this, not a new runner |
| Playwright | 1.55.0 `[VERIFIED: package.json]` | Already used by `collect-member-profile-evidence.mjs` for headless measurement | Reuse for any new image-budget/a11y-evidence capture, do not add a second browser-automation tool |

### Supporting (new, dev/test-only)
| Library | Registry Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `axe-core` | 4.13.0 `[ASSUMED — see Package Legitimacy Audit]` | Accessibility rule engine | Automated WCAG 2.2 checks (D-12), run inside Vitest+jsdom against rendered component output |
| `jest-axe` | 11.0.0 `[ASSUMED — see Package Legitimacy Audit]` | `toHaveNoViolations()` Vitest/Jest matcher wrapping axe-core, jsdom-compatible | Preferred integration point: works with Vitest's `expect` via `expect.extend`, no Jest runtime dependency required despite the package name |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jest-axe` | `vitest-axe` (0.1.0) | Newer/purpose-named for Vitest, but pre-1.0 and far less battle-tested (`jest-axe` is 8 years old, 9.5M downloads/month; `vitest-axe` is 0.1.0). `jest-axe` is the safer choice despite the "jest" name — it only needs a DOM + `expect.extend`, both of which Vitest+jsdom already provide. |
| Vitest+jsdom axe checks | `@axe-core/playwright` in a new E2E harness | No Playwright test harness exists in `frontend/` today (only ad hoc Playwright *scripts*, no `playwright.config.ts`, no `tests/e2e` dir). Standing one up is a much larger addition than this phase's scope calls for; D-12's "manual pass" already covers what a Playwright-driven a11y E2E would add. Keep axe checks inside existing Vitest component tests. |

**Installation:**
```bash
cd frontend && npm install --save-dev axe-core jest-axe
```

**Version verification:** `[VERIFIED: npm registry]` via `npm view axe-core version` → `4.13.0`;
`npm view jest-axe version` → `11.0.0`, `npm view jest-axe repository.url` →
`git+https://github.com/NickColley/jest-axe.git` (first published 2018-02-12). Package **names**
were sourced from training knowledge, not Context7/official docs, so per the provenance rule they
remain `[ASSUMED]` even though the registry lookups succeeded — see Package Legitimacy Audit.

## Package Legitimacy Audit

`slopcheck` could not be installed in this research session (`pip: command not found` on the research
host; no `pipx`/`pip3` available either). Per the graceful-degradation protocol, both new packages
are tagged `[ASSUMED]` below and the planner MUST gate their install behind a `checkpoint:human-verify`
task, even though independent registry/repo evidence (below) is strong.

| Package | Registry | Age | Downloads (30d) | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `axe-core` | npm | ~10 yrs (Deque Systems) | 252,068,039 | github.com/dequelabs/axe-core | not run — `[ASSUMED]` | Approved, gate behind checkpoint:human-verify |
| `jest-axe` | npm | ~8 yrs | 9,559,755 | github.com/NickColley/jest-axe | not run — `[ASSUMED]` | Approved, gate behind checkpoint:human-verify |

**Packages removed due to slopcheck `[SLOP]` verdict:** none (slopcheck did not run)
**Packages flagged as suspicious `[SUS]`:** none flagged by registry/download-count heuristics, but
both remain `[ASSUMED]` per protocol since slopcheck itself did not execute.

## Architecture Patterns

### System Architecture Diagram

```
Browser (member views /members/[slug])
        |
        v
Next.js App Router page (SSR)                         Next.js Image Optimizer (/_next/image)
  page.tsx --composes-->  MemberProfileContent            ^
        |                        |                        | requests variant (w, q)
        |  renders                v                        |
        |            MemberProfileHero / MemorialHero  ----+  (avatar/background, sizes-driven)
        |                        |
        |                        v
        |            MemberBadgeChain (client component)
        |               |             |
        |         FocalCarousel   per-stage sub-components
        |         (shared ui       (role card / anime / points /
        |          primitive:       contribution / membership /
        |          keyboard nav,    family-collection cards)
        |          aria-live         |
        |          counter,          v
        |          expand/collapse)  ResponsiveImage --requests--> /_next/image
        |
        v
  page.module.css (purpose-based viewport transitions: 1-col <-> 2-col)
        |
        v
  Component-owned CSS Modules (@container-scoped, post-split):
     profile.module.css (hero/timeline) -> should gain @container for hero
     MemberBadgeChain.*.module.css (split target, see below)
     FocalCarousel.module.css (already @container-based, reference pattern)
```

Reading the diagram: a request enters at the App Router page, SSR composes the profile from
already-fetched DTO data (Phase 130/131/132 own that), and the *page* decides 1-col vs 2-col via
`@media` (purpose-based, kept). Every component *inside* that page decides its own internal layout
via `@container` queries scoped to its own wrapping box — that's the D-01 boundary this phase must
finish enforcing. Images flow through `ResponsiveImage` → Next's `/_next/image` route, which is
gated by `next.config.mjs`'s `localPatterns`/`dangerouslyAllowLocalIP`.

### Recommended Project Structure (CSS split target)

```
frontend/src/components/profile/
├── MemberBadgeChain.module.css          # shell only: .section/.chainCard/.groupList/.group/
│                                          # .carouselShell/.carouselSkeleton/.chain/.badgeWindow/
│                                          # .badgeGrid/.visuallyHidden  (~150-180 lines)
├── LockedStageArtwork.module.css        # .lockedStageArtwork*, .lockedStageHero*  (~85 lines)
├── LayeredBadgeArtwork.module.css       # .roleArtworkMist/.roleArtworkBackdrop/.roleArtworkMotif/
│                                          # .roleArtworkFrame/.roleHeroArtworkLayered/
│                                          # .badgeArtworkLayered  (~95 lines, shared cross-cutting)
├── BadgeChip.module.css                 # .badgeRow/.badgeRowCompact/.badgeStep*/.badgeItem*/
│                                          # .badgeIcon/.badgeArtwork + per-group size overrides +
│                                          # .contributionProgress* (~370 lines)
├── BadgeFamilyCard.module.css           # .familyCard/.familyHero*/.familyStages/.familyStage*/
│                                          # .specialAwardCard/.specialAwardArtwork (~260 lines)
├── RoleBadgeCard.module.css             # .roleBadgeRow/.roleLabel/.roleHeroArtwork/.roleStatus/
│                                          # .roleCount/.roleProgress*/.roleProgression/
│                                          # .roleStage*/.roleNextCopy/.currentChip base rules,
│                                          # DE-DUPLICATED to ONE definition per selector (~430 lines
│                                          # after removing the 3 duplicate declarations found below —
│                                          # verify against 450 after consolidation; if still over,
│                                          # split role-card breakpoints into a second file, see Open Q)
├── AnimeProjectStage.module.css         # .animeProject* (~90 lines expanded/readable)
├── PointsAchievementStage.module.css    # .points* (~85 lines expanded)
├── ContributionAchievementStage.module.css # .contributionAchievementStage/.contributionStage*/
│                                          # .contributionTier* (~110 lines expanded)
└── MembershipStage.module.css           # .membershipStage/.membershipStage*/.membershipDurationTrack/
                                           # .foundingMember* (~105 lines expanded)
```

Each new module is imported only by the component function that owns it (D-04's "component owns
its module" rule). `MemberBadgeChain.tsx` already has each of these as a **separate function**
(`FamilyCollectionCard`, `AnimeProjectAchievementStage`, `PointsAchievementStage`,
`ContributionAchievementStage`, `MembershipStage`, `LockedStageArtwork`) in one 928-line file — the
CSS split does not require splitting the `.tsx` file, but doing so as a parallel effort is
consistent with the same 450-line rule (see Open Questions).

### Concrete `MemberBadgeChain.module.css` Split Evidence

`@media` vs `@container` usage per profile CSS module — this quantifies the D-01/D-03 debt:

| File | `@media` | `@container` | `!important` |
|------|----------|---------------|--------------|
| `MemberBadgeChain.module.css` | 34 | 4 | 4 |
| `profile.module.css` | 5 | 0 | 0 |
| `page.module.css` (page-level, keep `@media`) | 3 | 1 | 0 |
| `LatestContributionsSection.module.css` | 3 | 1 | 0 |
| `MemberCurrentProjectsSection.module.css` | 2 | 0 | 0 |
| `PreviousContributionsSection.module.css` | 2 | 0 | 0 |
| `FocalCarousel.module.css` (shared ui primitive, reference) | 1 (reduced-motion only) | 2 | 0 |

`FocalCarousel.module.css` is the pattern to copy: exactly one `@media` block (and it's for
`prefers-reduced-motion`, which is legitimately device/OS-level, not layout) — everything else is
`@container`.

### Pattern 1: Duplicate/conflicting selector consolidation (the highest-value D-05 cleanup)

**What:** At least four classes in `MemberBadgeChain.module.css` are defined **more than once**,
at widely separated line numbers, with genuinely different (sometimes contradictory) declarations,
and the later block wins purely by source order:

| Selector | 1st definition (line) | 2nd definition (line) | 3rd definition (line) | Conflict |
|---|---|---|---|---|
| `.roleBadgeRow` | 606 (`min-height: 420px; padding: 24px 8px`) | 1337 (`min-height: 0; padding: 32px 24px`) | — | Different min-height/padding for the same class |
| `.roleLabel` | 596 (`font-size: 0.82rem; text-transform: uppercase; white-space: nowrap`) | 1358 (`font-size: 12px;` no uppercase, no nowrap) | — | Typography contradicts itself |
| `.roleHeroArtwork` | 812 (`width/height: 320px`, transform/filter/transition) | 1366 (`width/height: 320px` again, no transform) | 2002 (`aspect-ratio: 1; height: auto`) | Fixed-size vs aspect-ratio-driven sizing layered three times |
| `.roleProgressTrack` | 1377 | 1826 (near-identical redeclaration) | — | Redundant, no functional difference but doubles maintenance surface |

**When to use:** This is not a "pattern to follow" — it is the concrete evidence for why D-05
("widersprüchliche und doppelte Selektoren... entfernt") is not abstract. The planner should treat
finding and merging every duplicate-selector pair as an explicit verification step during the
split (grep each extracted selector name in the *source* file before deleting it, confirm only one
canonical rule survives in the destination module).

**Example (consolidation target for `.roleLabel`):**
```css
/* Keep exactly one .roleLabel rule in RoleBadgeCard.module.css. Decide between the two
   historical variants (uppercase-eyebrow-style vs. plain-12px) — this is a visual decision,
   not purely mechanical, since removing one changes rendered typography. Flag for UI-SPEC
   or discuss-phase confirmation if a visual contract (/gsd:ui-phase 133) exists. */
.roleLabel {
  justify-self: start;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
}
```

### Anti-Patterns to Avoid
- **Re-patching instead of consolidating:** Adding a 4th `@media (min-width: X)` block that
  overrides a value set in an earlier block (the pattern that produced 34 `@media` rules in one
  file) — instead, edit the canonical rule directly or use a single `@container` range.
- **`!important` as a first resort:** All 4 current `!important` sites (`.badgeWindow`'s
  `flex-basis`/`overflow`, twice) exist because a later, more specific selector was fighting the
  base rule instead of the base rule being written correctly for cascade order. When re-slicing,
  check whether normal specificity/order resolves it before keeping `!important`.
- **Device-width JS branches duplicating CSS container queries:** `FamilyCollectionCard` in
  `MemberBadgeChain.tsx` (lines ~213-272) calls `window.matchMedia('(max-width: 820px)')` twice to
  decide (a) whether to run scroll-settle "nearest stage" auto-selection logic, and (b) reduced-motion
  smooth-scroll behavior — hardcoded to **820px**, a value that appears nowhere in the CSS
  breakpoints used elsewhere in the same file (480/520/900/1099/1440/1600/2100). This is real,
  behavioral JS-side device-breakpoint logic (not just styling) that D-07/PMUI-07 flags as
  "unnötige Resize-Listener" territory — it also runs a `ResizeObserver` unconditionally on mount.
  This is presentation logic that changes *behavior* (which item auto-centers) based on viewport
  width, so it cannot become pure CSS — but the hardcoded 820px magic number should at minimum be
  extracted to a shared constant and reconciled with (or justified against) the CSS breakpoint set.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessibility rule checking | A custom DOM/aria linter | `axe-core` + `jest-axe` (`toHaveNoViolations`) | Axe-core is the industry-standard automated WCAG rule engine; hand-rolled checks would only catch what you already thought to check for |
| Image byte-budget measurement | A new Playwright script from scratch | Extend `collect-member-profile-evidence.mjs`'s existing `capturePageMetrics()` → `imageWaterfall` (already captures per-image `url/status/bytes/timing`) and its `LOCKED_BUDGETS`/`evaluateBudget()` pattern (already implements baseline+margin+ceiling for API payloads) | This exact machinery already exists and already does the "measure both seed profiles, lock budget, gate on re-measure" workflow Phase 131 built and D-08 wants mirrored — do not build a parallel harness |
| Carousel keyboard/focus/ARIA behavior | New carousel component | `FocalCarousel` (shared `@/components/ui` primitive) | Already implements ArrowLeft/Right/Home/End nav, `aria-roledescription="Karussell"`, `aria-live` counter, expand/collapse with `aria-expanded`/`aria-controls` — the phase's job is to *harden* this one shared primitive (fixes propagate to every carousel use), not touch each per-use CSS module's copy of similar logic |
| Quality-bounded image requests | Manual `<img>` + custom `srcset` builder | `next/image` via existing `ResponsiveImage` wrapper + `next.config.mjs`'s `images.qualities` array | Next.js 16 already restricts/coerces `quality` values via `images.qualities` (default `[75]` if unset) — set this array explicitly rather than hand-validating quality props at each call site |

**Key insight:** Nothing in this phase's success criteria requires new machinery. The recurring
theme across CSS, images, and a11y is: an existing seam (container queries, `ResponsiveImage`,
`FocalCarousel`, `collect-member-profile-evidence.mjs`) already does 80% of the job; the debt is in
inconsistent/duplicate application, not missing capability.

## Common Pitfalls

### Pitfall 1: `verify-profile-image-delivery.mjs` is the wrong extension target for D-08's KB budget
**What goes wrong:** CONTEXT.md's plan-time-read list and D-08 both point at
`frontend/scripts/verify-profile-image-delivery.mjs` as the harness to extend for the
baseline+margin+absolute-ceiling image budget.
**Why it happens:** The name sounds right, but reading the script shows it is a **correctness**
verifier tied to five fixed, hardcoded "phase120" probe fixtures (`static-badge`, `profile-avatar`,
`profile-hero`, `api-project`, `api-group`) at fixed widths `[128,160,512,640]`, asserting WebP
format/alpha-channel/cache-HIT behavior — it does not touch the two real seed profiles
(`sheppert`, `csubs-leader`) and has no notion of a byte-size budget at all.
**How to avoid:** Extend **both** scripts for their actual purposes: keep
`verify-profile-image-delivery.mjs` for format/dimension/cache correctness (add badge/avatar cases
here if new variants are introduced), and extend `collect-member-profile-evidence.mjs`'s
`--mode budget-check` (already measures both seed profiles and already has an `imageWaterfall`
with per-image byte counts inside `capturePageMetrics`) with per-image and aggregate KB assertions
in its `evaluateBudget()`/`LOCKED_BUDGETS` structure — this is where the real baseline+margin
method from Phase 131 (131-08) actually lives.
**Warning signs:** If a plan task says "add byte-budget checks to `verify-profile-image-delivery.mjs`"
without also touching `collect-member-profile-evidence.mjs`, the measurement will not run against
real profile data.

### Pitfall 2: `dangerouslyAllowLocalIP` is currently unconditional
**What goes wrong:** `next.config.mjs` sets `images.dangerouslyAllowLocalIP: true` at the top
level with no `NODE_ENV`/env-flag guard — it applies in every environment including a hypothetical
production build, which is exactly the SSRF risk Next.js's own docs warn is "not recommended for
most users."
**Why it happens:** It was added for local dev convenience (loopback probe fixtures at
`http://127.0.0.1:3101/...`) and never gated.
**How to avoid:** Wrap it, e.g. `dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production'`
(or an explicit `TEAM4S_ALLOW_LOCAL_IMAGE_OPTIMIZATION` flag if the deploy pipeline needs finer
control) — and add/extend a `next.config.mjs` test (mirroring the existing
`ResponsiveImage.config.test.ts` pattern) asserting the flag is `false` when `NODE_ENV=production`.
**Warning signs:** Any config test that imports `nextConfig.images.dangerouslyAllowLocalIP` and
finds it `true` unconditionally.

### Pitfall 3: `/media/**` must stay in `localPatterns` or the page hard-crashes (E426)
**What goes wrong:** `next.config.mjs`'s `images.localPatterns` array currently includes
`/media/**` correctly — but this is exactly the kind of allow-list entry that's easy to
accidentally narrow or reorder incorrectly while refactoring the config for the dev/test guard
above (Pitfall 2), per the team's own documented memory (see CONTEXT.md canonical refs).
**Why it happens:** `localPatterns` and `dangerouslyAllowLocalIP` are separate concerns
(path-allow-listing vs. local-IP-optimization-allow) but live in the same config block and are
easy to conflate while editing.
**How to avoid:** Any task touching `next.config.mjs` in this phase must diff-check that
`/media/**`, `/member-achievement-badges/**`, and `/covers/**` remain present in `localPatterns`
verbatim, and add/extend `ResponsiveImage.config.test.ts` coverage for it (that test file already
asserts `hasLocalMatch` for several profile-media paths — add a regression case if missing).
**Warning signs:** Any profile page returning HTTP 500/E426 in dev after a `next.config.mjs` edit.

### Pitfall 4: FocalCarousel loses focus when expanding to grid view
**What goes wrong:** Clicking "Alle Auszeichnungen anzeigen" (`showAll`) swaps the entire returned
JSX subtree from the carousel-track branch to the `expanded` grid branch (`FocalCarousel.tsx`
lines 357-388 vs. 390-484) — the button that had focus is unmounted, and nothing moves focus into
the newly-rendered grid or its "Weniger anzeigen" button. Collapsing back (`restoreFocusRef`)
already handles focus restoration correctly; expanding does not have the equivalent.
**Why it happens:** The `expanded` state change causes React to swap the whole `if (expanded)`
branch, which unmounts the entire non-expanded subtree including the just-clicked button.
**How to avoid:** On `setExpanded(true)`, imperatively focus the "Weniger anzeigen" button (or the
grid's `<ul>` if it should receive focus first) after the expand transition, mirroring the existing
`restoreFocusRef` pattern used for the collapse direction.
**Warning signs:** Keyboard-only manual testing (D-12) tabbing after "show all" lands on `<body>` /
resets to the top of the page instead of continuing naturally from the toggle.

### Pitfall 5: Off-screen (inactive) carousel slides remain independently tabbable
**What goes wrong:** `FocalCarousel`'s collapsed view renders **all** `visibleItems` in the DOM
(not virtualized); only the active one is visually centered/scaled via CSS opacity/filter. None of
the `itemWindow` wrapper `<div>`s have `tabindex="-1"` or `inert` applied to inactive slides, so any
interactive descendant inside an off-screen slide (e.g. a badge-stage `<button>` inside a
not-currently-visible `roleBadgeRow`) remains a normal tab stop — a keyboard user tabbing through
the page encounters every slide's interactive content in DOM order, not just the visible one.
**Why it happens:** The carousel intentionally keeps all slides mounted (for scroll-snap and
instant navigation) but never toggles `inert`/`tabindex` on the non-active ones.
**How to avoid:** Apply `inert` (or, as a fallback for older browser support if `inert` isn't
acceptable, `tabindex="-1"` cascaded onto descendant interactive elements) to every `itemWindow`
except the active one; re-evaluate on every `activeIndex` change. This is a well-documented carousel
a11y anti-pattern (WAI-ARIA APG carousel pattern explicitly calls out "content in non-visible slides
... should not be focusable").
**Warning signs:** Manual keyboard-only pass (D-12) reveals tabbing through a badge-group jumps
through many more stops than the number of visually-reachable controls.

### Pitfall 6: Memorial profiles render the member's display name as both `<h1>` and `<h2>`
**What goes wrong:** `MemberProfileMemorialHero.tsx` renders `<PageHeader title={displayName} />`
(which internally renders `<h1>{title}</h1>` — verified in `PageHeader.tsx`) **and**, a few lines
later in the same component, a second heading `<h2 className={styles.heroTitleRow}>{displayName}...</h2>`
with the identical name text. The non-memorial path (`MemberProfileHero.tsx`) does not have this
duplication — it renders exactly one `<h1>` for public view.
**Why it happens:** `PageHeader` was reused for its layout/eyebrow styling without noticing it
already provides the page's `<h1>`, then the pre-existing styled hero heading was kept as `<h2>`
on top of it.
**How to avoid:** Either drop `PageHeader`'s title usage for the memorial hero (pass no `title` /
use a different layout primitive) and keep the single styled `<h2>`... but then there is no `<h1>`
anywhere on memorial profile pages, which is worse. The correct fix is almost certainly: make the
existing styled hero text the actual `<h1>` (mirroring the non-memorial branch's
`<h1 className={styles.heroTitle}>`), and drop the redundant `PageHeader`-rendered title, keeping
`PageHeader`'s `eyebrow` styling if wanted via a different composition. This needs a concrete
decision during planning (see Open Questions) since it changes visible page structure.
**Warning signs:** axe/jest-axe will very likely flag "heading levels should only increase by one"
is NOT technically violated (h1→h2 is a valid single-step increase) but a heading-outline manual
review, or a duplicate-accessible-name check, will surface the double announcement of the same name.

## Runtime State Inventory

Not applicable — this is a presentation-layer refactor phase (CSS Modules, component split, image
config, a11y attributes), not a rename/rebrand/data-migration phase. No stored data, live service
config, OS-registered state, secrets, or renamed identifiers are involved. **Nothing found in this
category, verified by reading CONTEXT.md's domain boundary** ("This phase is presentation only... does
NOT change the DTO/contract... pagination... or the composition/state architecture").

## Code Examples

### Existing container-query pattern to copy (already correct — `FocalCarousel.module.css`)
```css
/* Source: frontend/src/components/ui/FocalCarousel.module.css (already in repo) */
.root {
  display: grid;
  gap: 12px;
  min-width: 0;
  container: focal-carousel / inline-size;
  max-width: 100%;
}

@container focal-carousel (max-width: 480px) {
  .controls {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 44px;
  }
}
```

### Existing purpose-based page-level viewport transition to keep (`page.module.css`)
```css
/* Source: frontend/src/app/members/[slug]/page.module.css (already in repo) — this is the
   D-02 pattern: collapse a semantic 2-column pairing to 1 column, not a device-specific patch. */
.profilePair {
  grid-template-columns: minmax(0, 8fr) minmax(0, 5fr);
}

@media (max-width: 1399px) {
  .profilePair {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

### Existing image-fallback wrapper to keep using as-is (`ResponsiveImage.tsx`)
```typescript
// Source: frontend/src/components/ui/ResponsiveImage.tsx (already in repo, 30 lines)
// Retries once, unoptimized, on the SAME display URL if the optimizer errors. No quality prop
// is set by any current caller in src/components/profile — D-07's "bound quality" work is about
// adding an explicit quality prop/default here or at call sites, not rewriting this wrapper.
export function ResponsiveImage({ src, alt, onError, ...props }: ResponsiveImageProps) {
  const [failedOptimizedSource, setFailedOptimizedSource] = useState<string | null>(null)
  const usingDisplayOriginal = failedOptimizedSource === src
  return (
    <Image {...props} src={src} alt={alt} unoptimized={usingDisplayOriginal}
      onError={(event) => { onError?.(event); setFailedOptimizedSource((s) => s === src ? s : src) }} />
  )
}
```

### Existing budget-lock pattern to extend for image KB budgets
```javascript
// Source: frontend/scripts/collect-member-profile-evidence.mjs (already in repo, --mode budget-check)
// capturePageMetrics() already returns imageWaterfall: { count, totalBytes, images: [{url, status,
// bytes, startTimeMs, responseEndMs}] } per seed profile. Extend LOCKED_BUDGETS.profiles[slug]
// with e.g. { imageWaterfall: { maxTotalBytes: <baseline * 1.2>, maxSingleImageBytes: <ceiling> } }
// and add the corresponding check inside evaluateBudget() next to the existing payload/latency checks.
const LOCKED_BUDGETS = {
  profiles: {
    sheppert: {
      initialProfile: { expectStatus: 200, maxBytes: 1952, maxMedianMs: 25 },
      // ADD: imageWaterfall: { maxTotalBytes: ..., maxSingleImageBytes: ... }
    },
  },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Unrestricted `quality` prop on `next/image` (any 1-100 value) | `images.qualities` allow-list, default `[75]`, values coerced to nearest allowed | Next.js 16 (this repo's installed major version) `[CITED: nextjs.org/docs/app/api-reference/components/image]` | D-07's "begrenzte Qualität" is directly enforceable at the `next.config.mjs` level, not just by convention at call sites |
| Any local-IP image source auto-optimized | `dangerouslyAllowLocalIP` required explicit opt-in, docs say "not recommended for most users" outside private networks | Next.js 16 `[CITED: nextjs.org/docs/app/guides/upgrading/version-16]` | Confirms D-09's dev/test-only restriction is not just a house rule but aligned with the framework's own security guidance |

**Deprecated/outdated:** none identified specific to this phase's scope — no legacy CSS
methodology, deprecated ARIA pattern, or superseded Next.js image API is in use that needs
replacing beyond what's captured above.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `jest-axe` (not `vitest-axe` or a Playwright-based axe integration) is the right automated a11y tool for this stack | Standard Stack / Alternatives Considered | Low — `jest-axe` is a thin matcher over `axe-core` and both work interchangeably at the API level with Vitest; switching later is a small change confined to test setup files |
| A2 | The exact new CSS module file names/boundaries proposed in "Recommended Project Structure" are the right split | Architecture Patterns | Low-Medium — CONTEXT.md's D-04 explicitly leaves "exact module split boundaries/names" to Claude's discretion; the proposed split is derived directly from the `.tsx` file's existing function boundaries (`FamilyCollectionCard`, `AnimeProjectAchievementStage`, etc.) and CSS comment markers ("Phase 123", "Phase 124", "Phase 125", "Phase 126"), so it should be low-risk, but the planner should confirm final names during plan-writing |
| A3 | The correct fix for Pitfall 6 (memorial hero duplicate heading) is to make the styled hero text the real `<h1>` and drop `PageHeader`'s title-as-h1, rather than the reverse | Common Pitfalls #6 | Medium — this changes visible heading structure/styling on memorial profiles; if a `/gsd:ui-phase 133` UI-SPEC exists or gets created, it should confirm this before implementation, since it affects visual layout, not just semantics |
| A4 | `webpinfo`/`dwebp`/`cwebp` (needed by `verify-profile-image-delivery.mjs`'s alpha-channel check) are available inside the `team4sv30-frontend` Docker container but NOT on the bare host — confirmed by direct check in this session | Environment Availability | Low — directly verified via `docker exec`, not assumed; included here only because the *conclusion* (run image-correctness scripts inside the container, not on host) is a recommendation the planner should follow |

## Open Questions

1. **Should `MemberBadgeChain.tsx` (928 lines) be split into per-stage component files alongside the CSS split?**
   - What we know: CLAUDE.md's 450-line limit applies to all production code files, and this file
     already exceeds it by more than 2×. CONTEXT.md's D-04 only explicitly scopes the *CSS*
     module split ("Split oversized profile CSS - notably MemberBadgeChain.module.css").
   - What's unclear: Whether splitting the `.tsx` file is in-scope for Phase 133 or should be
     deferred/flagged as separate follow-up debt, since it's not named in the phase's deliverables
     or success criteria (which are about CSS/responsiveness/a11y/images, not component-file size).
   - Recommendation: Flag this explicitly to the user/planner as a scope boundary decision before
     planning tasks — either (a) split the `.tsx` file in this phase since it's the same file being
     touched for CSS-module import updates anyway (low incremental cost, keeps CLAUDE.md compliant),
     or (b) explicitly log it as accepted pre-existing debt out of this phase's scope in STATE.md,
     consistent with how the codebase already tracks other oversized files (e.g.
     `member_profile_repository.go` ~1810 lines, explicitly deferred in Phase 131's context).

2. **Is `RoleBadgeCard.module.css` still over 450 lines after de-duplication, and if so, how should it be split further?**
   - What we know: The role-card CSS spans roughly lines 290-470, 579-585, 606-931, 1329-1530,
     1553-2005 of the current file (base rules + six responsive breakpoints: 480/520/900/1099/1440/1600/2100px)
     — even after removing the ~4 duplicate-selector blocks identified above, this is likely the
     single largest remaining chunk and may still exceed 450 lines.
   - What's unclear: Whether consolidating redundant/overlapping breakpoint rules (several of the
     6 breakpoints set near-identical properties with only minor value changes — e.g. three separate
     `@media (min-width: 1440px)` blocks touching `.roleStatus`/`.roleCount` at lines 321, 1629, and
     1971 that could likely merge into one) will bring it under 450 alone, or whether a second file
     (e.g. `RoleBadgeCard.module.css` for base/mobile + `RoleBadgeCard.wide.module.css` for the
     1440/1600/2100px desktop-scale variants) is needed.
   - Recommendation: Do the duplicate/redundant-breakpoint consolidation FIRST (this alone may
     resolve much of D-05's line-count pressure), then re-measure before deciding whether to split
     further; treat this as a plan-time verification step, not a pre-decided file count.

3. **Does the CSS-module split risk any visual regression the D-06 "per-section visual spot-check" catches, or does it need production-build screenshot diffing?**
   - What we know: D-06 explicitly adds narrow/intermediate/wide/400%-zoom spot-checks per section
     as a deviation from the bundled-UAT default, specifically because "CSS regressions are hard to
     catch automatically." `collect-member-profile-evidence.mjs`'s `--mode phase120` (original mode)
     already captures full-page screenshots per viewport for two profile states.
   - What's unclear: Whether the planner should reuse/extend the `phase120` screenshot capture mode
     as the mechanical backbone for D-06's spot-checks (comparing before/after screenshots per
     section) or whether D-06 is meant to be a manual-only checklist.
   - Recommendation: Since automated pixel-diffing is a heavier addition than this phase's scope
     implies, treat D-06 as manual-with-recorded-evidence (screenshots captured, compared by a
     human) unless the planner finds explicit budget for automated visual regression tooling —
     flag this as a discretion point for planning, not something research should resolve unilaterally.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All scripts, Vitest, build | ✓ (host) | v24.19.0 | — |
| npm | Package install | ✓ (host) | 11.17.0 | — |
| Docker Compose stack (`team4sv30-*`) | Live server for evidence/UAT scripts | ✓ | frontend on :3000, backend on :18092, Postgres on :5433 | — |
| `webpinfo`/`dwebp`/`cwebp` (libwebp tools) | `verify-profile-image-delivery.mjs`'s alpha-channel/format checks | ✗ on host, ✓ inside `team4sv30-frontend` container | n/a (host) | Run image-correctness scripts via `docker exec team4sv30-frontend node scripts/...` rather than directly on the host, or `apt install webp` on host if host-side execution is required |
| `axe-core` / `jest-axe` | PMA11Y-01..04 automated evidence (D-12) | ✗ (not installed anywhere yet) | — | Install as new devDependency (see Standard Stack); no viable fallback — this is genuinely new tooling needed for the phase's evidence requirement |
| Playwright browsers (Chromium) | `collect-member-profile-evidence.mjs` | ✓ (already used by Phase 131's scripts) | 1.55.0 | — |

**Missing dependencies with no fallback:**
- `axe-core`/`jest-axe` — must be installed; this is the one genuinely new addition in the phase.

**Missing dependencies with fallback:**
- `webpinfo`/`dwebp`/`cwebp` on host — run via `docker exec` into the frontend container instead.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (jsdom environment), configured in `frontend/vitest.config.ts` |
| Config file | `frontend/vitest.config.ts` (existing; no axe-specific config file needed — matcher registered via a setup import) |
| Quick run command | `cd frontend && npx vitest run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` |
| Full suite command | `cd frontend && npm test` (runs `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PMUI-04/05/07 | CSS-module split preserves rendered class names/behavior | unit (existing RTL tests) | `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ (2063 lines, extensive existing coverage) |
| PMA11Y-01 | Single, non-duplicated heading hierarchy per profile state (incl. memorial) | unit + axe | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` | ✅ exists (537 lines) — extend with a heading-count/`toHaveNoViolations` assertion; ❌ Wave 0 for the axe assertion itself |
| PMA11Y-02/03 | `FocalCarousel` keyboard nav, expand/collapse focus management, `aria-expanded`/`aria-controls` | unit (RTL `userEvent`) + axe | `npx vitest run src/components/ui/FocalCarousel.test.tsx` | ✅ exists — extend with focus-after-expand assertion (Pitfall 4) and inert/tabindex-on-inactive-slide assertion (Pitfall 5); both are ❌ Wave 0 additions |
| PMA11Y-04 | No axe violations on rendered profile sections | unit (axe) | new test using `jest-axe`'s `toHaveNoViolations()` | ❌ Wave 0 — `jest-axe` not installed yet |
| PMPF-06/08 | Image budget within locked KB ceilings on both seed profiles | script-driven (Playwright, not Vitest) | `node frontend/scripts/collect-member-profile-evidence.mjs --mode budget-check --output-dir <dir>` (extended) | ✅ script exists, ❌ image-budget assertions inside it are Wave 0 additions |
| PMUI-01/06 | No document-level horizontal overflow at narrow/400% zoom | manual + existing `pageOverflow`/`bodyOverflow` capture in `collect-member-profile-evidence.mjs`'s `snapshotDOM()` | `node frontend/scripts/collect-member-profile-evidence.mjs` (phase120 mode already captures `pageOverflow`/`bodyOverflow`) | ✅ capture exists; turning it into a hard assertion (vs. just recorded) is a Wave 0 addition if desired |

### Sampling Rate
- **Per task commit:** targeted Vitest file(s) for the component/CSS module touched
- **Per wave merge:** `cd frontend && npm test` (full Vitest suite) + `npm run lint` + `npm run typecheck`
- **Phase gate:** Full suite green, plus `collect-member-profile-evidence.mjs --mode budget-check` passing on both seed profiles, before `/gsd:verify-work`. D-06's per-section visual spot-checks and D-12's manual keyboard/zoom/screen-reader pass are additional non-automated gates specific to this phase.

### Wave 0 Gaps
- [ ] `npm install --save-dev axe-core jest-axe` + a shared test-setup helper (e.g.
      `frontend/src/test/axeSetup.ts`) registering `expect.extend(toHaveNoViolations)` — no such
      setup file exists yet; `vitest.config.ts` has no `setupFiles` entry today.
- [ ] Decide and record the canonical `.roleLabel`/`.roleBadgeRow` resolved values (Pattern 1 above)
      before extraction — this is a content decision, not purely mechanical.
- [ ] Decide the `MemberProfileMemorialHero` heading fix (Pitfall 6 / A3) before writing its test.

*(Existing Vitest/RTL infrastructure otherwise fully covers this phase's component-level testing
needs — no new test runner, no new component-testing library required.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Out of scope — no auth logic touched this phase |
| V3 Session Management | no | Out of scope |
| V4 Access Control | no | Out of scope — Phase 128 owns this |
| V5 Input Validation | no | No new user input surfaces introduced |
| V6 Cryptography | no | Not applicable |
| V13 (API/Config security, closest fit for image-optimizer SSRF risk) | yes | `next.config.mjs` `images.localPatterns`/`remotePatterns` allow-listing + `dangerouslyAllowLocalIP` env-gating (D-09) is the concrete control |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via Next.js image optimizer requesting arbitrary local-network URLs | Tampering / Information Disclosure | `images.localPatterns`/`remotePatterns` allow-lists (already in place) + `dangerouslyAllowLocalIP` restricted to non-production environments (currently missing — Pitfall 2) |
| Accidental allow-list narrowing during config refactor breaking `/media/**` | Denial of Service (self-inflicted) | Regression test in `ResponsiveImage.config.test.ts` asserting `/media/**` paths still `hasLocalMatch` after any `next.config.mjs` edit |

## Sources

### Primary (HIGH confidence)
- Direct file reads in this repository: `frontend/src/components/profile/MemberBadgeChain.{tsx,module.css}`,
  `profile.module.css`, `frontend/src/app/members/[slug]/page.module.css`,
  `frontend/src/components/ui/FocalCarousel.{tsx,module.css}`, `ResponsiveImage.tsx`,
  `ResponsiveImage.config.test.ts`, `frontend/next.config.mjs`,
  `frontend/scripts/verify-profile-image-delivery.mjs`, `frontend/scripts/collect-member-profile-evidence.mjs`,
  `frontend/src/components/profile/MemberProfileHero.tsx`, `MemberProfileMemorialHero.tsx`,
  `frontend/src/components/ui/PageHeader.tsx`, `SectionHeader.tsx`, `frontend/package.json`,
  `frontend/vitest.config.ts`, `frontend/eslint.config.mjs`
- https://nextjs.org/docs/app/api-reference/components/image — `images.qualities` allow-list behavior in Next.js 16
- https://nextjs.org/docs/app/guides/upgrading/version-16 — `dangerouslyAllowLocalIP` security guidance

### Secondary (MEDIUM confidence)
- `npm view axe-core version` / `npm view jest-axe version repository.url time.created` / npmjs.org
  download-count API — registry facts about packages whose *names* came from training knowledge

### Tertiary (LOW confidence)
- None — all findings above were either directly verified against this repo's files or against
  official Next.js documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new production dependency; the one new dev dependency (`jest-axe`)
  is a mature, high-download, verifiably real package, tagged `[ASSUMED]` only due to the
  provenance rule (slopcheck unavailable), not due to any actual doubt about its legitimacy
- Architecture (CSS split plan): HIGH — every line-range and duplicate-selector claim was verified
  by direct `grep`/`Read` of the actual file, not inferred
- Pitfalls (a11y gaps, image-budget-script mismatch, `dangerouslyAllowLocalIP` gap): HIGH — each
  was confirmed by reading the actual implementation, not assumed from the phase description

**Research date:** 2026-08-15
**Valid until:** 2026-09-14 (30 days — this is a fast-moving area of the codebase under active
milestone development; re-verify line numbers/selector locations if Phase 130-132 work has
touched these files further before Phase 133 planning begins)
