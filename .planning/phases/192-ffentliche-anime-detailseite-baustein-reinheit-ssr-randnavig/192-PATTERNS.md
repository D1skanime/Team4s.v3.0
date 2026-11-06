# Phase 192: Öffentliche Anime-Detailseite — Pattern Map

**Mapped:** 2026-11-04
**Files analyzed:** 20 (3 new Grundbausteine + their tests/stories + 5 pilot-composite modifications + shared-logic/test extensions)
**Analogs found:** 20 / 20 (zero "no analog" files — this phase is a brownfield refactor of already-known code, and `192-RESEARCH.md`/`192-UI-SPEC.md` already pin exact source line numbers)

> This phase has an unusually strong upstream input: `192-UI-SPEC.md` already locks the exact prop
> API, CSS rule bodies, and consumption map for `Stack`/`Cluster`/`SplitLayout`, and
> `192-RESEARCH.md` already cites exact current-file line ranges for every Befund. This PATTERNS.md
> does not re-derive those decisions — it binds them to concrete, read-verified excerpts from the
> actual analog files so the planner can cite "copy X from file:line" directly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/components/ui/Stack.tsx` (+`.module.css`, `.stories.tsx`, `.test.tsx`) | utility (layout Grundbaustein) | transform (pure render, token→CSS-var) | `frontend/src/components/ui/Card.tsx` (`tintHue` override-hook mechanism) | role-match (override-hook pattern identical; Card is composite, Stack is primitive) |
| `frontend/src/components/ui/Cluster.tsx` (+`.module.css`, `.stories.tsx`, `.test.tsx`) | utility (layout Grundbaustein) | transform | `frontend/src/components/fansubs/FansubGroupPicker.module.css` `.chipRow` (flex-wrap pattern to be replaced) + `Card.tsx` (hook mechanism) | role-match |
| `frontend/src/components/ui/SplitLayout.tsx` (+`.module.css`, `.stories.tsx`, `.test.tsx`) | utility (layout Grundbaustein) | transform | `frontend/src/components/ui/ArtworkHero.tsx` + `ArtworkHero.module.css` (container-query breakpoint collapse) | exact (container-query pattern copied verbatim) |
| `frontend/src/components/ui/index.ts` | config (barrel export) | — | itself (existing alphabetical list) | exact |
| `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` | component (composite) | request-response (pure prop-driven render) | itself (current version) — gains `Card variant="publicHero"` + `SplitLayout` wrapper currently owned by `AnimeDetailView.tsx` | exact (modifying in place) |
| `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` (new file) | config (CSS Module) | — | `frontend/src/components/fansubs/ReleasePreviewRow.module.css` (dedicated per-composite CSS Module convention) | role-match |
| `frontend/src/app/anime/[id]/AnimeDetailHero.stories.tsx` | test (Storybook) | — | itself (existing, gains 1440px + 390px proof stories) | exact |
| `frontend/src/app/anime/[id]/AnimeDetailView.tsx` | component (page-level orchestrator) | request-response | itself (current version) — loses `Card`/grid wrapper, becomes pure sequencer | exact |
| `frontend/src/app/anime/[id]/page.tsx` (`AnimeDetailContent`) | route (Next.js Server Component) | request-response (SSR data fetch) | itself — existing `Promise.allSettled` fail-open pattern (lines 76, 80-87) is the analog for the new neighbor-resolution call | exact |
| `frontend/src/app/anime/[id]/page.module.css` / `page.poster.module.css` / `page.infoCard.module.css` | config (CSS Module) | — | itself — rules move out, not a new pattern | exact |
| `frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts` | test (content-regex guard) | — | itself — extend `forbiddenLocalDesign` array | exact |
| `frontend/src/components/anime/AnimeEdgeNavigation.tsx` | component (client, 'use client') | event-driven (hover/focus) + request-response (now prop-driven for hrefs) | itself — current client-only `loadNeighbors()` algorithm (lines 54-94) is the logic to extract, not duplicate | exact |
| `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` | test (jsdom + RTL) | — | itself — existing `vi.mock('@/lib/api', ...)` + `render`/`waitFor` pattern | exact |
| `frontend/src/lib/animeGridContext.ts` | utility (pure, server-safe) | transform | itself — existing exported pure functions (`buildAnimeGridQuery`, `parseAnimeListParamsFromGridQuery`); new `resolveAnimeNeighbors()` follows the same JSDoc-commented pure-function convention | exact |
| `frontend/src/app/anime/[id]/page.test.tsx` | test (SSR tree-walk) | — | itself — existing `elements()` walker (lines 102-111) + `loadContent()` helper (lines 128-139) | exact |
| `frontend/src/app/anime/[id]/page.performance.test.ts` | test (defensive mock fix) | — | `page.test.tsx`'s already-correct `vi.mock('@/lib/api', ...)` override list (line 19) | exact |
| `frontend/src/components/fansubs/ReleasePreviewRow.tsx` | component (client, 'use client') | request-response (pure prop-driven render) | itself — current `.content`/`.identity`/`.logos` structure (lines 50-93) | exact |
| `frontend/src/components/fansubs/ReleasePreviewRow.module.css` | config (CSS Module) | — | itself — `.content`/`.identity` grid/flex rules move to `SplitLayout`/`Cluster`/`Stack` composition | exact |
| `frontend/src/components/fansubs/ReleasePreviewRow.test.tsx` (new file, confirmed absent) | test (component, likely jsdom) | — | `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` (RTL render + `screen` query pattern for a 'use client' component in this same domain) | role-match (no direct analog test file in `fansubs/`, nearest is cross-directory) |
| `frontend/src/components/fansubs/FansubGroupPicker.tsx`/`.module.css` | component (client, 'use client') | request-response | itself — `.wrapper`/`.chipRow` (lines 7-19) are the 1:1 mechanical `Stack`/`Cluster` migration target named explicitly in `192-UI-SPEC.md`'s consumption map | exact |

## Pattern Assignments

### `frontend/src/components/ui/Stack.tsx` / `Stack.module.css` / `Stack.stories.tsx` / `Stack.test.tsx` (Grundbaustein, Befund 23)

**Analog:** `frontend/src/components/ui/Card.tsx` (override-hook mechanism) + `frontend/src/components/ui/AvatarStack.tsx`/`.stories.tsx` (file quartet shape of a Grundbaustein without internal cataloged imports)

**Override-hook pattern to copy** (`Card.tsx:63-72`):
```tsx
const hasTint = isGlassVariant && tintHue !== undefined
const mergedStyle: CSSProperties | undefined = hasTint
  ? {
      ...style,
      '--card-tint-hue': tintHue,
      ...(tintSaturation !== undefined ? { '--card-tint-saturation-override': `${tintSaturation}%` } : {}),
    } as CSSProperties
  : style
