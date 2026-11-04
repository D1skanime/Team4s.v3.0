# Phase 192: Öffentliche Anime-Detailseite — Baustein-Reinheit, SSR-Randnavigation, Release-Zeilen-Einrückung - Research

**Researched:** 2026-11-04
**Domain:** Next.js 16 App Router (Server/Client Component boundary), CSS Grid/Flexbox layout primitives, in-house design-system testing guards (Vitest, file-content regex scanners)
**Confidence:** HIGH (all findings verified directly against the actual repository source — this is a pure brownfield refactor with zero new runtime dependencies; no external library research was needed)

## Summary

This phase has no "unknown ecosystem" risk — every file, test pattern, and guard mentioned in
`192-CONTEXT.md`/`192-UI-SPEC.md` was read directly from the live repository and is documented
below with exact line references. The real planning risk is **sequencing and test-infrastructure
reuse**, not technology choice: three brand-new Grundbausteine (`Stack`/`Cluster`/`SplitLayout`)
must be built to match an established, already-enforced convention (CSS Modules + override-hook
custom properties + two existing automated guards that will **automatically** apply to the new
files without modification), and five existing composite blocks must be migrated onto them while
provably producing a byte-for-byte-identical DOM/CSS output except for two named, deliberate fixes
(Befund 19 SSR timing, Befund 20 indentation).

The SSR-neighbor-resolution fix (Befund 19) requires extracting the neighbor-finding algorithm
that currently lives only inside the client component `AnimeEdgeNavigation.tsx` into a shared,
server-safe function, because `page.tsx`'s server component now needs to run the *same* logic
(including the page-boundary-crossing branch) before first paint. `getAnimeList` (`lib/api/
fansubs-core.ts:73`) is already a plain `fetch()`-based async function with no `'use client'`
marker and is already used server-side elsewhere on this page's call graph — it is directly
callable from `page.tsx`'s `AnimeDetailContent` async Server Component today.

The release-row indentation fix (Befund 20) has one latent implementation trap worth flagging now:
the prescribed `SplitLayout` primitive always reserves a grid column + `gap` for its first slot,
which will re-introduce a "phantom gap" for the zero-avatar case unless `ReleasePreviewRow`
conditionally skips rendering `SplitLayout` entirely when there are no logos (see Common Pitfalls).

**Primary recommendation:** Build `Stack`/`Cluster`/`SplitLayout` exactly to the API already locked
in `192-UI-SPEC.md` (do not re-derive it), migrate the five pilot composites in the binding order
23+22/21 → 19 → 20, extract the neighbor-finding algorithm into one shared function reused by both
the new server call site and the existing client hover-preview call site, and conditionally omit
`SplitLayout` in `ReleasePreviewRow` when the avatar column is empty.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Layout-Grundbausteine (Stack/Cluster/SplitLayout) | Browser/Client (pure CSS, framework-agnostic) | — | Presentational primitives with zero data dependency; rendered identically on server or client (no `'use client'` needed — see Code Examples) |
| Anime-Kopf-Baustein (`AnimeDetailHero`) composition | Frontend Server (SSR) | — | Pure function of already-server-loaded props (`anime`, `coverUrl`, `relationsResponse`); no client state, currently has no `'use client'` directive and must keep none |
| Seiten-Orchestrierung (`AnimeDetailView`/`page.tsx`) | Frontend Server (SSR) | — | Async Server Component; owns data fetching (`getAnimeFansubs`/`getGroupedEpisodes`/`getAnimeRelations`/new `getAnimeList` neighbor calls) and section sequencing only |
| Randnavigation — Link-HREFs (Befund 19) | Frontend Server (SSR) | API/Backend (`GET /api/v1/anime` via `getAnimeList`) | HREFs must be present in the initial HTML; computing them requires one additional server-side list fetch per direction (page-boundary case) |
| Randnavigation — Hover-Vorschaukarte (Bild/Titel/Typ) | Browser/Client | API/Backend (same endpoint, client-fetched) | Genuinely interaction-gated (`onMouseEnter`/`onFocus`); no SSR benefit, CONTEXT.md explicitly keeps this client-fetched |
| Release-Zeilen-Spaltenausrichtung (Befund 20) | Browser/Client (pure CSS layout) | — | No data dependency; purely a `SplitLayout`/`Stack` composition fix inside an existing client component (`ReleasePreviewRow` is `'use client'` only because of its Button variant, not state) |

## Project Constraints (from CLAUDE.md)

These directives apply to every task in this phase and are treated with the same authority as
locked CONTEXT.md decisions:

- **450-Zeilen-Regel:** Any touched file over 450 lines must be split in the same commit as a pure
  refactor (no behavior change), tests green, before the behavioral change lands. None of the five
  pilot files are currently near the limit (`AnimeDetailHero.tsx` 112, `AnimeDetailView.tsx` 104,
  `AnimeEpisodesSection.tsx` 45, `ReleasePreviewRow.tsx` 107, `AnimeEdgeNavigation.tsx` 138 lines) —
  **no split is required by this phase** unless a plan's additions push one over 450.
- **Deutsche Umlaute Pflicht:** All new/changed German UI text, aria-labels, code comments must use
  real ä/ö/ü/ß — this phase introduces no new copy (per UI-SPEC), but any new code comment explaining
  the new primitives or the neighbor-resolution extraction must follow this rule.
