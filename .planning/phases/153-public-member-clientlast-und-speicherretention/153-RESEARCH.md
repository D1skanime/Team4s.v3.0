# Phase 153: Public-Member-Profil — Speicherretention, Importgraph, SSR-Sichtbarkeit - Research

**Researched:** 2026-09-09
**Domain:** Next.js 16 App Router (React 18.3.1) — image loading attributes, code-splitting/import-graph hygiene, SSR/hydration visibility timing
**Confidence:** HIGH

## Summary

This phase is a targeted, evidence-driven correction of three P1 root causes documented in
`docs/audits/2026-09-09-public-member-performance/REPORT.md` (commit `592df665`). It is **not**
exploratory research into "what stack should we use" — the codebase, libraries, and architecture
are already fixed by the project. All three workstreams are single-repository, no-new-dependency
fixes. This research verified every code location named in `153-USER-REQUEST.md` and
`153-UI-SPEC.md` directly in the running repository (HEAD `9f9a45f3`, working tree clean, same
tree as audited) and confirms the user-request's factual claims are accurate as of this session.

**Workstream A (RCA-01):** Confirmed — `AchievementArtwork.tsx:37` is the **only** call site in the
entire `frontend/src` tree that uses `sizes="auto"`/`` `auto, ...` ``. `HERO_SIZES` (192/216/240px
at 0/562/658px container breakpoints) and `STAGE_SIZES` (64/80px at 0/562px) already match
`AchievementArtwork.module.css`'s actual `.hero`/`.stage` container-query breakpoints exactly
(verified byte-for-byte against `@container achievement-card` rules) — no CSS realignment is
needed, only removal of the `auto,` prefix. Two existing test files
(`AchievementArtwork.test.tsx`, `MemberBadgeChain.test.tsx`) assert the current `auto,`-prefixed
string and **must be updated** as part of this fix, not left to fail.

**Workstream B (RCA-02):** Confirmed — `components/editor/index.ts` is a 4-line barrel exporting
`RichTextEditor`, `RichTextRenderer`, `ColorTokenExtension`, `COLOR_TOKENS` from one module.
`RichTextRenderer.tsx` itself has zero Tiptap/ProseMirror imports (only its CSS module + `dangerouslySetInnerHTML`
of pre-sanitized `bodyHtml`). Grepping all barrel consumers found **exactly the four renderer-only
files** named in the user-request, confirming no fifth hidden consumer, and **six** true
`RichTextEditor` consumers (three of which — `ProfileStoryCard.tsx`, `NotesTab.helpers.tsx`,
`AnimeProjectNoteWorkspace.tsx` — legitimately import both symbols in the same admin/private-edit
file). `not-found.tsx` for `/members/[slug]` unconditionally renders `OwnHiddenProfilePreview`,
which is a client component that imports the full `MemberProfileContent` composition — confirmed
this is the only content of that route segment (4 lines).

**Workstream C (RCA-03):** Confirmed — three components (`MemberCurrentProjectsSection.tsx`,
`LatestContributionsSection.tsx`, `PreviousContributionsSection.tsx`) all use the identical
`data-visible="false"`-once-`interactionEnabled` CSS-overlay-over-real-content anti-pattern
(`opacity: 0; visibility: hidden` triggered by a sibling attribute), and `MemberBadgeChain.tsx`
uses the structurally identical pattern via a `:has()` CSS selector keyed to
`data-interaction-enabled` set by `FocalCarousel`'s internals. `LatestContributionsSection.tsx:160`
already demonstrates the Rules-of-Hooks-compliant "call all hooks first, then `return null`"
pattern the UI-SPEC wants extended to `MemberCurrentProjectsSection`. No `next/dynamic`,
`React.lazy`, or content-level `<Suspense>` boundary exists anywhere in this codebase today — this
phase's C3 requirement (independent per-section loading boundaries) will be the **first** use of
code-split loading boundaries in this repo, which the planner must treat as new-pattern work, not
"reuse an existing pattern," despite the Grundprinzipien's general reuse mandate (that mandate's
named examples — `RichTextRenderer`, `AchievementArtwork`, `ResponsiveImage`, "Phase-151-Slots" —
do not include a loading-boundary primitive; "Phase-151-Slots" refers to the
`AchievementArtwork`/`.module.css` image-geometry-reservation contract from Phase 151, not to a
Suspense/dynamic-import pattern).

**Primary recommendation:** Execute the three workstreams largely independently (A has zero
overlap with B/C; B's barrel-import fix and not-found loading-boundary fix are independent of each
other; C's visibility-gate rewire touches four sibling components with one shared template). Reuse
the exact `LatestContributionsSection.tsx:160` "hooks-then-early-return" shape for
`MemberCurrentProjectsSection`'s new zero-total-count branch. Keep `MemberBadgeChain`'s full
rendered badge/tier set untouched — only its skeleton-visibility *timing* changes. Update the two
stale test files in the same task as the Workstream A code change so `vitest run` does not regress.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Responsive image `sizes` selection (A) | Browser / Client (native `<img>` attribute) | Frontend Server (SSR renders the attribute value) | The `sizes` string is computed server-side (it's a pure function of `size`/`priority` props) but its *effect* (srcset source selection, retention behavior) is entirely a browser-native mechanism outside React's control |
| Public import graph / bundle composition (B) | Frontend Server (SSR, Webpack/Next bundler) | Browser / Client (what actually downloads and executes) | Which modules end up in a route's client chunk is decided at build time by which files are statically imported from a Client Component subtree; this is a build/bundler-tier concern even though the symptom is client-side download weight |
| Private not-found preview access gating (B4) | Frontend Server (route segment `not-found.tsx`) | API / Backend (owner/visibility check inside `useMemberViewer`) | The route-segment choice of *what to render* is frontend-server-owned; the actual authorization decision (is this viewer the owner) is already correctly delegated to the backend-verified viewer resolution behind `useMemberViewer` — B4 must not touch that boundary |
| SSR-visible-vs-skeleton content gating (C) | Frontend Server (SSR emits real markup) | Browser / Client (CSS + hydration-driven `interactionEnabled` currently gates visibility, incorrectly) | The defect is a client-tier CSS rule keyed to a client-tier signal masking server-tier-already-correct markup; the fix moves the *visibility* decision back to being implicit in the SSR markup (visible by default) while narrowing the client-tier signal to genuinely-loading sub-states only |
| Empty-section server decision (C2) | Frontend Server (`MemberProfileContent`, a Server Component) | — | `MemberProfileContent` already receives `totalCount`/`length` values from the server-fetched profile and can decide *before* handing off to any Client Component whether a section has content; this tier ownership already exists for the `hasContributions` gate and should be extended, not invented |

## User Constraints

> No `CONTEXT.md` exists for this phase. Per phase description, `153-USER-REQUEST.md` is the
> **verbindliche Auftragsquelle** and plays the role CONTEXT.md normally plays. Copied verbatim
> (translated section headers kept in German as in the source) below.

### Locked Decisions (from `153-USER-REQUEST.md` §Requirements + §Grundprinzipien)

- **A1/A3/A4:** Remove the `auto` prefix from the `sizes` descriptor; the existing deterministic
  `HERO_SIZES`/`STAGE_SIZES` apply to lazy **and** priority images alike. If CSS slot sizes and the
  constants disagree, align the constants to CSS truth (verified in this research: they already
  agree, no realignment needed). Treat any other `sizes="auto"`/`` `auto,` `` call site the same way
  (verified: none exist).
- **A2:** Lazy loading stays. **Do not** switch to global `eager` — the audit explicitly names this
  a premature/wrong fix. Reserved geometry, optimizer usage, `srcset`, and image sharpness must
  remain provably unchanged.
- **B1/B2:** All four renderer-only consumers (`MemberStorySection.tsx`,
  `MemberGroupsHistorySection.tsx`, `PublicNoteCard.tsx`, `AnimeProjectNotesSection.tsx`) import
  `RichTextRenderer` directly from its own module, not the barrel. The barrel stays usable for real
  editor consumers. No second renderer, no copy, no parallel architecture.
- **B3:** A decision on the barrel's future shape (keep `RichTextEditor` in the barrel vs. split
  entry points) must be made **and documented with reasoning** — not silently decided.
- **B4:** The private not-found full preview gets a real loading boundary so its client code is no
  longer part of the successful public profile bundle. Owner/privacy logic and preview
  functionality for the legitimate owner must remain unchanged and regression-tested.
- **B5:** No behavioral or visual difference in rendered rich text. The Phase 152 Tiptap link
  contract stays intact.
- **C1/C6:** Publicly available server-rendered content is visible without waiting for the client
  graph. Skeletons show only genuine loading states, not hydration progress. Data, SEO, and
  accessibility stay unchanged; isolate per-section failures instead of decomposing the whole page.
- **C2/C5:** Empty sections are decided server-side. A profile with no projects/contributions/story
  does not mount full client empty-state/pagination scaffolding for those sections. **Binding
  exception, do not deviate:** `MemberBadgeChain`'s full locked badge ladder stays exactly as
  visually complete on an empty profile as it is today — this is a deliberate, already-made product
  decision (RCA-03 is a *timing* defect, not a *scope* defect for the badge ladder). Only its
  skeleton *timing* is in scope. The audit's own A/B number (`kara` 606 → 172 elements when the
  entire badge section is removed) is explicitly **not** a target for this phase and must not be
  used as a pass/fail criterion by any verifier.