```
→ `Stack.tsx` does the same but unconditionally (no `hasTint` gate needed — `gap`/`align` always have a default):
```tsx
// Prescriptive shape, locked in 192-UI-SPEC.md:208-217
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

**CSS pattern** (new file, mirrors `Card.module.css`'s hook-consuming shape, e.g. line 134 `grid-template-columns: var(--card-public-hero-columns, minmax(0, 1fr));`):
```css
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--stack-gap, var(--space-3));
  align-items: var(--stack-align, stretch);
  min-width: 0;
}
```

**Barrel import pattern** (`frontend/src/components/ui/index.ts:1-50`, alphabetical, one line per primitive):
```ts
export * from './Accordion'
export * from './Avatar'
...
export * from './SortableList'
export * from './Spinner'
// 'Stack' inserts alphabetically between 'Spinner' and 'StatusIcon'
export * from './StatusIcon'
```

**Stories taxonomy pattern** (`frontend/src/components/ui/AvatarStack.stories.tsx:1-22`, adapt `title` to `Grundbausteine/Stack` since Stack itself imports no other cataloged primitive — unlike AvatarStack which is `Zusammengesetzte Bausteine/*`):
```tsx
import type { Meta, StoryObj } from '@storybook/nextjs'
const meta = {
  title: 'Grundbausteine/Stack',
  component: Stack,
  tags: ['autodocs'],
} satisfies Meta<typeof Stack>
export default meta
type Story = StoryObj<typeof meta>
export const Standard: Story = { args: { gap: '3', children: <>...</> } }
```

**Taxonomy guard this must satisfy:** `frontend/src/components/ui/catalogTaxonomy.test.ts:131-150` — reads `Stack.tsx`'s own source via `fs.readFileSync`, extracts local `from './X'` imports, and fails if `X.stories.tsx` exists for any imported `X` not in `EXCEPTIONS`. `Stack`/`Cluster`/`SplitLayout` must import **zero** sibling `components/ui` files to pass this with no `EXCEPTIONS` entry needed (they only import `classNames` and types, same as `Card.tsx:1-6`'s non-cataloged imports `CSSProperties`/`classNames`/`Heading`/`Text` — note `Card` itself needed an `EXCEPTIONS['Card'] = ['Heading', 'Text']` entry at `catalogTaxonomy.test.ts:42`; `Stack`/`Cluster`/`SplitLayout` must avoid needing any such entry per `192-UI-SPEC.md:131`).

