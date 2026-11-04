---
phase: 192
slug: ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
status: draft
shadcn_initialized: false
preset: none
created: 2026-11-04
---

# Phase 192 — UI Design Contract

> Visual and interaction contract for `/anime/[id]`. This phase is a **structural/architectural
> refactor phase** (Live-UAT-Befunde 19–23), not a redesign — it must produce **zero visible pixel
> change** on `/anime/6`, `/anime/13`, `/anime/2` compared to `main` (the Pflicht-Nachweis in
> `192-CONTEXT.md` is exactly a before/after screenshot diff), except for the one deliberate
> behavioral fix in scope (Befund 19: edge-nav buttons now exist in the SSR HTML instead of
> appearing after hydration) and the one deliberate visual fix (Befund 20: release-row data-line
> indentation). All 5 decisions (Befunde 19–23) are already locked in `192-CONTEXT.md` with a
> binding human-specified implementation order (23+22/21 → 19 → 20). This document does not
> re-ask any of those decisions. It translates them into the prescriptive component API, CSS
> ownership rules, and acceptance criteria the planner/executor/checker need, reusing only tokens
> and primitives that already exist in `frontend/src/components/ui/` and
> `frontend/src/styles/tokens/`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — this project's canonical design system is the in-house `@/components/ui` primitive library (mandated by `CLAUDE.md` "Frontend-UI"), not shadcn. shadcn is not installed (no `components.json`, no Tailwind config in `frontend/`) and **must not be introduced by this phase** — doing so would directly contradict the already-enforced `catalogTaxonomy.test.ts` / ESLint-guard / "Grundbausteine vs. Zusammengesetzte Bausteine" taxonomy this phase extends. |
| Preset | not applicable |
| Component library | custom, in-repo `frontend/src/components/ui/`. This phase **adds three new Grundbausteine** (`Stack`, `Cluster`, `SplitLayout` — specified below) and **migrates** five existing composite blocks (`AnimeDetailHero`, `AnimeEpisodesSection`, `FansubVersionBrowser`/`FansubGroupPicker`, `ReleasePreviewRow`, `AnimeEdgeNavigation`) onto them. It reuses `Card`, `MediaFrame`, `ResponsiveImage`, `Text`, `Heading`, `Badge`, `LinkChip`, `AvatarStack`, `AdjacentNavigation`, `Avatar`, `Button` verbatim — no prop/visual change to any of those. |
| Icon library | `lucide-react` (already in use: `ExternalLink` in `AnimeDetailHero.tsx`) — no new icon introduced. |
| Font | existing site typography tokens (`frontend/src/styles/tokens/typography.css`) — unchanged by this phase. |

No new runtime dependency is introduced. `ArtworkHero`, `MetricList`, `PageHeader`, `SectionHeader`,
`Toolbar` are read-only reference examples for Befund 23 (they demonstrate the anti-pattern this
phase fixes) — they are explicitly **out of scope**, unchanged, per `192-CONTEXT.md`'s `<deferred>`
section.

---

## Spacing Scale

This phase does not introduce a new spacing scale. It reuses the sitewide tokens already declared
in `frontend/src/styles/tokens/layout.css:21-29`:

| Token | Value | Usage in this phase |
|-------|-------|----------------------|
| `--space-1` | 4px | `Stack`/`Cluster` tightest gap variant (e.g. `AvatarStack`-adjacent micro-gaps) |
| `--space-2` | 8px | `Cluster` default gap for chip rows (`FansubGroupPicker` `.chipRow`), `Stack` gap for `ReleasePreviewRow`'s data-line stack |
| `--space-3` | 12px | `AnimeDetailHero`'s internal section gaps (replaces `page.poster.module.css`/`page.infoCard.module.css` literals moved into the composite block) |
| `--space-4` | 16px | `SplitLayout` default column gap (poster|info, avatar|text) |
| `--space-5` | 24px | `AnimeDetailHero` info-card section spacing |
| `--space-6`–`--space-9` | 32/48/64/80px | not directly introduced by this phase; any existing use in the touched files is carried over unchanged |