- **Globales Design-System Pflicht:** The three new primitives live in `frontend/src/components/ui/`
  and must follow the `Grundbausteine/*` Storybook taxonomy (full state coverage, `tags: ['autodocs']`,
  no internal import of another cataloged primitive) — enforced automatically by
  `catalogTaxonomy.test.ts` (see Don't Hand-Roll).
- **"Stories ziehen mit":** Every visible prop/variant change to `AnimeDetailHero.stories.tsx` /
  `ReleasePreviewRow.stories.tsx` / `AnimeEdgeNavigation.stories.tsx` must land in the same task as
  the component change, not a follow-up.
- **Teststil-Pflicht:** New behavior assertions (SSR-href-presence, guard-test extension) must
  execute the real code path (direct component-function calls / tree-walk, matching the existing
  `page.test.tsx` pattern) — never `readFile` + `strings.Contains`-style existence checks, except for
  the already-established CSS-source-pattern guards which are an explicitly permitted exception
  class (testing the CSS file itself as the subject under test).
- **Dokumentation wächst mit dem Code:** `docs/FRONTEND_ARCHITEKTUR.md` gains the "Seiten vs.
  Bausteine" section mandated by CONTEXT.md's Befund 22 decision, in the same commit as the code move.
- **GSD-Workflow:** All work happens via `/gsd:execute-phase` plans on `main` (no worktrees, per
  current project convention) inside the `ki-run` branch `ki/team4s-261102-226d` for this autonomous
  order.

## Phase Requirements

No formally tracked `REQUIREMENTS.md` IDs exist for this ki-run phase. The binding requirement set
is the five Live-UAT-Befunde (19–23) locked in `192-CONTEXT.md`, mapped below:

| ID | Description | Research Support |
|----|-------------|------------------|
| Befund 23 | Layout-Grundbausteine fehlen (`Stack`/`Cluster`/`SplitLayout`) | API fully specified in `192-UI-SPEC.md`; CSS pattern verified against `ArtworkHero.module.css`/`AvatarStack.module.css`; both existing automated CSS guards (`foreignVariableOverrides.regression.test.ts`, `catalogTaxonomy.test.ts`) apply to the new files with zero modification needed |
| Befund 22 | Seiten ordnen nur Bausteine an | Exact current violation locations identified in `page.module.css:70-92` (`--card-public-hero-columns` hook) and `AnimeDetailView.tsx:84-95` (Card+grid wrapper in the page); `detailStyleSystem.guard.test.ts` extension pattern documented |
| Befund 21 | Anime-Kopf-Baustein unvollständig | Exact Card variant / grid ownership boundary identified in `Card.module.css:120-142` (`.cardPublicHero`) vs. `AnimeDetailHero.tsx` (currently returns a Fragment of two bare Cards, no wrapper) |
| Befund 19 | Randnavigation fehlt bis zur Hydration | `getAnimeList` confirmed server-safe (plain `fetch`, no `'use client'`); exact neighbor-resolution algorithm to extract identified in `AnimeEdgeNavigation.tsx:54-94`; SSR test template identified in `page.test.tsx:102-139` |
| Befund 20 | Release-Zeile falsch eingerückt | Exact current flex/grid structure identified in `ReleasePreviewRow.module.css:13-24` (`.content`/`.identity`/`.logos`); zero-avatar pitfall identified and documented below |

## Standard Stack

No new runtime dependency. This phase is a pure-refactor using only the project's existing
in-house `@/components/ui` design system and Next.js 16 App Router primitives already in use.

### Core
No new packages. `react`, `next`, `lucide-react` (already used, unchanged) remain the only runtime
dependencies touched.

### Package Legitimacy Audit

Not applicable — this phase installs zero external packages. No `npm install` step exists in any
plan this research supports.

## Architecture Patterns

### System Architecture Diagram

```
Request: GET /anime/22?grid_query=page%3D2%26...
        │
        ▼
┌─────────────────────────── page.tsx (Server Component) ───────────────────────────┐
│  loadAnimeDetail(id)  →  AnimeDetail                                               │
│         │                                                                          │
│         ▼                                                                          │
│  AnimeDetailContent (async, inside <Suspense>)                                     │
│     ├─ getAnimeFansubs(id)                      ─┐                                 │
│     ├─ resolveActiveFansubSlug(...)               │  Promise.allSettled            │
│     ├─ getGroupedEpisodes(id, {fansub})          ─┤  (existing, unchanged)          │
│     ├─ getAnimeRelations(id)                     ─┘                                 │
│     │                                                                               │
│     └─ NEW (Befund 19): resolveAnimeNeighbors(gridParams, id)                       │
│              ├─ getAnimeList(gridParams)              -- current page               │
│              ├─ if boundary: getAnimeList({page: p±1}) -- prev/next page fallback   │
│              └─→ { prev: {href,label,ariaLabel,anime}, next: {...} }               │
│         │                                                                            │
│         ▼                                                                            │
│  <AnimeDetailView ... edgeNavigation={...} />  (pure, prop-driven render)            │
│     ├─ BannerSection(+AnimeBackdropRotator)                                          │
│     ├─ Breadcrumbs                                                                   │
│     ├─ AnimeDetailHero  ◄── now OWNS Card(publicHero) + SplitLayout grid (Befund 21)│
│     │     ├─ SplitLayout firstColumn=posterCard secondColumn=infoCard               │
│     │     └─ edgeNavigation slot → <AnimeEdgeNavigation previous next />            │
│     │            (href already resolved server-side; renders immediately)          │
│     │            └─ 'use client' hover state → own getAnimeList() ONLY for preview │
│     └─ AnimeEpisodesSection → FansubVersionBrowser → ReleasePreviewRow              │
│              └─ SplitLayout(firstColumn=avatars, secondColumn=Stack(text lines))    │
│                 (Befund 20 — omitted entirely when zero avatars, see Pitfalls)      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

New files (Befund 23), all in `frontend/src/components/ui/`:

```
components/ui/
├── Stack.tsx               # vertical flex, gap-token prop
├── Stack.module.css
├── Stack.stories.tsx       # Grundbausteine/Stack
├── Stack.test.tsx
├── Cluster.tsx             # horizontal flex-wrap, gap-token prop
├── Cluster.module.css
├── Cluster.stories.tsx     # Grundbausteine/Cluster
├── Cluster.test.tsx
├── SplitLayout.tsx         # fixed/auto col + 1fr remainder, container-query breakpoint
├── SplitLayout.module.css
├── SplitLayout.stories.tsx # Grundbausteine/SplitLayout
├── SplitLayout.test.tsx
└── index.ts                # add `export * from './Stack'` etc. (alphabetical, matches existing list)
```

Modified files (Befund 21/22/19/20), no new files needed beyond the three primitives above:

```
app/anime/[id]/
├── AnimeDetailHero.tsx            # gains Card(publicHero)+SplitLayout wrapper + edgeNavigation slot
├── AnimeDetailHero.stories.tsx    # "Stories ziehen mit" — add 1440px + 390px proof stories
├── AnimeDetailView.tsx            # loses Card/styles.heroContainer/edgeNavigationOverlay wrapper div
├── AnimeDetailView.styles.ts      # unchanged (still merges the 4 page*.module.css files)
├── page.tsx                       # gains resolveAnimeNeighbors() call + edgeNavigation prop
├── page.module.css                # loses --card-public-hero-columns hook entirely
├── page.poster.module.css         # grid-owning rules move into AnimeDetailHero.module.css (new file)
├── page.infoCard.module.css       # grid-owning rules move into AnimeDetailHero.module.css (new file)
└── detailStyleSystem.guard.test.ts # add grid-template to forbidden list, remove hook exception test

components/anime/
├── AnimeEdgeNavigation.tsx        # takes previous/next as props; narrows own getAnimeList use to preview only
└── AnimeEdgeNavigation.module.css # unchanged (preview card positioning untouched)

lib/
└── animeGridContext.ts            # gains resolveAnimeNeighbors() (or a sibling file) — shared by server+client

components/fansubs/
├── ReleasePreviewRow.tsx          # restructures .identity+data-lines via SplitLayout+Stack
└── ReleasePreviewRow.module.css   # loses .content grid / gains SplitLayout/Stack composition
```

### Pattern 1: Token-only layout primitive with CSS-custom-property override hooks

**What:** A Grundbaustein that accepts ONLY an enum/token prop (never raw px/color), and translates
that prop into one scoped CSS custom property consumed by its own `.module.css` file via
`var(--hook, fallback)`. This is the exact pattern already used by `Card`'s `tintHue` prop
(`Card.tsx` → sets `--card-tint-hue` inline style → `Card.module.css` reads it) and is explicitly
prescribed for `Stack`/`Cluster`/`SplitLayout` in `192-UI-SPEC.md:147,163,190-191`.

**When to use:** Any time a prop needs to reach CSS without becoming a second, competing CSS
declaration across file boundaries (the exact bug Befund 21/22 are fixing — see the `--card-
public-hero-columns` comment in `page.module.css:62-69` for the documented history of why a second
direct `grid-template-columns` declaration in a different file is non-deterministic).

**Example (matches `Card.tsx`'s existing `tintHue` mechanism):**
```tsx
// Source: frontend/src/components/ui/Card.tsx (existing pattern, reused verbatim for Stack)
export function Stack({ gap = '3', align = 'stretch', as: Component = 'div', className, children }: StackProps) {
  return (
    <Component
      className={classNames(styles.stack, className)}
      style={{ '--stack-gap': `var(--space-${gap})`, '--stack-align': align } as CSSProperties}
    >
      {children}
    </Component>
  )
}
```
```css
/* Source: frontend/src/components/ui/Stack.module.css (new file, same shape as Card.module.css's hook) */
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--stack-gap, var(--space-3));
  align-items: var(--stack-align, stretch);
  min-width: 0;
}
```

### Pattern 2: Container-query breakpoint collapse (not viewport media query)

**What:** `ArtworkHero.module.css:2-5,92` already establishes the pattern `SplitLayout` must copy:
`container: artwork-hero / inline-size;` on the wrapper, then `@container artwork-hero (min-width:
48rem) { ... }` for the wide-layout rule. This is required (not just preferred) because `SplitLayout`
instances will nest inside `Card`s of varying available width (full-width hero vs. a narrower
release row inside `FansubVersionBrowser`'s own content column) — a viewport media query would
collapse/expand based on the browser window, not the actual available inline space, producing the
wrong breakpoint behavior for narrower nested contexts.

**Example:**
```css
/* Source: frontend/src/components/ui/ArtworkHero.module.css:2-5,92 (existing, verified pattern) */
.hero { container: artwork-hero / inline-size; min-width: 0; }
@container artwork-hero (min-width: 48rem) { /* wide-layout rules */ }
```
`SplitLayout.module.css` must use a **uniquely named** container (e.g. `split-layout`) so multiple
`SplitLayout` instances nested inside each other (not expected in this phase, but technically
possible) don't collide on the same named container — Next.js/PostCSS does not auto-scope container
names, only class names (via CSS Modules).

### Pattern 3: Server-safe data function reused across server and client call sites (no duplication)

**What:** `getAnimeList` (`lib/api/fansubs-core.ts:73-110`) has no `'use client'` marker, uses plain
`fetch()`/`authorizedFetch()`, and already supports an `AbortSignal` + Next.js `revalidate` option.
It is currently called ONLY from the client component `AnimeEdgeNavigation.tsx:63,70,77`. Befund 19
requires `page.tsx`'s server component to run the **same** neighbor-finding algorithm (`index of
currentAnimeID in current.data`, with the page-boundary branch: `index===0 && currentPage>1` →
fetch previous page and take its last item; `index===last && currentPage<total_pages` → fetch next
page and take its first item).

**Recommendation (avoids CLAUDE.md's "no duplicate logic" violation):** Extract this algorithm into
one new exported function — e.g. `resolveAnimeNeighbors(gridParams, currentAnimeID, options)` — in
`lib/animeGridContext.ts` (already the canonical home for all other grid-URL logic this page uses)
or a sibling file if `animeGridContext.ts` would exceed 450 lines after the addition (currently 199
lines — safe). Both `page.tsx` (server, no AbortSignal needed) and `AnimeEdgeNavigation.tsx` (client,
needs AbortSignal for its still-client-fetched hover-preview data) call this ONE function instead of
each re-implementing the index/boundary logic.

```ts
// Illustrative signature — exact return shape is Claude's Discretion per CONTEXT.md,
// but MUST be a single shared function, not two parallel implementations.
export async function resolveAnimeNeighbors(
  gridParams: AnimeListParams,
  currentAnimeID: number,
  options: { signal?: AbortSignal } = {},
): Promise<{ prev: { anime: AnimeListItem; page: number } | null; next: { anime: AnimeListItem; page: number } | null }>
```

**Server call site (page.tsx) — fail-open per existing `Promise.allSettled` convention:**
```ts
// Source pattern: frontend/src/app/anime/[id]/page.tsx:80-87 (existing Promise.allSettled usage)
const gridParams = parseAnimeListParamsFromGridQuery(gridQuery)
const [neighborsResult] = gridParams
  ? await Promise.allSettled([resolveAnimeNeighbors(gridParams, anime.id)])
  : [{ status: 'fulfilled' as const, value: { prev: null, next: null } }]