**Design-token guard this must satisfy:** `frontend/src/components/ui/foreignVariableOverrides.regression.test.ts:30-76` — globs every `.module.css` in `components/ui`, flags (a) any custom property set in more than one file unless listed in `KNOWN_OVERRIDE_HOOK_OWNERS` (lines 60-76), and (b) raw px/rem/hex/rgba literals outside `@media`/`@container` conditions. `--stack-gap`/`--stack-align` must be uniquely named (not collide with any existing hook) and `Stack.module.css` must use only `var(--space-N)` token references, never a literal.

---

### `frontend/src/components/ui/Cluster.tsx` / `Cluster.module.css` / `Cluster.stories.tsx` / `Cluster.test.tsx` (Grundbaustein, Befund 23)

**Analog:** same `Card.tsx` override-hook mechanism as `Stack`; CSS shape analog is `frontend/src/components/fansubs/FansubGroupPicker.module.css:14-19` (the exact flex-wrap rule this primitive replaces):
```css
/* Source: FansubGroupPicker.module.css:14-19 (current, to be replaced by Cluster) */
.chipRow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
}
```
→ `Cluster.module.css` generalizes this exact shape per `192-UI-SPEC.md:163`:
```css
.cluster {
  display: flex;
  flex-wrap: var(--cluster-wrap, wrap);
  gap: var(--cluster-gap, var(--space-2));
  align-items: var(--cluster-align, center);
  justify-content: var(--cluster-justify, flex-start);
  min-width: 0;
}
```
`FansubGroupPicker.tsx:36-38` is the exact call site that will wrap `.wrapper`/`.chipRow` with `Stack`/`Cluster`:
```tsx
<div className={styles.wrapper}>       {/* → <Stack gap="2"> */}
  <Text as="span" variant="eyebrow" tone="onScrim">Fansub-Gruppe</Text>
  <div role="group" aria-label="Fansub-Gruppe" className={styles.chipRow}>  {/* → <Cluster gap="3" as="div" role="group" aria-label="..."> */}
```
Note: `Cluster`'s `as` prop (default `'div'`) must still accept `role`/`aria-label` via rest-prop spread (same `...props` pattern as `Card.tsx:52,76`) — `FansubGroupPicker`'s `role="group"` is accessibility-load-bearing and must survive the migration unchanged.

---

### `frontend/src/components/ui/SplitLayout.tsx` / `SplitLayout.module.css` / `SplitLayout.stories.tsx` / `SplitLayout.test.tsx` (Grundbaustein, Befund 23)

**Analog:** `frontend/src/components/ui/ArtworkHero.tsx` + `ArtworkHero.module.css` — exact container-query breakpoint-collapse pattern to copy.