Exceptions: **none new.** The three new Grundbausteine (`Stack`/`Cluster`/`SplitLayout`) must accept
**only** `--space-1` through `--space-9` as their `gap` prop values (string literals `'1'`…`'9'`
mapped 1:1 to `var(--space-N)`) — no raw pixel value, no new token, no literal CSS `gap:` value may
survive anywhere these primitives replace hand-rolled flex/grid in the five pilot composite blocks.

---

## Typography

This phase reuses existing typographic roles verbatim — it is a layout-ownership refactor, not a
typography change. No new font-size/weight/line-height combination is introduced anywhere in scope.

| Role | Size | Weight | Line Height | Source (reuse, do not re-declare) |
|------|------|--------|-------------|------------------------------------|
| Body (anime description, release group/release-name text) | 16px (`--text-body-font-size`) | 400 | 1.5 | `Text` default variant, `typography.css:31` |
| Meta / soft (genres eyebrow, release tech-line, release extras-line, release date-line) | 14px (`--text-meta-font-size`) | 400 | 1.5 | `Text` `variant="meta"`/inline `style={mutedOnGlassTextStyle}`, `typography.css:33` — unchanged |
| Label (release group name, "COOP" label) | inherits body size, weight `600` via `font-weight: 600` in `ReleasePreviewRow.module.css` `.groupName`/`.coopLabel` | 600 | 1.5 | unchanged, carried into the new `Stack`-based layout verbatim |
| Heading (anime title, `<h1>`) | `--font-size-h1` (`clamp(2rem, 3vw, 2.75rem)`) | 700 (`--font-weight-heading`) | browser default on `Heading level={1}` | `Heading level={1}`, unchanged |

No row in this table changes. The checker must verify that migrating `AnimeDetailHero.tsx`,
`ReleasePreviewRow.tsx`, `AnimeEdgeNavigation.tsx` onto `Stack`/`Cluster`/`SplitLayout` touches
**only** `display`/`flex-direction`/`grid-template-columns`/`gap`/`align-items`/`justify-content`
declarations — never a `font-size`, `font-weight`, `line-height`, or `color` declaration.

---

## Color

This phase introduces **no new color token and no new hex value anywhere.** It is a layout
refactor; every existing color decision (Card variants, `Text`/`Heading` override hooks on
`.cardPublicHeroInfo`, Badge variants, `mutedOnGlassTextStyle`) is reused verbatim.

| Role | Value | Usage in this phase |
|------|-------|----------------------|
| Dominant (page background) | `var(--public-page-bg)` | `page.module.css` `.page` — untouched by this phase except removing now-dead rules per Befund 22's CSS-purity guard |
| Secondary (hero card surfaces) | `var(--card-public-hero-bg)` / `var(--card-public-hero-info-bg)` / `var(--card-public-poster-bg)` | `Card variant="publicHero"` / `"publicHeroInfo"` / `"publicPoster"` — these three Card variants, their override hooks, and their responsive mobile color-flip (`--heading-color`/`--text-body-color`/`--text-eyebrow-color` in `Card.module.css:233-244`) are **completely unchanged**; this phase only moves which file *positions* the card content (into `AnimeDetailHero`), never which file *colors* it (stays in `Card.module.css`) |
| Accent (10%) | `var(--card-tint-hue)`-driven tints (not used on this page), `var(--border-on-media)` for dividers | Reserved for: existing release-row logo border (`ReleasePreviewRow.module.css` `.logo`), existing dividers (`.posterDivider`, `.divider`) — unchanged |
| Destructive | `var(--color-error)` | Not used by this phase — no destructive action exists on `/anime/[id]` |