const neighbors = neighborsResult.status === 'fulfilled' ? neighborsResult.value : { prev: null, next: null }
```
On `getAnimeList` failure, `neighborsResult.status === 'rejected'` → `neighbors = {prev:null,next:null}`
→ the corresponding `AdjacentNavigation` button is simply omitted (matches the existing `null`-on-
missing-`gridParams` behavior already in `AnimeEdgeNavigation.tsx:103`, and the project-wide
fail-open convention already used for `getAnimeFansubs`/`getGroupedEpisodes`/`getAnimeRelations`).

### Anti-Patterns to Avoid

- **Re-implementing the neighbor-finding index/boundary logic a second time in `page.tsx`:**
  Violates CLAUDE.md's "Implementation Reuse" rule and risks the two copies silently diverging on
  the page-boundary edge case (the one piece of this algorithm that is easy to get subtly wrong
  twice). Extract once, call from both sites (see Pattern 3).
- **Letting `SplitLayout` always render its two-column grid track even when `firstColumn` is
  empty:** reintroduces exactly the "leftover gap" bug Befund 20 is fixing for the "Ohne Logo" case
  (see Common Pitfalls — the zero-avatar case must skip `SplitLayout` entirely, not pass it an
  empty `firstColumn`).
- **Setting `grid-template-columns`/`color`/`border-radius` directly in `page.module.css` /
  `page.poster.module.css` / `page.infoCard.module.css` instead of moving the rule into the owning
  composite's own `.module.css`:** this is the literal anti-pattern Befund 22 exists to eliminate,
  and will be caught automatically by the extended `detailStyleSystem.guard.test.ts` (see Common
  Pitfalls) if it survives into a plan's diff.
- **Using a viewport `@media` query instead of a `@container` query inside `SplitLayout`:** breaks
  the nested-narrower-context case (release row inside a content column) — see Pattern 2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checking that the 3 new primitives set zero `background`/`color`/`border`/`box-shadow`/`border-radius` | A bespoke new test file per primitive | **Nothing new needed** — `foreignVariableOverrides.regression.test.ts` already globs *every* `.module.css` under `components/ui` and already forbids raw px/rem/hex/rgba literals outside `@media`/`@container` condition lines, AND already forbids any custom property being set by more than one file unless registered as a known override hook. Simply writing `Stack.module.css`/`Cluster.module.css`/`SplitLayout.module.css` using only `var(--space-N)` and three private, uniquely-named hooks (`--stack-gap`, `--cluster-gap`, `--split-first-col`, etc.) means this existing test passes **with zero modification** — no new guard file needed for Acceptance Criterion "Dimension 3/5". |
| Checking that the 3 new Grundbausteine don't import another cataloged Grundbaustein | A bespoke import-scanner | **`catalogTaxonomy.test.ts`** (already globs all `*.stories.tsx` with `title` starting `Grundbausteine/`) — just give each new primitive a `title: 'Grundbausteine/Stack'` etc. and the existing test validates it automatically. |
| Verifying page*.module.css purity (Befund 22) | A brand-new scanner file | **Extend `detailStyleSystem.guard.test.ts`'s existing `forbiddenLocalDesign` array** — add `/grid-template/i` as a new entry, and delete the third `it()` block (the one that currently asserts `--card-public-hero-columns` is an *allowed* exception) since that hook is being retired, not merely exempted. This is a 2-line diff to an existing file, not a new test suite. |
| Determining neighbor anime for prev/next (Befund 19) | A new backend endpoint or a client-side-only cache | **`getAnimeList`** (existing, paginated, already used for the anime grid) — it is already server-callable; no backend change needed. |
| Multiple-avatar overlap rendering (mentioned in CONTEXT.md as "relevant for Befund 20") | A new avatar-row component | **Keep `ReleasePreviewRow`'s own bespoke `.logos` flex row** (not `AvatarStack`) — `AvatarStack` applies a negative-margin overlap + ring border that is a *visually different* treatment than the current non-overlapping `.logos` gap layout. Swapping to `AvatarStack` here would be an undeclared visual change, which `192-UI-SPEC.md`'s "zero pixel diff except Befund 19/20" contract forbids. `AvatarStack`'s relevance is only that its *existence proves* multi-logo-with-dynamic-width is a solved layout problem elsewhere — not that this row must adopt its specific overlap styling. |

**Key insight:** This phase's two automated CSS-content guards
(`foreignVariableOverrides.regression.test.ts`, `catalogTaxonomy.test.ts`) already run against the
entire `components/ui` directory with no per-file allowlist needed to *add* a new compliant file —
they only require an allowlist entry when a file *violates* the rule. Building the three new
primitives correctly from the start means these two tests pass without being touched at all; only
`detailStyleSystem.guard.test.ts` (which is page-specific, not global) needs an explicit, intentional
edit.

## Common Pitfalls

### Pitfall 1: `SplitLayout`'s fixed two-track grid reintroduces the Befund 20 bug for the zero-avatar case

**What goes wrong:** `SplitLayout`'s prescribed CSS (`192-UI-SPEC.md:189-191`) is
`grid-template-columns: var(--split-first-col, auto) minmax(0,1fr); gap: var(--split-gap, var(--space-4));`
— this unconditionally reserves a `gap` between column 1 and column 2 regardless of whether column 1
renders any content. If `ReleasePreviewRow` passes `firstColumn={groups.length > 0 ? <div>...avatars...</div> : null}`,
the grid still has two tracks and the gap still renders — reproducing exactly the "leftover gap
with zero avatars" defect the UI-SPEC's Acceptance Criteria for Befund 20 explicitly forbids
("the implementation must not render a SplitLayout first column that reserves width/gap when there
are zero avatars").

**Why it happens:** CSS Grid always allocates `gap` between adjacent tracks that exist in
`grid-template-columns`, independent of whether a track's content is empty — there is no built-in
"collapse this gap if this slot is empty" grid behavior without a `:has()`-based conditional rule
(fragile, and not part of `SplitLayout`'s prescribed API).

**How to avoid:** In `ReleasePreviewRow.tsx`, branch BEFORE rendering `SplitLayout`: when
`groups.length === 0`, render the second-column content (the `Stack` of groupName/releaseName/
techLine/extrasLine/dateLine) directly, without wrapping it in `SplitLayout` at all. This mirrors
the existing codebase convention of conditionally omitting an entire wrapper element rather than
rendering it with an empty child (see `ArtworkHero.tsx:58`: `{roles ? <div>...</div> : null}`, and
`AnimeDetailHero.tsx:84-100`: the whole `tagsSection` div is omitted, not rendered empty, when there
are no tags).

**Warning signs:** A Storybook visual diff on the "Ohne Logo" story showing the data lines starting
slightly right of where `groupName` starts, even though no avatar is visible.

### Pitfall 2: Unmocked `getAnimeList` in existing tests that already call `AnimeDetailPage`

**What goes wrong:** `page.test.tsx` already includes `getAnimeList: vi.fn()` in its top-level
`vi.mock('@/lib/api', ...)` block (line 19) — safe. However, `page.performance.test.ts`'s
`vi.mock('@/lib/api', ...)` block (lines 15-19) does **not** include `getAnimeList` in its override
list, meaning any call to the real `getAnimeList` would fall through to `importOriginal` and attempt
a genuine `fetch()` against `http://192.168.235.196:18092` (the stubbed `NEXT_PUBLIC_API_URL` in that
file's `beforeEach`). Currently this is safe only because none of `page.performance.test.ts`'s test
cases pass a `grid_query` search param (so `gridParams` resolves to `null` and the new neighbor-
resolution call never fires). Any future test added to that file that *does* exercise a grid query
would silently attempt a real network call in CI/test runs.