- **C3/C4:** Replace the one shared hydration-gated composition with smaller independently-mounted
  interactive islands with real loading boundaries. **Forbidden fixes, do not implement or
  propose:** tuning `ACTIVATION_ROOT_MARGIN` or any skeleton timer/debounce/transition duration as
  a substitute fix; disabling features behind `typeof window === 'undefined'`/no-JS fallbacks (the
  audit proved this makes skeletons never clear at all).
- **D1:** A before/after measurement under report conditions goes into a **new** audit document;
  the existing `REPORT.md` is not overwritten.
- **D2/D3:** Regression tests for all three workstreams pass; the existing frontend test suite
  passes; production build passes via `docker compose build` (not `exec ... npm run build`, whose
  polluted `.next` volume reports false prerender errors). A retention/bundle gate should be
  evaluated as a permanent regression guard.
- **D4:** RCA-04 (the reported Chrome tab crash) stays explicitly open. No "crash fixed" claim. The
  phase may only claim the auto-sizes retention is eliminated; whether that explains the reported
  crash is a separate, later, user-Chrome observation task.
- **D5:** Three pre-existing, phase-foreign defects (confirmed still present in this research pass,
  see Common Pitfalls) are documented and explicitly scoped out, not silently fixed or silently
  ignored without evidence.

### Claude's Discretion

- Exact mechanics of "smaller interactive islands with real loading boundaries" (C3) — this
  codebase has no prior `next/dynamic`/`Suspense`/`React.lazy` precedent; the implementer must
  choose and justify a concrete mechanism (see Architecture Patterns below for the two realistic
  options and their tradeoffs).
- The B3 barrel-structure decision itself (keep vs. split) — the user-request requires a documented
  decision, not a predetermined one.
- Exact shape of the D2 "permanent regression guard" (vitest-based static grep-check vs.
  Playwright-based CI gate vs. both) — user-request says "ist zu prüfen" (to be evaluated), not
  mandated.

### Deferred Ideas (OUT OF SCOPE)

- RCA-05 (sequential aggregator, four redundant fact queries) — Phase 154.
- RCA-06 (locked project artwork heavy original-PNG fallback, animated avatar) — Phase 154.
- RCA-07 (initial empty React-root-commit repetitions) — explicitly to be re-measured only *after*
  the import-graph shrinks, i.e. not meaningfully measurable before Phase 154.
- RCA-08 (viewer resolution duplicate fetch, unused `AbortSignal`) — Phase 154.
- The unreproduced personal Chrome tab crash (RCA-04) itself — stays open, not a phase goal.
- Any reduction of `MemberBadgeChain`'s rendered badge/family/tier count for an empty profile —
  explicitly forbidden even though it would incidentally reduce DOM element count (see C2/C5
  above).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P153-01 | Remove `auto` prefix from `sizes`; deterministic, CSS-aligned responsive `sizes` for hero/stage; treat other `auto` call sites | Confirmed single call site `AchievementArtwork.tsx:37`; confirmed `HERO_SIZES`/`STAGE_SIZES` already match CSS breakpoints exactly; confirmed 0 other `sizes="auto"` sites repo-wide |
| P153-02 | Lazy loading, reserved geometry, optimizer, `srcset`, sharpness unchanged; no global `eager` | `ResponsiveImage.tsx` unaffected by this change (only forwards `sizes` prop verbatim to `next/image`); confirmed no Next.js-side special-casing of the literal string `"auto"` in installed `next` package (`get-img-props.js` grep) |
| P153-03 | No linear DOM/listener retention over 12 and 50 SPA cycles | `audit-public-member-navigation-retention.mjs` already supports `AUDIT_CYCLES` env var and `AUDIT_IMAGE_INTERVENTION=no-auto-sizes` isolated-variable mode — reusable as-is for verification |
| P153-04 | Four renderer-only consumers import `RichTextRenderer` directly | Confirmed exact import lines in all four files; direct path is `@/components/editor/RichTextRenderer` |
| P153-05 | Barrel-structure decision documented | See Architecture Patterns → Don't Hand-Roll section for the two options and their tradeoffs; six existing `RichTextEditor` consumers enumerated |
| P153-06 | Not-found full preview behind real loading boundary; owner/privacy logic unchanged, regression-tested | `not-found.tsx` confirmed to be a 4-line unconditional render of `OwnHiddenProfilePreview`; `OwnHiddenProfilePreview.test.tsx` exists already (regression harness present) |
| P153-07 | No Tiptap/ProseMirror/RichTextEditor in public import graph; rendering + Phase 152 link contract unchanged; DEV+prod bytes remeasured | `audit-public-member-bundles.mjs` already categorizes `tiptap`/`prosemirror`/`editor` module buckets — reusable directly |
| P153-08 | SSR content visible before hydration; data/SEO/a11y unchanged | Confirmed exact CSS overlay mechanism (`opacity`/`visibility` keyed to `data-visible`/`:has([data-interaction-enabled])`) in all four components |
| P153-09 | Empty sections server-decided; badge-ladder scope explicitly clarified (kept full) | `hasContributions` gate in `MemberProfileContent.tsx:56,150` is the existing template; badge-ladder exception is locked (see User Constraints) |
| P153-10 | Smaller interactive islands with real loading boundaries; no timer/rootMargin cosmetic fix | Confirmed no existing `Suspense`/`dynamic` precedent in this codebase — new pattern, see Architecture Patterns |
| P153-11 | New before/after audit document under report conditions; existing report unchanged | `REPRODUCE.md` documents exact reusable invocation commands and env vars for all audit scripts |
| P153-12 | Regression tests + full suite + `docker compose build` green; retention/bundle gate evaluated | Confirmed test command (`vitest run`), confirmed `docker compose build` vs `exec ... npm run build` distinction is a real, already-documented pitfall |
| P153-13 | RCA-04 stays open, no crash-fixed claim | Direct requirement, no additional code research needed — documentation discipline only |
| P153-14 | Pre-existing phase-foreign defects named, not silently touched | All three confirmed still present in this session (see Common Pitfalls) |

## Standard Stack

No new libraries are introduced by this phase. All three workstreams are corrections within the
existing stack.