Accent reserved for: nothing new. The three new Grundbausteine (`Stack`/`Cluster`/`SplitLayout`)
must set **zero** `background`, `color`, `border`, `box-shadow`, or `border-radius` declarations —
per `192-CONTEXT.md`: "Rundungen/Flächen kommen weiterhin aus `Card`/`MediaFrame`-Varianten — die
neuen Primitives selbst setzen keine `border-radius`/Hintergrundfarbe." This is a hard constraint,
checked by a new unit test on the three primitives' own `.module.css` files (see Acceptance
Criteria below) — not just a style guideline.

---

## Copywriting Contract

This phase introduces **no new user-facing copy.** Every German string already on `/anime/[id]`
today is reused byte-identical; this is a structural refactor, not a content change.

| Element | Copy |
|---------|------|
| Primary CTA (release row, unchanged) | `"Zum Release →"` (`ReleasePreviewRow.tsx:101`) — reused verbatim |
| Edge-navigation labels (unchanged) | `"Zurück"` / `"Weiter"` button text, `"Vorheriger Anime: {title}"` / `"Nächster Anime: {title}"` `ariaLabel` (`AnimeEdgeNavigation.tsx:111-112`) — reused verbatim, now rendered server-side instead of after hydration |
| Empty/missing state (edge navigation, Befund 19) | No visible copy at all — if `getAnimeList` fails server-side or a neighbor does not exist, the corresponding `AdjacentNavigation` button is simply **omitted** (same `null`-on-missing-`gridParams` behavior as today), not replaced by an error message or skeleton. This mirrors the existing `Promise.allSettled` fail-open pattern already used elsewhere in `page.tsx`. |
| Error state | Not applicable — this phase introduces no new error-producing interaction; the hover-preview card (image + title + type) remains client-fetched and silently omits itself if that fetch fails, exactly as today |
| Destructive confirmation | Not applicable — no destructive action in scope |

Checker note: because there is no new copy, Dimension 1 (Copywriting) passes by verifying **absence
of change** — a grep diff of every JSX text node / `aria-label` / button label in the five touched
files against `main` must show zero textual differences, only structural (element/className) ones.

---

## New Grundbausteine: `Stack`, `Cluster`, `SplitLayout` (Befund 23)

Exact prop API (Claude's Discretion per `192-CONTEXT.md`, now locked as the prescriptive contract
for planner/executor). All three live in `frontend/src/components/ui/`, each with its own
`X.module.css`, `X.stories.tsx` (Storybook category **`Grundbausteine/*`**, full state coverage,
`tags: ['autodocs']`), and `X.test.tsx`. None may import any other `components/ui` file that itself
has a `.stories.tsx` (enforced by `catalogTaxonomy.test.ts` — see Acceptance Criteria).

### `Stack` — vertical arrangement

```ts
export type SpaceToken = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface StackProps {
  gap?: SpaceToken              // default '3' (var(--space-3))
  align?: 'start' | 'center' | 'end' | 'stretch'  // default 'stretch'
  as?: ElementType              // default 'div'
  className?: string
  children: ReactNode
}
```