**Why it happens:** Partial `vi.mock` override lists (spreading `importOriginal` then overriding only
some exports) silently let any *newly added* call to a not-yet-overridden export fall through to the
real implementation — this is invisible until the new code path is actually exercised by a test.

**How to avoid:** When implementing Befund 19, add `getAnimeList: vi.fn()` to
`page.performance.test.ts`'s mock block defensively (even though no current test case needs it),
matching `page.test.tsx`'s already-correct pattern. Grep `vi.mock\('@/lib/api'` across the frontend
test suite before finalizing the plan to confirm no other partial-mock file silently gains a new
unmocked network call.

### Pitfall 3: `Card variant="publicHero"`'s base grid rule still applies once `SplitLayout` moves inside it

**What goes wrong:** `Card.module.css:120-142`'s `.cardPublicHero` sets
`grid-template-columns: var(--card-public-hero-columns, minmax(0,1fr))` — once `AnimeDetailHero`
stops setting the `--card-public-hero-columns` hook (per Befund 21/22), this rule falls back to its
default `minmax(0,1fr)` (a single column), which is exactly correct **only if** `SplitLayout` becomes
the single child filling that one column. If a plan accidentally keeps the two `Card`s
(`publicPoster`/`publicHeroInfo`) as *direct* children of the outer `Card variant="publicHero"`
(instead of nesting them inside a `SplitLayout` that itself is the single child), they will silently
collapse to one stacked column with no responsive behavior at all (the two-column breakpoint logic
would be entirely lost, not just mis-positioned).