### Core (already in use, relevant to this phase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^16.1.6 [VERIFIED: frontend/package.json] | App Router, `next/image`, bundler | Already the project's framework; no alternative considered |
| react / react-dom | 18.3.1 [VERIFIED: frontend/package.json] | Client/server component runtime | Already the project's runtime |
| playwright | 1.55.0 [VERIFIED: frontend/package.json] | Headless-browser audit scripts (Workstream D) | Already a devDependency; the three named audit scripts already depend on it |
| vitest | ^3.2.4 [VERIFIED: frontend/package.json] | Unit/component test runner | Already the project's test runner |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual `next/dynamic` + `Suspense` for C3 islands | A UI framework's built-in streaming/partial-prerendering feature | Next.js 16 App Router already supports React `Suspense` streaming natively for Server Components; no extra library needed, so this is not a real alternative — it is the mechanism itself (see Architecture Patterns) |
| Route-segment `loading.tsx` (already used 3x elsewhere in this repo) for B4 | Ad-hoc client-side conditional render (today's state) | `loading.tsx` only fires while the **whole route segment's Server Component** is resolving; `not-found.tsx` has no async Server Component work to await (its only content is a fully client component), so a `loading.tsx` sibling would not by itself defer `OwnHiddenProfilePreview`'s bundle — `next/dynamic(..., { ssr: false, loading: ... })` inside `not-found.tsx` is the mechanism that actually defers the client chunk |

**Installation:** none — no `npm install` required for this phase.

## Package Legitimacy Audit

Not applicable — this phase installs no new packages. All work is a refactor/correction within
already-installed dependencies (`next`, `react`, `playwright`, `vitest`, existing internal
`@/components/ui`, `@/components/editor` modules). No `Package Legitimacy Gate` run required.

## Architecture Patterns

### System Architecture Diagram — current defective flow (Workstream C)

```
Request → page.tsx (Server Component, awaits getMemberProfile)
             │
             ▼
     MemberProfileContent (Server Component)
             │  passes profile data as props into Client Components
             ▼
  ┌──────────────────────────────────────────────────────────┐
  │ Client Component tree (hydrates as ONE unit)              │
  │                                                            │
  │  MemberCurrentProjectsSection  ──┐                        │
  │  LatestContributionsSection    ──┤  each renders BOTH:    │
  │  PreviousContributionsSection  ──┤   (a) real <ul> with   │
  │  MemberBadgeChain              ──┘       SSR'd items      │
  │                                       (b) skeleton overlay │
  │                                       stacked on same      │
  │                                       grid cell, z-index 2 │
  │                                                            │
  │  useNearViewportActivation() fires on EACH component       │
  │  independently, but is gated by the SAME cost: waiting for │
  │  hydration + (for below-fold) IntersectionObserver         │
  │                                                            │
  │  skeleton CSS rule: opacity:1/visibility:visible UNTIL     │
  │  interactionEnabled flips a data-attribute → THEN hidden   │
  └──────────────────────────────────────────────────────────┘
             │
             ▼
  User sees: real content is in the HTML (View Source proves it)
  but VISUALLY sees only skeletons until hydration completes,
  because the skeleton is drawn ON TOP of the real content, not
  because the real content is actually absent.
```

### Target flow (Workstream C fix)

```
Request → page.tsx → MemberProfileContent (Server Component)
             │
             │  BEFORE handing off to any Client Component:
             │  decide per-section "has content?" server-side
             │  (extend the existing hasContributions pattern)
             ▼
  ┌───────────────────────────────────────────────────────────┐
  │ totalCount/length === 0 → render plain server EmptyState   │
  │ (no hook-driven pagination/skeleton scaffolding mounted)    │
  │                                                              │
  │ totalCount/length > 0 → mount Client Component; its FIRST   │
  │ paint shows the real SSR'd markup (no opacity:0/visibility: │
  │ hidden gate on already-rendered content); skeleton markup   │
  │ is re-scoped to ONLY the genuine async sub-state (e.g.      │
  │ pagination continuation fetch, already has a real           │
  │ loading/error state via `Button loading={isLoading}` +      │
  │ ErrorState)                                                 │
  │                                                              │
  │ interactionEnabled (from useNearViewportActivation) stays a │
  │ legitimate gate ONLY for interactive affordances (button    │
  │ disabled state, pointer/drag/keyboard handlers) — never for │
  │ hiding already-rendered content                             │
  └───────────────────────────────────────────────────────────┘
             │
  MemberBadgeChain: SAME visibility-timing fix applied to its    │
  carouselSkeleton, but its rendered badge/family/tier SET stays │
  100% unchanged (binding exception, do not reduce)              │
```

### Recommended Project Structure

No new directories. Files touched, by workstream:

```
frontend/src/components/profile/AchievementArtwork.tsx          # A: sizes fix
frontend/src/components/profile/AchievementArtwork.test.tsx     # A: update stale assertions
frontend/src/components/profile/MemberBadgeChain.test.tsx       # A: update stale assertions (sizes strings)
                                                                  #    + C: skeleton-timing test updates

frontend/src/components/editor/index.ts                         # B3: barrel decision (keep/split)
frontend/src/components/profile/MemberStorySection.tsx          # B1: direct RichTextRenderer import
frontend/src/components/profile/MemberGroupsHistorySection.tsx  # B1: direct import
frontend/src/components/public/PublicNoteCard.tsx                # B1: direct import
frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx # B1: direct import
frontend/src/app/members/[slug]/not-found.tsx                    # B4: real loading boundary
frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx # B4: regression coverage to extend

frontend/src/components/profile/MemberCurrentProjectsSection.tsx      # C: visibility gate + C2 empty-decision
frontend/src/components/profile/MemberCurrentProjectsSection.module.css
frontend/src/components/profile/LatestContributionsSection.tsx        # C: visibility gate
frontend/src/components/profile/LatestContributionsSection.module.css
frontend/src/components/profile/PreviousContributionsSection.tsx      # C: visibility gate (sibling consistency)
frontend/src/components/profile/PreviousContributionsSection.module.css
frontend/src/components/profile/MemberBadgeChain.tsx                  # C: visibility-timing only, NOT content
frontend/src/components/profile/MemberBadgeChain.module.css
frontend/src/app/members/[slug]/MemberProfileContent.tsx              # C2: extend hasContributions-style gating

docs/audits/2026-09-09-public-member-performance/153-AFTER.md   # D1: new audit doc (exact filename TBD by planner)
```

### Pattern 1: Deterministic responsive `sizes` (Workstream A)

**What:** Replace `` `auto, ${fallbackSizes}` `` with `fallbackSizes` directly, for both lazy and
priority images — the `priority ? fallbackSizes : ...` branch collapses to always `fallbackSizes`.
**When to use:** Any `next/image`/`ResponsiveImage` consumer where the rendered slot size is fully
known from CSS breakpoints ahead of time (true here — `AchievementArtwork.module.css` container
queries are static, not data-dependent).
**Example:**
```tsx
// Source: frontend/src/components/profile/AchievementArtwork.tsx (current, line 35-38)
const fallbackSizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES
// Native lazy-image auto sizes use the actual container layout without per-card observers.
const sizes = priority ? fallbackSizes : `auto, ${fallbackSizes}`
const loading = priority ? undefined : 'lazy'

// Target shape:
const sizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES
const loading = priority ? undefined : 'lazy'
```
Note: this makes the `priority`-conditional branch on `sizes` dead code — the planner should decide
whether to keep the ternary for readability/symmetry with `loading` or simplify to a single
assignment. Either is behaviorally identical; simplifying reduces one branch to reason about.

**Verified:** `HERO_SIZES = '(min-width: 658px) 240px, (min-width: 562px) 216px, 192px'` and
`STAGE_SIZES = '(min-width: 562px) 80px, 64px'` (`AchievementArtwork.tsx:20-21`) match
`AchievementArtwork.module.css`'s `.hero`/`.stage` base sizes (192px/64px) and
`@container achievement-card (min-width: 562px)` / `(min-width: 658px)` breakpoint values exactly
— confirmed byte-for-byte in this research session. **No CSS realignment work exists for A3** —
document this explicitly in the plan so the executor does not go looking for a mismatch that
does not exist.

### Pattern 2: Direct module import instead of barrel (Workstream B1)

**What:** Renderer-only consumers import `RichTextRenderer` from its own file, not the barrel.
**When to use:** Any consumer that only needs `RichTextRenderer` and never `RichTextEditor`.
**Example:**
```tsx
// Before (frontend/src/components/profile/MemberStorySection.tsx:5, and identically in the
// other three files):
import { RichTextRenderer } from '@/components/editor'

// After:
import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
```
Apply identically to `MemberGroupsHistorySection.tsx:10`, `PublicNoteCard.tsx:7`,
`AnimeProjectNotesSection.tsx:6`. Do **not** touch the six files that import `RichTextEditor`
(`ProfileStoryCard.tsx`, `ReleaseVersionNotesTab.tsx`, `AnimeProjectNoteForm.tsx`,
`NotesTab.helpers.tsx`, `AnimeProjectNoteWorkspace.tsx`, `dev/ui-system/showcase/ProjectNoteShowcase.tsx`)
— they remain on the barrel per B2 ("barrel bleibt für echte Editor-Konsumenten nutzbar"), unless
the B3 decision (see Don't Hand-Roll below) chooses a split that also changes these six call sites.

### Pattern 3: Real loading boundary via `next/dynamic` (Workstream B4, and a candidate for C3)

**What:** Defer a client-only, owner-gated composition's bundle out of the parent segment's chunk.
**When to use:** `not-found.tsx` has no Server Component data-fetching step to await (unlike
`page.tsx`, which already awaits `getMemberProfile` and can rely on `loading.tsx`); its entire
content is `OwnHiddenProfilePreview`, a `'use client'` component. A sibling `loading.tsx` file
would not defer this bundle, because Next.js's `loading.tsx` mechanism activates while a route
segment's **Server** work is pending — there is no pending Server work here to hang a
`Suspense` boundary off of implicitly. `next/dynamic` with `ssr: false` (or `React.lazy` +
an explicit `<Suspense>` wrapper, since `OwnHiddenProfilePreview` is itself `'use client'` and
does all its data-fetching client-side via `useMemberViewer`) is the mechanism that produces a
genuinely separate chunk, loaded only when the not-found segment actually renders.
**Example (illustrative shape, not to be copy-pasted without verifying current Next 16 dynamic API):**
```tsx
// frontend/src/app/members/[slug]/not-found.tsx — target shape
import dynamic from 'next/dynamic'
import { LoadingState } from '@/components/ui'

const OwnHiddenProfilePreview = dynamic(
  () => import('./OwnHiddenProfilePreview').then((m) => m.OwnHiddenProfilePreview),
  { ssr: false, loading: () => <LoadingState title="Profil wird geprüft." /> },
)

export default function MemberProfileNotFound() {
  return <OwnHiddenProfilePreview />
}
```
This is the **first** use of `next/dynamic` in this codebase (confirmed via repo-wide grep — zero
existing call sites). Flag this in the plan as new-pattern work; it does not violate the
Grundprinzipien "no parallel architecture" rule because it does not duplicate
`OwnHiddenProfilePreview`'s logic — it only changes how/when its existing bundle loads. Regression
test via the existing `OwnHiddenProfilePreview.test.tsx` harness, extended to assert the not-found
route still renders the same UI for an owner after the dynamic-import change (component-level
tests using `vi.mock`/testing-library do not typically need special handling for `next/dynamic`
with `ssr:false` since the mocked module resolves synchronously in the test environment — the
planner/executor must verify this empirically for this codebase's specific test setup rather than
assume it, since `next/dynamic` mocking behavior has previously undergone Next.js version changes;
this is flagged as [ASSUMED], see Assumptions Log).

### Pattern 4: Hooks-first-then-early-return for zero-content sections (Workstream C2)

**What:** Call all hooks unconditionally (Rules of Hooks compliance), then branch to a plain
`EmptyState` *before* the JSX that would otherwise mount pagination/skeleton scaffolding.
**When to use:** Any section component whose "empty" case has structurally nothing to paginate.
**Example (existing, already-correct precedent in this codebase):**
```tsx
// Source: frontend/src/components/profile/LatestContributionsSection.tsx:148-160 (verified)
export function LatestContributionsSection({ items, headingLevel = 2, referenceNow }: LatestContributionsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const { targetRef, interactionEnabled } = useNearViewportActivation<HTMLElement>()
  const allUsableItems = usableItems(items)
  const visibleItems = expanded ? allUsableItems : allUsableItems.slice(0, INITIAL_ITEM_COUNT)
  const initialVisibleItems = allUsableItems.slice(0, INITIAL_ITEM_COUNT)
  if (allUsableItems.length === 0) return null   // ← hooks already called above this line

  return ( /* ... */ )
}
```
`MemberCurrentProjectsSection` should adopt the identical shape: call
`useNearViewportActivation`/`useCancellableSlugState`/`useState` unconditionally at the top (React
requires this — hooks cannot be conditionally skipped), then branch on `totalCount === 0` to return
a plain `<EmptyState title="Keine aktuellen Projekte sichtbar." />` **before** rendering the
skeleton `<ul>`/pagination button markup. Note the nuance: "not mounting the pagination hook chain"
(per UI-SPEC wording) cannot literally mean skipping the hook *calls* (illegal in React) — it means
the hooks stay called-but-inert (their state never gets exercised because no button/fetch trigger
is ever rendered) while the *visible DOM* for skeleton/pagination scaffolding is skipped. Document
this precisely in the plan so the executor does not attempt an illegal conditional-hooks refactor.

### Pattern 5: CSS `:has()` for JS-signal-driven visibility (existing, keep the mechanism, narrow its scope)

**What:** `MemberBadgeChain.module.css` already uses `.carouselShell:has([data-interaction-enabled="true"]) > .carouselSkeleton { visibility: hidden; }` — this is a native CSS selector (Chromium/Firefox/Safari all support `:has()` at the Next 16 / Chromium 140 baseline this project targets), not a hand-rolled JS visibility toggle.
**When to use:** Keep this exact mechanism. The fix is **not** to replace `:has()` with something
else — it is to change *when the underlying real content is visually masked at all*, i.e. remove
the CSS rule that masks real, already-rendered content, while keeping (or narrowing) the rule that
masks a genuinely-empty skeleton placeholder.

### Anti-Patterns to Avoid

- **Tuning `ACTIVATION_ROOT_MARGIN` or skeleton animation timing as a "fix":** explicitly forbidden
  by C4/the UI-SPEC. This changes *when* the skeleton disappears, not *whether* real content was
  ever actually hidden — it treats the symptom's timing, not the CSS-gate-on-real-content root
  cause.
- **Global `loading="eager"` on all `AchievementArtwork` images:** explicitly forbidden by A2. The
  audit's own control experiment shows `eager` "fixes" retention only as an accidental side effect
  of skipping the `IntersectionObserver`/lazy machinery entirely, which is a much larger behavioral
  change (eagerly downloads every image immediately) than the actual root cause requires.
  Deterministic `sizes` alone (without `eager`) already reproduces the fix in the audit's own
  isolated-variable test (`production, nur Auto-Sizes entfernt`: 464 → 1,192 nodes, same order of
  magnitude as the `eager` variant's 466 → 1,194).
- **`typeof window === 'undefined'` / no-JS fallback branching as an SSR-visibility "fix":**
  explicitly forbidden by C4. The audit proved this makes skeletons never clear at all without JS.
- **Reducing `MemberBadgeChain`'s rendered badge/tier count for empty profiles:** explicitly
  forbidden even though it would technically also reduce DOM element count and superficially "look
  like" it satisfies C1/C3. This is a locked product decision, not a technical judgment call.
- **A second/parallel `RichTextRenderer`-like component to avoid touching the barrel:** explicitly
  forbidden by B2/Grundprinzipien. The fix is a different import path to the *same* existing file,
  never a new file.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deferred client bundle for a client-only, no-SSR-data route segment | A custom `useEffect`-based "mount after a tick" hack, or a hand-rolled dynamic `import()` + local loading state | `next/dynamic(() => import(...), { ssr: false, loading: ... })` | This is exactly Next.js's sanctioned primitive for this exact scenario (client-only content with no server data dependency); a hand-rolled version would duplicate `next/dynamic`'s chunk-splitting, error-boundary, and loading-state wiring worse |
| Per-section error isolation for C3/C6 | A new custom error-boundary component | React's `<Suspense>`/an existing error-boundary pattern once located, or the already-sanctioned `ErrorState` component reused per-section (per UI-SPEC — "Reuse `ErrorState`... for any new per-section error boundary") | UI-SPEC explicitly forbids inventing new skeleton/error shapes; `ErrorState` is already the project's one sanctioned per-section error visual, already used by `MemberCurrentProjectsSection`'s pagination-failure path |
| A "second" rich-text renderer to sidestep the barrel import cost | A copy of `RichTextRenderer.tsx` under a new name/path | Direct import of the existing `RichTextRenderer.tsx` from its own module path | Explicitly forbidden by B2; would immediately create the exact "second variant" divergence the project's modularity/no-parallel-architecture principle warns against, and the UI-SPEC repeats this warning almost verbatim regarding `PreviousContributionsSection` |

**Key insight:** every "don't hand-roll" item in this phase resolves to *use an existing project
primitive or an existing framework primitive correctly*, not to introduce a third-party library.
This phase's entire technical content is "stop working around your own framework's/browser's
existing capability with an ad-hoc client-side mechanism."

## Common Pitfalls

### Pitfall 1: Confusing the audit's A/B diagnostic numbers with this phase's success targets

**What goes wrong:** A verifier (human or automated) sees `kara` still has ~400+ DOM elements after
this phase and treats that as a regression, because the audit's RCA-03 A/B test showed 606 → 172
when the badge section was entirely removed.
**Why it happens:** The 172-element number was produced by an isolation experiment (remove the
whole badge section) that this phase explicitly does **not** perform — it is diagnostic evidence
of impact magnitude, not an implementation target.
**How to avoid:** State explicitly in the plan and in any verification/UAT document that the only
sanctioned element-count claim is "fewer initial modules/elements than today's baseline where
reasonably achievable outside the badge ladder" — exactly the UI-SPEC's own wording.
**Warning signs:** Any verification step that asserts a specific numeric DOM-element-count ceiling
for `kara` without explicitly carving out the badge ladder as exempt.

### Pitfall 2: Treating the `sizes="auto"` fix as also requiring a CSS realignment (A3)

**What goes wrong:** Time spent hunting for a CSS/JS size mismatch that this research confirms does
not exist.
**Why it happens:** A3's wording ("falls sie abweichen, sind sie an der CSS-Wahrheit
auszurichten") is conditional, and a plan that treats it as mandatory work wastes a task.
**How to avoid:** The plan should state as a verified fact (from this research) that
`HERO_SIZES`/`STAGE_SIZES` already match the CSS breakpoints, and scope A3 as "verify match holds
after the `auto` removal" (a check, not a change).
**Warning signs:** A task titled "align sizes to CSS" with no diff shown against CSS values.

### Pitfall 3: Breaking two stale test assertions when fixing the `sizes` string

**What goes wrong:** `vitest run` fails after the Workstream A code change because
`AchievementArtwork.test.tsx:41,89,103` and `MemberBadgeChain.test.tsx:1110,1335,1338` assert the
`auto,`-prefixed string literally.
**Why it happens:** These are legitimate regression tests for the *current* (buggy) behavior; they
must be updated, not just left failing or deleted without replacement.
**How to avoid:** Update all five assertion sites in the same task/commit as the source change, to
assert the new non-`auto` `sizes` string. Do not delete the assertions — they should continue
asserting the correct deterministic string going forward (regression protection against
regression back to `auto`).
**Warning signs:** `npm test`/`vitest run` inside the frontend container reporting failures in
these two files after the Workstream A change.

### Pitfall 4: `next/dynamic` + `vi.mock('@/components/editor', ...)`-style test mocking interactions

**What goes wrong:** Existing tests mock `@/components/editor` via `vi.mock`; if B1's direct
import path change (`@/components/editor/RichTextRenderer`) isn't mirrored in those mocks, tests
for the four renamed consumers (and any test that mocks the barrel expecting the renderer-only
files to still import through it) could silently stop exercising the mock and either pass for the
wrong reason or fail.
**Why it happens:** `vi.mock('@/components/editor', ...)` only intercepts imports of that exact
module specifier; a change to `@/components/editor/RichTextRenderer` requires either a second
`vi.mock` target or reliance on the real (safe, no-Tiptap) `RichTextRenderer.tsx` implementation.
**How to avoid:** Grep each of the four consumers' `.test.tsx` files for `vi.mock('@/components/editor'`
before changing the import, and either add a matching mock for the new specifier or confirm the
test already uses the real `RichTextRenderer` (safe, since it has no Tiptap dependency).
**Warning signs:** A renderer-only consumer's test suite passing suspiciously unchanged after the
import-path edit — verify it's still actually rendering something, not silently getting
`undefined` from an unmatched mock.

### Pitfall 5: `docker compose exec ... npm run build` false-negative production build failures

**What goes wrong:** Running the production build check via `docker compose exec -T
team4sv30-frontend npm run build` reports a prerender error that is an artifact of a
polluted/stale `.next` build-cache volume mounted into the running dev container, not a real
regression.
**Why it happens:** The running `team4sv30-frontend` service's `.next` directory is a long-lived
dev-mode volume; `npm run build` inside it can pick up stale artifacts from previous dev/build runs.
**How to avoid:** Use `docker compose build` (a fresh, isolated image build) as the authoritative
production-build gate per D3/D5, exactly as the audit report itself found (`production-build-diagnostic.log`
vs `production-build-original.log` in the audit evidence directory document this exact distinction).
**Warning signs:** A build failure that doesn't reproduce in a fresh `docker compose build`.

### Pitfall 6: Silently "fixing" the three D5-named pre-existing defects while in the neighborhood

**What goes wrong:** An executor touching `frontend/src/app/anime/page.tsx` (unrelated to this
phase) or `admin/anime/[id]/edit/page.tsx` for some incidental reason "cleans up" the pre-existing
typecheck/build defect as a drive-by fix, inflating the phase's diff and violating D5's "not
silently mitrepariert."
**Why it happens:** These defects are visible in typecheck/build output and are tempting to fix
"while you're there."
**How to avoid:** Confirmed present in this research session:
  - `frontend/src/app/anime/page.tsx:18,56-58` — `searchParams` typed as `Promise<...>` but handled
    in a way that trips the Next 16 PageProps typecheck (confirmed via direct file read).
  - `frontend/src/app/admin/anime/[id]/edit/page.tsx:26` — exports `formatEditLoadError` (a
    non-component, non-metadata named export) from a page file, which Next.js's page-export
    validation rejects at build time (confirmed via grep).
  - ESLint: confirmed **13 errors, 332 warnings, 345 total problems** in a full-repo lint run
    (`lint.log` tail, re-verified in this session — exact count matches the audit's own figure).
  These are pre-existing and out of scope; the plan should explicitly name them as "confirmed
  still present, phase-foreign, not touched" per D5, with this research's file:line evidence as the
  citation, rather than re-deriving evidence at execution time.
**Warning signs:** Any diff touching `anime/page.tsx` or `admin/anime/[id]/edit/page.tsx` without an
explicit phase-scope justification in the plan.

## Code Examples

### Current `sizes="auto"` defect (Workstream A)
```tsx
// Source: frontend/src/components/profile/AchievementArtwork.tsx:35-38 (verified this session)
const fallbackSizes = size === 'hero' ? HERO_SIZES : STAGE_SIZES
// Native lazy-image auto sizes use the actual container layout without per-card observers.
const sizes = priority ? fallbackSizes : `auto, ${fallbackSizes}`
const loading = priority ? undefined : 'lazy'
```

### Confirmed no Next.js-side special-casing of `sizes="auto"` (verified via installed package)
```
# Command run inside the running frontend container, this session:
docker compose exec -T team4sv30-frontend sh -c \
  "grep -rn 'auto' node_modules/next/dist/shared/lib/get-img-props.js"
# Result: only an unrelated CSS width:'auto'/height:'auto' warning message, no sizes="auto"
# special-casing. Confirms Next.js forwards the `sizes` string to the browser verbatim; the
# retention mechanism is purely a browser-native (Chromium) behavior, not a Next.js quirk.
```

### Barrel export shape (Workstream B), verified this session
```ts
// Source: frontend/src/components/editor/index.ts (full file, 4 lines)
export { RichTextEditor } from './RichTextEditor'
export { RichTextRenderer } from './RichTextRenderer'
export { ColorTokenExtension, COLOR_TOKENS } from './ColorTokenExtension'
export type { ColorToken } from './ColorTokenExtension'
```

### `RichTextRenderer.tsx` has zero Tiptap dependency (verified this session, full file)
```tsx
// Source: frontend/src/components/editor/RichTextRenderer.tsx
import styles from './RichTextRenderer.module.css'

type RichTextRendererProps = {
  bodyHtml?: string | null
  bodyJson?: unknown | null
  editorType?: string | null
  contentSchemaVersion?: number | null
}

// SICHERHEITSINVARIANTE: dangerouslySetInnerHTML NUR mit body_html (serverseitig sanitisiert).
// Niemals body_json direkt rendern ohne serverseitiges Sanitizing.
export function RichTextRenderer({ bodyHtml }: RichTextRendererProps) {
  if (!bodyHtml?.trim()) return null
  return (
    <div className={styles.richTextOutput} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  )
}
```

### `not-found.tsx`'s full current content (Workstream B4), verified this session
```tsx
// Source: frontend/src/app/members/[slug]/not-found.tsx (full file, 5 lines)
import { OwnHiddenProfilePreview } from './OwnHiddenProfilePreview'

export default function MemberProfileNotFound() {
  return <OwnHiddenProfilePreview />
}
```

### The existing correct empty-decision template (Workstream C2), verified this session
```tsx
// Source: frontend/src/app/members/[slug]/MemberProfileContent.tsx:56,150-172
const hasContributions = latestContributions.length > 0 || previousContributionsCount > 0
// ...
{hasContributions ? (
  <section className={`${styles.section} ${styles.rhythmBand} ${styles.contributionsBand}`} aria-label="Beiträge">
    <SectionHeader title="Beiträge" underline />
    {/* ... LatestContributionsSection / PreviousContributionsSection ... */}
  </section>
) : null}
```

### The visibility-overlay CSS anti-pattern (Workstream C), verified this session across all three
```css
/* Source: frontend/src/components/profile/MemberCurrentProjectsSection.module.css:21-30 */
.projectSkeleton {
  z-index: 2;
  pointer-events: none;
  opacity: 1;
  visibility: visible;
}
.projectSkeleton[data-visible='false'] {
  opacity: 0;
  visibility: hidden;
}
/* .projectList and .projectSkeleton share grid-column: 1; grid-row: 2 — true overlay stacking */
```
```css
/* Source: frontend/src/components/profile/MemberBadgeChain.module.css:57-70 — uses :has() instead
   of a data-attribute keyed off its OWN component, keyed off a child (FocalCarousel internals) */
.carouselSkeleton {
  position: absolute;
  inset: 0;
  z-index: 2;
  /* ... */
}
.carouselShell:has([data-interaction-enabled="true"]) > .carouselSkeleton,
.carouselShell:has(.badgeGrid) > .carouselSkeleton {
  visibility: hidden;
}
```
```tsx
// Source: frontend/src/components/ui/FocalCarouselInternals.tsx:296 — where data-interaction-enabled is set
<div
  data-interaction-enabled={interactionEnabled ? 'true' : 'false'}
  /* ... */
>
```

### `useNearViewportActivation` — full hook, verified this session (unchanged by this phase per C4)
```ts
// Source: frontend/src/hooks/useNearViewportActivation.ts (full file, 37 lines)
const ACTIVATION_ROOT_MARGIN = '600px 0px'

export function useNearViewportActivation<T extends HTMLElement>(deferActivation = true) {
  const targetElementRef = useRef<T | null>(null)
  const activatedRef = useRef(!deferActivation)
  const [interactionEnabled, setInteractionEnabled] = useState(!deferActivation)
  const targetRef = useCallback((target: T | null) => {
    targetElementRef.current = target
    if (!target || activatedRef.current || (deferActivation && typeof IntersectionObserver !== 'undefined')) return
    activatedRef.current = true
    setInteractionEnabled(true)
  }, [deferActivation])

  useEffect(() => {
    if (activatedRef.current || !deferActivation || typeof IntersectionObserver === 'undefined') return
    const target = targetElementRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (activatedRef.current || !entries.some((entry) => entry.isIntersecting)) return
      activatedRef.current = true
      observer.disconnect()
      setInteractionEnabled(true)
    }, { rootMargin: ACTIVATION_ROOT_MARGIN })
    observer.observe(target)
    return () => observer.disconnect()
  }, [deferActivation])

  return { targetRef, interactionEnabled }
}
```
**C4 is explicit: do not modify `ACTIVATION_ROOT_MARGIN` or this hook's IntersectionObserver
mechanics as part of this phase's fix.** The hook stays exactly as-is; only its *consumers'* CSS
visibility rules change scope (from "gates real content" to "gates only interactive affordances +
genuinely-loading sub-states").

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `sizes="auto"` for lazy `<img>`+`srcset` | Deterministic `sizes` string matching CSS breakpoints | Chrome 126+ shipped `sizes="auto"` (2024) as a convenience feature; this codebase's use of it is what introduces the Chromium-140-observed retention defect the audit reproduced independently of React/Next | Removing `auto` trades a minor convenience (not having to hand-maintain the `sizes` string if CSS breakpoints ever change) for eliminating a reproduced DOM-retention memory issue on SPA navigation — a clearly favorable tradeoff for this specific defect |
| One shared hydration-gated Client Component composition for a whole page section band | Smaller per-section interactive islands with independent loading boundaries | This is a general React/Next 16 App Router best practice (streaming SSR + islands), not a version-specific change — this codebase simply hasn't adopted it yet for this page | Isolates failure/slow-load blast radius per section (C6), and is the structural fix underlying C1/C3 |

**Deprecated/outdated:** none — this phase does not deprecate any library API; it corrects
misapplications of still-current APIs (`sizes`, barrel exports, CSS-gated visibility).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `next/dynamic(..., { ssr: false })` mocking/testing behavior in this project's current Vitest + `@testing-library/react` setup works without special test-harness changes beyond what's already used for the barrel `vi.mock` pattern | Architecture Patterns → Pattern 3 | If wrong, `OwnHiddenProfilePreview`'s existing test suite could require additional `vi.mock('next/dynamic', ...)` scaffolding not accounted for in this research; low overall risk since this is a well-trodden Next.js/Vitest interaction, but not empirically verified in *this* codebase's test config during this research pass — the planner should have the first execution task include a quick spike/verification before committing to the full B4 plan shape |
| A2 | `next/dynamic` is the single best-fit mechanism for B4 (vs. `React.lazy` + manual `<Suspense>`) given `OwnHiddenProfilePreview` is a `'use client'` component with no SSR data dependency | Architecture Patterns → Pattern 3 | Low risk — both mechanisms achieve the same chunk-splitting outcome in Next.js App Router; `next/dynamic` is the more idiomatic/documented choice for this exact "client-only, no SSR" scenario, but `React.lazy` is a legitimate fallback if `next/dynamic`'s `ssr:false` option interacts poorly with something not surfaced in this research (e.g. a Next.js 16-specific change to `next/dynamic` behavior not checked against current official docs in this session due to no Context7/ctx7 access) |
| A3 | 341 relevant frontend tests / 20 test files (1 skipped) from `REPORT.md`'s Validation section still holds as the current baseline test count, since HEAD has moved one docs-only commit (`9f9a45f3`) past the audit's commit (`592df665`) | Environment Availability / Validation Architecture | Low risk (docs-only commit in between) — but the planner should re-run `vitest run` once at plan-time or execution-start to get the authoritative current count rather than trusting this research's inherited number indefinitely |

**If this table is empty:** N/A — see entries above. All three assumptions are low-risk,
narrow-scope items around test-harness mechanics for a pattern new to this codebase (B4/C3's
loading-boundary approach), not about the underlying root-cause facts (which are all
`[VERIFIED]`/`[CITED]` against the committed audit and direct source reads in this session).

## Open Questions

1. **What exact mechanism should C3's "smaller interactive islands" use per section —
   `next/dynamic` (client-chunk-splitting) or `<Suspense>` around a Server Component boundary
   (streaming SSR), or a combination?**
   - What we know: `MemberCurrentProjectsSection`, `LatestContributionsSection`,
     `PreviousContributionsSection`, and `MemberBadgeChain` are all currently `'use client'`
     components that receive already-fetched data as props (not their own data-fetching Server
     Components) — Workstream C's own scope (per UI-SPEC) is a *visibility/mount-timing* fix, not
     a *data-fetching-architecture* fix.
   - What's unclear: whether "real loading boundary" for C3 should be interpreted as (a) purely a
     CSS-visibility fix (make the existing skeleton scoped correctly, no code-splitting at all —
     the minimal reading of C1/C3 combined) or (b) additionally code-splitting each section's
     client bundle via `next/dynamic` so a slow/failing section's *JS* doesn't block others (a
     stronger reading of C3's "kleinere interaktive Inseln").
   - Recommendation: Treat (a) — the CSS-visibility-gate rewire — as the mandatory minimum that
     satisfies C1/P153-08 and the bulk of C3/P153-10. Additional `next/dynamic` code-splitting per
     section is a legitimate stretch goal for C3's "isolate failures" framing but is not proven
     necessary by the audit's own evidence (the audit's dominant cost is DOM/skeleton-overlay
     timing and the editor/not-found import weight, not per-section JS chunk isolation) — the
     planner should scope (a) as required and (b) as optional/discretionary, consistent with the
     UI-SPEC's own framing that "No new visual component is needed for this requirement."

2. **What exact form should the D1 "new audit document" take — a full new REPORT.md-style
   document, or a lighter delta/diff-style comparison document?**
   - What we know: D1 requires identical measurement conditions (1440×900, DPR 1, anonymous
     context, cold/warm separated, same throttling) and reuse of the same committed scripts; the
     existing report must not be overwritten.
   - What's unclear: the user-request does not specify a filename or exact document structure for
     the new artifact, only that it must exist "als neues Auditdokument."
   - Recommendation: Follow the same directory convention (`docs/audits/<date>-<topic>/`) with a
     clearly dated new subdirectory or a clearly named sibling file (e.g.
     `docs/audits/2026-09-09-public-member-performance/AFTER-153.md` or a new dated directory) —
     the planner should decide the exact path/name as part of task breakdown; this is a naming
     decision, not a research gap.

3. **Should the D2 "permanent regression guard" be a new automated CI-style test, or a documented
   manual-run checklist referencing the existing scripts?**
   - What we know: the three audit scripts already exist and are Playwright-based (require a
     running dev/prod server, not simple `vitest`-runnable unit assertions); `playwright` is
     already a devDependency.
   - What's unclear: whether "dauerhafter Regressionsschutz" implies wiring these into an
     automated pipeline step (which does not currently exist for these scripts) or whether a
     lighter static check (e.g. an ESLint rule or a grep-based vitest assertion that fails if
     `sizes="auto"` or a barrel-wide `RichTextEditor` import reappears in a renderer-only file)
     is sufficient and more pragmatic given this repo has no browser-based CI gate today.
   - Recommendation: Propose a lightweight static/vitest-level guard (fast, CI-friendly, no
     browser dependency) as the primary "permanent" gate for the two structural regressions (B1's
     import path, A1's `sizes` string), and treat the full Playwright retention/visibility scripts
     as a documented manual/periodic verification procedure (per D1/D11) rather than a per-commit
     gate — this matches the project's existing test infrastructure shape (`vitest`-only automated
     suite, Playwright reserved for audit/diagnostic runs) without inventing new CI infrastructure
     that CLAUDE.md does not currently describe as existing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Compose (`team4sv30-frontend` service) | All verification (typecheck/lint/test/build) | ✓ | Compose stack up 26h at research time | — |
| `playwright` (devDependency, in-container) | Workstream D audit script reuse | ✓ | 1.55.0 [VERIFIED: frontend/package.json] | — |
| `vitest` (devDependency, in-container) | Regression test runs | ✓ | ^3.2.4 [VERIFIED: frontend/package.json] | — |
| `docker compose build` (fresh image build) | D3 authoritative production build gate | ✓ | — | none needed; this IS the fallback for the known-false-negative `exec ... npm run build` path |
| Host-side `node_modules`/`npm install` | N/A — explicitly not used | ✗ (by design) | — | All commands run via `docker compose exec -T team4sv30-frontend ...` per CLAUDE.md; not a gap, a deliberate constraint |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none — all required tooling is already present in the
running stack.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 [VERIFIED: frontend/package.json] |
| Config file | `frontend/vitest.config.ts` (alias `@` → `src`, setup file `src/test/axeSetup.ts`) |
| Quick run command | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path-to-test-file>"` |
| Full suite command | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm test"` (runs `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P153-01 | `sizes` string no longer contains `auto,` prefix, for both lazy and priority images | unit (component) | `vitest run src/components/profile/AchievementArtwork.test.tsx` | ✅ (needs assertion updates, not new file) |
| P153-01 | Badge-chain carousel images also carry the corrected `sizes` string | unit (component) | `vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ (needs assertion updates, not new file) |
| P153-02 | Lazy loading / geometry / optimizer / srcset unchanged | unit (component) + manual/audit-script | existing `AchievementArtwork.test.tsx`/`ResponsiveImage`-covering tests + `audit-public-member-images.mjs` for real transfer/sharpness evidence | ✅ / ✅ (script exists) |
| P153-03 | No linear DOM/listener growth over 12 and 50 SPA cycles | manual/audit-script (Playwright, not vitest-automatable in <30s) | `docker compose exec -T -e AUDIT_LABEL=post153 -e AUDIT_CYCLES=12 team4sv30-frontend node scripts/audit-public-member-navigation-retention.mjs` (repeat with `AUDIT_CYCLES=50`) | ✅ script exists |
| P153-04 | Four renderer-only consumers import directly, still render identical output | unit (component) | existing per-component test files (`MemberStorySection.test.tsx`, etc. — verify each has direct-import coverage; add assertion of import path only if a static-import-guard test is introduced per D2 Open Question 3) | ✅ (existing suites), ⚠️ new static-guard test if planner adopts that D2 approach — Wave 0 gap |
| P153-05 | Barrel decision documented | manual/doc (not a test) | N/A | N/A |
| P153-06 | Not-found preview still works for owner after loading-boundary change | unit (component) | `vitest run src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` | ✅ (needs extension for dynamic-import wrapping, see Assumption A1) |
| P153-07 | No Tiptap/ProseMirror/editor modules in public DEV bundle | audit-script | `docker compose exec -T team4sv30-frontend node scripts/audit-public-member-bundles.mjs` (reads `.next/dev/static/chunks/`, requires dev server having compiled the relevant routes first) | ✅ script exists |
| P153-08/09/10 | SSR content visible pre-hydration; empty sections server-decided; badge ladder unchanged | unit (component, DOM presence/visibility assertions) + audit-script for timing | Existing/extended `MemberCurrentProjectsSection.test.tsx`, `LatestContributionsSection.test.tsx`, `PreviousContributionsSection.test.tsx`, `MemberBadgeChain.test.tsx` for structural assertions; `scripts/audit-public-member-visibility.mjs` for throttled-timing evidence | ✅ all test files exist (confirm exact names at plan time); script exists |
| P153-11 | Before/after measurement document | manual/doc | Reuse D1 script set per `REPRODUCE.md` | N/A (documentation artifact, not a test) |
| P153-12 | Full suite green, prod build PASS | full-suite | `docker compose exec -T team4sv30-frontend npm test`, `docker compose exec -T team4sv30-frontend npm run typecheck`, `docker compose exec -T team4sv30-frontend npm run lint`, `docker compose build` | ✅ all commands exist |
| P153-13 | RCA-04 stays documented-open | manual/doc | N/A | N/A |
| P153-14 | Pre-existing defects named with evidence | manual/doc | N/A (evidence already captured in this research's Pitfall 6) | N/A |

### Sampling Rate
- **Per task commit:** targeted `vitest run <file>` for the touched component(s), plus
  `npx tsc --noEmit` scoped check where feasible.
- **Per wave merge:** full `npm test` + `npm run lint` + `npm run typecheck` inside the container.
- **Phase gate:** full suite green, `docker compose build` PASS, plus the three audit scripts
  re-run under report conditions (D1/D11) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] Confirm each of the four Workstream-B1 renderer-only consumers' existing `.test.tsx` files
  do not `vi.mock('@/components/editor', ...)` in a way that silently breaks after the import-path
  change (see Pitfall 4) — a quick read-and-adjust pass, not a new file.
- [ ] If the planner adopts the D2 Open-Question-3 "lightweight static guard" approach, a new
  small vitest file (e.g. `src/components/editor/__tests__/publicImportGraph.test.ts` or similar,
  exact name/location is a planner decision) asserting no `sizes="auto"` string and no barrel-wide
  `RichTextEditor` import exists in the four named public-consumer files — this is new-file work
  not covered by any existing test.
- [ ] `OwnHiddenProfilePreview.test.tsx` may need a `vi.mock('next/dynamic', ...)` addition
  depending on how B4 is implemented (see Assumption A1) — verify empirically at the start of the
  B4 task, not assumed in advance.

*(No other gaps — the bulk of Workstream A/C verification reuses existing, already-passing test
files with updated assertions, and Workstream D reuses existing, already-working audit scripts.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | Not touched — `useMemberViewer`'s auth/session resolution logic is explicitly out of scope (B4 only changes *when* the client bundle downloads, not the owner-check logic itself) |
| V3 Session Management | no | Not touched |
| V4 Access Control | yes (regression-risk only, no new control) | B4's loading-boundary change must not alter the existing `viewer.is_owner`/`hasAuthSession` gating inside `OwnHiddenProfilePreview` — the existing checks (`if (!slug \|\| !hasAuthSession) return <UnavailableProfile />`, `if (!response || !response.viewer.is_owner) return <UnavailableProfile />`) must remain byte-identical; this is a **regression-prevention** concern, not a new security control to implement |
| V5 Input Validation | no | No new user input surfaces introduced by this phase |
| V6 Cryptography | no | Not touched |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Private-preview data leaking into the public bundle/HTML for anonymous visitors (relevant regression risk for B4) | Information Disclosure | The existing pattern already correctly keeps `OwnHiddenProfilePreview`'s actual profile *data* fetch entirely client-side, gated behind `hasAuthSession`/`viewer.is_owner` checks that run **after** the component mounts — B4 only changes bundle-loading timing, not this data-gating logic, so no new disclosure surface is introduced as long as the `next/dynamic`/`Suspense` wrapper does not accidentally prefetch or SSR any owner-only data. Verify: the `loading` fallback shown during the dynamic-import wait must not reveal any profile-specific information (the UI-SPEC/code already uses a generic `LoadingState` with copy like "Profil wird geprüft." — reuse that exact generic copy for the new loading boundary, not anything slug-specific). |
| Rendering unsanitized rich text after a barrel-import path change (B1) | Tampering (XSS) | `RichTextRenderer.tsx`'s existing `SICHERHEITSINVARIANTE` comment and the fact that it *only* renders `bodyHtml` (never `bodyJson`) via `dangerouslySetInnerHTML` must remain completely untouched by the B1 import-path change — this is a pure import-path edit with zero change to the sanitization contract, but the plan should explicitly state "no change to `RichTextRenderer.tsx` itself" to make this obvious to a reviewer. |

## Sources

### Primary (HIGH confidence)
- `docs/audits/2026-09-09-public-member-performance/REPORT.md` (commit `592df665`) — the project's
  own committed root-cause analysis; primary factual basis for this entire phase.
- `.planning/phases/153-public-member-clientlast-und-speicherretention/153-USER-REQUEST.md` —
  binding phase order.
- `.planning/phases/153-public-member-clientlast-und-speicherretention/153-UI-SPEC.md` — approved
  UI/interaction contract for Workstream C.
- Direct source reads this session (all file:line citations above are from live reads of HEAD
  `9f9a45f3`, working tree clean): `AchievementArtwork.tsx`, `AchievementArtwork.module.css`,
  `ResponsiveImage.tsx`, `components/editor/index.ts`, `RichTextRenderer.tsx`, `not-found.tsx`,
  `OwnHiddenProfilePreview.tsx`, `page.tsx` (members/[slug]), `MemberProfileContent.tsx`,
  `useNearViewportActivation.ts`, `MemberCurrentProjectsSection.tsx`/`.module.css`,
  `LatestContributionsSection.tsx`/`.module.css`, `PreviousContributionsSection.tsx`/`.module.css`,
  `MemberBadgeChain.tsx`/`.module.css`, `FocalCarousel.tsx`, `FocalCarouselInternals.tsx`, and the
  three named `frontend/scripts/audit-public-member-*.mjs` files.
- `docker compose exec -T team4sv30-frontend sh -c "grep ... node_modules/next/..."` — direct
  inspection of the actually-installed `next` package in the running container, confirming no
  Next.js-side special handling of the `sizes="auto"` literal.
- `git log`, `git status --short`, `docker compose ps` — confirmed HEAD, clean tree, running stack,
  this session.
- `docs/audits/2026-09-09-public-member-performance/lint.log` — re-verified 13 errors/332
  warnings/345 problems total, this session (matches audit's own claim).

### Secondary (MEDIUM confidence)
- [Intent to Ship: Auto Sizes for Lazy Loaded Images with Srcset](https://groups.google.com/a/chromium.org/g/blink-dev/c/OAsmCbjPJz0/m/jzuTJzs1AAAJ) — Chromium blink-dev intent thread confirming `sizes="auto"` mechanism and requirements (width/height attributes, `loading="lazy"`).
- [Sizes="auto" pretty much requires width and height attributes — ericportis.com](https://ericportis.com/posts/2023/auto-sizes-pretty-much-requires-width-and-height/) — independent write-up corroborating the `sizes="auto"` mechanism and Chrome 126+ support baseline.
- [Components: Image Component | Next.js](https://nextjs.org/docs/app/api-reference/components/image) — official `next/image` API reference for the `sizes` prop's general behavior (forwarded to the underlying `<img>` element).

### Tertiary (LOW confidence)
- None used as load-bearing claims in this document — all `sizes="auto"` mechanism claims are
  corroborated by at least two independent sources (Chromium blink-dev + ericportis.com) plus this
  project's own independent reproduction in `REPORT.md`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all versions confirmed via `package.json` and direct
  in-container `node_modules` inspection.
- Architecture: HIGH — every code location and mechanism named in the user-request and UI-SPEC was
  independently re-verified by direct file reads and greps in this session, not taken on faith
  from the source documents.
- Pitfalls: HIGH for A/B (direct evidence: stale test assertions found, D5 defects re-confirmed
  present) — MEDIUM for the C3/B4 "new pattern in this codebase" risk (Assumptions A1/A2), since
  this specific `next/dynamic`+Vitest interaction was not empirically test-run in this research
  session (no Context7/ctx7 access in this environment; recommend a first-task spike to close this
  gap before the rest of the B4 plan commits to a specific mocking approach).

**Research date:** 2026-09-09
**Valid until:** 14 days (fast-moving: this research is tied to a specific commit `9f9a45f3` and a
specific same-day audit; any further commits to the touched files before execution should trigger
a quick re-verification of the file:line citations above, not a full re-research).