CSS (`Stack.module.css`): `display: flex; flex-direction: column; gap: var(--stack-gap, var(--space-3)); align-items: var(--stack-align, stretch); min-width: 0;` — the `gap`/`align` props set the two CSS custom properties inline (same pattern as `Card`'s `--card-tint-hue` override hook), never a second competing declaration in a consumer's own CSS Module.

### `Cluster` — horizontal arrangement with wrap

```ts
export interface ClusterProps {
  gap?: SpaceToken               // default '2' (var(--space-2))
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'  // default 'center'
  justify?: 'start' | 'center' | 'end' | 'between'             // default 'start'
  wrap?: boolean                 // default true
  as?: ElementType               // default 'div'
  className?: string
  children: ReactNode
}
```

CSS: `display: flex; flex-wrap: var(--cluster-wrap, wrap); gap: var(--cluster-gap, var(--space-2)); align-items: var(--cluster-align, center); justify-content: var(--cluster-justify, flex-start); min-width: 0;`

### `SplitLayout` — fixed/auto first column + flexible remainder, with wrap breakpoint

```ts
export interface SplitLayoutProps {
  firstColumn: ReactNode
  secondColumn: ReactNode
  firstColumnWidth?: string      // any valid CSS <length> or 'auto' — caller supplies the value
                                  // (e.g. 'var(--media-frame-poster-width)', 'auto'); the primitive
                                  // itself knows NO domain token names
  gap?: SpaceToken                // default '4' (var(--space-4))
  breakpoint?: 'md' | 'lg'        // default 'md'. 'md' = 48rem / 768px (matches ArtworkHero's
                                   // existing container-query threshold); 'lg' = 64rem / 1024px
                                   // (matches the existing 1023px poster-width tier). Below the
                                   // chosen breakpoint, columns stack vertically (firstColumn above
                                   // secondColumn).
  align?: 'start' | 'center' | 'stretch'  // default 'start'
  as?: ElementType
  className?: string
}
```

CSS: uses a **container query** (`container-type: inline-size`), not a viewport media query — same
established pattern as `ArtworkHero.module.css:2-5` (`container: artwork-hero / inline-size`). This
is required because `SplitLayout` instances nest inside `Card`s of varying available width (hero
card vs. a narrower release row), not always the full viewport. Base rule:
`display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--split-gap, var(--space-4)); align-items: var(--split-align, start);`
Above the container-query threshold: `grid-template-columns: var(--split-first-col, auto) minmax(0, 1fr);`

**Why `breakpoint` is a fixed two-value enum, not an arbitrary pixel prop:** CSS container-query
(and media-query) conditions cannot read a `var()` custom property as of this project's supported
browser matrix — the threshold must be a literal value at parse time. A two-value enum (`'md'`/`'lg'`)
keeps the primitive breakpoint-token-based and domain-free (no "poster" knowledge) while remaining
implementable as static CSS; this is the generic "breakpoint token" `192-CONTEXT.md` asked for.

### Consumption map (which pilot block uses which primitive)

| Pilot block (Befund 21/23) | Primitive(s) it composes |
|---|---|
| `AnimeDetailHero` (poster Card + info Card) | `SplitLayout` (`firstColumnWidth` driven by the existing `--media-frame-poster-width`/`-medium`/`-compact` tokens via `AnimeDetailHero`'s own new `.module.css`, `breakpoint="lg"` for the 1024px tier; the <768px tier is a second, nested stacking rule already native to `SplitLayout`'s own breakpoint collapse) wrapping the two `Card`s; `Stack` for the info-card's internal vertical rhythm (title row → badges → description → tags → stats → banner → relations) |
| `AnimeEpisodesSection` | `Stack` for the vertical episode-list arrangement, `Cluster` for any inline badge/filter rows |
| `FansubVersionBrowser`/`FansubGroupPicker` | `Stack` for `.wrapper` (currently `display:flex; flex-direction:column; gap`), `Cluster` for `.chipRow` (currently `display:flex; flex-wrap:wrap; gap; align-items:center`) — a 1:1 mechanical replacement, zero visual change |
| `ReleasePreviewRow` | `Cluster` (`justify="between"`, `wrap=true`) replaces `.row`'s desktop-row/mobile-column flex; `SplitLayout` (`firstColumnWidth="auto"`, `breakpoint` not relevant here — no stacking needed, the avatar column always stays beside the text) replaces `.content` for the avatar(s) | text-and-data-lines split; `Stack` (`gap='1'`) replaces the implicit vertical flow of `groupName`/`releaseName`/`techLine`/`extrasLine`/`dateLine` inside the second column |
| `AnimeEdgeNavigation` + preview card | No new layout primitive needed for the nav buttons themselves (`AdjacentNavigation` already owns that layout) — this block's scope in Befund 23 is limited to not regressing while Befund 19's SSR change lands; the hover-preview `Card` keeps its existing `.previewCard` flex layout (already correct, not part of the anti-pattern) |

---

## Seiten vs. Bausteine boundary (Befund 22)

`AnimeDetailView.tsx` after this phase may contain **only**:
- `BannerSection`/`AnimeBackdropRotator` composition (unchanged)
- `Breadcrumbs` (unchanged)
- a single `<AnimeDetailHero anime={...} coverUrl={...} embySeriesUrl={...} relationsResponse={...} edgeNavigation={...} />` call — no surrounding `Card`, no `styles.heroContainer`, no `styles.edgeNavigationOverlay` wrapper div. The overlay slot for `AnimeEdgeNavigation` becomes either a named prop (`edgeNavigation?: ReactNode`) or a children slot on `AnimeDetailHero` itself — Claude's Discretion on the exact prop name, but it must be `AnimeDetailHero` that positions it (absolute overlay CSS lives in `AnimeDetailHero`'s own new `.module.css`), not the page.
- `<AnimeEpisodesSection .../>` inside a bare section-spacing wrapper (page-width/gutter only)