**Why it happens:** The current Befund-21 violation already nests the grid at the wrong level
(`AnimeDetailView.tsx:85-94`: the outer `<Card variant="publicHero">` directly contains
`AnimeDetailHero`'s Fragment output, i.e. the two inner Cards are direct grid children today). The
fix must deliberately insert one more wrapping level (`SplitLayout`) between the outer `Card` and the
two inner `Card`s — a surface-level "just remove the page's div" refactor would miss this.

**How to avoid:** Verify via the Storybook screenshot proof mandated by `192-UI-SPEC.md` Befund 21
acceptance criterion (1440px desktop AND 390px mobile) — a collapsed single-column layout at 1440px
is the unambiguous signal this pitfall occurred.

### Pitfall 4: The `elements()` test-tree-walker only materializes explicitly whitelisted component types

**What goes wrong:** `page.test.tsx`'s `elements()` helper (lines 102-111) only calls into (i.e.
"materializes") `AnimeDetailHero` and `AnimeEpisodesSection` — any other function component
(including the post-refactor `AnimeEdgeNavigation`) remains an **opaque, unrendered React element**
in the walked tree; its own JSX children are never visited, but its **props are still fully
readable** (React elements are plain objects; `.props` is always inspectable without calling the
function).

**Why it happens:** `isValidElement(child)` returns `true` for a function-component element
regardless of whether that function has been invoked — `elements()` deliberately special-cases a
small, explicit allowlist of "safe to call directly" components (no hooks, no 'use client' state)
rather than attempting to materialize every component, because some child components (e.g.
`AnimeMediaProvider`, `WatchlistAddButton`) rely on React context/hooks that would throw if invoked
as a plain function outside of a real render.