**Container-query pattern** (`ArtworkHero.module.css:1-5`, verbatim structure to replicate with a uniquely-named container per `192-RESEARCH.md`'s Pattern 2):
```css
/* Geteilter, inhaltsgroßer heller Hero. Geometrie gehört hierhin, niemals in eine Domänen-Seite. */
.hero {
  container: artwork-hero / inline-size;
  min-width: 0;
}
```
→ `SplitLayout.module.css` uses its own container name (e.g. `split-layout`):
```css
.splitLayout {
  container: split-layout / inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--split-gap, var(--space-4));
  align-items: var(--split-align, start);
  min-width: 0;
}
@container split-layout (min-width: 48rem) {   /* breakpoint="md" */
  .splitLayout {
    grid-template-columns: var(--split-first-col, auto) minmax(0, 1fr);
  }
}
```
`ArtworkHero.module.css:92-99` shows the exact `@container` breakpoint-swap idiom (grid-column reassignment at the threshold) this mirrors:
```css
@container artwork-hero (min-width: 48rem) {
  .artwork img { object-position: right center; }
  .details { grid-column: 2; }
  ...
}
```

**Pitfall this primitive's consumers must avoid** (documented in `192-RESEARCH.md` Pitfall 1 and `192-UI-SPEC.md:247`): `SplitLayout`'s grid always reserves `gap` between its two tracks once both tracks exist — `ReleasePreviewRow.tsx` must conditionally skip rendering `SplitLayout` entirely when `groups.length === 0` (see `ReleasePreviewRow` section below), the existing codebase precedent for this conditional-omission idiom is `ArtworkHero.tsx:58`:
```tsx
{roles ? <div className={styles.roles}>{roles}</div> : null}
```

**Grid-ownership pitfall this replaces** (`Card.module.css:120-142`, the `.cardPublicHero` rule `AnimeDetailHero` must nest `SplitLayout` INSIDE, not bypass):
```css
/* Source: Card.module.css:120-142 (unchanged by this phase, read-only reference) */
.cardPublicHero {
  position: relative;
  grid-template-columns: var(--card-public-hero-columns, minmax(0, 1fr));
  gap: 0;
  padding: 0;
  overflow: visible;
  border-color: var(--card-public-hero-border);
  border-radius: var(--card-public-hero-radius);
  background: var(--card-public-hero-bg);
  box-shadow: var(--card-public-hero-shadow);
}
```
Once `page.module.css:70-92`'s `--card-public-hero-columns` hook is retired (Befund 22), this rule falls back to `minmax(0, 1fr)` — a single column — which is only correct if `SplitLayout` becomes the single grid child filling that column (see Pitfall 3 in `192-RESEARCH.md`).

---

### `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` + new `AnimeDetailHero.module.css` (composite, Befund 21)

**Analog:** itself (current file, full text read) — the fix moves ownership INTO this file, not from an external analog.

**Current structure to restructure** (`AnimeDetailHero.tsx:34-62`, poster `Card`, and `:71-109`, info `Card` — currently two sibling Fragment children, the exact Pitfall-3 violation):
```tsx
return (
  <>
    <Card variant="publicPoster" className={styles.posterColumn}>...</Card>
    <Card variant="publicHeroInfo" className={styles.infoCard}>...</Card>
  </>
)
```
→ becomes (per `192-UI-SPEC.md:203,216` consumption map — `AnimeDetailHero` now owns the outer `Card variant="publicHero"` + `SplitLayout` wrapper currently sitting in `AnimeDetailView.tsx:85-94`):
```tsx
return (
  <Card variant="publicHero" className={styles.heroContainer}>
    <SplitLayout
      firstColumn={<Card variant="publicPoster" className={styles.posterColumn}>...</Card>}
      secondColumn={<Card variant="publicHeroInfo" className={styles.infoCard}>...</Card>}
      firstColumnWidth="var(--media-frame-poster-width)"
      breakpoint="lg"
    />
    {edgeNavigation /* new slot prop, positioned via AnimeDetailHero's own .module.css, not the page */}
  </Card>
)
```

**Page-ownership code being moved OUT of `AnimeDetailView.tsx` into this file** (`AnimeDetailView.tsx:84-95`, exact lines to delete from the page and relocate):
```tsx
<div className={styles.heroWrapper}>
  <Card variant="publicHero" className={styles.heroContainer}>
    <AnimeDetailHero anime={anime} coverUrl={displayCoverUrl} embySeriesUrl={embySeriesUrl} relationsResponse={relationsResponse} />
    {gridQuery && (
      <div className={styles.edgeNavigationOverlay}>
        <AnimeEdgeNavigation currentAnimeID={anime.id} gridQuery={gridQuery} />
      </div>
    )}
  </Card>
</div>
```
→ `AnimeDetailView.tsx` after the fix contains only (per `192-UI-SPEC.md:213-217`):
```tsx
<AnimeDetailHero anime={anime} coverUrl={displayCoverUrl} embySeriesUrl={embySeriesUrl} relationsResponse={relationsResponse} edgeNavigation={gridQuery ? <AnimeEdgeNavigation currentAnimeID={anime.id} gridQuery={gridQuery} previous={...} next={...} /> : null} />
```

**CSS rules migrating from `page.module.css:70-92` into the new `AnimeDetailHero.module.css`** (the retired `--card-public-hero-columns` override-hook, plus the `edgeNavigationOverlay` positioning currently in `page.infoCard.module.css:84-96,137-147`):
```css
/* Source: page.module.css:70-92 (DELETE from page, the SplitLayout prop replaces this entirely) */
.heroContainer {
  --card-public-hero-columns: var(--media-frame-poster-width) minmax(0, 1fr);
}
@media (max-width: 1023px) {
  .heroContainer { --card-public-hero-columns: var(--media-frame-poster-width-medium) minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .heroContainer { --card-public-hero-columns: minmax(0, 1fr); }
}
```
```css
/* Source: page.infoCard.module.css:84-96,137-147 (MOVE into AnimeDetailHero.module.css verbatim —
   this is the absolute-overlay-on-hero-card positioning that 192-UI-SPEC.md:216 says
   AnimeDetailHero itself must now own) */
.edgeNavigationOverlay {
  position: absolute;
  z-index: var(--z-dropdown);
  top: var(--space-3);
  right: 0;
  left: 0;
  height: var(--control-height-md);
  pointer-events: none;
}
.edgeNavigationOverlay > * { pointer-events: auto; }
@media (max-width: 767px) {
  .edgeNavigationOverlay {
    position: relative;
    inset: auto;
    height: auto;
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    margin-top: var(--space-4);
    padding: 0 var(--space-5) var(--space-5);
  }
}
```

**Code-comment convention to preserve** (`AnimeDetailHero.tsx:64-70,86-94`, German fachlich comments explaining *why*, not just *what* — follow this exact style for any new comment explaining the `SplitLayout`/`Card` nesting):
```tsx
{/* publicHeroInfo ist oben nahezu opak HELL (siehe Card.module.css), anders als die
    übrigen dunklen Glasflächen dieser Seite -- Titel/Beschreibung bleiben deshalb bei der
    dunklen Standard-Textfarbe (kein tone="onScrim"). ... */}
```

---

### `frontend/src/app/anime/[id]/page.tsx` (`AnimeDetailContent`) + `frontend/src/lib/animeGridContext.ts` (Befund 19)

**Analog:** itself — existing `Promise.allSettled` fail-open convention (lines 76, 80-87) is the exact pattern the new neighbor-resolution call must follow.

**Fail-open pattern to copy** (`page.tsx:76-77`):
```tsx
const [animeFansubsResult] = await Promise.allSettled([getAnimeFansubs(anime.id)])
const animeFansubsResponse = animeFansubsResult.status === 'fulfilled' ? animeFansubsResult.value : null
```
→ applied to neighbor resolution:
```tsx
const gridParams = parseAnimeListParamsFromGridQuery(gridQuery)
const [neighborsResult] = gridParams
  ? await Promise.allSettled([resolveAnimeNeighbors(gridParams, anime.id)])
  : [{ status: 'fulfilled' as const, value: { prev: null, next: null } }]
const neighbors = neighborsResult.status === 'fulfilled' ? neighborsResult.value : { prev: null, next: null }
```

**Algorithm to extract (not duplicate)** — `frontend/src/components/anime/AnimeEdgeNavigation.tsx:54-94`, the current client-only `loadNeighbors()` body, is the ONE source of truth for the index/boundary logic. It must move into `frontend/src/lib/animeGridContext.ts` as a new exported function, called from both `page.tsx` (server) and `AnimeEdgeNavigation.tsx` (client, still needs its own `AbortController` for the hover-preview fetch):
```ts
// Current client-only logic to extract verbatim (AnimeEdgeNavigation.tsx:63-80):
const current = await getAnimeList(gridParams, { signal: controller.signal })
const index = current.data.findIndex((anime) => anime.id === currentAnimeID)
const result: Neighbors = { prev: null, next: null }
if (index >= 0) {
  if (index > 0) result.prev = { anime: current.data[index - 1], page: currentPage }
  else if (currentPage > 1) {
    const previous = await getAnimeList({ ...gridParams, page: currentPage - 1 }, { signal: controller.signal })
    const anime = previous.data[previous.data.length - 1]
    if (anime) result.prev = { anime, page: currentPage - 1 }
  }
  if (index < current.data.length - 1) result.next = { anime: current.data[index + 1], page: currentPage }
  else if (currentPage < current.meta.total_pages) {
    const next = await getAnimeList({ ...gridParams, page: currentPage + 1 }, { signal: controller.signal })
    if (next.data[0]) result.next = { anime: next.data[0], page: currentPage + 1 }
  }
}
```

**Pure-function JSDoc convention to follow** (`animeGridContext.ts:38-44`, every exported function in this file has this exact comment shape — German, `@param`/`@returns`):
```ts
/**
 * Baut einen URL-Query-String aus den übergebenen Anime-Listenparametern.
 * Lässt nicht gesetzte oder ungültige Parameter weg.
 *
 * @param params - Filterparameter für die Anime-Übersicht
 * @returns URL-encodierter Query-String (ohne führendes `?`)
 */
export function buildAnimeGridQuery(params: AnimeListParams): string { ... }
```
File is 199 lines — safe to extend without hitting the 450-line split rule (per `192-RESEARCH.md`'s 450-Zeilen-Regel section).

**`getAnimeList` server-safety confirmed** (`frontend/src/lib/api/fansubs-core.ts:73-106`): plain `fetch()`/`authorizedFetch()` branch on `params.include_disabled`, no `'use client'` marker, already accepts `AbortSignal` + `next.revalidate`:
```ts
export async function getAnimeList(params: AnimeListParams, options: AnimeListRequestOptions = {}): Promise<PaginatedAnimeResponse> {
  const path = params.include_disabled === true ? "/api/v1/admin/anime" : "/api/v1/anime";
  ...
  const response = params.include_disabled === true ? await authorizedFetch(url, requestInit) : await fetch(url, requestInit);
```
Neighbor resolution never sets `include_disabled` → automatically takes the public, unauthenticated path (preserves the "public SSR free from viewer cookies" invariant asserted in `page.test.tsx:142-149`).

---

### `frontend/src/components/anime/AnimeEdgeNavigation.tsx` (Befund 19, narrowed scope)

**Analog:** `frontend/src/components/ui/AdjacentNavigation.tsx` (already accepts `previous`/`next` as plain `AdjacentNavigationItem | null` props, lines 19-25) — the target shape `AnimeEdgeNavigation` itself must now also expose:
```tsx
export interface AdjacentNavigationItem {
  href: string
  label: string
  ariaLabel?: string
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>
  onMouseLeave?: MouseEventHandler<HTMLAnchorElement>
  onFocus?: FocusEventHandler<HTMLAnchorElement>
  onBlur?: FocusEventHandler<HTMLAnchorElement>
  onTouchStart?: TouchEventHandler<HTMLAnchorElement>
}
```
`AnimeEdgeNavigation`'s current `itemFor()` function (`AnimeEdgeNavigation.tsx:105-119`) already builds exactly this shape client-side from its own fetched `neighbors` state — post-fix, the `href`/`label`/`ariaLabel` fields come from server-passed props (computed once via `buildAnimeDetailHref`/`resolveAnimeNeighbors`), while the five hover/focus handlers remain locally defined (they gate the still-client-only preview card, not navigation).

**Test migration target** — `AnimeEdgeNavigation.test.tsx:33-44`'s first test currently asserts hrefs appear only `await waitFor(...)` (post-fetch); this assertion moves to the new SSR tree-walk test in `page.test.tsx` (see below), while `AnimeEdgeNavigation.test.tsx` itself keeps its **second** test (`'zeigt die Vorschaukarte erst bei Hover...'`, lines 46-56) unchanged since the hover-preview fetch behavior is explicitly preserved.

---

### `frontend/src/app/anime/[id]/page.test.tsx` — new SSR edge-navigation test (Befund 19)

**Analog:** itself — existing `elements()` tree-walker (lines 102-111) and `loadContent()` helper (lines 128-139), already proven not to call hook-using components directly (Pitfall 4 in `192-RESEARCH.md`).

```tsx
// Source: page.test.tsx:102-111 (existing, verified) — the walker to extend
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    if (child.type === AnimeDetailHero || child.type === AnimeEpisodesSection) {
      const component = child.type as (props: Record<string, unknown>) => ReactNode
      return [child, ...elements(component(child.props))]
    }
    return [child, ...elements(child.props.children as ReactNode)]
  })
}
```
**Do not add `AnimeEdgeNavigation` to this whitelist** (it still needs `'use client'` hook state for the hover preview — invoking it as a plain function throws "Invalid hook call"). Instead assert directly on its un-materialized element's `.props` (the illustrative test already drafted in `192-RESEARCH.md`'s Code Examples section, reusing `loadContent()`/`elements()`/`AnimeEdgeNavigation` exactly as imported at `page.test.tsx:6,27-28`):
```tsx
const nav = elements(content).find((item) => item.type === AnimeEdgeNavigation)
expect(nav?.props.previous?.href).toBe(buildAnimeDetailHref(21, buildAnimeGridQuery({ per_page: 3, page: 1 })))
```

**Existing `vi.mock('@/lib/api', ...)` block to extend** (`page.test.tsx:17-21`, already includes `getAnimeList: vi.fn()` — safe, no change needed here, but confirms the mock shape new tests can reuse):
```tsx
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  getAnimeList: vi.fn(), getAnimeByID: vi.fn(), getAnimeFansubs: vi.fn(), getGroupedEpisodes: vi.fn(),
  getAnimeRelations: vi.fn(), getWatchlistEntry: vi.fn(),
}))
```

**Defensive fix required in a sibling test file** (`page.performance.test.ts`, per `192-RESEARCH.md` Pitfall 2) — add `getAnimeList: vi.fn()` to that file's own partial `vi.mock('@/lib/api', ...)` override list defensively, matching the pattern above, to prevent a future real-network fallthrough.

---

### `frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts` (Befund 22)

**Analog:** itself — this is a 2-line regex-array diff, not a new test file.

**Current forbidden-pattern array** (`detailStyleSystem.guard.test.ts:13-28`):
```ts
const forbiddenLocalDesign = [
  /#[0-9a-f]{3,8}\b/i,
  /rgba?\(/i,
  /color-mix\(/i,
  /linear-gradient\(/i,
  /(?:-webkit-)?backdrop-filter\s*:/i,
  /filter\s*:\s*blur\(/i,
  /box-shadow\s*:/i,
  /border-radius\s*:\s*(?!var\()/i,
  /--[\w-]*color[\w-]*\s*:/i,
]
```
→ add `/grid-template/i` as a new entry (Befund 22's explicit requirement). The existing third `it()` block (`detailStyleSystem.guard.test.ts:48-52`, which currently asserts `--card-public-hero-columns` is an **allowed** exception) must be **deleted**, not kept — that hook is retired entirely, not merely exempted:
```ts
it('lässt einen erlaubten Layout-Hook ohne "color" im Namen unangetastet (z. B. --card-public-hero-columns)', () => {
  // DELETE this whole it() block — the hook it validates no longer exists after Befund 21/22.
})
```

---

### `frontend/src/components/fansubs/ReleasePreviewRow.tsx` / `.module.css` (Befund 20)

**Analog:** itself — current `.content`/`.identity`/`.logos` structure is the exact migration target, plus `ArtworkHero.tsx:58`'s conditional-omission idiom for the zero-avatar pitfall.

**Current structure to restructure** (`ReleasePreviewRow.tsx:52-93`):
```tsx
<div className={styles.content}>
  <div className={styles.identity}>
    <div className={styles.logos}>{groups.map((group) => <Avatar ... />)}</div>
    <div className={styles.identityText}>
      <Text ...>{groupNameLine}{isCoop ? <Text as="span" ...> COOP</Text> : null}</Text>
      <Text ...>{resolveReleaseName(version)}</Text>
    </div>
  </div>
  {techLine ? <Text ...>{techLine}</Text> : null}
  {extras.length > 0 ? <Text ...>{extras.join('   ')}</Text> : null}
  {dateLine ? <Text ...>{dateLine}</Text> : null}
</div>
```
**Current CSS being replaced** (`ReleasePreviewRow.module.css:13-24`):
```css
.content {
  min-width: 0;
  display: grid;
  gap: var(--space-2);
}
.identity {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  min-width: 0;
}
```
→ per `192-UI-SPEC.md:206` consumption map: `SplitLayout firstColumnWidth="auto"` (no stacking breakpoint needed — avatar column always stays beside text) replaces `.content`; `Stack gap="1"` replaces the implicit vertical flow of `groupName`/`releaseName`/`techLine`/`extrasLine`/`dateLine` in the second column.

**Mandatory zero-avatar branch** (per `192-UI-SPEC.md:247` and `192-RESEARCH.md` Pitfall 1 — `groups.length === 0` must skip `SplitLayout` entirely, not pass it an empty `firstColumn`):
```tsx
// Pitfall-avoidance precedent already in the codebase (ArtworkHero.tsx:58):
{roles ? <div className={styles.roles}>{roles}</div> : null}
// Applied analogously to ReleasePreviewRow:
{groups.length > 0 ? (
  <SplitLayout firstColumn={<div className={styles.logos}>{...avatars...}</div>} secondColumn={<Stack gap="1">{...text lines...}</Stack>} firstColumnWidth="auto" />
) : (
  <Stack gap="1">{...text lines, flush at column start...}</Stack>
)}
```

**Do-not-swap guidance** (per `192-RESEARCH.md` Don't Hand-Roll table): keep `ReleasePreviewRow`'s own bespoke `.logos` flex row for multiple avatars (not `AvatarStack` — `AvatarStack.tsx:33-58`'s overlap+ring treatment is a visually different, undeclared change forbidden by the "zero pixel diff" contract).

**New test file to create** (`ReleasePreviewRow.test.tsx`, confirmed absent — nearest sibling-domain analog is `AnimeEdgeNavigation.test.tsx:1-30`'s RTL render setup for a `'use client'` component):
```tsx
// Pattern to copy (AnimeEdgeNavigation.test.tsx:1-13, adapted):
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReleasePreviewRow } from './ReleasePreviewRow'
// Assert: data-line elements' bounding position / column alignment with groupName in all 3
// story variants ("Mit allen Extras", "Koop", "Ohne Logo" — see ReleasePreviewRow.stories.tsx),
// and that "Ohne Logo" renders no empty SplitLayout first-column gap.
```

---

## Shared Patterns

### Override-hook CSS custom property mechanism (applies to all 3 new Grundbausteine)
**Source:** `frontend/src/components/ui/Card.tsx:63-72` (inline `style={{'--x': value}}`) + `Card.module.css:134` (`var(--x, fallback)` consumption)
**Apply to:** `Stack.tsx`/`Stack.module.css`, `Cluster.tsx`/`Cluster.module.css`, `SplitLayout.tsx`/`SplitLayout.module.css` — each sets its own uniquely-named private hooks (`--stack-gap`/`--stack-align`, `--cluster-gap`/`--cluster-align`/`--cluster-justify`/`--cluster-wrap`, `--split-gap`/`--split-align`/`--split-first-col`), never a second file-crossing declaration of the same property.

### Container-query breakpoint collapse (not viewport media query)
**Source:** `frontend/src/components/ui/ArtworkHero.module.css:2-5,92` (`container: artwork-hero / inline-size` + `@container artwork-hero (min-width: 48rem)`)
**Apply to:** `SplitLayout.module.css` only (uniquely named container, e.g. `split-layout`) — required because `SplitLayout` instances nest inside `Card`s of varying available width, not always full viewport width.

### `Promise.allSettled` fail-open data-fetch convention
**Source:** `frontend/src/app/anime/[id]/page.tsx:76-77,80-87` (existing pattern for `getAnimeFansubs`/`getGroupedEpisodes`/`getAnimeRelations`)
**Apply to:** the new `resolveAnimeNeighbors()` server call site in `page.tsx` — on failure, `neighbors = {prev: null, next: null}`, and the corresponding `AdjacentNavigation` button is simply omitted (no error UI, matches existing `null`-on-missing-`gridParams` behavior at `AnimeEdgeNavigation.tsx:103`).

### Content-regex guard test pattern (no rendering, reads real source via `fs`)
**Source:** `frontend/src/app/anime/[id]/detailStyleSystem.guard.test.ts:1-53` (page-CSS purity), `frontend/src/components/ui/catalogTaxonomy.test.ts:1-152` (import taxonomy), `frontend/src/components/ui/foreignVariableOverrides.regression.test.ts:1-80` (token/hook literal guard)
**Apply to:** All three guards already glob the directories this phase touches with zero per-file allowlist needed for *new compliant files* — only `detailStyleSystem.guard.test.ts` needs an explicit, intentional 2-line edit (add `/grid-template/i`, delete the retired-hook exception test). `catalogTaxonomy.test.ts` and `foreignVariableOverrides.regression.test.ts` require NO edits if `Stack`/`Cluster`/`SplitLayout` are written correctly from the start (see Pattern Assignments above).

### German fachlich code-comment convention
**Source:** `frontend/src/app/anime/[id]/AnimeDetailHero.tsx:64-70,86-94` (explains WHAT a CSS/structural decision does and WHY, in German with correct umlauts, never a bare phase/plan reference)
**Apply to:** Any new comment explaining the `SplitLayout`/`Card` nesting in `AnimeDetailHero.tsx`, the neighbor-resolution extraction in `animeGridContext.ts`, and the zero-avatar branch in `ReleasePreviewRow.tsx`.

## No Analog Found

None. Every file in this phase's scope either already exists (modification-in-place) or has a direct, line-cited analog in the codebase. `192-UI-SPEC.md` additionally pre-locks the exact prop API for the three genuinely new files (`Stack`/`Cluster`/`SplitLayout`), removing the usual "no analog" risk for brand-new primitives.

## Metadata

**Analog search scope:** `frontend/src/components/ui/`, `frontend/src/app/anime/[id]/`, `frontend/src/components/anime/`, `frontend/src/components/fansubs/`, `frontend/src/lib/`, `frontend/src/lib/api/`
**Files scanned:** 24 (read in full or targeted sections during this mapping session)
**Pattern extraction date:** 2026-11-04