`page.module.css`/`page.poster.module.css`/`page.infoCard.module.css`/`page.episodes.module.css`
after this phase may declare **only**: page/section max-width, gutter, and the vertical gap between
Banner → Breadcrumbs → Hero → Episodes (reusing `--public-page-detail-max-width`,
`--public-page-detail-gutter`, `--space-*` tokens). Every rule currently in these four files that
sets `grid-template-columns`, any color value, `border-radius`, `box-shadow`, `backdrop-filter`, or
inner-component padding/gap must move into the relevant composite block's own new `.module.css`
(`AnimeDetailHero.module.css`, `ReleasePreviewRow.module.css` stays, etc.) or be deleted if the new
Grundbaustein now owns it.

**Guard test extension (mandatory):** `detailStyleSystem.guard.test.ts` (existing, see excerpt
above) must gain a new forbidden pattern for `grid-template` (currently only checks colors/radius/
shadows/blur) and must **lose** its documented exception for `--card-public-hero-columns` (that
override hook is retired entirely once `SplitLayout` takes over — if a future regression
re-introduces it, the guard should fail, not special-case it). Any remaining intentionally-allowed
width-contract line (e.g. a `width: min(var(--public-page-detail-max-width), ...)` rule) must be
added to the guard's documented-exception list with an explicit code comment, never silently
excluded.

---

## Acceptance Criteria (maps to Befunde 19–23)