**How to avoid (this is the correct, low-risk design for the Befund 19 SSR test):** Do **not** add
`AnimeEdgeNavigation` to the whitelist (it legitimately still needs `'use client'` hook state for the
hover preview and would throw "Invalid hook call" if invoked as a plain function in this test style).
Instead, assert directly against the **props** already sitting on the un-materialized
`AnimeEdgeNavigation` element — e.g. `const nav = elements(content).find(el => el.type ===
AnimeEdgeNavigation); expect(nav?.props.previous?.href).toBe(...)`. Since the server now resolves
`previous`/`next` before creating this element, their `href` values are fully present on `.props`
without ever calling the component function or touching any client hook — this is simultaneously the
correct architecture (hrefs genuinely computed server-side) and the correct, hook-free test technique.

## Code Examples

### SSR-oriented test for Befund 19 (no mock fetch, no client hydration)

```tsx
// Illustrative extension of the existing page.test.tsx pattern (lines 102-139) —
// exact prop name (`previous`/`next` vs. a single `edgeNavigation` object) is Claude's Discretion.
it('stellt die Randnavigations-HREFs bereits im Server-Baum bereit, ohne AnimeEdgeNavigation selbst aufzurufen', async () => {
  vi.mocked(getAnimeList).mockResolvedValue({
    data: [item(21), item(22), item(23)],
    meta: { page: 1, per_page: 3, total: 3, total_pages: 1 },
  })
  const boundary = await AnimeDetailPage({
    ...paramsFor('22'),
    searchParams: Promise.resolve({ grid_query: buildAnimeGridQuery({ per_page: 3 }) }),
  })
  const content = await loadContent('22') // existing helper, unchanged
  const nav = elements(content).find((item) => item.type === AnimeEdgeNavigation)
  expect(nav?.props.previous?.href).toBe(buildAnimeDetailHref(21, buildAnimeGridQuery({ per_page: 3, page: 1 })))
  expect(nav?.props.next?.href).toBe(buildAnimeDetailHref(23, buildAnimeGridQuery({ per_page: 3, page: 1 })))
  // Kein waitFor(), kein act(), kein jsdom-Render nötig -- die hrefs stehen bereits synchron
  // auf dem vom Server erzeugten Element, bevor AnimeEdgeNavigation je aufgerufen wird.
})
```

### Existing override-hook mechanism to copy for `Stack`/`Cluster`/`SplitLayout` (already in repo)

```tsx
// Source: frontend/src/components/ui/Card.tsx (verified, existing — tintHue prop)
<Component style={{ '--card-tint-hue': tintHue } as CSSProperties}>
```
```css
/* Source: frontend/src/components/ui/Card.module.css:191-195 (verified, existing) */
.cardGlass.cardTinted {
  background-color: hsl(var(--card-tint-hue) var(--card-tint-saturation-override, var(--card-tint-saturation)) ...);
}
```

## State of the Art

Not applicable — no external library/ecosystem version drift risk exists in this phase (zero new
dependencies, Next.js 16/React 18.3.1 already pinned project-wide and unaffected by this phase).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact prop/return shape of the proposed `resolveAnimeNeighbors()` shared function (vs. keeping two separate call sites that both call a lower-level shared helper) is left as an implementation choice — `192-CONTEXT.md` mandates "dieselbe Grid-Logik", not a specific function signature. | Architecture Patterns, Pattern 3 | Low — any shared-logic shape satisfies the "no duplication" constraint; the specific signature shown is illustrative, not binding. |
| A2 | `AnimeEdgeNavigation`'s hover-preview client fetch is assumed to remain a **separate** `getAnimeList` call from the server-resolved neighbor data (per literal reading of CONTEXT.md's "bleibt ... erhalten"), rather than reusing the server's already-fetched `AnimeListItem` objects for the preview card too (which would be more efficient but requires passing full neighbor objects, not just hrefs, as props). | Pattern 3, Phase Requirements (Befund 19) | Medium — if the planner instead passes the full neighbor objects from server to avoid a duplicate client fetch, that is very likely acceptable (CONTEXT.md's "Claude's Discretion" section allows prop-name/shape flexibility) but should be flagged to the user/reviewer as a deliberate deviation from the most literal reading, since it changes which data crosses the server/client boundary. |