| Befund | Prescriptive contract |
|---|---|
| 23 | `Stack`, `Cluster`, `SplitLayout` exist in `frontend/src/components/ui/`, each exporting the prop API above, each with a `.stories.tsx` under `Grundbausteine/*` with `tags:['autodocs']` and full state coverage (every `gap` value used by a consumer, every `align`/`justify` value used, `SplitLayout` at both `breakpoint` values and both narrow/wide container widths). Their own `.module.css` sets zero `background`/`color`/`border`/`box-shadow`/`border-radius` (new unit test, pattern-matching the three files for those five properties, must assert an empty violation list — mirror `detailStyleSystem.guard.test.ts`'s own `forbiddenLocalDesign` regex-list approach). `catalogTaxonomy.test.ts` passes for all three (no internal import of another cataloged Grundbaustein). |
| 22 | `page.module.css`/`page.poster.module.css`/`page.infoCard.module.css`/`page.episodes.module.css` contain no `grid-template`, no color value, no `border-radius`/shadow for a baustein's interior, no `--card-public-hero-columns` hook. New/extended guard test enforces this with a documented exception list for width-contract lines only. `AnimeDetailView.tsx` only sequences `BannerSection → Breadcrumbs → AnimeDetailHero → AnimeEpisodesSection`. |
| 21 | `AnimeDetailHero.stories.tsx` (`Zusammengesetzte Bausteine/Anime-Kopf`) renders **pixel-identical** to the live `/anime/6` page at 1440px (poster left, info right) and gains a second story at the 390px viewport showing the stacked mobile layout — both as a required before/after screenshot pair in the phase's verification artifact. `AnimeDetailHero` itself now owns the `Card variant="publicHero"` wrapper and the `SplitLayout` two-column grid; `AnimeDetailView` passes it only data props plus the edge-navigation slot. |
| 19 | `page.tsx`'s `AnimeDetailContent` resolves `prev`/`next` neighbors server-side (reusing `animeGridContext.ts` + `getAnimeList`, including the page-boundary branch — last item of the previous page / first item of the next page) and passes them as props. `AnimeEdgeNavigation` renders `AdjacentNavigation` with real `href`s already present in the server-rendered HTML — **no client fetch gates the nav buttons' first paint.** The hover-preview card (image+title+type) may still be client-fetched/client-only. On a `getAnimeList` server failure, the affected button is omitted (no broken link, no visible error). New SSR-oriented test (lightweight component-tree walk, no mock fetch needed) asserts `href` is present on the rendered tree when neighbors exist. |
| 20 | `ReleasePreviewRow`'s data lines (`techLine`/`extrasLine`/`dateLine`) start at the exact same horizontal position as `groupName`/`releaseName` — i.e., flush with the second column of the new `SplitLayout`, never under the avatar(s). Verified in all 3 existing stories: "Mit allen Extras" (single avatar), "Koop" (multi-avatar, wider first column — the data lines must shift right by exactly the wider avatar-group's rendered width, not a fixed single-avatar width), "Ohne Logo" (zero avatars — data lines flush at column start, **no leftover gap** from an empty first column; the implementation must not render a `SplitLayout` first column that reserves width/gap when there are zero avatars). |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none — shadcn is not used in this project | not applicable |
| third-party | none | not applicable |

No registry vetting gate applies to this phase — all components are first-party, newly authored or
already in the repository.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — verify zero textual-content diff in all five touched
  components/pages vs. `main` (grep-diffable JSX text nodes, `aria-label`s, button labels);
  verify the Befund 19 "omit button, no error copy" rule is implemented, not a new empty/error string.
- [ ] Dimension 2 Visuals: PASS — verify the mandatory before/after screenshot pairs
  (`/anime/6`, `/anime/13`, `/anime/2` at 1440×900 and 390×844, main vs. branch) show no diff except
  the edge-nav-buttons-now-present-pre-hydration case and the release-row indentation fix; verify
  `AnimeDetailHero.stories.tsx` vs. the live page screenshot pair required by Befund 21.
- [ ] Dimension 3 Color: PASS — verify no new hex/token introduced anywhere in the five touched
  blocks or the three new primitives; verify the three new primitives set zero
  background/color/border/box-shadow/border-radius (automated test, not just review).
- [ ] Dimension 4 Typography: PASS — verify no font-size/weight/line-height/color declaration was
  touched by the `Stack`/`Cluster`/`SplitLayout` migration in any of the five pilot blocks.
- [ ] Dimension 5 Spacing: PASS — verify `Stack`/`Cluster`/`SplitLayout`'s `gap` prop only accepts
  `--space-1`..`--space-9`; verify no raw pixel gap survives in the five migrated blocks.
- [ ] Dimension 6 Registry Safety: PASS (trivially — no registry in scope).

**Additional non-standard gates for this phase (beyond the six dimensions):**
- [ ] `catalogTaxonomy.test.ts` passes for the three new Grundbausteine (no undisclosed import of
  another cataloged primitive).
- [ ] The extended `detailStyleSystem.guard.test.ts` passes with `grid-template` added to its
  forbidden-pattern list and the `--card-public-hero-columns` exception removed.
- [ ] The new SSR edge-navigation test (Befund 19) passes without a mock fetch / client hydration
  step — asserting `href` presence directly on the server-rendered component tree.
- [ ] Implementation order respected: 23 and 22/21 land together first, 19 second, 20 third (per
  `192-CONTEXT.md`'s binding human-specified sequence).

**Approval:** pending