**If this table is empty:** N/A — two low/medium-risk assumptions are logged above; both concern
implementation shape, not whether a decision is correct, since all hard constraints come from
already-locked `192-CONTEXT.md`/`192-UI-SPEC.md` text.

## Open Questions

1. **Does `AnimeEdgeNavigation` keep its own `getAnimeList` call for the hover preview, or does the
   server pass the full neighbor `AnimeListItem` objects down as props (eliminating the duplicate
   fetch entirely)?**
   - What we know: CONTEXT.md's literal wording keeps the client fetch "nur für die Hover-
     Vorschaukarte" — implying the hook stays, just narrowed in purpose.
   - What's unclear: Whether passing the already-fetched neighbor objects from the server instead
     (eliminating the second fetch, since the server already has `title`/`type`/`cover_image` for
     each neighbor) would be interpreted as contradicting that wording, or as a more efficient
     *implementation* of the same requirement.
   - Recommendation: Default to keeping the existing client fetch (matches the literal text, zero
     ambiguity, smallest diff), but note the alternative as a valid lower-risk optimization the
     planner may choose instead — either satisfies Befund 19's hard requirement (hrefs present in
     SSR HTML).

2. **Exact CSS Module filename for the grid/layout rules extracted out of `page.poster.module.css`/
   `page.infoCard.module.css` into `AnimeDetailHero`'s own ownership.**
   - What we know: `AnimeDetailHero.tsx` currently has no own `.module.css` file (it imports
     `AnimeDetailView.styles.ts`'s merged `styles` object). Befund 21 requires it to own its own
     grid/card wrapper CSS.
   - What's unclear: Whether to create a new standalone `AnimeDetailHero.module.css` (cleanest,
     matches every other composite's naming convention, e.g. `ReleasePreviewRow.module.css`) or to
     keep reusing the merged `AnimeDetailView.styles.ts` bundle (consistent with the *current*
     mechanism but perpetuates the very "styles live outside the component that owns them"
     structure Befund 21/22 are correcting).
   - Recommendation: Create a dedicated `AnimeDetailHero.module.css` (matching every other pilot
     composite's convention: `ReleasePreviewRow.module.css`, `AnimeEdgeNavigation.module.css`) and
     retire the poster/infoCard portions of `AnimeDetailView.styles.ts`'s merge accordingly — this is
     the architecturally consistent choice and was implicitly assumed throughout this research's
     Recommended Project Structure.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 (already configured, `frontend/vitest.config.ts`) |
| Config file | `frontend/vitest.config.ts` (existing — no changes needed) |
| Quick run command | `cd frontend && npx vitest run src/app/anime/[id] src/components/anime/AnimeEdgeNavigation.test.tsx src/components/fansubs/ReleasePreviewRow src/components/ui/Stack.test.tsx src/components/ui/Cluster.test.tsx src/components/ui/SplitLayout.test.tsx` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| Befund 23 | `Stack`/`Cluster`/`SplitLayout` accept only token props, set no color/radius/shadow | unit | `npx vitest run src/components/ui/foreignVariableOverrides.regression.test.ts` | ✅ (existing, auto-covers new files) |
| Befund 23 | No undisclosed internal import of another cataloged Grundbaustein | unit | `npx vitest run src/components/ui/catalogTaxonomy.test.ts` | ✅ (existing, auto-covers new files) |
| Befund 23 | New component-level tests (render each gap/align/justify/breakpoint state) | unit | `npx vitest run src/components/ui/Stack.test.tsx src/components/ui/Cluster.test.tsx src/components/ui/SplitLayout.test.tsx` | ❌ Wave 0 — new files |
| Befund 22 | `page*.module.css` contains no `grid-template`/color/radius/shadow for baustein interiors | unit | `npx vitest run src/app/anime/\[id\]/detailStyleSystem.guard.test.ts` | ✅ exists, needs `grid-template` pattern + exception removal (Wave 0 edit, not new file) |
| Befund 21 | `AnimeDetailHero` renders identical structure to the live page (Card+SplitLayout ownership) | unit (tree-walk) | `npx vitest run src/app/anime/\[id\]/page.test.tsx` | ✅ exists, needs new assertions |
| Befund 21 | Visual proof: Storybook vs. live page, 1440px + 390px | manual-only (screenshot pair) | Playwright screenshot script per `192-CONTEXT.md`'s specifics | ❌ — scripted manually per phase's established `git worktree add --detach` convention |
| Befund 19 | Edge-nav hrefs present in server-rendered tree without client fetch | unit (tree-walk, no mock hydration) | `npx vitest run src/app/anime/\[id\]/page.test.tsx` | ❌ Wave 0 — new test case, existing file |
| Befund 19 | Preview card still only shows on hover/focus (regression) | unit (jsdom, existing pattern) | `npx vitest run src/components/anime/AnimeEdgeNavigation.test.tsx` | ✅ exists, needs updated props contract (prev/next now passed, not fetched for hrefs) |
| Befund 20 | Data lines align with group/release text column in all 3 story variants | unit | New assertions in `npx vitest run src/components/fansubs/ReleasePreviewRow.stories.tsx`-covered component test (create `ReleasePreviewRow.test.tsx` if none exists) | ❌ Wave 0 — verify no `ReleasePreviewRow.test.tsx` currently exists; if absent, create it |
| Befund 20 | Zero-avatar case has no leftover gap | unit | Same new `ReleasePreviewRow.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** scoped `npx vitest run <touched-dir>` (quick run command above)
- **Per wave merge:** full suite (`npx vitest run`) + `npx tsc --noEmit` + `npx eslint .`
- **Phase gate:** Full suite green, plus the mandated Playwright screenshot-pair proof
  (`/anime/6`, `/anime/13`, `/anime/2` at 1440×900/390×844, main vs. branch; `AnimeDetailHero.stories.tsx`
  vs. live page) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/components/ui/Stack.test.tsx` — new primitive, no existing test
- [ ] `src/components/ui/Cluster.test.tsx` — new primitive, no existing test
- [ ] `src/components/ui/SplitLayout.test.tsx` — new primitive, no existing test
- [ ] Confirm whether `src/components/fansubs/ReleasePreviewRow.test.tsx` already exists (not found in
  this research's file listing — only `.stories.tsx`/`.module.css`/`.tsx` were found for this
  component); if absent, create it for the Befund 20 alignment + zero-avatar-gap assertions.
- [ ] `page.performance.test.ts`'s `vi.mock('@/lib/api', ...)` block needs `getAnimeList: vi.fn()`
  added defensively (see Common Pitfalls, Pitfall 2) even though no current test case in that file
  exercises a grid query.

## Environment Availability

Skipped — this phase has no external tool/service/runtime dependency beyond the already-running
Docker Compose stack (Postgres/Redis/Go backend/Next.js frontend) and the project's already-pinned
Node/npm toolchain. No new dependency is introduced.

## Security Domain

Not applicable in the ASVS sense — this phase touches zero authentication, session, access-control,
input-validation, or cryptography surface. The only "security-adjacent" existing test this phase must
not regress is `page.test.tsx`'s assertion that public SSR stays free of viewer cookies/watchlist
reads (`'keeps public SSR free from viewer cookies and watchlist status reads'`, line 142) — the new
`getAnimeList` server call must use the **unauthenticated** `fetch()` branch (not `authorizedFetch`),
which is already guaranteed by `getAnimeList`'s own branching logic (`params.include_disabled ===
true ? authorizedFetch : fetch`, `lib/api/fansubs-core.ts:97-100`) — the public anime-list endpoint
path (`/api/v1/anime`, not `/api/v1/admin/anime`) is taken automatically since neighbor resolution
never sets `include_disabled`.

## Sources

### Primary (HIGH confidence — direct repository inspection, this session)
- `frontend/src/app/anime/[id]/page.tsx` — Server Component structure, existing `Promise.allSettled` fail-open pattern
- `frontend/src/app/anime/[id]/AnimeDetailView.tsx` — current Befund 21/22 violation location
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` — current composite structure
- `frontend/src/app/anime/[id]/AnimeDetailView.styles.ts`, `page.module.css`, `page.poster.module.css`, `page.infoCard.module.css` — current CSS ownership
- `frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts` — existing guard-test template for Befund 22 extension
- `frontend/src/app/anime/[id]/page.test.tsx`, `page.performance.test.ts` — existing tree-walk test technique and `vi.mock` partial-override pitfall
- `frontend/src/app/anime/[id]/AnimeDetailView.test.tsx` — existing direct-function-call test pattern
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx`, `AnimeEdgeNavigation.module.css`, `AnimeEdgeNavigation.test.tsx` — current client-only neighbor-resolution algorithm and its jsdom test pattern
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`, `ReleasePreviewRow.module.css`, `ReleasePreviewRow.stories.tsx` — current data-line indentation bug location and existing story variants
- `frontend/src/components/fansubs/FansubGroupPicker.module.css` — `.wrapper`/`.chipRow` migration targets
- `frontend/src/components/ui/Card.tsx`, `Card.module.css` — override-hook mechanism (`tintHue`) and `.cardPublicHero`/`.cardPublicPoster`/`.cardPublicHeroInfo` grid ownership
- `frontend/src/components/ui/ArtworkHero.tsx`, `ArtworkHero.module.css` — container-query breakpoint pattern to copy for `SplitLayout`
- `frontend/src/components/ui/AvatarStack.tsx`, `AvatarStack.module.css` — existing multi-avatar overlap pattern (confirmed NOT to be swapped into `ReleasePreviewRow`)
- `frontend/src/components/ui/catalogTaxonomy.test.ts` — Grundbausteine import-guard, confirmed to auto-cover new files
- `frontend/src/components/ui/foreignVariableOverrides.regression.test.ts` — literal-value/foreign-variable guard, confirmed to auto-cover new files
- `frontend/src/components/ui/AdjacentNavigation.tsx` — existing `href`-bearing item shape consumed by `AnimeEdgeNavigation`
- `frontend/src/lib/animeGridContext.ts`, `animeGridContext.test.ts` — existing grid-query parse/build helpers, extension point for shared neighbor-resolution
- `frontend/src/lib/api/fansubs-core.ts` — `getAnimeList` confirmed server-safe (no `'use client'`, plain `fetch`)
- `frontend/src/components/ui/index.ts` — barrel export convention for new primitives
- `.planning/phases/192-.../192-CONTEXT.md`, `192-UI-SPEC.md` — binding decisions and prescriptive component API (already locked, not re-derived)

### Secondary / Tertiary
None used — no WebSearch/Context7/WebFetch calls were necessary for this phase; every claim above
is sourced directly from the repository.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all existing project conventions directly inspected
- Architecture: HIGH — exact current file/line ownership of every Befund identified directly
- Pitfalls: HIGH — all four pitfalls derived from reading actual existing code/tests, not speculation

**Research date:** 2026-11-04
**Valid until:** No external expiry risk (pure internal refactor of already-committed code); re-verify
only if `main` receives conflicting changes to any of the Sources files before this phase executes.
